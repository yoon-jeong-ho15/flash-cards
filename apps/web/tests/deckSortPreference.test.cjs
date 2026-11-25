const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness } = require('./support.cjs');
const { hookRenderer } = require('./hookRenderer.cjs');

function sortPreferenceFixture(storage = new Map()) {
  const renderer = hookRenderer();
  const h = createHarness({}, storage, { react: renderer.react });
  const { useDeckSortPreference } = h.load(path.join(h.root, 'hooks/useDeckSortPreference.ts'));
  return {
    ...h,
    renderer,
    useDeckSortPreference,
  };
}

test('useDeckSortPreference validates stored options, falls back to date-desc, and tolerates storage failures', () => {
  const storage = new Map([['flashcard_all_decks_sort', 'invalid-option']]);
  const invalidFixture = sortPreferenceFixture(storage);
  const [fallbackSort] = invalidFixture.renderer.render(() =>
    invalidFixture.useDeckSortPreference('flashcard_all_decks_sort')
  );
  assert.equal(fallbackSort, 'date-desc');

  for (const option of ['name-asc', 'name-desc', 'date-desc', 'date-asc']) {
    const validFixture = sortPreferenceFixture(new Map([['flashcard_all_decks_sort', option]]));
    const [loadedSort] = validFixture.renderer.render(() =>
      validFixture.useDeckSortPreference('flashcard_all_decks_sort')
    );
    assert.equal(loadedSort, option);
  }

  const writeFailFixture = sortPreferenceFixture(new Map());
  writeFailFixture.localStorage.getItem = () => {
    throw new Error('read disabled');
  };
  writeFailFixture.localStorage.setItem = () => {
    throw new Error('write disabled');
  };
  const renderWriteFail = () =>
    writeFailFixture.renderer.render(() =>
      writeFailFixture.useDeckSortPreference('flashcard_all_decks_sort')
    );
  const [initialSort, setSort] = renderWriteFail();
  assert.equal(initialSort, 'date-desc');
  setSort('name-asc');
  const [updatedSort] = renderWriteFail();
  assert.equal(updatedSort, 'name-asc');
});

test('all-decks and folder-detail sort preferences stay independent across keys', () => {
  const storage = new Map([
    ['flashcard_all_decks_sort', 'name-asc'],
    ['flashcard_folder_deck_sort', 'date-asc'],
  ]);
  const h = sortPreferenceFixture(storage);
  const renderBoth = () =>
    h.renderer.render(() => ({
      allDecks: h.useDeckSortPreference('flashcard_all_decks_sort'),
      folderDecks: h.useDeckSortPreference('flashcard_folder_deck_sort'),
    }));

  const first = renderBoth();
  assert.equal(first.allDecks[0], 'name-asc');
  assert.equal(first.folderDecks[0], 'date-asc');

  first.allDecks[1]('name-desc');
  const afterAllChange = renderBoth();
  assert.equal(afterAllChange.allDecks[0], 'name-desc');
  assert.equal(afterAllChange.folderDecks[0], 'date-asc');
  assert.equal(storage.get('flashcard_all_decks_sort'), 'name-desc');
  assert.equal(storage.get('flashcard_folder_deck_sort'), 'date-asc');

  afterAllChange.folderDecks[1]('date-desc');
  const afterFolderChange = renderBoth();
  assert.equal(afterFolderChange.allDecks[0], 'name-desc');
  assert.equal(afterFolderChange.folderDecks[0], 'date-desc');
  assert.equal(storage.get('flashcard_all_decks_sort'), 'name-desc');
  assert.equal(storage.get('flashcard_folder_deck_sort'), 'date-desc');
});
