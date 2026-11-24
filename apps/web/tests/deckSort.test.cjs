const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness } = require('./support.cjs');

const harness = createHarness();
const { sortDecks } = harness.load(path.join(harness.root, 'utils/deckSort.ts'));

const deck = (id, title, updatedAt, createdAt) => Object.freeze({ id, title, updatedAt, createdAt });
const decks = Object.freeze([
  deck('ten', '가 10', 30, 1),
  deck('older-two', '가 2', 10, 100),
  deck('na', '나 1', undefined, 30),
  deck('newer-two', '가 2', 30, 5),
  deck('tied-two', '가 2', 30, 20),
  deck('created-two', '가 2', 0, 20),
  deck('no-date', '다', undefined, undefined),
]);
const ids = (list) => Array.from(list, ({ id }) => id);

const expected = {
  'name-asc': ['newer-two', 'tied-two', 'created-two', 'older-two', 'ten', 'na', 'no-date'],
  'name-desc': ['no-date', 'na', 'ten', 'newer-two', 'tied-two', 'created-two', 'older-two'],
  'date-asc': ['no-date', 'older-two', 'created-two', 'newer-two', 'tied-two', 'ten', 'na'],
  'date-desc': ['newer-two', 'tied-two', 'ten', 'na', 'created-two', 'older-two', 'no-date'],
};

for (const [option, order] of Object.entries(expected)) {
  test(`deck sorting preserves numeric Korean title order, timestamp fallback and ties for ${option}`, () => {
    const originalOrder = ids(decks);
    const sorted = sortDecks(decks, option);

    assert.deepEqual(ids(sorted), order);
    assert.notEqual(sorted, decks);
    assert.deepEqual(ids(decks), originalOrder);
  });
}
