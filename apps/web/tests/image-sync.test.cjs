const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed, deferred, tick } = require('./support.cjs');
const image = 'data:image/webp;base64,YWJj';
const other = 'data:image/png;base64,ZGVm';
const url = 'https://storage.example/image?alt=media&token=abc';
const storageModule = path.resolve(__dirname, '../src/services/storageService.ts');
const serviceModule = path.resolve(__dirname, '../src/services/flashcardService.ts');
const firebaseModule = path.resolve(__dirname, '../src/lib/firebase.ts');
function fixture(upload, commit = async () => {}) {
  const h = createHarness({ commitChanges: commit }, new Map(), {
    [storageModule]: { uploadDataImage: upload, extractAllFirebaseImageUrlsFromCard: () => [] },
  });
  h.navigator.onLine = false;
  h.storage.set('flashcards_account_v1:user:a', JSON.stringify(seed.snapshot()));
  h.store.getState().setUser({ uid: 'a' });
  return h;
}
function durable(h, uid = 'a') { return JSON.parse(h.storage.get(`flashcards_account_v1:user:${uid}`)); }

test('offline large legacy images migrate once across fields/cards/HTML, preserving formatting and aliases', async () => {
  const uploads = []; const sent = [];
  const large = 'data:image/webp;base64,' + 'YQ=='.repeat(150000);
  const h = fixture(async original => { uploads.push(original); return url; }, async snapshot => sent.push(snapshot));
  const state = seed.snapshot();
  state.cards = state.cards.map(card => ({ ...card, frontImageUrl: large, backImageUrl: large, imageUrl: large,
    termRichText: `<p style="color:red"><strong>hello</strong><img alt='a' src = '${large}' width="10"></p>` }));
  h.storage.set('flashcards_account_v1:user:a', JSON.stringify(state));
  await h.store.getState().refreshAccount();
  assert.equal(uploads.length, 0);
  h.navigator.onLine = true;
  await h.store.getState().flushPendingSync();
  assert.equal(uploads.length, 1);
  assert.equal(sent.length, 1);
  assert.equal(durable(h).cards[0].imageUrl, url);
  assert.equal(durable(h).cards[0].backImageUrl, url);
  assert.equal(durable(h).cards[0].termRichText, `<p style="color:red"><strong>hello</strong><img alt='a' src = '${url}' width="10"></p>`);
  await h.store.getState().updateCard('c1', { learned: false });
  await h.store.getState().flushPendingSync();
  assert.equal(uploads.length, 1);
});

test('upload failure keeps original/outbox; partial success is durable and retry uploads only remaining images', async () => {
  let fail = true; const uploads = [];
  const h = fixture(async original => { uploads.push(original); if (original === other && fail) throw Error('upload failed'); return url; });
  await h.store.getState().updateCard('c1', { frontImageUrl: image, backImageUrl: other, imageUrl: other });
  h.navigator.onLine = true;
  await h.store.getState().flushPendingSync();
  assert.equal(h.store.getState().syncStatus, 'error');
  assert.equal(durable(h).cards[0].frontImageUrl, url);
  assert.equal(durable(h).cards[0].backImageUrl, other);
  assert.ok(durable(h).pendingSync.cardIds.includes('c1'));
  fail = false;
  await h.store.getState().flushPendingSync();
  assert.deepEqual(uploads, [image, other, other]);
  assert.equal(durable(h).pendingSync.cardIds.length, 0);
});

for (const action of ['edit', 'delete', 'account']) test(`upload completion preserves concurrent ${action}`, async () => {
  const gate = deferred(); const sent = [];
  const h = fixture(async () => gate.promise, async snapshot => sent.push(snapshot));
  await h.store.getState().updateCard('c1', { frontImageUrl: image, termRichText: `<p>old<img src="${image}"></p>` });
  h.navigator.onLine = true;
  const run = h.store.getState().flushPendingSync(); await tick();
  if (action === 'edit') await h.store.getState().updateCard('c1', { frontImageUrl: undefined, termRichText: `<b>new</b><img src="${image}">` });
  if (action === 'delete') await h.store.getState().deleteCard('c1');
  if (action === 'account') { h.navigator.onLine = false; h.store.getState().setUser({ uid: 'b' }); }
  gate.resolve(url); await run;
  if (action === 'edit') {
    assert.equal(durable(h).cards[0].frontImageUrl, undefined);
    assert.equal(durable(h).cards[0].termRichText, `<b>new</b><img src="${url}">`);
    assert.equal(sent[0].cards[0].termRichText, `<b>new</b><img src="${url}">`);
  }
  if (action === 'delete') assert.ok(!durable(h).cards.some(card => card.id === 'c1'));
  if (action === 'account') {
    assert.equal(durable(h).cards[0].frontImageUrl, image);
    assert.equal(h.store.getState().cards.length, 0);
    assert.equal(sent.length, 0);
  }
});

