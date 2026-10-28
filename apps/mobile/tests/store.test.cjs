const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, item, deferred, tick, user, accountKey, emptySnapshot } = require('./helpers.cjs');

test('failed device persistence publishes no data or outbox, and a retry succeeds', async () => {
  const { store, storage, map } = harness(); await store.switchUser(null);
  const before = store.getState();
  const original = storage.setItem; storage.setItem = async () => { throw Error('disk full'); };
  await assert.rejects(store.saveDeck(undefined, { title: '덱' }, [item()]), /disk full/);
  assert.equal(store.getState().decks, before.decks); assert.equal(store.getState().outbox, before.outbox);
  assert.equal(map.size, 0);
  storage.setItem = original; await store.saveDeck(undefined, { title: '덱' }, [item()]);
  const saved = JSON.parse(map.get(accountKey()));
  assert.equal(saved.decks.length, 1); assert.equal(saved.cards.length, 1); assert.equal(Object.keys(saved.outbox).length, 2);
  assert.equal('user' in saved, false); assert.equal('session' in saved, false); assert.equal('online' in saved, false);
});
test('guest and each signed-in account retain independent durable data, preferences, and outboxes', async () => {
  const { store, map } = harness(); await store.switchUser(null);
  await store.saveDeck(undefined, { title: 'guest' }, [item()]);
  await store.switchUser(user('a')); await store.saveDeck(undefined, { title: 'A' }, [item()]);
  await store.setPreferences({ lastStudiedDeckId: 'A', deckSort: 'name-asc' });
  await store.switchUser(user('b')); assert.equal(store.getState().decks.length, 0);
  await store.saveDeck(undefined, { title: 'B' }, [item()]);
  await store.switchUser(null); assert.equal(store.getState().decks[0].title, 'guest');
  const restarted = harness({}, map).store; await restarted.switchUser(user('a'));
  assert.equal(restarted.getState().decks[0].title, 'A');
  assert.equal(restarted.getState().preferences.deckSort, 'name-asc'); assert.equal(Object.keys(restarted.getState().outbox).length, 2);
});
test('folder deletion retains deck/card IDs and learned progress, then deck deletion enqueues tombstones', async () => {
  const { store } = harness(); await store.switchUser(null);
  const folderId = await store.saveFolder(undefined, '폴더', '');
  const deckId = await store.saveDeck(undefined, { title: '덱', folderId }, [item()]);
  const cardId = store.getState().cards[0].id; await store.setLearned(cardId, true);
  await store.deleteFolder(folderId);
  assert.equal(store.getState().decks[0].folderId, null); assert.equal(store.getState().cards[0].learned, true);
  assert.equal(store.getState().cards[0].id, cardId);
  await store.deleteDeck(deckId); assert.equal(store.getState().cards.length, 0);
  assert.equal(store.getState().outbox[`cards:${cardId}`].deleted, true);
  assert.equal(store.getState().outbox[`decks:${deckId}`].deleted, true);
});
test('saving card order preserves current learned state and legacy images, while removing empty cards', async () => {
  const { store } = harness(); await store.switchUser(null);
  const id = await store.saveDeck(undefined, { title: '덱' }, [item('A'), item('B')]);
  const [a,b] = store.getState().cards; await store.setLearned(a.id, true);
  await store.saveDeck(id, { title: '수정' }, [b, { ...a, learned: false }, { termRichText: '<p>&nbsp;\u200b</p>', definitionRichText: '' }, { termRichText: '', definitionRichText: '', imageUrl: 'https://example.com/photo.jpg' }]);
  const cards = store.getState().cards;
  assert.deepEqual(cards.map(c => c.order), [0,1,2]); assert.equal(cards[0].id, b.id); assert.equal(cards[1].learned, true);
  assert.equal(cards[2].backImageUrl, 'https://example.com/photo.jpg');
  await assert.rejects(store.saveDeck(id, { title: '덱', folderId: 'missing' }, [item()]), /폴더가 삭제/);
});
test('async concurrent mutations are serialized instead of overwriting one another', async () => {
  const { store } = harness(); await store.switchUser(null);
  await Promise.all(Array.from({ length: 20 }, (_, i) => store.saveFolder(undefined, `폴더 ${i}`, '')));
  assert.equal(store.getState().folders.length, 20); assert.equal(Object.keys(store.getState().outbox).length, 20);
});
test('an acknowledgement cannot clear a newer edit made while a push is in flight', async () => {
  const started = deferred(), release = deferred(); const sent = [];
  const { store, cloud } = harness({ push: async (_, snapshot) => { sent.push(snapshot); if (sent.length === 1) { started.resolve(); await release.promise; } } });
  await store.switchUser(user('a')); const id = await store.saveDeck(undefined, { title: '덱' }, [item()]);
  cloud.pull = async () => ({ folders: store.getState().folders, decks: store.getState().decks, cards: store.getState().cards });
  cloud.available = true; const work = store.sync(false); await started.promise;
  const card = store.getState().cards[0]; await store.setLearned(card.id, true);
  release.resolve(); await work;
  assert.equal(sent.length, 2); assert.equal(sent[0].cards[0].learned, false); assert.equal(sent[1].cards[0].learned, true);
  assert.equal(Object.keys(store.getState().outbox).length, 0); assert.equal(store.getState().decks[0].id, id);
});
test('a cloud read racing a local deletion is discarded and re-read after the delete is pushed', async () => {
  const began = deferred(), release = deferred(); let reads = 0; let server;
  const { store, cloud } = harness({
    push: async (_, value) => { server = { folders: value.folders, decks: value.decks, cards: value.cards }; },
    pull: async () => { reads++; const captured = server; if (reads === 1) { began.resolve(); await release.promise; } return captured; },
  });
  await store.switchUser(user('a')); const id = await store.saveDeck(undefined, { title: '덱' }, [item()]);
  cloud.available = true; const work = store.sync(); await began.promise; await store.deleteDeck(id); release.resolve(); await work;
  assert.equal(reads, 2); assert.equal(store.getState().decks.length, 0); assert.equal(store.getState().cards.length, 0);
});
test('a delayed old-account response cannot replace the new account cache', async () => {
  const began = deferred(), release = deferred();
  const map = new Map([[accountKey('b'), JSON.stringify({ ...emptySnapshot(), decks: [{ id: 'b-deck', title: 'B', createdAt: 0, updatedAt: 0 }] })]]);
  const { store, cloud } = harness({ pull: async uid => {
    if (uid === 'a') { began.resolve(); await release.promise; return { folders: [], decks: [{ id: 'a-deck', title: 'A', createdAt: 0, updatedAt: 0 }], cards: [] }; }
    cloud.available = false; return { folders: [], decks: store.getState().decks, cards: [] };
  } }, map);
  await store.switchUser(user('a')); cloud.available = true; const work = store.sync(); await began.promise;
  await store.switchUser(user('b')); release.resolve(); await work; await tick(); await store.sync(false);
  assert.equal(store.getState().user.uid, 'b'); assert.equal(store.getState().decks[0].id, 'b-deck');
  assert.equal(JSON.parse(map.get(accountKey('b'))).decks[0].id, 'b-deck');
});
test('network failure keeps the durable queue and a reconnect retries successfully', async () => {
  const { store, cloud, map } = harness({ push: async () => { throw Error('network'); } });
  await store.switchUser(user('a')); await store.saveDeck(undefined, { title: '덱' }, [item()]);
  cloud.available = true; await store.sync(false); assert.equal(store.getState().status, 'error');
  assert.equal(Object.keys(JSON.parse(map.get(accountKey('a'))).outbox).length, 2);
  cloud.push = async () => {}; cloud.pull = async () => ({ folders: [], decks: store.getState().decks, cards: store.getState().cards });
  store.setOnline(false); store.setOnline(true); await store.sync();
  assert.equal(store.getState().status, 'synced'); assert.equal(Object.keys(store.getState().outbox).length, 0);
});
test('draft keys isolate accounts and different new-deck target folders; remove follows in-flight write', async () => {
  const { store, map } = harness(); await store.switchUser(null);
  const guestKey = store.draftKey(undefined, 'folder1');
  assert.notEqual(guestKey, store.draftKey(undefined, 'folder2'));
  const draft = { title: 'draft', description: '', folderId: null, cards: [item()], savedAt: 1 };
  await Promise.all([store.writeDraft(guestKey, draft), store.removeDraft(guestKey)]); assert.equal(await store.readDraft(guestKey), null);
  await store.writeDraft(guestKey, draft); await store.switchUser(user('a'));
  assert.notEqual(store.draftKey(undefined, 'folder1'), guestKey); assert.equal(await store.readDraft(store.draftKey()), null);
  assert.equal(map.get(guestKey), JSON.stringify(draft));
});
test('a corrupted account snapshot fails closed without replacing recovery data', async () => {
  const map = new Map([[accountKey(), '{invalid json']]); const { store } = harness({}, map);
  await assert.rejects(store.switchUser(null)); assert.equal(store.getState().ready, false); assert.equal(map.get(accountKey()), '{invalid json');
});
test('loading a cache cannot restore stale session, user, or connectivity metadata', async () => {
  const map = new Map([[accountKey('a'), JSON.stringify({ ...emptySnapshot(), session: 999, online: true, user: user('wrong') })]]);
  const { store } = harness({}, map); store.setOnline(false); await store.switchUser(user('a'));
  assert.equal(store.getState().session, 1); assert.equal(store.getState().user.uid, 'a'); assert.equal(store.getState().online, false);
  await store.saveFolder(undefined, 'A', ''); await store.switchUser(null); await store.switchUser(user('a'));
  assert.equal(store.getState().session, 3);
});
