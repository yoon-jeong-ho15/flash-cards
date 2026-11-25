const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed } = require('./support.cjs');

const { hookRenderer } = require('./hookRenderer.cjs');

function editorFixture() {
  const h = createHarness();
  h.navigator.onLine = false;
  h.storage.set('flashcards_account_v1:user:a', JSON.stringify(seed.snapshot()));
  h.store.getState().setUser({ uid: 'a' });
  const renderer = hookRenderer();
  const mockStore = Object.assign(
    (selector) => (selector ? selector(h.store.getState()) : h.store.getState()),
    { getState: h.store.getState }
  );
  const loader = createHarness({}, h.storage, {
    react: renderer.react,
    [path.join(h.root, 'store/useFlashcardStore.ts')]: {
      useFlashcardStore: mockStore,
    },
  });
  const { useDeckEditor } = loader.load(path.join(h.root, 'hooks/useDeckEditor.ts'));
  const options = { deckId: 'd1', onSaved: () => {} };
  return {
    ...h,
    renderer,
    editorStorage: loader.localStorage,
    render: () => renderer.render(() => useDeckEditor(options)),
  };
}

test('draft keys isolate accounts and report persistence failure', async () => {
  const h = createHarness();
  const drafts = h.load(path.join(h.root, 'services/deckDraftStorage.ts'));
  const draft = {
    deckId: 'd1',
    title: 'private',
    description: '',
    selectedFolderId: null,
    cardItems: [seed.card],
    savedAt: 1,
  };
  assert.equal(drafts.saveDeckDraft('a', draft), true);
  assert.equal(drafts.loadDeckDraft('b', 'd1'), null);
  assert.equal(drafts.loadDeckDraft('a', 'd1').title, 'private');
  drafts.removeDeckDraft('a', 'd1');
  assert.equal(drafts.loadDeckDraft('a', 'd1'), null);
  h.localStorage.setItem = () => {
    throw Error('quota');
  };
  assert.equal(drafts.saveDeckDraft('a', draft), false);
});

test('remote refresh preserves dirty inputs and offers explicit reload', async () => {
  const h = editorFixture();
  try {
    let editor = h.render();
    editor.setTitle('unsaved title');
    editor.handleUpdateCard(0, 'termRichText', 'unsaved text');
    h.render();
    await h.store.getState().updateDeck('d1', { title: 'remote title' });
    await h.store.getState().updateCard('c1', { termRichText: 'remote text' });
    editor = h.render();
    assert.equal(editor.title, 'unsaved title');
    assert.equal(editor.cardItems[0].termRichText, 'unsaved text');
    assert.equal(editor.hasExternalChanges, true);
    editor.reloadOriginal();
    editor = h.render();
    assert.equal(editor.title, 'remote title');
    assert.equal(editor.cardItems[0].termRichText, 'remote text');
    assert.equal(editor.hasExternalChanges, false);
  } finally {
    h.renderer.cleanup();
  }
});

test('navigation flushes a draft but saving does not recreate it on unmount', async () => {
  const h = editorFixture();
  let editor = h.render();
  editor.setTitle('draft');
  h.render();
  h.renderer.cleanup();
  assert.equal(JSON.parse(h.storage.get('flashcards_draft_v2:user:a:d1')).title, 'draft');
  const saved = editorFixture();
  editor = saved.render();
  editor.setTitle('saved');
  editor = saved.render();
  await editor.handleSave();
  saved.renderer.cleanup();
  assert.equal(saved.storage.get('flashcards_draft_v2:user:a:d1'), 'null');
  assert.equal(saved.store.getState().decks[0].title, 'saved');
});

test('deck saves retain image-only cards and exclude empty cards', async () => {
  const h = editorFixture();
  const accountKey = 'flashcards_account_v1:user:a';
  try {
    let editor = h.render();
    editor.setTitle('edited deck');
    for (const index of [0, 1]) {
      editor.handleUpdateCard(index, 'termRichText', '<p>&nbsp;</p>');
      editor.handleUpdateCard(index, 'definitionRichText', '<p><br></p>');
    }

    const before = h.storage.get(accountKey);
    await h.render().handleSave();
    editor = h.render();
    assert.ok(editor.errors.general);
    assert.equal(h.storage.get(accountKey), before);

    const imageUrl = 'https://example.com/legacy.png';
    editor.handleUpdateCard(0, 'imageUrl', imageUrl);
    await h.render().handleSave();
    const { cards, decks } = JSON.parse(h.storage.get(accountKey));
    assert.equal(decks[0].title, 'edited deck');
    assert.deepEqual(cards.map(({ id }) => id), ['c1']);
    assert.equal(cards[0].termRichText, '<p>&nbsp;</p>');
    assert.equal(cards[0].definitionRichText, '<p><br></p>');
    assert.equal(cards[0].imageUrl, imageUrl);
  } finally {
    h.renderer.cleanup();
  }
});

