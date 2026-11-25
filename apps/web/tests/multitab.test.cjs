const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, seed, deferred, tick } = require('./support.cjs');

const key = 'flashcards_account_v1:user:a';
function tabs(service = {}, initial) {
  const storage = new Map(initial ? [[key, JSON.stringify(initial)]] : []);
  const a = createHarness(service, storage);
  const b = createHarness(service, storage);
  for (const tab of [a, b]) { tab.navigator.onLine = false; tab.store.getState().setUser({ uid: 'a' }); }
  return { a, b, storage, saved: () => JSON.parse(storage.get(key)) };
}

test('stale tabs apply concurrent folder and card operations to the latest durable account', async () => {
  const { a, b, saved, storage } = tabs({}, seed.snapshot());
  const [fa, fb] = await Promise.all([a.store.getState().addFolder('a'), b.store.getState().addFolder('b')]);
  await Promise.all([
    a.store.getState().addCard({ ...seed.card, setId: 's1' }),
    b.store.getState().addCard({ ...seed.card, setId: 's1' }),
  ]);
  assert.equal(saved().folders.length, 2);
  assert.equal(saved().cards.length, 4);
  assert.deepEqual(new Set(saved().pendingSync.folderIds), new Set([fa, fb]));
  assert.equal(saved().pendingSync.cardIds.length, 2);
  const reload = createHarness({}, storage); reload.store.getState().setUser({ uid: 'a' });
  assert.equal(reload.store.getState().folders.length, 2);
  assert.equal(reload.store.getState().cards.length, 4);
});

test('deleting a folder and editing an unrelated card preserve each other and the outbox', async () => {
  const initial = seed.snapshot(); initial.folders = [{ id: 'f1', title: 'delete', createdAt: 1 }];
  const { a, b, saved } = tabs({}, initial);
  await Promise.all([a.store.getState().deleteFolder('f1'), b.store.getState().updateCard('c1', { termRichText: 'edited' })]);
  assert.equal(saved().folders.length, 0);
  assert.equal(saved().cards.find(c => c.id === 'c1').termRichText, 'edited');
  assert.deepEqual(saved().pendingSync.deletedFolderIds, ['f1']);
  assert.deepEqual(saved().pendingSync.cardIds, ['c1']);
});

test('two cloud writers serialize; an old acknowledgement cannot clear a newer queued edit', async () => {
  const gate = deferred(); const entered = deferred();
  let concurrent = 0; let maximum = 0; const sent = [];
  const { a, b, saved } = tabs({ commitChanges: async snapshot => {
    maximum = Math.max(maximum, ++concurrent);
    sent.push(snapshot.cards.find(c => c.id === 'c1').termRichText);
    if (sent.length === 1) { entered.resolve(); await gate.promise; }
    concurrent--;
  } }, seed.snapshot());
  await a.store.getState().updateCard('c1', { termRichText: 'first' });
  a.navigator.onLine = true; b.navigator.onLine = true;
  const first = a.store.getState().flushPendingSync(); await entered.promise;
  await b.store.getState().updateCard('c1', { termRichText: 'newer' });
  const second = b.store.getState().flushPendingSync();
  gate.resolve(); await Promise.all([first, second]);
  assert.deepEqual(sent, ['first', 'newer']); assert.equal(maximum, 1);
  assert.equal(saved().pendingSync.cardIds.length, 0);
  assert.equal(saved().cards[0].termRichText, 'newer');
});

test('a cloud pull in one tab cannot overwrite another tab edit or deletion', async () => {
  const gate = deferred(); const entered = deferred(); let reads = 0;
  let server = seed.data();
  const { a, b, saved } = tabs({ fetchAllData: async () => {
    if (++reads === 1) { entered.resolve(); return gate.promise; }
    return server;
  }, commitChanges: async snapshot => { server = { folders: snapshot.folders, sets: snapshot.sets, cards: snapshot.cards }; } }, seed.snapshot());
  a.navigator.onLine = true;
  const sync = a.store.getState().initCloudSync(); await entered.promise;
  await b.store.getState().updateCard('c1', { termRichText: 'newer' });
  await b.store.getState().deleteCard('c2');
  gate.resolve(seed.data()); await sync;
  assert.equal(saved().cards.length, 1);
  assert.equal(saved().cards[0].termRichText, 'newer'); assert.equal(reads, 2);
});

test('failed local write preserves the other tab data and both existing pending work and inputs', async () => {
  const { a, b, saved } = tabs({}, seed.snapshot());
  const folder = await a.store.getState().addFolder('durable');
  b.localStorage.setItem = () => { throw Error('quota'); };
  await assert.rejects(b.store.getState().updateCard('c1', { termRichText: 'unsaved' }), /quota/);
  assert.equal(b.store.getState().cards[0].termRichText, 'old');
  assert.equal(saved().cards[0].termRichText, 'old');
  assert.deepEqual(saved().pendingSync.folderIds, [folder]);
});

test('queued mutation is cancelled on account switch before lock acquisition', async () => {
  const { a, b, saved } = tabs({}, seed.snapshot());
  const gate = deferred(); const entered = deferred();
  const hold = a.navigator.locks.request(`${key}:data`, async () => { entered.resolve(); await gate.promise; });
  await entered.promise;
  const pending = b.store.getState().addFolder('cancelled');
  b.store.getState().setUser({ uid: 'b' });
  gate.resolve(); await hold;
  await assert.rejects(pending, /계정/);
  assert.equal(saved().folders.length, 0); assert.equal(b.store.getState().folders.length, 0);
});

