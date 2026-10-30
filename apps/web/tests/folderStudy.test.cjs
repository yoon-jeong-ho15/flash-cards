const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { createHarness, seed } = require('./support.cjs');
const { hookRenderer } = require('./hookRenderer.cjs');

function folderSession() {
  const snapshot = seed.snapshot();
  snapshot.folders = ['f1', 'f2', 'empty'].map(id => ({ id, title: id, createdAt: 1 }));
  snapshot.decks = [
    { id: 'd1', folderId: 'f1', title: 'First', createdAt: 1, updatedAt: 1 },
    { id: 'd2', folderId: 'f1', title: 'Second', createdAt: 1, updatedAt: 1 },
    { id: 'd3', folderId: 'f2', title: 'Other', createdAt: 1, updatedAt: 1 },
    { id: 'root', title: 'Root', createdAt: 1, updatedAt: 1 },
  ];
  snapshot.cards = ['d1', 'd1', 'd2', 'd3', 'root', 'missing'].map((deckId, order) => ({
    ...seed.card, id: `c${order + 1}`, deckId, order, learned: order === 0,
  }));
  const storage = new Map([['flashcards_account_v1:guest', JSON.stringify(snapshot)]]);
  const h = createHarness({}, storage);
  h.navigator.onLine = false;
  const renderer = hookRenderer();
  const mockStore = Object.assign(selector => selector(h.store.getState()), { getState: h.store.getState });
  const loader = createHarness({}, storage, {
    react: renderer.react,
    [path.join(h.root, 'store/useFlashcardStore.ts')]: { useFlashcardStore: mockStore },
  });
  // A fixed random source makes exact shuffle/restart assertions reproducible.
  vm.runInContext('Math.random = () => 0', loader.context);
  const { useStudySession } = loader.load(path.join(h.root, 'hooks/useStudySession.ts'));
  const render = (options = { folderId: 'f1' }) =>
    renderer.render(() => useStudySession({ ...options, onExit() {} }));
  return { ...h, render, cleanup: renderer.cleanup };
}

const ids = cards => Array.from(cards, card => card.id);

test('folder study shuffles every card across its decks exactly once, including learned cards', () => {
  const h = folderSession();
  try {
    const session = h.render();
    assert.equal(session.folder.id, 'f1');
    assert.equal(session.isShuffle, true);
    assert.deepEqual(ids(session.sessionCards), ['c2', 'c3', 'c1']);
    assert.equal(session.totalInitialCount, 3);
    assert.equal(session.masteredCount, 1);
    assert.equal(session.remainingUnlearnedCount, 2);
    assert.equal(h.store.getState().cards[0].learned, true);
    assert.deepEqual(ids(h.store.getState().cards), ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
  } finally { h.cleanup(); }
});

test('folder progress and edits update the original deck without resetting the shuffled session', () => {
  const h = folderSession();
  try {
    let session = h.render();
    session.handleNext();
    session = h.render();
    assert.equal(session.currentCard.id, 'c3');
    session.handleToggleKnow();
    session.handleUpdateCurrentCard({ termRichText: 'edited', definitionRichText: 'new answer' });
    session = h.render();
    assert.equal(session.currentIndex, 1);
    assert.deepEqual(ids(session.sessionCards), ['c2', 'c3', 'c1']);
    const edited = h.store.getState().cards.find(card => card.id === 'c3');
    assert.equal(edited.deckId, 'd2');
    assert.equal(edited.learned, true);
    assert.equal(session.currentCard.termRichText, 'edited');
    assert.equal(session.remainingUnlearnedCount, 1);
    session.handleDeleteCurrentCard();
    session = h.render();
    assert.deepEqual(ids(session.sessionCards), ['c2', 'c1']);
    assert.equal(session.currentCard.id, 'c1');
    assert.equal(h.store.getState().cards.some(card => card.id === 'c3'), false);
    assert.equal(h.store.getState().cards.find(card => card.id === 'c4').deckId, 'd3');
  } finally { h.cleanup(); }
});

test('folder restarts filter unlearned cards or reshuffle all cards from the current folder', () => {
  const h = folderSession();
  try {
    let session = h.render();
    session.handleToggleKnow(); // c2
    session = h.render();
    session.handleRestartUnlearned();
    session = h.render();
    assert.deepEqual(ids(session.sessionCards), ['c3']);
    assert.equal(session.round, 2);
    session.handleNext();
    assert.equal(h.render().isFinishModalOpen, true);
    h.store.getState().moveDeck('d2', 'f2');
    session.handleRestartAll();
    session = h.render();
    assert.deepEqual(ids(session.sessionCards), ['c2', 'c1']);
    assert.equal(session.round, 1);
    assert.equal(session.isFinishModalOpen, false);
    assert.equal(session.remainingUnlearnedCount, 0);
  } finally { h.cleanup(); }
});

test('empty folders wait for cards and changing the folder initializes a fresh session', () => {
  const h = folderSession();
  try {
    assert.equal(h.render({ folderId: 'empty' }).sessionCards.length, 0);
    h.store.getState().moveDeck('d2', 'empty');
    assert.deepEqual(ids(h.render({ folderId: 'empty' }).sessionCards), ['c3']);
    const second = h.render({ folderId: 'f2' });
    assert.deepEqual(ids(second.sessionCards), ['c4']);
    assert.equal(second.currentIndex, 0);
    assert.equal(second.round, 1);
  } finally { h.cleanup(); }
});

test('deck study still starts with only that deck’s unlearned cards in order', () => {
  const h = folderSession();
  try {
    const session = h.render({ deckId: 'd1' });
    assert.equal(session.isShuffle, false);
    assert.deepEqual(ids(session.sessionCards), ['c2']);
    session.handleRestartAll();
    assert.deepEqual(ids(h.render({ deckId: 'd1' }).sessionCards), ['c1', 'c2']);
  } finally { h.cleanup(); }
});
