const { test } = require('node:test');
const assert = require('node:assert/strict');

const collections = ['flashcard_folders', 'flashcard_decks', 'flashcard_cards'];
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function registerAccountPullTests(fixture) {
  test('an unreachable Firestore server preserves local data instead of using an empty cache', async () => {
    const h = await fixture();
    const before = h.durable();
    h.server.beforeRead = async () => { throw Error('server unavailable'); };

    await h.connect();

    assert.deepEqual(h.server.serverReads, collections);
    assert.deepEqual(h.server.cacheReads, []);
    assert.deepEqual(h.durable(), before);
    assert.equal(h.cards().length, 3);
    assert.equal(h.status(), 'error');
    assert.match(h.error(), /server unavailable/);
    assert.equal(h.lastSyncedAt(), null);

    h.server.beforeRead = async () => {};
    await h.flush();
    assert.deepEqual(h.server.serverReads, [...collections, ...collections]);
    assert.equal(h.status(), 'synced');
    assert.equal(h.error(), null);
    assert.ok(h.lastSyncedAt() > 0);
  });

  test('one failed collection preserves all local collections and edits made during the pull', async (t) => {
    let now = 1000;
    t.mock.method(Date, 'now', () => now);
    const h = await fixture();
    await h.connect();
    assert.equal(h.lastSyncedAt(), 1000);
    now = 2000;

    h.server.clearCollections();
    const started = deferred();
    const failingRead = deferred();
    h.server.beforeRead = async (name) => {
      if (name === 'flashcard_decks') {
        started.resolve();
        await failingRead.promise;
      }
    };
    const sync = h.connect();
    assert.equal(await Promise.race([started.promise.then(() => 'started'), sync.then(() => 'finished')]), 'started');
    await h.edit('c1', '<p>edit during pull</p>');
    const afterEdit = h.durable();
    failingRead.reject(Error('decks read failed'));
    await sync;

    assert.deepEqual(h.server.serverReads, [...collections, ...collections]);
    assert.deepEqual(h.server.cacheReads, []);
    assert.deepEqual(h.durable(), afterEdit);
    assert.equal(h.cards().find(card => card.id === 'c1').termRichText, '<p>edit during pull</p>');
    assert.equal(h.pending('c1'), true);
    assert.equal(h.status(), 'error');
    assert.match(h.error(), /decks read failed/);
    assert.equal(h.lastSyncedAt(), 1000);
  });

  test('a timed-out pull keeps local data and ignores a late empty server response', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const h = await fixture();
    const before = h.durable();
    const started = deferred();
    const slowRead = deferred();
    h.server.clearCollections();
    h.server.beforeRead = async (name) => {
      if (name === 'flashcard_cards') {
        started.resolve();
        await slowRead.promise;
      }
    };
    const sync = h.connect();
    assert.equal(await Promise.race([started.promise.then(() => 'started'), sync.then(() => 'finished')]), 'started');
    t.mock.timers.tick(20_000);
    await sync;
    slowRead.resolve();
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(h.durable(), before);
    assert.deepEqual(h.server.cacheReads, []);
    assert.equal(h.status(), 'error');
    assert.match(h.error(), /초과/);
    assert.equal(h.lastSyncedAt(), null);
  });

  test('three successful empty server reads replace local data and record a successful sync', async (t) => {
    let now = 1000;
    t.mock.method(Date, 'now', () => now);
    const h = await fixture();
    assert.equal(h.durable().folders.length, 1);
    assert.equal(h.durable().decks.length, 1);
    assert.equal(h.durable().cards.length, 3);
    h.server.clearCollections();
    await h.connect();

    const { folders, decks, cards } = h.durable();
    assert.deepEqual({ folders, decks, cards }, { folders: [], decks: [], cards: [] });
    assert.equal(h.cards().length, 0);
    assert.deepEqual(h.server.cacheReads, []);
    assert.deepEqual(h.server.serverReads, collections);
    assert.equal(h.status(), 'synced');
    assert.equal(h.error(), null);
    assert.equal(h.lastSyncedAt(), 1000);

    now = 2000;
    await h.flush();
    assert.equal(h.lastSyncedAt(), 1000, 'a run with no server work must not advance the timestamp');
  });
}
module.exports = { registerAccountPullTests };
