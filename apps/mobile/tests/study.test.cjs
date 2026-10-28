const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const { startSession, stepSession, reconcileSession } = load('core/study.ts');
const { plainText, hasContent, shuffled, sortDecks } = load('core/content.ts');
const cards = [{ id: 'a', learned: true }, { id: 'b', learned: false }, { id: 'c', learned: false }];
test('study starts with unlearned cards, supports all-card review and round restart, and marks finish at the boundary', () => {
  let session = startSession(cards);
  assert.deepEqual(session.ids, ['b','c']); session = stepSession(session, -1); assert.equal(session.index, 0);
  session = stepSession(session, 1); assert.equal(session.index, 1); session = stepSession(session, 1); assert.equal(session.finished, true);
  assert.deepEqual(startSession(cards, false, false).ids, ['a','b','c']);
  assert.equal(startSession(cards.map(c => ({ ...c, learned: true }))).finished, true);
  assert.equal(startSession(cards, false, true, 2).round, 2);
});
test('deleting earlier cards preserves the currently displayed card; deleting the current last card clamps the index', () => {
  const initial = { ...startSession(cards, false, false), index: 2, flipped: true };
  const earlier = reconcileSession(initial, cards.slice(1)); assert.equal(earlier.ids[earlier.index], 'c'); assert.equal(earlier.flipped, true);
  const current = reconcileSession(initial, cards.slice(0, 2)); assert.equal(current.index, 1); assert.equal(current.flipped, false);
  assert.equal(reconcileSession(initial, []).finished, true);
});
test('progress changes do not remove mastered cards mid-session or reset position', () => {
  const initial = { ...startSession(cards), index: 1 };
  const updated = reconcileSession(initial, cards.map(c => ({ ...c, learned: true })));
  assert.deepEqual(updated.ids, ['b','c']); assert.equal(updated.index, 1); assert.equal(updated.finished, false);
});
test('visible-text search decodes numeric/entities, excludes scripts, attributes and HTML tags, and handles Korean', () => {
  assert.equal(plainText('<p>한글 &amp; &#x1F600;</p><img src="https://secret.example"><script>hidden</script>'), '한글 & 😀');
  assert.equal(hasContent({ termRichText: '<p>&nbsp;&#8203;　</p>', definitionRichText: '' }), false);
  assert.equal(hasContent({ termRichText: '<img src="https://example.com/image">', definitionRichText: '' }), true);
});
test('shuffle is non-mutating and complete; numeric Korean name sorting and date ties are stable', () => {
  const input = ['a','b','c']; const copy = shuffled(input, () => 0); assert.deepEqual(input, ['a','b','c']); assert.deepEqual([...copy].sort(), input);
  const decks = [{ title: '덱 10', createdAt: 1 }, { title: '덱 2', createdAt: 1 }];
  assert.deepEqual(sortDecks(decks, 'name-asc').map(d => d.title), ['덱 2','덱 10']);
});
