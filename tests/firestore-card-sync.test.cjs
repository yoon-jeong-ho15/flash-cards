const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
const firestore = require('firebase/firestore');
const { createHarness, deferred } = require('../apps/web/tests/support.cjs');

const { deleteField, disableNetwork, doc, enableNetwork, getDocFromServer, setDoc, updateDoc } = firestore;
const uid = 'a';
const card = { id: 'c1', userId: uid, deckId: 'd1', order: 0, termRichText: '원본',
  definitionRichText: '뒷면', learned: false };
const cardRef = db => doc(db, 'flashcard_cards', card.id);
const accountKey = 'flashcards_account_v1:user:a';
const firstEdit = '첫 번째 편집';
const secondEdit = '두 번째 편집';
let env;

before(async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);
  env = await initializeTestEnvironment({
    projectId: 'demo-flash-cards-firestore',
    firestore: { rules: readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'flashcard_decks', card.deckId), { id: card.deckId, userId: uid, title: '덱' });
    await setDoc(cardRef(db), card);
  });
});
after(async () => { await env?.cleanup(); });

function tab(storage) {
  const db = env.authenticatedContext(uid).firestore();
  const started = deferred();
  const submitted = deferred();
  const writes = [];
  const src = path.resolve(__dirname, '../apps/web/src');
  const harness = createHarness({}, storage, {
    [path.join(src, 'services/flashcardService.ts')]: null,
    [path.join(src, 'lib/firebase.ts')]: { db, auth: { currentUser: { uid } }, isFirebaseConfigured: true },
    'firebase/firestore': {
      ...firestore,
      writeBatch(client) {
        const batch = firestore.writeBatch(client);
        const bodies = [];
        return {
          set(target, data, options) {
            if (target.parent.id === 'flashcard_cards') bodies.push(data.termRichText);
            batch.set(target, { ...data }, { ...options });
          },
          commit() {
            const work = batch.commit();
            writes.push(...bodies);
            if (bodies.length) {
              started.resolve();
              submitted.resolve(work.then(() => 'written', error => error.code));
            }
            return work;
          },
        };
      },
    },
  });
  let timeout;
  harness.context.setTimeout = (callback, milliseconds) => {
    if (milliseconds !== 20_000) return setTimeout(callback, milliseconds);
    timeout = callback;
    return callback;
  };
  harness.context.clearTimeout = timer => {
    if (typeof timer !== 'function') clearTimeout(timer);
    else if (timeout === timer) timeout = undefined;
  };
  const state = () => harness.store.getState();
  const service = harness.load(path.join(src, 'services/flashcardService.ts')).flashcardService;
  state().setUser({ uid });
  return {
    db, state, service, writes, started, submitted,
    expire() { assert.equal(typeof timeout, 'function'); timeout(); },
    pull: () => state().initCloudSync(),
    edit: text => state().updateCard(card.id, { termRichText: text }),
  };
}