test('failed local URL persistence preserves original and never sends unpersisted URLs', async () => {
  const gate = deferred(); let commits = 0;
  const h = fixture(async () => gate.promise, async () => commits++);
  await h.store.getState().updateCard('c1', { imageUrl: image });
  h.navigator.onLine = true;
  const run = h.store.getState().flushPendingSync(); await tick();
  h.localStorage.setItem = () => { throw Error('quota'); };
  gate.resolve(url); await run;
  assert.equal(durable(h).cards[0].imageUrl, image);
  assert.ok(durable(h).pendingSync.cardIds.includes('c1'));
  assert.equal(commits, 0);
});

test('HTML replacement touches only real src attributes and preserves all surrounding markup', () => {
  const h = createHarness();
  const { cardDataImages, replaceCardImage } = h.load(path.join(h.root, 'services/imageSync.ts'));
  const card = { ...seed.card, termRichText: `<p>${image}</p><img data-src="${other}" title=">" SRC=${image}><img src='${other}'>` };
  assert.deepEqual(Array.from(cardDataImages(card)), [image, other]);
  const replaced = replaceCardImage(card, image, url);
  assert.equal(replaced.termRichText, `<p>${image}</p><img data-src="${other}" title=">" SRC="${url}"><img src='${other}'>`);
});

function cloudHarness() {
  const commits = []; let batch;
  const h = createHarness({}, new Map(), {
    [serviceModule]: null, [firebaseModule]: { db: {}, auth: { currentUser: { uid: 'a' } }, isFirebaseConfigured: true },
    'firebase/firestore': { doc: (_db, _name, id) => id, writeBatch: () => {
      const ops = []; batch = { set: (id, data) => ops.push({ id, data }), delete: id => ops.push({ id }), commit: async () => commits.push(ops) }; return batch;
    } },
  });
  return { ...h, commits, service: h.load(serviceModule).flashcardService };
}
test('cloud rejects unprepared data images and oversize UTF-8 documents before submitting any batch', async () => {
  const h = cloudHarness(); const state = seed.snapshot(); state.pendingSync = { ...state.pendingSync, cardIds: ['c1'] };
  state.cards[0].imageUrl = image;
  await assert.rejects(h.service.commitChanges(state, 'a', () => true), /이미지 업로드/);
  delete state.cards[0].imageUrl; state.cards[0].termRichText = '한'.repeat(400000);
  await assert.rejects(h.service.commitChanges(state, 'a', () => true), /너무 큽니다/);
  assert.equal(h.commits.length, 0);
});
test('cloud retains 400 operation batches after image preparation', async () => {
  const h = cloudHarness(); const state = seed.snapshot();
  state.cards = Array.from({ length: 801 }, (_, i) => ({ ...seed.card, id: `c${i}`, deckId: 'd1', backImageUrl: url, imageUrl: url }));
  state.pendingSync = { ...state.pendingSync, cardIds: state.cards.map(card => card.id) };
  await h.service.commitChanges(state, 'a', () => true);
  assert.deepEqual(h.commits.map(chunk => chunk.length), [400, 400, 1]);
});

test('strict upload reuses deterministic hash path and checks account after asynchronous work', async () => {
  const paths = []; let uploads = 0; let exists = false; let active = true;
  const h = createHarness({}, new Map(), {
    [storageModule]: null, [firebaseModule]: { storage: {}, auth: { currentUser: { uid: 'a' } }, isFirebaseConfigured: true },
    'firebase/storage': {
      ref: (_storage, path) => { paths.push(path); return path; },
      getDownloadURL: async () => { if (!exists) throw Object.assign(Error('missing'), { code: 'storage/object-not-found' }); return url; },
      uploadBytesResumable: target => { uploads++; exists = true; const task = Promise.resolve({ ref: target }); task.cancel = () => {}; return task; },
    },
  });
  const { uploadDataImage } = h.load(storageModule);
  assert.equal(await uploadDataImage(image, 'a', () => active), url);
  assert.equal(await uploadDataImage(image, 'a', () => active), url);
  assert.equal(uploads, 1);
  assert.equal(paths[0], paths[1]);
  assert.match(paths[0], /^cards\/a\/sha256_[a-f0-9]{64}\.webp$/);
  const promise = uploadDataImage(other, 'a', () => active); active = false;
  await assert.rejects(promise, /session changed/);
  assert.equal(uploads, 1);
});

