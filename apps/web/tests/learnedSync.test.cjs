const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed } = require('./support.cjs');
const { firestoreFixture, registerLearnedSyncTests, seedData } = require('../../../tests/learned-sync-fixture.cjs');
const { registerSetDeleteTests } = require('../../../tests/set-delete-sync-regressions.cjs');
const { registerAccountPullTests } = require('../../../tests/account-pull-regressions.cjs');

function fixture({ legacy = false, cachedImage = false, existingSet = false, legacySet = false } = {}) {
  const data = seedData(existingSet);
  const server = firestoreFixture(data);
  const snapshot = { ...seed.snapshot(), ...data };
  if (legacy) {
    snapshot.cards[2].termRichText = '<p>legacy queued edit</p>';
    snapshot.pendingSync = { ...snapshot.pendingSync, cardIds: ['c3'] };
    snapshot.pendingVersions = { 'cards:c3': 1 };
    snapshot.mutationRevision = 1;
  }
  if (legacySet) {
    snapshot.pendingSync = { ...snapshot.pendingSync, setIds: ['s2'] };
    snapshot.pendingVersions = { 'sets:s2': 1 };
    snapshot.mutationRevision = 1;
  }
  if (cachedImage) snapshot.cards[0].frontImageUrl = 'data:image/webp;base64,YWJj';
  const key = 'flashcards_account_v1:user:a';
  const storage = new Map([[key, JSON.stringify(snapshot)]]);
  const overrides = {
    [path.resolve(__dirname, '../src/services/flashcardService.ts')]: null,
    [path.resolve(__dirname, '../src/lib/firebase.ts')]: {
      db: {}, auth: { currentUser: { uid: 'a' } }, isFirebaseConfigured: true,
    },
    [path.resolve(__dirname, '../src/services/storageService.ts')]: {
      uploadDataImage: async () => { throw Error('unexpected image upload'); },
      extractAllFirebaseImageUrlsFromCard: () => [],
    },
    'firebase/firestore': server.sdk,
  };
  let h;
  const reload = () => {
    h = createHarness({}, storage, overrides);
    h.context.Date = Date;
    h.navigator.onLine = false;
    h.store.getState().setUser({ uid: 'a' });
  };
  reload();
  return {
    server, reload,
    createSet: async () => {
      const setId = await h.store.getState().addSet({ title: 'offline set' }, [seed.card, seed.card]);
      return { setId, cardIds: h.store.getState().cards.filter(card => card.setId === setId).map(card => card.id) };
    },
    renameSet: (id, title) => h.store.getState().updateSet(id, { title }),
    deleteSet: id => h.store.getState().deleteSet(id),
    queued: token => {
      const { pendingSync } = JSON.parse(storage.get(key));
      const [kind, id] = token.split(':');
      const [upserts, deletes] = kind === 'sets' ? ['setIds', 'deletedSetIds'] : ['cardIds', 'deletedCardIds'];
      const deleted = pendingSync[deletes].includes(id);
      if (deleted || pendingSync[upserts].includes(id)) return { state: pendingSync.writeStates?.[token], deleted };
    },
    rate: (id, learned) => h.store.getState().setCardLearned(id, learned),
    edit: (id, termRichText) => h.store.getState().updateCard(id, { termRichText }),
    editInSet: (id, termRichText) => {
      const state = h.store.getState();
      return state.saveSetWithCards('s1', { title: 'set' },
        state.cards.map(card => card.id === id ? { ...card, termRichText } : card));
    },
    create: (termRichText) => h.store.getState().addCard({ setId: 's1', termRichText, definitionRichText: '', learned: false }),
    connect: () => {
      h.navigator.onLine = true;
      return h.store.getState().initCloudSync();
    },
    flush: () => {
      h.navigator.onLine = true;
      return h.store.getState().flushPendingSync();
    },
    pending: (id) => h.store.getState().pendingSync.cardIds.includes(id),
    status: () => h.store.getState().syncStatus,
    error: () => h.store.getState().syncError,
    lastSyncedAt: () => h.store.getState().lastSyncedAt,
    durable: () => JSON.parse(storage.get(key)),
    cards: () => h.store.getState().cards,
  };
}

registerLearnedSyncTests(fixture);
registerAccountPullTests(fixture);
registerSetDeleteTests(fixture);

test('web progress-only sync refreshes stale cached data images without uploading the old card', async () => {
  const h = fixture({ cachedImage: true });
  h.server.cards.set('c1', { ...h.server.cards.get('c1'), termRichText: '<p>server edit</p>' });
  await h.rate('c1', true);
  await h.flush();
  assert.equal(h.status(), 'synced');
  assert.equal(h.pending('c1'), false);
  assert.equal(h.cards().find(card => card.id === 'c1').frontImageUrl, undefined);
  assert.equal(h.cards().find(card => card.id === 'c1').termRichText, '<p>server edit</p>');
  assert.deepEqual(h.server.writes.map(write => write.kind), ['update']);
});

test('pending count includes each write or delete once across queue versions', () => {
  const h = createHarness();
  const { countPending } = h.load(path.join(h.root, 'store/syncQueue.ts'));
  const legacy = { ...seed.snapshot().pendingSync, cardIds: ['c1'], deletedSetIds: ['s2'] };
  assert.equal(countPending(legacy), 2);
  assert.equal(countPending({ ...legacy, learnedOnlyCardIds: ['c1'], writeStates: { 'cards:c1': 'existing' } }), 2);
});
