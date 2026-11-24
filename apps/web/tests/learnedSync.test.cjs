const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed } = require('./support.cjs');
const { firestoreFixture, registerLearnedSyncTests, seedData } = require('../../../tests/learned-sync-fixture.cjs');
const { registerDeckDeleteTests } = require('../../../tests/deck-delete-sync-regressions.cjs');
const { registerAccountPullTests } = require('../../../tests/account-pull-regressions.cjs');

function fixture({ legacy = false, cachedImage = false, existingDeck = false, legacyDeck = false } = {}) {
  const data = seedData(existingDeck);
  const server = firestoreFixture(data);
  const snapshot = { ...seed.snapshot(), ...data };
  if (legacy) {
    snapshot.cards[2].termRichText = '<p>legacy queued edit</p>';
    snapshot.pendingSync = { ...snapshot.pendingSync, cardIds: ['c3'] };
    snapshot.pendingVersions = { 'cards:c3': 1 };
    snapshot.mutationRevision = 1;
  }
  if (legacyDeck) {
    snapshot.pendingSync = { ...snapshot.pendingSync, deckIds: ['d2'] };
    snapshot.pendingVersions = { 'decks:d2': 1 };
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
    createDeck: async () => {
      const deckId = await h.store.getState().addDeck({ title: 'offline deck' }, [seed.card, seed.card]);
      return { deckId, cardIds: h.store.getState().cards.filter(card => card.deckId === deckId).map(card => card.id) };
    },
    renameDeck: (id, title) => h.store.getState().updateDeck(id, { title }),
    deleteDeck: id => h.store.getState().deleteDeck(id),
    queued: token => {
      const { pendingSync } = JSON.parse(storage.get(key));
      const [kind, id] = token.split(':');
      const [upserts, deletes] = kind === 'decks' ? ['deckIds', 'deletedDeckIds'] : ['cardIds', 'deletedCardIds'];
      const deleted = pendingSync[deletes].includes(id);
      if (deleted || pendingSync[upserts].includes(id)) return { state: pendingSync.writeStates?.[token], deleted };
    },
    rate: (id, learned) => h.store.getState().setCardLearned(id, learned),
    edit: (id, termRichText) => h.store.getState().updateCard(id, { termRichText }),
    editInDeck: (id, termRichText) => {
      const state = h.store.getState();
      return state.saveDeckWithCards('d1', { title: 'deck' },
        state.cards.map(card => card.id === id ? { ...card, termRichText } : card));
    },
    create: (termRichText) => h.store.getState().addCard({ deckId: 'd1', termRichText, definitionRichText: '', learned: false }),
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
registerDeckDeleteTests(fixture);

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
