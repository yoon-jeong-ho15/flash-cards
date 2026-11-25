const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, seed, deferred, tick } = require('./support.cjs');

test('failed writes remain durable and retry successfully', async () => {
  let fail = true;
  const h = createHarness({ commitChanges: async () => { if (fail) throw Error('network'); } });
  h.store.getState().setUser({ uid: 'a' });
  const id = await h.store.getState().addSet({ title: 'set' }, [seed.card]);
  await h.store.getState().flushPendingSync();
  assert.equal(h.store.getState().syncStatus, 'error');
  assert.ok(h.store.getState().pendingSync.setIds.includes(id));
  const reloaded = createHarness({}, h.storage);
  reloaded.store.getState().setUser({ uid: 'a' });
  assert.ok(reloaded.store.getState().pendingSync.setIds.includes(id));
  fail = false;
  await h.store.getState().flushPendingSync();
  assert.equal(h.store.getState().pendingSync.setIds.length, 0);
});

test('offline set replacement queues removed cards and progress reset', async () => {
  const h = createHarness();
  h.store.getState().setUser({ uid: 'a' });
  const id = await h.store.getState().addSet({ title: 'set' }, [seed.card, seed.card]);
  await h.store.getState().flushPendingSync();
  h.navigator.onLine = false;
  const [first, second] = h.store.getState().cards;
  await h.store.getState().saveSetWithCards(id, { title: 'set' }, [first]);
  assert.ok(h.store.getState().pendingSync.deletedCardIds.includes(second.id));
  assert.ok(!h.store.getState().pendingSync.cardIds.includes(second.id));
  await h.store.getState().resetSetProgress(id);
  assert.equal(h.store.getState().cards[0].learned, false);
  assert.ok(h.store.getState().pendingSync.cardIds.includes(first.id));
});

test('folder deletion queues set detachment and cascading deletes', async () => {
  const h = createHarness();
  h.store.getState().setUser({ uid: 'a' });
  const folderId = await h.store.getState().addFolder('folder');
  const setId = await h.store.getState().addSet({ title: 'set', folderId }, [seed.card]);
  await h.store.getState().flushPendingSync();
  h.navigator.onLine = false;
  await h.store.getState().deleteFolder(folderId);
  assert.equal(h.store.getState().sets[0].folderId, null);
  assert.ok(h.store.getState().pendingSync.setIds.includes(setId));
  const second = await h.store.getState().addFolder('second');
  await h.store.getState().moveSet(setId, second);
  await h.store.getState().deleteFolder(second, true);
  assert.equal(h.store.getState().cards.length, 0);
  assert.ok(h.store.getState().pendingSync.deletedSetIds.includes(setId));
  assert.equal(h.store.getState().pendingSync.cardIds.length, 0);
});

test('an edit during a write is sent again, with one writer at a time', async () => {
  const gate = deferred(); const sent = []; let concurrent = 0; let maximum = 0;
  const h = createHarness({ commitChanges: async snapshot => {
    concurrent++; maximum = Math.max(maximum, concurrent);
    sent.push(snapshot.sets[0].title);
    if (sent.length === 1) await gate.promise;
    concurrent--;
  } });
  h.store.getState().setUser({ uid: 'a' });
  const id = await h.store.getState().addSet({ title: 'first' });
  await tick();
  await h.store.getState().updateSet(id, { title: 'second' });
  gate.resolve();
  await h.store.getState().flushPendingSync();
  assert.deepEqual(sent, ['first', 'second']);
  assert.equal(maximum, 1);
  assert.equal(h.store.getState().pendingSync.setIds.length, 0);
});

test('edits and deletes during a pull invalidate the stale result', async () => {
  const gate = deferred(); let reads = 0; let server = seed.data();
  const h = createHarness({ fetchAllData: async () => ++reads === 1 ? gate.promise : server,
    commitChanges: async snapshot => { server = { folders: snapshot.folders, sets: snapshot.sets, cards: snapshot.cards }; } });
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
  await h.store.getState().addSet({ title: 'private' });
  h.store.getState().setUser(null);
  gate.resolve(seed.data()); await sync;
  assert.equal(h.store.getState().sets.length, 0);
  h.store.getState().setUser({ uid: 'b' });
  assert.equal(h.store.getState().sets.length, 0);
  h.store.getState().setUser({ uid: 'a' });
  assert.equal(h.store.getState().sets[0].title, 'private');
  assert.equal(h.store.getState().pendingSync.setIds.length, 1);
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
  await assert.rejects(h.store.getState().addSet({ title: 'unsaved' }), /quota/);
  await tick();
  assert.equal(h.store.getState().sets.length, 0);
  assert.equal(writes, 0);
});

