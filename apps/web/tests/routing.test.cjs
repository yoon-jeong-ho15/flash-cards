const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHarness, seed, deferred, tick } = require('./support.cjs');
const webRequire = createRequire(path.resolve(__dirname, '../package.json'));
const { createMemoryRouter } = webRequire('react-router');

function harness(service) {
  const h = createHarness(service);
  h.context.URLSearchParams = URLSearchParams;
  return { ...h, ...h.load(path.join(h.root, 'routing.ts')) };
}

test('all screen URLs round-trip IDs, focused cards and study options', () => {
  const h = harness();
  const views = [
    { type: 'dashboard' }, { type: 'all-decks' }, { type: 'all-folders' },
    { type: 'deck', deckId: 'deck 한글' }, { type: 'folder', folderId: 'folder-1' },
    { type: 'folder-study', folderId: 'folder-1' },
    { type: 'edit-deck', folderId: 'folder & 한글' },
    { type: 'edit-deck', deckId: 'd1', focusCardId: 'c?&1' },
    { type: 'study', deckId: 'd1', onlyDifficult: true, shuffle: true },
  ];
  for (const view of views) {
    const url = new URL(h.viewUrl(view), 'https://example.test');
    assert.deepEqual(JSON.parse(JSON.stringify(h.resolveView(url.pathname, url.search))), view);
  }
  assert.equal(h.resolveView('/decks/new').type, 'edit-deck');
  assert.equal(h.resolveView('/not-a-page'), null);
  assert.equal(h.resolveView('/decks/d1/unknown'), null);
  assert.equal(h.resolveView('/decks/d1/study', '?shuffle=0').shuffle, false);
});

test('deep link stays intact throughout auth restoration and delayed cloud load', async () => {
  const gate = deferred();
  const h = harness({ fetchAllData: () => gate.promise });
  const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/decks/d1/edit?cardId=c1'] });
  const view = () => h.resolveView(router.state.location.pathname, router.state.location.search);
  assert.equal(h.routeStatus(view(), h.store.getState()), 'loading');
  h.store.getState().setUser({ uid: 'a' });
  // No flash of missing data between auth and the first sync microtask.
  assert.equal(h.routeStatus(view(), h.store.getState()), 'loading');
  const sync = h.store.getState().initCloudSync();
  await tick();
  assert.equal(h.routeStatus(view(), h.store.getState()), 'loading');
  gate.resolve(seed.data()); await sync;
  assert.equal(h.routeStatus(view(), h.store.getState()), 'ready');
  assert.equal(router.state.location.pathname, '/decks/d1/edit');
  assert.equal(view().focusCardId, 'c1');
  router.dispose();
});

test('late old-account results cannot release the next account loading gate', async () => {
  const a = deferred(); const b = deferred();
  const h = harness({ fetchAllData: uid => uid === 'a' ? a.promise : b.promise });
  h.store.getState().setUser({ uid: 'a' });
  const oldSync = h.store.getState().initCloudSync(); await tick();
  h.store.getState().setUser({ uid: 'b' });
  void h.store.getState().initCloudSync();
  const view = h.resolveView('/decks/d1');
  a.resolve(seed.data()); await oldSync; await tick();
  assert.equal(h.routeStatus(view, h.store.getState()), 'loading');
  assert.equal(h.store.getState().decks.length, 0);
  b.resolve({ folders: [], decks: [], cards: [] });
  await h.store.getState().initCloudSync();
  assert.equal(h.routeStatus(view, h.store.getState()), 'missing');
  h.store.getState().setUser(null);
  assert.equal(h.routeStatus(view, h.store.getState()), 'missing');
});

test('offline and failed loads are recoverable, while cached data remains usable', async () => {
  let fail = true;
  const h = harness({ fetchAllData: async () => { if (fail) throw Error('network'); return seed.data(); } });
  h.store.getState().setUser({ uid: 'a' });
  const view = h.resolveView('/decks/d1/edit');
  await h.store.getState().initCloudSync();
  assert.equal(h.routeStatus(view, h.store.getState()), 'unavailable');
  fail = false;
  await h.store.getState().initCloudSync();
  assert.equal(h.routeStatus(view, h.store.getState()), 'ready');
  h.navigator.onLine = false;
  await h.store.getState().initCloudSync();
  assert.equal(h.routeStatus(view, h.store.getState()), 'ready');
  assert.equal(h.routeStatus(h.resolveView('/decks/absent'), h.store.getState()), 'unavailable');
});

test('switching accounts offline settles the loading gate after an old request', async () => {
  const gate = deferred();
  const h = harness({ fetchAllData: () => gate.promise });
  h.store.getState().setUser({ uid: 'a' });
  const sync = h.store.getState().initCloudSync(); await tick();
  h.navigator.onLine = false;
  h.store.getState().setUser({ uid: 'b' });
  void h.store.getState().initCloudSync();
  gate.resolve(seed.data()); await sync; await tick();
  assert.equal(h.routeStatus(h.resolveView('/decks/d1'), h.store.getState()), 'unavailable');
});

test('folder-bound creation validates the folder and unknown paths show not found', () => {
  const h = harness(); h.store.getState().setUser(null);
  assert.equal(h.routeStatus(h.resolveView('/decks/new'), h.store.getState()), 'ready');
  assert.equal(h.routeStatus(h.resolveView('/decks/new', '?folderId=absent'), h.store.getState()), 'missing');
  assert.equal(h.routeStatus(h.resolveView('/unknown'), h.store.getState()), 'not-found');
});

test('back and forward restore screen and query options from URL history', async () => {
  const h = harness();
  const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/folders'] });
  await router.navigate(h.viewUrl({ type: 'deck', deckId: 'd1' }));
  await router.navigate(h.viewUrl({ type: 'study', deckId: 'd1', shuffle: true }));
  await router.navigate(-1);
  assert.equal(h.resolveView(router.state.location.pathname).type, 'deck');
  await router.navigate(1);
  assert.equal(h.resolveView(router.state.location.pathname, router.state.location.search).shuffle, true);
  router.dispose();
});