test('bounded requests time out with a recoverable error', async () => {
  const h = createHarness(); const { bounded } = h.load(path.join(h.root, 'services/imageSync.ts'));
  await assert.rejects(bounded(new Promise(() => {}), 5), /다시 동기화/);
});

test('another tab can change/delete images during upload without stale card restoration', async () => {
  const gate = deferred(); const h = fixture(async () => gate.promise);
  await h.store.getState().updateCard('c1', { frontImageUrl: image });
  await h.store.getState().updateCard('c2', { imageUrl: image });
  const second = createHarness({}, h.storage); second.navigator.onLine = false;
  second.store.getState().setUser({ uid: 'a' });
  h.navigator.onLine = true;
  const run = h.store.getState().flushPendingSync(); await tick();
  await second.store.getState().updateCard('c1', { frontImageUrl: 'https://new.example/image', termRichText: '<em>edited in tab 2</em>' });
  await second.store.getState().deleteCard('c2');
  gate.resolve(url); await run;
  assert.equal(durable(h).cards.length, 1);
  assert.equal(durable(h).cards[0].frontImageUrl, 'https://new.example/image');
  assert.equal(durable(h).cards[0].termRichText, '<em>edited in tab 2</em>');
});

test('strict upload cancels a stalled transfer and rejects unsupported/oversized originals', async () => {
  let cancelled = 0;
  const h = createHarness({}, new Map(), {
    [storageModule]: null, [firebaseModule]: { storage: {}, auth: { currentUser: { uid: 'a' } }, isFirebaseConfigured: true },
    'firebase/storage': {
      ref: (_storage, path) => path,
      getDownloadURL: async () => { throw Object.assign(Error('missing'), { code: 'storage/object-not-found' }); },
      uploadBytesResumable: () => { const task = new Promise(() => {}); task.cancel = () => cancelled++; return task; },
    },
  });
  h.context.setTimeout = callback => setTimeout(callback, 5);
  const { uploadDataImage } = h.load(storageModule);
  await assert.rejects(uploadDataImage(image, 'a', () => true), /다시 동기화/);
  assert.equal(cancelled, 1);
  await assert.rejects(uploadDataImage('data:image/svg+xml;base64,YWJj', 'a', () => true), /지원하지/);
  await assert.rejects(uploadDataImage('data:image/png;base64,' + Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64'), 'a', () => true), /5MB/);
});

test('HTML attribute text resembling an image source is preserved', () => {
  const h = createHarness(); const { replaceCardImage } = h.load(path.join(h.root, 'services/imageSync.ts'));
  const card = { ...seed.card, termRichText: `<img title="example src='${image}'" src='${image}'>` };
  assert.equal(replaceCardImage(card, image, url).termRichText, `<img title="example src='${image}'" src='${url}'>`);
});

test('Firestore failure and page reload retain the uploaded URL without repeating upload', async () => {
  let uploads = 0;
  const h = fixture(async () => { uploads++; return url; }, async () => { throw Error('firestore unavailable'); });
  await h.store.getState().updateCard('c1', { backImageUrl: image, imageUrl: image });
  h.navigator.onLine = true;
  await h.store.getState().flushPendingSync();
  assert.equal(h.store.getState().syncStatus, 'error');
  assert.equal(durable(h).cards[0].backImageUrl, url);
  assert.ok(durable(h).pendingSync.cardIds.includes('c1'));
  const reloaded = createHarness({}, h.storage, {
    [storageModule]: { uploadDataImage: async () => { throw Error('unexpected upload'); } },
  });
  reloaded.store.getState().setUser({ uid: 'a' });
  await reloaded.store.getState().flushPendingSync();
  assert.equal(uploads, 1);
  assert.equal(durable(h).pendingSync.cardIds.length, 0);
  assert.equal(reloaded.store.getState().cards[0].imageUrl, url);
});
