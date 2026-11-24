const { test } = require('node:test');
const assert = require('node:assert/strict');

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function holdCreate(h, deckId) {
  const entered = deferred();
  const release = deferred();
  h.server.beforeBatch = async entries => {
    if (!entries.some(entry => entry.kind === 'set' && entry.id === deckId)) return;
    entered.resolve();
    await release.promise;
  };
  return { entered, release };
}

const tokens = ({ deckId, cardIds }) => [`decks:${deckId}`, ...cardIds.map(id => `cards:${id}`)];
const writesFor = (h, { deckId, cardIds }) =>
  h.server.writes.filter(write => write.id === deckId || cardIds.includes(write.id));
const assertDeleted = (h, { deckId, cardIds }) => {
  assert.equal(h.server.decks.has(deckId), false);
  for (const id of cardIds) assert.equal(h.server.cards.has(id), false);
};
const assertOtherEdit = h => assert.equal(h.server.decks.get('d1').title, 'unrelated edit');

function registerDeckDeleteTests(fixture) {
  test('offline deck and card creations cancel on deletion even across reloads', async () => {
    const h = await fixture();
    const draft = await h.createDeck();
    await h.renameDeck(draft.deckId, 'renamed locally');
    await h.edit(draft.cardIds[0], '<p>edited before first push</p>');
    await h.reload();
    for (const token of tokens(draft)) assert.equal(h.queued(token)?.state, 'unsent');
    await h.renameDeck('d1', 'unrelated edit');
    assert.equal(h.queued('decks:d1')?.state, 'existing');
    await h.deleteDeck(draft.deckId);
    await h.reload();

    for (const token of tokens(draft)) assert.equal(h.queued(token), undefined);
    await h.connect();

    assert.deepEqual(writesFor(h, draft), []);
    assertDeleted(h, draft);
    assertOtherEdit(h);
    assert.equal(h.status(), 'synced');
  });

  test('deleting a deck during the create request preserves its delete and the other deck edit', async () => {
    const h = await fixture();
    const draft = await h.createDeck();
    const { entered, release } = holdCreate(h, draft.deckId);
    const sync = h.connect();
    try {
      assert.equal(await Promise.race([entered.promise.then(() => 'entered'), sync.then(() => 'finished')]), 'entered');
      for (const token of tokens(draft)) assert.equal(h.queued(token)?.state, 'attempted');
      await h.deleteDeck(draft.deckId);
      await h.renameDeck('d1', 'unrelated edit');
      for (const token of tokens(draft)) assert.deepEqual(h.queued(token), { state: 'attempted', deleted: true });
    } finally {
      release.resolve();
    }
    await sync;

    assertDeleted(h, draft);
    assertOtherEdit(h);
    for (const token of tokens(draft)) assert.equal(h.queued(token), undefined);
    for (const id of [draft.deckId, ...draft.cardIds]) {
      assert.deepEqual(writesFor(h, draft).filter(write => write.id === id).map(write => write.kind), ['set', 'delete']);
    }
  });

  test('a timed-out create retains deletion after restart, even if the server was initially empty', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const h = await fixture();
    const draft = await h.createDeck();
    const { entered, release } = holdCreate(h, draft.deckId);
    const sync = h.connect();
    try {
      assert.equal(await Promise.race([entered.promise.then(() => 'entered'), sync.then(() => 'finished')]), 'entered');
      await h.deleteDeck(draft.deckId);
      await h.renameDeck('d1', 'unrelated edit');
      t.mock.timers.tick(20_000);
      await sync;
      assert.equal(h.status(), 'error');
      assertDeleted(h, draft);

      await h.reload();
      await h.connect();
      assertOtherEdit(h);
      assert.equal(h.status(), 'synced');
      for (const token of tokens(draft)) assert.deepEqual(h.queued(token), { state: 'attempted', deleted: true });
    } finally {
      release.resolve();
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.server.decks.has(draft.deckId), true, 'the original request reached the server late');
    assert.equal(h.cards().some(card => card.deckId === draft.deckId), false);

    t.mock.timers.tick(5_000);
    await new Promise(resolve => setImmediate(resolve));
    assertDeleted(h, draft);
    assertOtherEdit(h);
    for (const token of tokens(draft)) assert.equal(h.queued(token), undefined);
  });

  for (const legacyDeck of [false, true]) {
    test(`offline deletion of a server deck syncs alongside other changes (${legacyDeck ? 'legacy' : 'current'} queue)`, async () => {
      const h = await fixture({ existingDeck: true, legacyDeck });
      const existing = { deckId: 'd2', cardIds: ['d2-card'] };
      if (!legacyDeck) await h.renameDeck('d2', 'edited before deleting');
      await h.deleteDeck('d2');
      await h.renameDeck('d1', 'unrelated edit');
      assert.deepEqual(h.queued('decks:d2'), { state: legacyDeck ? 'attempted' : 'existing', deleted: true });
      assert.equal(h.queued('cards:d2-card')?.deleted, true);
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
module.exports = { registerDeckDeleteTests };
