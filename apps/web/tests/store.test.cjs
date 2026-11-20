const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, seed, deferred, tick } = require('./support.cjs');

test('failed writes remain durable and retry successfully', async () => {
  let fail = true;
  const h = createHarness({ commitChanges: async () => { if (fail) throw Error('network'); } });
  h.store.getState().setUser({ uid: 'a' });
  const id = await h.store.getState().addDeck({ title: 'deck' }, [seed.card]);
  await h.store.getState().flushPendingSync();
  assert.equal(h.store.getState().syncStatus, 'error');
  assert.ok(h.store.getState().pendingSync.deckIds.includes(id));
  const reloaded = createHarness({}, h.storage);
  reloaded.store.getState().setUser({ uid: 'a' });
  assert.ok(reloaded.store.getState().pendingSync.deckIds.includes(id));
  fail = false;
  await h.store.getState().flushPendingSync();
  assert.equal(h.store.getState().pendingSync.deckIds.length, 0);
});

test('offline deck replacement queues removed cards and progress reset', async () => {
  const h = createHarness(); h.navigator.onLine = false;
  h.store.getState().setUser({ uid: 'a' });
  const id = await h.store.getState().addDeck({ title: 'deck' }, [seed.card, seed.card]);
  const [first, second] = h.store.getState().cards;
  await h.store.getState().saveDeckWithCards(id, { title: 'deck' }, [first]);
  assert.ok(h.store.getState().pendingSync.deletedCardIds.includes(second.id));
  assert.ok(!h.store.getState().pendingSync.cardIds.includes(second.id));
  await h.store.getState().resetDeckProgress(id);
  assert.equal(h.store.getState().cards[0].learned, false);
  assert.ok(h.store.getState().pendingSync.cardIds.includes(first.id));
});

test('folder deletion queues deck detachment and cascading deletes', async () => {
  const h = createHarness(); h.navigator.onLine = false;
  const folderId = await h.store.getState().addFolder('folder');
  const deckId = await h.store.getState().addDeck({ title: 'deck', folderId }, [seed.card]);
  await h.store.getState().deleteFolder(folderId);
  assert.equal(h.store.getState().decks[0].folderId, null);
  assert.ok(h.store.getState().pendingSync.deckIds.includes(deckId));
  const second = await h.store.getState().addFolder('second');
  await h.store.getState().moveDeck(deckId, second);
  await h.store.getState().deleteFolder(second, true);
  assert.equal(h.store.getState().cards.length, 0);
  assert.ok(h.store.getState().pendingSync.deletedDeckIds.includes(deckId));
  assert.equal(h.store.getState().pendingSync.cardIds.length, 0);
});

test('an edit during a write is sent again, with one writer at a time', async () => {
  const gate = deferred(); const sent = []; let concurrent = 0; let maximum = 0;
  const h = createHarness({ commitChanges: async snapshot => {
    concurrent++; maximum = Math.max(maximum, concurrent);
    sent.push(snapshot.decks[0].title);
    if (sent.length === 1) await gate.promise;
    concurrent--;
  } });
  h.store.getState().setUser({ uid: 'a' });
  const id = await h.store.getState().addDeck({ title: 'first' });
  await tick();
  await h.store.getState().updateDeck(id, { title: 'second' });
  gate.resolve();
  await h.store.getState().flushPendingSync();
  assert.deepEqual(sent, ['first', 'second']);
  assert.equal(maximum, 1);
  assert.equal(h.store.getState().pendingSync.deckIds.length, 0);
});

test('edits and deletes during a pull invalidate the stale result', async () => {
  const gate = deferred(); let reads = 0; let server = seed.data();
  const h = createHarness({ fetchAllData: async () => ++reads === 1 ? gate.promise : server,
    commitChanges: async snapshot => { server = { folders: snapshot.folders, decks: snapshot.decks, cards: snapshot.cards }; } });
  h.storage.set('flashcards_account_v1:user:a', JSON.stringify(seed.snapshot()));
  h.store.getState().setUser({ uid: 'a' });
  const sync = h.store.getState().initCloudSync(); await tick();
  await h.store.getState().updateCard('c1', { termRichText: 'new' });
  await h.store.getState().deleteCard('c2');
  gate.resolve(seed.data()); await sync;
  assert.equal(h.store.getState().cards.length, 1);
  assert.equal(h.store.getState().cards[0].termRichText, 'new');
  assert.equal(reads, 2);
});

test('logout invalidates old reads and preserves the original account outbox', async () => {
  const gate = deferred();
  const h = createHarness({ fetchAllData: () => gate.promise });
  h.store.getState().setUser({ uid: 'a' });
  const sync = h.store.getState().initCloudSync(); await tick();
  h.navigator.onLine = false;
  await h.store.getState().addDeck({ title: 'private' });
  h.store.getState().setUser(null);
  gate.resolve(seed.data()); await sync;
  assert.equal(h.store.getState().decks.length, 0);
  h.store.getState().setUser({ uid: 'b' });
  assert.equal(h.store.getState().decks.length, 0);
  h.store.getState().setUser({ uid: 'a' });
  assert.equal(h.store.getState().decks[0].title, 'private');
  assert.equal(h.store.getState().pendingSync.deckIds.length, 1);
});

test('legacy cache is loaded only for its owner', async () => {
  const storage = new Map([['quizlet_flashcards_v1', JSON.stringify({state:{...seed.snapshot(), user:{uid:'a'}}})]]);
  const h = createHarness({}, storage);
  assert.equal(h.store.getState().cards.length, 0);
  h.store.getState().setUser({ uid: 'b' });
  assert.equal(h.store.getState().cards.length, 0);
  h.store.getState().setUser({ uid: 'a' });
  assert.equal(h.store.getState().cards.length, 2);
  assert.ok(storage.has('quizlet_flashcards_v1'));
});

test('local persistence failure does not publish or upload an unsaved mutation', async () => {
  let writes = 0;
  const h = createHarness({ commitChanges: async () => { writes++; } });
  h.store.getState().setUser({ uid: 'a' });
  h.localStorage.setItem = () => { throw Error('quota'); };
  await assert.rejects(h.store.getState().addDeck({ title: 'unsaved' }), /quota/);
  await tick();
  assert.equal(h.store.getState().decks.length, 0);
  assert.equal(writes, 0);
});