function createMultiAccountCloudHarness(beforeBatch = async () => {}) {
  const path = require('node:path');
  const auth = { currentUser: { uid: 'a' } };
  const collections = {
    flashcard_folders: new Map([['f1', { id: 'f1', userId: 'a', title: 'folder', createdAt: 1 }]]),
    flashcard_sets: new Map([
      ['s1', { id: 's1', userId: 'a', folderId: 'f1', title: 'set A', createdAt: 1, updatedAt: 1 }],
      ['bs1', { id: 'bs1', userId: 'b', folderId: null, title: 'set B', createdAt: 1, updatedAt: 1 }],
    ]),
    flashcard_cards: new Map([
      ['c1', { id: 'c1', userId: 'a', setId: 's1', order: 0, termRichText: 'original A', definitionRichText: 'answer A', learned: false, contentVersion: 'v0' }],
      ['bc1', { id: 'bc1', userId: 'b', setId: 'bs1', order: 0, termRichText: 'original B', definitionRichText: 'answer B', learned: false, contentVersion: 'bv0' }],
    ]),
  };
  const writes = [];
  const firestore = {
    doc: (_db, name, id) => ({ name, id }),
    collection: (_db, name) => name,
    documentId: () => '__name__',
    where: (field, operator, value) => {
      assert.equal(operator, '==');
      return { field, value };
    },
    query: (name, ...filters) => ({ name, filters }),
    getDocsFromServer: async ({ name, filters }) => {
      const docs = Array.from(collections[name], ([id, data]) => ({ id, data }))
        .filter(({ id, data }) => filters.every(({ field, value }) => (field === '__name__' ? id : data[field]) === value))
        .map(({ id, data }) => ({ id, data: () => ({ ...data }) }));
      return { docs, empty: docs.length === 0 };
    },
    updateDoc: async ({ name, id }, data) => {
      writes.push({ kind: 'update', name, id, data: { ...data } });
      collections[name].set(id, { ...collections[name].get(id), ...data });
    },
    deleteDoc: async ({ name, id }) => {
      writes.push({ kind: 'delete', name, id });
      collections[name].delete(id);
    },
    writeBatch: () => {
      const entries = [];
      return {
        set: ({ name, id }, data) => entries.push({ kind: 'set', name, id, data: { ...data } }),
        delete: ({ name, id }) => entries.push({ kind: 'delete', name, id }),
        commit: async () => {
          await beforeBatch(entries);
          for (const entry of entries) {
            writes.push(entry);
            const { kind, name, id, data } = entry;
            if (kind === 'delete') collections[name].delete(id);
            else collections[name].set(id, { ...collections[name].get(id), ...data });
          }
        },
      };
    },
  };
  const storage = new Map([
    ['flashcards_account_v1:user:a', JSON.stringify({
      folders: [collections.flashcard_folders.get('f1')],
      sets: [collections.flashcard_sets.get('s1')],
      cards: [collections.flashcard_cards.get('c1')],
      pendingSync: seed.snapshot().pendingSync,
      pendingVersions: {},
      mutationRevision: 0,
      cardConflicts: {},
    })],
    ['flashcards_account_v1:user:b', JSON.stringify({
      folders: [],
      sets: [collections.flashcard_sets.get('bs1')],
      cards: [{ ...collections.flashcard_cards.get('bc1'), termRichText: 'pending B' }],
      pendingSync: { ...seed.snapshot().pendingSync, cardIds: ['bc1'], writeStates: { 'cards:bc1': 'existing' } },
      pendingVersions: { 'cards:bc1': 1 },
      mutationRevision: 1,
      cardConflicts: {},
    })],
  ]);
  const h = createHarness({}, storage, {
    [path.resolve(__dirname, '../src/services/flashcardService.ts')]: null,
    [path.resolve(__dirname, '../src/lib/firebase.ts')]: { db: {}, auth, isFirebaseConfigured: true },
    [path.resolve(__dirname, '../src/services/storageService.ts')]: {
      uploadDataImage: async () => { throw Error('unexpected upload'); },
      extractAllFirebaseImageUrlsFromCard: () => [],
      deleteImagesByUrls: async () => {},
    },
    'firebase/firestore': firestore,
  });
  return { h, auth, collections, writes, storage };
}

