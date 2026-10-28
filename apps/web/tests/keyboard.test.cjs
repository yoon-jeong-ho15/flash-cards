const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed } = require('./support.cjs');
const { hookRenderer } = require('./hookRenderer.cjs');

test('study shortcuts preserve native button activation, select inputs, and handled modal events', () => {
  const h = createHarness();
  h.navigator.onLine = false;
  const snapshot = seed.snapshot();
  snapshot.cards.forEach((card) => {
    card.learned = false;
  });
  h.storage.set('flashcards_account_v1:user:keyboard', JSON.stringify(snapshot));
  h.store.getState().setUser({ uid: 'keyboard' });
  const renderer = hookRenderer();
  const mockStore = Object.assign((selector) => selector(h.store.getState()), {
    getState: h.store.getState,
  });
  const loader = createHarness({}, h.storage, {
    react: renderer.react,
    [path.join(h.root, 'store/useFlashcardStore.ts')]: { useFlashcardStore: mockStore },
  });
  let keydown;
  loader.window.addEventListener = (type, listener) => {
    if (type === 'keydown') keydown = listener;
  };
  loader.window.removeEventListener = () => {};
  const { useStudySession } = loader.load(path.join(h.root, 'hooks/useStudySession.ts'));
  let exits = 0;
  const onExit = () => {
    exits++;
  };
  const render = () => renderer.render(() => useStudySession({ deckId: 'd1', onExit }));
  const dispatch = (key, tagName = 'DIV', extra = {}) =>
    keydown({
      key,
      target: { tagName, closest: () => (tagName === 'BUTTON' ? {} : null) },
      preventDefault() {},
      ...extra,
    });
  try {
    render();
    dispatch('Enter', 'BUTTON');
    assert.equal(
      h.store.getState().cards[0].learned,
      false,
      'button Enter must not also toggle learned'
    );
    dispatch('ArrowRight', 'SELECT');
    assert.equal(render().currentIndex, 0, 'select arrow keys must not change cards');
    dispatch('Escape', 'DIV', { defaultPrevented: true });
    assert.equal(exits, 0, 'Escape already handled by a dialog must not exit study');
    dispatch('Enter', 'DIV', { isComposing: true });
    assert.equal(h.store.getState().cards[0].learned, false, 'IME input must not trigger study');
    dispatch('Enter');
    assert.equal(
      h.store.getState().cards[0].learned,
      true,
      'study Enter shortcut still marks the card'
    );
    dispatch('ArrowRight');
    assert.equal(render().currentIndex, 1, 'study navigation shortcut still works');
  } finally {
    renderer.cleanup();
  }
});
