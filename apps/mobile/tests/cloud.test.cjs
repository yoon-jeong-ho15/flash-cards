const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');

async function fixture() {
  const context = { uid: 'a', batches: [], uploads: [], queries: [], records: {} };
  const native = { auth: { get currentUser() { return { uid: context.uid }; } }, configured: true, db: {}, storage: {} };
  const firestore = {
    doc: (_, name, id) => ({ name, id }), collection: (_, name) => name,
    where: (field, operator, value) => ({ field, operator, value }),
    query: (name, condition) => { context.queries.push({ name, condition }); return name; },
    getDocs: async name => ({ docs: (context.records[name] || []).map(([id,data]) => ({ id, data: () => data })) }),
    writeBatch: () => { const operations = []; return { set: (doc, data, options) => operations.push({ type: 'set', doc, data, options }), delete: doc => operations.push({ type: 'delete', doc }), commit: async () => context.batches.push(operations) }; },
  };
  const storage = {
    ref: (_, path) => path,
    uploadBytesResumable: (ref, bytes) => { context.uploads.push({ ref, bytes }); const task = Promise.resolve({ ref }); task.cancel = () => {}; return task; },
    getDownloadURL: async ref => `https://firebasestorage.googleapis.com/${ref}`,
  };
  const compiled = await esbuild.build({ entryPoints: [path.resolve(__dirname, '../src/platform/cloud.ts')], bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{ name: 'platform-fixtures', setup(build) {
      build.onResolve({ filter: /^(\.\/firebase|firebase\/firestore|firebase\/storage)$/ }, args => ({ path: args.path, external: true }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(id => ({ './firebase': native, 'firebase/firestore': firestore, 'firebase/storage': storage })[id], module, module.exports);
  return { cloud: module.exports.cloud, context };
}
test('native cloud transport uses web collections, splits batches at 400, clears removed optional fields and checks the active account', async () => {
  const { cloud, context } = await fixture();
  const decks = Array.from({ length: 401 }, (_, i) => ({ id: `d${i}`, title: '덱', createdAt: 1, updatedAt: 1 }));
  const outbox = Object.fromEntries(decks.map(d => [`decks:${d.id}`, { kind: 'decks', id: d.id, revision: 1, deleted: false }]));
  await cloud.push('a', { folders: [], decks, cards: [], revision: 1, preferences: {}, outbox }, () => true);
  assert.deepEqual(context.batches.map(batch => batch.length), [400,1]);
  assert.equal(context.batches[0][0].doc.name, 'flashcard_decks'); assert.equal(context.batches[0][0].data.userId, 'a'); assert.equal(context.batches[0][0].data.description, null);
  context.uid = 'b'; await assert.rejects(cloud.push('a', { decks, outbox }, () => true), /계정이 변경/); assert.equal(context.batches.length, 2);
});
test('offline images in fields and rich HTML become Storage URLs once, without mutating the local snapshot', async () => {
  const { cloud, context } = await fixture(); const data = 'data:image/jpeg;base64,YWJj';
  const card = { id: 'c', deckId: 'd', termRichText: `<p>질문<img src="${data}"></p>`, definitionRichText: '<p>답</p>', frontImageUrl: data, backImageUrl: data, imageUrl: data, learned: false };
  await cloud.push('a', { folders: [], decks: [], cards: [card], outbox: { 'cards:c': { kind: 'cards', id: 'c', revision: 1, deleted: false } } }, () => true);
  assert.equal(context.uploads.length, 1); assert.equal(Buffer.from(context.uploads[0].bytes).toString(), 'abc');
  const uploaded = context.batches[0][0].data;
  assert.match(uploaded.frontImageUrl, /^https:/); assert.equal(uploaded.frontImageUrl, uploaded.backImageUrl); assert.ok(uploaded.termRichText.includes(uploaded.frontImageUrl));
  assert.equal(card.frontImageUrl, data); assert.ok(card.termRichText.includes(data));
});
test('cloud reads filter by account, normalize legacy images and orphan cards, and perform no writes or migrations', async () => {
  const { cloud, context } = await fixture();
  context.records = { flashcard_folders: [['f', { title: '폴더' }]], flashcard_decks: [['d', { title: '덱', folderId: 'f' }]], flashcard_cards: [['c', { deckId: 'd', imageUrl: 'https://example.com/old.jpg', learned: true }], ['orphan', { deckId: 'missing' }]] };
  const data = await cloud.pull('a');
  assert.equal(data.cards.length, 1); assert.equal(data.cards[0].backImageUrl, 'https://example.com/old.jpg'); assert.equal(data.cards[0].learned, true);
  assert.equal(context.queries.length, 3); assert.ok(context.queries.every(query => query.condition.field === 'userId' && query.condition.value === 'a'));
  assert.equal(context.batches.length, 0); assert.equal(context.uploads.length, 0);
});