test('write acknowledgement after logout and switching to B clears A queue without touching B or overwriting later remote edits', async () => {
  const entered = deferred();
  const gate = deferred();
  const { h, auth, collections, writes, storage } = createMultiAccountCloudHarness(async entries => {
    if (entries.some(entry => entry.id === 'c1')) {
      entered.resolve();
      await gate.promise;
    }
  });
  h.store.getState().setUser({ uid: 'a' });
  await h.store.getState().updateCard('c1', { termRichText: 'edited by A' });
  const syncA = h.store.getState().flushPendingSync();
  await entered.promise;

  auth.currentUser = null;
  h.store.getState().setUser(null);
  auth.currentUser = { uid: 'b' };
  h.store.getState().setUser({ uid: 'b' });
  const bStateBefore = {
    sets: h.store.getState().sets,
    cards: h.store.getState().cards,
    pendingSync: h.store.getState().pendingSync,
    pendingVersions: h.store.getState().pendingVersions,
    syncStatus: h.store.getState().syncStatus,
    syncError: h.store.getState().syncError,
  };
  const bDurableBefore = storage.get('flashcards_account_v1:user:b');

  gate.resolve();
  await syncA;

  assert.equal(h.store.getState().user.uid, 'b');
  assert.deepEqual({
    sets: h.store.getState().sets,
    cards: h.store.getState().cards,
    pendingSync: h.store.getState().pendingSync,
    pendingVersions: h.store.getState().pendingVersions,
    syncStatus: h.store.getState().syncStatus,
    syncError: h.store.getState().syncError,
  }, bStateBefore);
  assert.equal(storage.get('flashcards_account_v1:user:b'), bDurableBefore);

  const durableA = JSON.parse(storage.get('flashcards_account_v1:user:a'));
  assert.deepEqual(durableA.pendingSync.cardIds, []);
  const versionFromA = collections.flashcard_cards.get('c1').contentVersion;
  assert.equal(durableA.cards[0].contentVersion, versionFromA);

  collections.flashcard_cards.set('c1', {
    ...collections.flashcard_cards.get('c1'),
    termRichText: 'edited by other device',
    contentVersion: 'v2-other-device',
  });
  const writesBeforeRelogin = writes.length;

  auth.currentUser = null;
  h.store.getState().setUser(null);
  auth.currentUser = { uid: 'a' };
  h.store.getState().setUser({ uid: 'a' });
  await h.store.getState().initCloudSync();
  await h.store.getState().initCloudSync();

  assert.equal(writes.length, writesBeforeRelogin);
  assert.equal(collections.flashcard_cards.get('c1').termRichText, 'edited by other device');
  assert.equal(h.store.getState().cards.find(c => c.id === 'c1').termRichText, 'edited by other device');
  assert.equal(JSON.parse(storage.get('flashcards_account_v1:user:a')).cards[0].termRichText, 'edited by other device');
});

test('first write acknowledgement arriving after A relogs in and makes a newer edit keeps the newer edit queued and sends it', async () => {
  const firstEntered = deferred();
  const firstGate = deferred();
  const secondEntered = deferred();
  const secondGate = deferred();
  let batchCount = 0;
  const { h, auth, collections, writes, storage } = createMultiAccountCloudHarness(async entries => {
    if (!entries.some(entry => entry.id === 'c1')) return;
    batchCount++;
    if (batchCount === 1) {
      firstEntered.resolve();
      await firstGate.promise;
    } else {
      secondEntered.resolve();
      await secondGate.promise;
    }
  });
  h.store.getState().setUser({ uid: 'a' });
  await h.store.getState().updateCard('c1', { termRichText: 'first edit' });
  const sync1 = h.store.getState().flushPendingSync();
  await firstEntered.promise;

  auth.currentUser = null;
  h.store.getState().setUser(null);
  auth.currentUser = { uid: 'a' };
  h.store.getState().setUser({ uid: 'a' });
  h.store.getState().initCloudSync();
  await h.store.getState().updateCard('c1', { termRichText: 'second edit' });

  firstGate.resolve();
  await sync1;
  await secondEntered.promise;

  const cardWrites = () => writes.filter(write => write.id === 'c1');
  const firstWriteVersion = cardWrites()[0].data.contentVersion;
  assert.equal(cardWrites()[0].data.termRichText, 'first edit');
  assert.ok(h.store.getState().pendingSync.cardIds.includes('c1'));
  assert.equal(h.store.getState().cards.find(c => c.id === 'c1').termRichText, 'second edit');
  assert.equal(h.store.getState().cards.find(c => c.id === 'c1').contentVersion, firstWriteVersion);
  const durableMid = JSON.parse(storage.get('flashcards_account_v1:user:a'));
  assert.deepEqual(durableMid.pendingSync.cardIds, ['c1']);
  assert.equal(durableMid.pendingVersions['cards:c1'], 2);

  secondGate.resolve();
  await h.store.getState().flushPendingSync();

  assert.equal(batchCount, 2);
  assert.equal(collections.flashcard_cards.get('c1').termRichText, 'second edit');
  assert.equal(cardWrites()[1].data.baseContentVersion, firstWriteVersion);
  assert.equal(h.store.getState().pendingSync.cardIds.length, 0);
  assert.deepEqual(JSON.parse(storage.get('flashcards_account_v1:user:a')).pendingSync.cardIds, []);
  assert.equal(h.store.getState().syncStatus, 'synced');
});

test('failed write after logout leaves the original account queue intact', async () => {
  const entered = deferred();
  const gate = deferred();
  const { h, auth, storage } = createMultiAccountCloudHarness(async () => {
    entered.resolve();
    await gate.promise;
    throw Object.assign(Error('network failure'), { code: 'unavailable' });
  });
  h.store.getState().setUser({ uid: 'a' });
  await h.store.getState().updateCard('c1', { termRichText: 'failed edit' });
  const syncA = h.store.getState().flushPendingSync();
  await entered.promise;

  auth.currentUser = null;
  h.store.getState().setUser(null);
  auth.currentUser = { uid: 'b' };
  h.store.getState().setUser({ uid: 'b' });

  gate.resolve();
  await syncA;

  const durableA = JSON.parse(storage.get('flashcards_account_v1:user:a'));
  assert.deepEqual(durableA.pendingSync.cardIds, ['c1']);
  assert.equal(h.store.getState().syncStatus, 'offline');
});
