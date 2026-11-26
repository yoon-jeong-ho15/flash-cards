const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness } = require('./support.cjs');
const { hookRenderer } = require('./hookRenderer.cjs');

function sortPreferenceFixture(storage = new Map()) {
  const renderer = hookRenderer();
  const h = createHarness({}, storage, { react: renderer.react });
  const { useSetSortPreference } = h.load(path.join(h.root, 'hooks/useSetSortPreference.ts'));
  return {
    ...h,
    renderer,
    useSetSortPreference,
  };
}

test('useSetSortPreference validates stored options, falls back to date-desc, and tolerates storage failures', () => {
  const storage = new Map([['flashcard_all_sets_sort', 'invalid-option']]);
  const invalidFixture = sortPreferenceFixture(storage);
  const [fallbackSort] = invalidFixture.renderer.render(() =>
    invalidFixture.useSetSortPreference('flashcard_all_sets_sort')
  );
  assert.equal(fallbackSort, 'date-desc');

  for (const option of ['name-asc', 'name-desc', 'date-desc', 'date-asc']) {
    const validFixture = sortPreferenceFixture(new Map([['flashcard_all_sets_sort', option]]));
    const [loadedSort] = validFixture.renderer.render(() =>
      validFixture.useSetSortPreference('flashcard_all_sets_sort')
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
      writeFailFixture.useSetSortPreference('flashcard_all_sets_sort')
    );
  const [initialSort, setSort] = renderWriteFail();
  assert.equal(initialSort, 'date-desc');
  setSort('name-asc');
  const [updatedSort] = renderWriteFail();
  assert.equal(updatedSort, 'name-asc');
});

test('all-sets and folder-detail sort preferences stay independent across keys', () => {
  const storage = new Map([
    ['flashcard_all_sets_sort', 'name-asc'],
    ['flashcard_folder_set_sort', 'date-asc'],
  ]);
  const h = sortPreferenceFixture(storage);
  const renderBoth = () =>
    h.renderer.render(() => ({
      allSets: h.useSetSortPreference('flashcard_all_sets_sort'),
      folderSets: h.useSetSortPreference('flashcard_folder_set_sort'),
    }));

  const first = renderBoth();
  assert.equal(first.allSets[0], 'name-asc');
  assert.equal(first.folderSets[0], 'date-asc');

  first.allSets[1]('name-desc');
  const afterAllChange = renderBoth();
  assert.equal(afterAllChange.allSets[0], 'name-desc');
  assert.equal(afterAllChange.folderSets[0], 'date-asc');
  assert.equal(storage.get('flashcard_all_sets_sort'), 'name-desc');
  assert.equal(storage.get('flashcard_folder_set_sort'), 'date-asc');

  afterAllChange.folderSets[1]('date-desc');
  const afterFolderChange = renderBoth();
  assert.equal(afterFolderChange.allSets[0], 'name-desc');
  assert.equal(afterFolderChange.folderSets[0], 'date-desc');
  assert.equal(storage.get('flashcard_all_sets_sort'), 'name-desc');
  assert.equal(storage.get('flashcard_folder_set_sort'), 'date-desc');
});
