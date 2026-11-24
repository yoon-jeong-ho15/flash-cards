const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { firestoreFixture, registerLearnedSyncTests, seedData } = require('../../../tests/learned-sync-fixture.cjs');
const { registerDeckDeleteTests } = require('../../../tests/deck-delete-sync-regressions.cjs');
const { registerAccountPullTests } = require('../../../tests/account-pull-regressions.cjs');
const { harness, user, accountKey, emptySnapshot } = require('./helpers.cjs');

async function fixture(firestoreOverride) {
  const context = { uid: 'a', batches: [], uploads: [], queries: [], records: {}, objects: new Set() };
  const native = { auth: { get currentUser() { return { uid: context.uid }; } }, configured: true, db: {}, storage: {} };
  const firestore = {
    doc: (_, name, id) => ({ name, id }), collection: (_, name) => name,
    where: (field, operator, value) => ({ field, operator, value }),
    query: (name, condition) => { context.queries.push({ name, condition }); return name; },
    getDocsFromServer: async name => ({ docs: (context.records[name] || []).map(([id,data]) => ({ id, data: () => data })) }),
    writeBatch: () => { const operations = []; return { set: (doc, data, options) => operations.push({ type: 'set', doc, data, options }), delete: doc => operations.push({ type: 'delete', doc }), commit: async () => (() => { if (context.failBatch === context.batches.length + 1) throw Error('batch failed'); context.batches.push(operations); })() }; },
  };
  const storage = {
    ref: (_, path) => path,
    uploadBytesResumable: (ref, bytes) => { context.uploads.push({ ref, bytes }); context.objects.add(ref); const task = Promise.resolve({ ref }); task.cancel = () => {}; return task; },
    getDownloadURL: async ref => { if (context.lookupError) throw Object.assign(Error('lookup failed'), { code: context.lookupError }); if (!context.objects.has(ref)) throw Object.assign(Error('missing'), { code: 'storage/object-not-found' }); return `https://firebasestorage.googleapis.com/${ref}`; },
  };
  const compiled = await esbuild.build({ entryPoints: [path.resolve(__dirname, '../src/platform/cloud.ts')], bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{ name: 'platform-fixtures', setup(build) {
      build.onResolve({ filter: /^(\.\/firebase|firebase\/firestore|firebase\/storage|expo-crypto)$/ }, args => ({ path: args.path, external: true }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(id => ({ './firebase': native, 'firebase/firestore': firestoreOverride ?? firestore, 'firebase/storage': storage, 'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digest: (algorithm, bytes) => require('node:crypto').webcrypto.subtle.digest(algorithm, bytes) } })[id], module, module.exports);
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

test('SHA-256 paths reuse objects across pushes and isolate accounts; only object-not-found permits upload', async () => {
  const { cloud, context } = await fixture();
  const original = 'data:image/jpeg;base64,YWJj';
  const snapshot = { cards: [{ id: 'c', termRichText: '', definitionRichText: '', frontImageUrl: original }], outbox: { c: { kind: 'cards', id: 'c', revision: 1 } } };
  await cloud.push('a', snapshot, () => true);
  await cloud.push('a', snapshot, () => true);
  assert.equal(context.uploads.length, 1);
  assert.equal(context.uploads[0].ref, 'cards/a/sha256_ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.jpg');
  context.uid = 'b'; await cloud.push('b', snapshot, () => true);
  assert.equal(context.uploads.length, 2); assert.match(context.uploads[1].ref, /^cards\/b\//);
});

test('uploads report each successful conversion before a failed batch and safely parse only img src', async () => {
  const { cloud, context } = await fixture(); const original = 'data:image/png;base64,YWJj'; const results = [];
  const card = { id: 'c', termRichText: `<p>${original}</p><img data-src="${original}" src='${original}' alt="a > b">`, definitionRichText: `<IMG SRC=${original}>`, imageUrl: original };
  const snapshot = { cards: [card], outbox: { c: { kind: 'cards', id: 'c', revision: 1 } } };
  context.failBatch = 1;
  await assert.rejects(cloud.push('a', snapshot, () => true, async image => results.push(image)), /batch failed/);
  assert.equal(results.length, 1); assert.equal(results[0].cardId, 'c'); assert.equal(results[0].original, original);
  context.failBatch = 0;
  await cloud.push('a', snapshot, () => true);
  assert.equal(context.uploads.length, 1);
  const saved = context.batches[0][0].data;
  assert.ok(saved.termRichText.includes(`<p>${original}</p>`)); assert.ok(saved.termRichText.includes(`data-src="${original}"`));
  assert.ok(saved.definitionRichText.includes(results[0].url));
});

test('a failed second batch reuses previously uploaded objects on replay', async () => {
  const { cloud, context } = await fixture();
  const cards = Array.from({ length: 401 }, (_, i) => ({ id: `c${i}`, termRichText: '', definitionRichText: '', frontImageUrl: 'data:image/png;base64,YWJj' }));
  const snapshot = { cards, outbox: Object.fromEntries(cards.map(c => [c.id, { kind: 'cards', id: c.id, revision: 1 }])) };
  context.failBatch = 2; await assert.rejects(cloud.push('a', snapshot, () => true), /batch failed/);
  assert.equal(context.batches.length, 1);
  context.failBatch = 0; await cloud.push('a', snapshot, () => true);
  assert.equal(context.uploads.length, 1); assert.deepEqual(context.batches.map(b => b.length), [400, 400, 1]);
});

test('store and real cloud transport retain canonical URLs across learned/text edits and restart', async () => {
  const { harness, user, item, accountKey } = require('./helpers.cjs');
  const { cloud, context } = await fixture();
  const h = harness({ push: cloud.push });
  h.cloud.pull = async () => { const { folders, decks, cards } = h.store.getState(); return { folders, decks, cards }; };
  await h.store.switchUser(user('a'));
  const original = 'data:image/jpeg;base64,YWJj';
  await h.store.saveDeck(undefined, { title: '덱' }, [{ ...item(), frontImageUrl: original, backImageUrl: original, imageUrl: original, definitionRichText: `<img src="${original}">` }]);
  h.cloud.available = true; await h.store.sync(false);
  const card = h.store.getState().cards[0]; assert.match(card.frontImageUrl, /^https:/);
  await h.store.setLearned(card.id, true); await h.store.sync(false);
  await h.store.updateCard(card.id, { termRichText: '<p>edited</p>' }); await h.store.sync(false);
  assert.equal(context.uploads.length, 1);
  const restarted = harness({}, h.map).store; await restarted.switchUser(user('a'));
  assert.equal(restarted.getState().cards[0].frontImageUrl, card.frontImageUrl);
  assert.equal(restarted.resolveImage(card.frontImageUrl), original);
  assert.ok(restarted.displayHTML(restarted.getState().cards[0].definitionRichText).includes(original));
  assert.equal(restarted.canonicalHTML(`<img src="${original}">`), `<img src="${card.frontImageUrl}">`);
  assert.equal(JSON.parse(h.map.get(accountKey('a'))).cards[0].learned, true);
  await restarted.switchUser(user('b')); assert.equal(restarted.resolveImage(card.frontImageUrl), card.frontImageUrl);
});

test('permission/connection errors do not trigger another file upload', async () => {
  const { cloud, context } = await fixture();
  const snapshot = { cards: [{ id: 'c', termRichText: '', definitionRichText: '', frontImageUrl: 'data:image/png;base64,YWJj' }], outbox: { c: { kind: 'cards', id: 'c', revision: 1 } } };
  for (const code of ['storage/unauthorized', 'storage/retry-limit-exceeded']) {
    context.lookupError = code;
    await assert.rejects(cloud.push('a', snapshot, () => true), /lookup failed/);
  }
  assert.equal(context.uploads.length, 0); assert.equal(context.batches.length, 0);
});

test('uploaded object is reused after local conversion persistence fails and the app restarts', async () => {
  const { harness, item, user } = require('./helpers.cjs');
  const { cloud, context } = await fixture();
  const h = harness({ push: cloud.push }); await h.store.switchUser(user('a'));
  await h.store.saveDeck(undefined, { title: '덱' }, [{ ...item(), frontImageUrl: 'data:image/png;base64,YWJj' }]);
  const write = h.storage.setItem;
  h.storage.setItem = async (key, value) => {
    if (context.uploads.length) throw Error('disk full');
    await write(key, value);
  };
  h.cloud.available = true; await h.store.sync(false);
  assert.equal(h.store.getState().status, 'error'); assert.equal(context.uploads.length, 1);
  const restarted = harness({ push: cloud.push }, h.map);
  restarted.cloud.pull = async () => { const { folders, decks, cards } = restarted.store.getState(); return { folders, decks, cards }; };
  await restarted.store.switchUser(user('a')); restarted.cloud.available = true; await restarted.store.sync(false);
  assert.equal(context.uploads.length, 1); assert.match(restarted.store.getState().cards[0].frontImageUrl, /^https:/);
  assert.equal(Object.keys(restarted.store.getState().outbox).length, 0);
});

async function syncFixture({ legacy = false, existingDeck = false, legacyDeck = false } = {}) {
  const data = seedData(existingDeck);
  const server = firestoreFixture(data);
  const snapshot = { ...emptySnapshot(), ...data };
  if (legacy) {
    snapshot.cards[2].termRichText = '<p>legacy queued edit</p>';
    snapshot.outbox = { 'cards:c3': { kind: 'cards', id: 'c3', revision: 1, deleted: false } };
    snapshot.revision = 1;
  }
  if (legacyDeck) {
    snapshot.outbox = { 'decks:d2': { kind: 'decks', id: 'd2', revision: 1, deleted: false } };
    snapshot.revision = 1;
  }
  const map = new Map([[accountKey('a'), JSON.stringify(snapshot)]]);
  let h;
  const reload = async () => {
    const { cloud } = await fixture(server.sdk);
    h = harness({ ...cloud, available: false }, map);
    await h.store.switchUser(user('a'));
  };
  await reload();
  return {
    server, reload,
    createDeck: async () => {
      const cards = [1, 2].map(index => ({ termRichText: '<p>Card ' + index + '</p>', definitionRichText: '' }));
      const deckId = await h.store.saveDeck(undefined, { title: 'offline deck' }, cards);
      return { deckId, cardIds: h.store.getState().cards.filter(card => card.deckId === deckId).map(card => card.id) };
    },
    renameDeck: (id, title) => h.store.saveDeck(id, { title },
      h.store.getState().cards.filter(card => card.deckId === id)),
    deleteDeck: id => h.store.deleteDeck(id),
    queued: token => {
      const operation = JSON.parse(map.get(accountKey('a'))).outbox[token];
      if (operation) return { state: operation.writeState, deleted: operation.deleted };
    },
    rate: (id, learned) => h.store.setLearned(id, learned),
    edit: (id, termRichText) => h.store.updateCard(id, { termRichText }),
    editInDeck: (id, termRichText) => h.store.saveDeck('d1', { title: 'deck' },
      h.store.getState().cards.map(card => card.id === id ? { ...card, termRichText } : card)),
    create: async (termRichText) => {
      const deckId = await h.store.saveDeck(undefined, { title: 'new deck' }, [{ termRichText, definitionRichText: '' }]);
      return h.store.getState().cards.find(card => card.deckId === deckId).id;
    },
    connect: () => {
      h.cloud.available = true;
      return h.store.sync();
    },
    flush: () => h.store.sync(false),
    pending: (id) => Boolean(h.store.getState().outbox[`cards:${id}`]),
    status: () => h.store.getState().status,
    error: () => h.store.getState().error,
    lastSyncedAt: () => h.store.getState().lastSyncedAt,
    durable: () => JSON.parse(map.get(accountKey('a'))),
    cards: () => h.store.getState().cards,
  };
}
registerLearnedSyncTests(syncFixture);
registerAccountPullTests(syncFixture);
registerDeckDeleteTests(syncFixture);
