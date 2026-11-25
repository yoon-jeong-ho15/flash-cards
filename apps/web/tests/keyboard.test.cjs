const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed, tick } = require('./support.cjs');
const { hookRenderer } = require('./hookRenderer.cjs');

test('study shortcuts preserve native button activation, select inputs, and handled modal events', async () => {
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
    [path.join(h.root, 'store/useFlashcardStore.ts')]: {
      useFlashcardStore: mockStore,
    },
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
      target: {
        tagName,
        closest: (selector) => (tagName === 'BUTTON' && selector.includes('button') ? {} : null),
      },
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
    dispatch('ArrowRight', 'BUTTON', {
      target: { tagName: 'BUTTON', closest: (selector) => selector === '[role="dialog"]' ? {} : null },
    });
    assert.equal(render().currentIndex, 0, 'navigation dialogs must not change study cards');
    dispatch('Enter', 'DIV', { isComposing: true });
    assert.equal(h.store.getState().cards[0].learned, false, 'IME input must not trigger study');
    dispatch(' ', 'BUTTON');
    assert.equal(render().isFlipped, false, 'native button Space is preserved');
    dispatch(' ');
    assert.equal(render().isFlipped, true, 'Space flips the study card');
    dispatch('Enter');
    await tick();
    assert.equal(
      h.store.getState().cards[0].learned,
      true,
      'study Enter shortcut still marks the card'
    );
    dispatch('1', 'DIV', { preventDefault: () => assert.fail('1 must be ignored') });
    await tick();
    assert.equal(render().currentIndex, 0);
    assert.equal(h.store.getState().cards[0].learned, true);
    dispatch('ArrowRight');
    assert.equal(render().currentIndex, 1, 'study navigation shortcut still works');
    dispatch('2', 'DIV', { preventDefault: () => assert.fail('2 must be ignored') });
    await tick();
    assert.equal(render().isFinishModalOpen, false);
    assert.equal(h.store.getState().cards[1].learned, false);

    // Unused aliases are removed and modal Escape priority stays intact.
    const session = render();
    assert.equal('handleUnknown' in session, false);
    assert.equal('handleKnow' in session, false);

    dispatch('e');
    assert.equal(render().isEditModalOpen, true);
    render().openDeleteModal();
    render();
    dispatch('Escape');
    assert.equal(render().isDeleteModalOpen, false);
    assert.equal(render().isEditModalOpen, true);

    render().openFinishModal();
    render();
    dispatch('Escape');
    assert.equal(render().isFinishModalOpen, false);
    assert.equal(render().isEditModalOpen, true);

    dispatch('Escape');
    assert.equal(render().isEditModalOpen, false);
    dispatch('Escape');
    assert.equal(exits, 1);
  } finally {
    renderer.cleanup();
  }
});
