const test = require('node:test');
const assert = require('node:assert/strict');
const { load, harness, accountKey, item } = require('./helpers.cjs');
const { collectionColumns } = load('core/collectionLayout.ts');

test('grid fits phones and tablets, list remains one column, and large text stays readable', () => {
  assert.equal(collectionColumns('grid', 390, 1, 1), 2);
  assert.equal(collectionColumns('grid', 820, 1, 1), 3);
  assert.equal(collectionColumns('list', 390, 1, 1), 1);
  assert.equal(collectionColumns('list', 820, 1, 1), 1);
  assert.equal(collectionColumns('grid', 320, 1, 1), 1);
  assert.equal(collectionColumns('grid', 820, 1.4, 1), 1);
  assert.equal(collectionColumns('grid', 820, 1, 1.5), 1);
});

test('collection layout survives reopening without changing sort preferences or library content', async () => {
  const h = harness();
  await h.store.switchUser(null);
  const id = await h.store.saveDeck(undefined, { title: '세트' }, [item()]);
  await h.store.setPreferences({ deckSort: 'name-asc', folderSort: 'date-asc' });
  await Promise.all([
    h.store.setPreferences({ collectionLayout: 'list' }),
    h.store.setPreferences({ folderDeckSort: 'name-desc' }),
  ]);
  const saved = JSON.parse(h.map.get(accountKey()));
  assert.equal(saved.preferences.collectionLayout, 'list');
  const reopened = harness({}, h.map);
  await reopened.store.switchUser(null);
  assert.deepEqual(reopened.store.getState().preferences, {
    deckSort: 'name-asc', folderSort: 'date-asc', collectionLayout: 'list', folderDeckSort: 'name-desc',
  });
  assert.equal(reopened.store.getState().decks[0].id, id);
  await reopened.store.setPreferences({ collectionLayout: 'grid' });
  assert.equal(reopened.store.getState().preferences.collectionLayout, 'grid');
});