for (const sharedStorage of [true, false]) {
  const title = sharedStorage ? 'shared browser outbox' : 'separate outboxes';
  test(`the late first edit loses to the committed second edit with ${title}`, { timeout: 30_000 }, async () => {
    const storageA = new Map();
    const storageB = sharedStorage ? storageA : new Map();
    const a = tab(storageA);
    const b = tab(storageB);
    assert.notEqual(a.db, b.db);
    assert.notEqual(a.service, b.service);
    await a.pull();
    await b.pull();

    // Submit A's write through its real SDK while holding its outbound traffic.
    // B keeps its own active Firestore connection.
    await disableNetwork(a.db);
    try {
      await a.edit(firstEdit);
      const pending = a.state().flushPendingSync();
      const stage = await Promise.race([
        a.started.promise.then(() => 'submitted'),
        pending.then(() => a.state().syncError),
      ]);
      assert.equal(stage, 'submitted');
      a.expire();
      await pending;
      assert.match(a.state().syncError, /시간이 초과/);

      await b.edit(secondEdit);
      await b.state().flushPendingSync();
      assert.equal(b.state().syncStatus, 'synced');
      assert.equal((await getDocFromServer(cardRef(b.db))).data().termRichText, secondEdit);
    } finally {
      await enableNetwork(a.db);
    }
    assert.equal(await a.submitted.promise, 'permission-denied');
    await a.service.waitForWrites();
    assert.equal(JSON.parse(storageA.get(accountKey)).cards[0].termRichText, secondEdit);
    if (!sharedStorage) {
      const saved = JSON.parse(storageA.get(accountKey));
      assert.deepEqual(saved.pendingSync.cardIds, []);
      assert.equal(saved.cardConflicts[card.id].termRichText, firstEdit);
      assert.match(a.state().syncError, /충돌한 편집/);
    }

    const reopenedA = tab(storageA);
    const reopenedB = tab(storageB);
    await reopenedA.pull();
    await reopenedB.pull();
    for (const reopened of [reopenedA, reopenedB]) {
      assert.equal(reopened.state().cards[0].termRichText, secondEdit);
      assert.deepEqual(reopened.writes, []);
    }
    assert.deepEqual(a.writes, [firstEdit]);
    assert.deepEqual(b.writes, [secondEdit]);
    assert.equal((await getDocFromServer(cardRef(b.db))).data().termRichText, secondEdit);
  });
}

test('a late successful write advances the base of the next local edit', { timeout: 30_000 }, async () => {
  const a = tab(new Map());
  await a.pull();
  await disableNetwork(a.db);
  let next;
  try {
    await a.edit(firstEdit);
    const pending = a.state().flushPendingSync();
    assert.equal(await Promise.race([
      a.started.promise.then(() => 'submitted'),
      pending.then(() => a.state().syncError),
    ]), 'submitted');
    a.expire();
    await pending;
    assert.match(a.state().syncError, /시간이 초과/);
    await a.edit(secondEdit);
    next = a.state().flushPendingSync();
  } finally {
    await enableNetwork(a.db);
  }
  assert.equal(await a.submitted.promise, 'written');
  await next;
  assert.deepEqual(a.writes, [firstEdit, secondEdit]);
  const saved = (await getDocFromServer(cardRef(a.db))).data();
  assert.equal(saved.termRichText, secondEdit);
  assert.ok(saved.baseContentVersion);
  assert.equal(a.state().cards[0].contentVersion, saved.contentVersion);
});

test('legacy cards accept learned-only updates and one initial content version', async () => {
  const owner = env.authenticatedContext(uid).firestore();
  const foreign = env.authenticatedContext('b').firestore();
  const target = cardRef(owner);
  await updateDoc(target, { learned: true });
  assert.equal((await getDocFromServer(target)).data().contentVersion, undefined);
  await assertFails(updateDoc(target, { termRichText: 'old client edit' }));
  const newTarget = doc(owner, 'flashcard_cards', 'new');
  await assertFails(setDoc(newTarget, { ...card, id: 'new' }));
  await assertFails(setDoc(newTarget, { ...card, id: 'new', contentVersion: randomUUID() }));
  await setDoc(newTarget, { ...card, id: 'new', baseContentVersion: null, contentVersion: randomUUID() });

  const version = randomUUID();
  await updateDoc(target, { termRichText: secondEdit, baseContentVersion: null, contentVersion: version });
  await assertFails(updateDoc(target, { termRichText: firstEdit, baseContentVersion: null, contentVersion: randomUUID() }));
  await assertFails(updateDoc(target, { termRichText: firstEdit, contentVersion: deleteField() }));
  await assertFails(updateDoc(cardRef(foreign), { termRichText: firstEdit, baseContentVersion: version, contentVersion: randomUUID() }));
  await updateDoc(target, { learned: false });
  const saved = (await getDocFromServer(target)).data();
  assert.equal(saved.termRichText, secondEdit);
  assert.equal(saved.contentVersion, version);
  assert.equal(saved.learned, false);
});
