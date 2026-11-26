const { test } = require('node:test');
const assert = require('node:assert/strict');

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function holdCreate(h, setId) {
  const entered = deferred();
  const release = deferred();
  h.server.beforeBatch = async entries => {
    if (!entries.some(entry => entry.kind === 'set' && entry.id === setId)) return;
    entered.resolve();
    await release.promise;
  };
  return { entered, release };
}

const tokens = ({ setId, cardIds }) => [`sets:${setId}`, ...cardIds.map(id => `cards:${id}`)];
const writesFor = (h, { setId, cardIds }) =>
  h.server.writes.filter(write => write.id === setId || cardIds.includes(write.id));
const assertDeleted = (h, { setId, cardIds }) => {
  assert.equal(h.server.sets.has(setId), false);
  for (const id of cardIds) assert.equal(h.server.cards.has(id), false);
};
const assertOtherEdit = h => assert.equal(h.server.sets.get('s1').title, 'unrelated edit');

function registerSetDeleteTests(fixture) {
  test('offline set and card creations cancel on deletion even across reloads', async () => {
    const h = await fixture();
    const draft = await h.createSet();
    await h.renameSet(draft.setId, 'renamed locally');
    await h.edit(draft.cardIds[0], '<p>edited before first push</p>');
    await h.reload();
    for (const token of tokens(draft)) assert.equal(h.queued(token)?.state, 'unsent');
    await h.renameSet('s1', 'unrelated edit');
    assert.equal(h.queued('sets:s1')?.state, 'existing');
    await h.deleteSet(draft.setId);
    await h.reload();

    for (const token of tokens(draft)) assert.equal(h.queued(token), undefined);
    await h.connect();

    assert.deepEqual(writesFor(h, draft), []);
    assertDeleted(h, draft);
    assertOtherEdit(h);
    assert.equal(h.status(), 'synced');
  });

  test('deleting a set during the create request preserves its delete and the other set edit', async () => {
    const h = await fixture();
    const draft = await h.createSet();
    const { entered, release } = holdCreate(h, draft.setId);
    const sync = h.connect();
    try {
      assert.equal(await Promise.race([entered.promise.then(() => 'entered'), sync.then(() => 'finished')]), 'entered');
      for (const token of tokens(draft)) assert.equal(h.queued(token)?.state, 'attempted');
      await h.deleteSet(draft.setId);
      await h.renameSet('s1', 'unrelated edit');
      for (const token of tokens(draft)) assert.deepEqual(h.queued(token), { state: 'attempted', deleted: true });
    } finally {
      release.resolve();
    }
    await sync;

    assertDeleted(h, draft);
    assertOtherEdit(h);
    for (const token of tokens(draft)) assert.equal(h.queued(token), undefined);
    for (const id of [draft.setId, ...draft.cardIds]) {
      assert.deepEqual(writesFor(h, draft).filter(write => write.id === id).map(write => write.kind), ['set', 'delete']);
    }
  });

  test('a timed-out create retains deletion after restart, even if the server was initially empty', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const h = await fixture();
    const draft = await h.createSet();
    const { entered, release } = holdCreate(h, draft.setId);
    const sync = h.connect();
    try {
      assert.equal(await Promise.race([entered.promise.then(() => 'entered'), sync.then(() => 'finished')]), 'entered');
      await h.deleteSet(draft.setId);
      await h.renameSet('s1', 'unrelated edit');
      t.mock.timers.tick(20_000);
      await sync;
      assert.equal(h.status(), 'error');
      assertDeleted(h, draft);

      await h.reload();
      await h.connect();
      assertOtherEdit(h);
      assert.equal(h.status(), 'pending');
      for (const token of tokens(draft)) assert.deepEqual(h.queued(token), { state: 'attempted', deleted: true });
    } finally {
      release.resolve();
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.server.sets.has(draft.setId), true, 'the original request reached the server late');
    assert.equal(h.cards().some(card => card.setId === draft.setId), false);

    t.mock.timers.tick(5_000);
    await new Promise(resolve => setImmediate(resolve));
    assertDeleted(h, draft);
    assertOtherEdit(h);
    for (const token of tokens(draft)) assert.equal(h.queued(token), undefined);
  });

  test('a rejected first creation can be deleted without scheduling remote retries', async () => {
    const h = await fixture();
    const draft = await h.createSet();
    h.server.beforeBatch = async () => { throw Object.assign(Error('rejected'), { code: 'permission-denied' }); };
    await h.connect();
    assert.equal(h.status(), 'error');
    await h.reload();
    for (const token of tokens(draft)) assert.equal(h.queued(token)?.state, 'unsent');
    await h.deleteSet(draft.setId);
    h.server.beforeBatch = async () => {};
    await h.connect();
    assert.deepEqual(writesFor(h, draft), []);
    for (const token of tokens(draft)) assert.equal(h.queued(token), undefined);
    assert.equal(h.status(), 'synced');
  });

  test('an unresolved legacy delete stops polling but is reconciled on the next sync', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const h = await fixture({ existingSet: true, legacySet: true });
    const original = h.server.sets.get('s2');
    h.server.sets.delete('s2');
    await h.deleteSet('s2');
    await h.connect();
    assert.equal(h.status(), 'pending');
    const tick = async () => {
      t.mock.timers.tick(600_000);
      await new Promise(resolve => setImmediate(resolve));
    };
    for (let i = 0; i < 10; i++) await tick();
    const requests = h.server.writes.length;
    await tick();
    assert.equal(h.server.writes.length, requests);
    assert.equal(h.queued('sets:s2')?.deleted, true);

    h.server.sets.set('s2', original);
    await h.connect();
    assert.equal(h.queued('sets:s2'), undefined);
    assert.equal(h.server.sets.has('s2'), false);
    assert.equal(h.status(), 'synced');
  });

  for (const legacySet of [false, true]) {
    test(`offline deletion of a server set syncs alongside other changes (${legacySet ? 'legacy' : 'current'} queue)`, async () => {
      const h = await fixture({ existingSet: true, legacySet });
      const existing = { setId: 's2', cardIds: ['s2-card'] };
      if (!legacySet) await h.renameSet('s2', 'edited before deleting');
      await h.deleteSet('s2');
      await h.renameSet('s1', 'unrelated edit');
      assert.deepEqual(h.queued('sets:s2'), { state: legacySet ? 'attempted' : 'existing', deleted: true });
      assert.equal(h.queued('cards:s2-card')?.deleted, true);
      await h.reload();
      await h.connect();

      assertDeleted(h, existing);
      assertOtherEdit(h);
      assert.equal(h.status(), 'synced');
      assert.deepEqual(writesFor(h, existing).map(write => write.kind), ['delete', 'delete']);
      for (const token of tokens(existing)) assert.equal(h.queued(token), undefined);
    });
  }
}
module.exports = { registerSetDeleteTests };