test('deleting one duplicated card retains the shared image on the other', async () => {
  let deletions = 0;
  const h = createHarness({}, new Map(), {
    [path.resolve(__dirname, '../src/services/storageService.ts')]: {
      extractAllFirebaseImageUrlsFromCard: () => ['shared'],
      deleteImagesByUrls: () => {
        deletions++;
      },
    },
  });
  h.navigator.onLine = false;
  await h.store.getState().addDeck({ title: 'deck' }, [
    { ...seed.card, frontImageUrl: 'shared' },
    { ...seed.card, frontImageUrl: 'shared' },
  ]);
  await h.store.getState().deleteCard(h.store.getState().cards[0].id);
  assert.equal(deletions, 0);
  assert.equal(h.store.getState().cards[0].frontImageUrl, 'shared');
});

test('saving a draft before leaving persists the latest edits and reports a failed write', async () => {
  const h = editorFixture();
  try {
    let editor = h.render();
    editor.setTitle('continue later');
    editor.handleUpdateCard(0, 'definitionRichText', '<p>latest answer</p>');
    editor = h.render();
    assert.equal(editor.saveDraftNow(), true);
    const draft = JSON.parse(h.storage.get('flashcards_draft_v2:user:a:d1'));
    assert.equal(draft.title, 'continue later');
    assert.equal(draft.cardItems[0].definitionRichText, '<p>latest answer</p>');
    const write = h.editorStorage.setItem;
    h.editorStorage.setItem = () => {
      throw Error('quota');
    };
    editor.setTitle('must not disappear');
    editor = h.render();
    assert.equal(editor.saveDraftNow(), false);
    assert.ok(h.render().errors.general);
    h.editorStorage.setItem = write;
    assert.equal(h.render().saveDraftNow(), true);
    assert.equal(
      JSON.parse(h.storage.get('flashcards_draft_v2:user:a:d1')).title,
      'must not disappear'
    );
  } finally {
    h.renderer.cleanup();
  }
});

test('an asynchronous save failure keeps the editor input and draft for retry', async () => {
  const h = editorFixture();
  try {
    let editor = h.render(); editor.setTitle('keep my input'); editor = h.render();
    assert.equal(editor.saveDraftNow(), true);
    const write = h.localStorage.setItem;
    h.localStorage.setItem = () => { throw Error('quota'); };
    await editor.handleSave();
    editor = h.render();
    assert.equal(editor.title, 'keep my input'); assert.match(editor.errors.general, /quota/);
    assert.equal(h.store.getState().decks[0].title, 'deck');
    assert.equal(JSON.parse(h.storage.get('flashcards_draft_v2:user:a:d1')).title, 'keep my input');
    h.localStorage.setItem = write;
    await editor.handleSave();
    assert.equal(h.store.getState().decks[0].title, 'keep my input');
    assert.equal(h.storage.get('flashcards_draft_v2:user:a:d1'), 'null');
  } finally { h.renderer.cleanup(); }
});

test('removing the last card alerts once and duplicating a card matches newlyAddedCardId under double-invoked updaters', () => {
  const h = createHarness();
  h.navigator.onLine = false;
  h.storage.set('flashcards_account_v1:user:a', JSON.stringify(seed.snapshot()));
  h.store.getState().setUser({ uid: 'a' });
  const renderer = hookRenderer();
  let updaterRuns = 0;
  const strictReact = {
    ...renderer.react,
    useState(initial) {
      const [value, setValue] = renderer.react.useState(initial);
      return [
        value,
        (update) => {
          if (typeof update === 'function') {
            updaterRuns++;
            update(value);
          }
          setValue(update);
        },
      ];
    },
  };
  const mockStore = Object.assign(
    (selector) => (selector ? selector(h.store.getState()) : h.store.getState()),
    { getState: h.store.getState }
  );
  const loader = createHarness({}, h.storage, {
    react: strictReact,
    [path.join(h.root, 'store/useFlashcardStore.ts')]: { useFlashcardStore: mockStore },
  });
  let alerts = 0;
  loader.context.alert = () => { alerts++; };
  const { useDeckEditor } = loader.load(path.join(h.root, 'hooks/useDeckEditor.ts'));
  const render = () => renderer.render(() => useDeckEditor({ deckId: 'd1', onSaved: () => {} }));
  try {
    let editor = render();
    assert.equal(editor.cardItems.length, 2);
    editor.handleRemoveCard(0);
    editor = render();
    assert.equal(editor.cardItems.length, 1);

    editor.handleRemoveCard(0);
    editor = render();
    assert.equal(alerts, 1);
    assert.equal(editor.cardItems.length, 1);

    const runsBeforeDuplicate = updaterRuns;
    editor.handleDuplicateCard(0);
    editor = render();
    assert.ok(updaterRuns > runsBeforeDuplicate);
    assert.equal(editor.cardItems.length, 2);
    assert.equal(editor.cardItems[1].id, editor.newlyAddedCardId);
    assert.notEqual(editor.cardItems[1].id, editor.cardItems[0].id);
  } finally {
    renderer.cleanup();
  }
});