test('acknowledgement write failure keeps the outbox durable for idempotent retry', async () => {
  const gate = deferred(); const entered = deferred();
  const { a, saved } = tabs({ commitChanges: async () => { entered.resolve(); await gate.promise; } }, seed.snapshot());
  await a.store.getState().updateCard('c1', { termRichText: 'durable' });
  a.navigator.onLine = true;
  const sync = a.store.getState().flushPendingSync(); await entered.promise;
  a.localStorage.setItem = () => { throw Error('quota'); };
  gate.resolve(); await sync;
  assert.deepEqual(saved().pendingSync.cardIds, ['c1']);
  assert.equal(a.store.getState().syncStatus, 'error');
});

test('unsupported Web Locks reject writes explicitly without publishing or uploading', async () => {
  let uploads = 0;
  const h = createHarness({ commitChanges: async () => { uploads++; } });
  h.navigator.locks = undefined;
  h.store.getState().setUser({ uid: 'a' });
  await assert.rejects(h.store.getState().addFolder('unsupported'), /Web Locks/);
  await h.store.getState().initCloudSync();
  assert.equal(h.store.getState().folders.length, 0);
  assert.equal(h.storage.has(key), false); assert.equal(uploads, 0);
  assert.match(h.store.getState().storageError, /Web Locks/);
  assert.equal(h.store.getState().syncStatus, 'error');
});

test('an external refresh updates data without writing it back', async () => {
  const { a, b } = tabs({}, seed.snapshot());
  await a.store.getState().updateCard('c1', { termRichText: 'external' });
  b.localStorage.setItem = () => { throw Error('must not write'); };
  await b.store.getState().refreshAccount();
  assert.equal(b.store.getState().cards[0].termRichText, 'external');
  assert.equal(b.store.getState().storageError, null);
});

test('concurrent full editor saves merge independent cards and keep additions from both forms', async () => {
  const { a, b, saved } = tabs({}, seed.snapshot());
  const first = a.store.getState().cards.map(c => ({ ...c }));
  const second = b.store.getState().cards.map(c => ({ ...c }));
  first[0].termRichText = 'edit c1'; second[1].definitionRichText = 'edit c2';
  await Promise.all([
    a.store.getState().saveSetWithCards('s1', { title: 'set' }, [...first, { ...seed.card, termRichText: 'added a' }]),
    b.store.getState().saveSetWithCards('s1', { title: 'set' }, [...second, { ...seed.card, termRichText: 'added b' }]),
  ]);
  assert.equal(saved().cards.length, 4);
  assert.equal(saved().cards.find(c => c.id === 'c1').termRichText, 'edit c1');
  assert.equal(saved().cards.find(c => c.id === 'c2').definitionRichText, 'edit c2');
  assert.equal(saved().pendingSync.cardIds.length, 4);
});

test('editor base survives an external store refresh and does not overwrite untouched fields', async () => {
  const { a, b, saved } = tabs({}, seed.snapshot());
  const base = { set: b.store.getState().sets[0], cards: b.store.getState().cards };
  const form = base.cards.map(c => ({ ...c })); form[0].termRichText = 'my term';
  await a.store.getState().updateCard('c1', { definitionRichText: 'external definition' });
  await a.store.getState().updateSet('s1', { description: 'external description' });
  await b.store.getState().refreshAccount();
  await b.store.getState().saveSetWithCards('s1', { title: 'set', description: '' }, form, base);
  assert.equal(saved().cards[0].termRichText, 'my term');
  assert.equal(saved().cards[0].definitionRichText, 'external definition');
  assert.equal(saved().sets[0].description, 'external description');
});

test('deleting a card is not undone by a stale full editor save of another card', async () => {
  const { a, b, saved } = tabs({}, seed.snapshot());
  const form = b.store.getState().cards.map(c => ({ ...c })); form[0].termRichText = 'edit c1';
  await a.store.getState().deleteCard('c2');
  await b.store.getState().saveSetWithCards('s1', { title: 'set' }, form);
  assert.equal(saved().cards.length, 1); assert.equal(saved().cards[0].termRichText, 'edit c1');
  assert.ok(saved().pendingSync.deletedCardIds.includes('c2'));
});

test('an editor cannot resurrect a deleted set or silently drop edits to a deleted card', async () => {
  const { a, b, saved } = tabs({}, seed.snapshot());
  const form = b.store.getState().cards.map(c => ({ ...c })); form[0].termRichText = 'my edited card';
  await a.store.getState().deleteCard('c1');
  await assert.rejects(b.store.getState().saveSetWithCards('s1', { title: 'set' }, form), /삭제/);
  assert.equal(saved().cards.length, 1); assert.equal(b.store.getState().cards.length, 2);
  await a.store.getState().deleteSet('s1');
  await assert.rejects(b.store.getState().saveSetWithCards('s1', { title: 'set' }, form), /삭제/);
  assert.equal(saved().sets.length, 0);
});

test('a corrupt account is displayed as an error and never overwritten by a blank view', async () => {
  const storage = new Map([[key, '{corrupt']]);
  const h = createHarness({}, storage); h.navigator.onLine = false;
  h.store.getState().setUser({ uid: 'a' });
  assert.ok(h.store.getState().storageError);
  await assert.rejects(h.store.getState().addFolder('must not replace recovery data'));
  assert.equal(storage.get(key), '{corrupt');
  h.store.getState().setUser(null);
  assert.equal(h.store.getState().user, null);
});
