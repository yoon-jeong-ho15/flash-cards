const { test } = require('node:test');
const assert = require('node:assert/strict');

function seedData(existingDeck = false) {
  const data = {
    folders: [{ id: 'f1', userId: 'a', title: 'folder', createdAt: 1 }],
    decks: [{ id: 'd1', userId: 'a', folderId: 'f1', title: 'deck', createdAt: 1, updatedAt: 1 }],
    cards: ['c1', 'c2', 'c3'].map((id, order) => ({
      id, order, userId: 'a', deckId: 'd1', termRichText: '<p>original</p>',
      definitionRichText: '<p>answer</p>', learned: false,
    })),
  };
  if (existingDeck) {
    data.decks.push({ ...data.decks[0], id: 'd2', title: 'another deck' });
    data.cards.push({ ...data.cards[0], id: 'd2-card', deckId: 'd2' });
  }
  return data;
}

function firestoreFixture(data) {
  const documents = Object.fromEntries(Object.entries(data).map(([kind, items]) => [
    `flashcard_${kind}`, new Map(items.map(item => [item.id, { ...item }])),
  ]));
  const cards = documents.flashcard_cards;
  const writes = [];
  const denied = new Set();
  const missingCode = new Map();
  const server = {
    cards, decks: documents.flashcard_decks, writes, denied, missingCode,
    beforeUpdate: async () => {}, beforeBatch: async () => {},
    serverReads: [], cacheReads: [], beforeRead: async () => {},
    clearCollections: () => Object.values(documents).forEach(items => items.clear()),
  };
  const read = async ({ name, filters }) => {
    assert.ok(filters.some(filter => filter.field === 'userId' && filter.value === 'a'));
    server.serverReads.push(name);
    await server.beforeRead(name);
    const docs = Array.from(documents[name], ([id, data]) => ({ id, data }))
      .filter(({ id, data }) => filters.every(({ field, value }) => (field === '__name__' ? id : data[field]) === value))
      .map(({ id, data }) => ({ id, data: () => data }));
    return { docs, empty: docs.length === 0 };
  };

  server.sdk = {
    doc: (_db, name, id) => ({ name, id }),
    collection: (_db, name) => name,
    documentId: () => '__name__',
    where: (field, operator, value) => {
      assert.equal(operator, '==');
      return { field, value };
    },
    query: (name, ...filters) => ({ name, filters }),
    getDocs: async ({ name }) => {
      server.cacheReads.push(name);
      return { docs: [], empty: true, metadata: { fromCache: true } };
    },
    getDocsFromServer: read,
    updateDoc: async ({ name, id }, data) => {
      writes.push({ kind: 'update', name, id, data: { ...data } });
      await server.beforeUpdate(id);
      const item = documents[name].get(id);
      if (!item || denied.has(id)) {
        throw Object.assign(Error('update denied'), { code: missingCode.get(id) || 'permission-denied' });
      }
      documents[name].set(id, { ...item, ...data });
    },
    deleteDoc: async ({ name, id }) => {
      writes.push({ kind: 'delete', name, id });
      if (documents[name].get(id)?.userId !== 'a' || denied.has(id)) {
        throw Object.assign(Error('delete denied'), { code: 'permission-denied' });
      }
      documents[name].delete(id);
    },
    writeBatch: () => {
      const entries = [];
      return {
        set: ({ name, id }, data) => entries.push({ kind: 'set', name, id, data: { ...data } }),
        delete: ({ name, id }) => entries.push({ kind: 'delete', name, id }),
        commit: async () => {
          await server.beforeBatch(entries);
          for (const entry of entries) {
            writes.push(entry);
            const { kind, name, id, data } = entry;
            if (kind === 'delete') documents[name].delete(id);
            else documents[name].set(id, { ...documents[name].get(id), ...data });
          }
        },
      };
    },
  };
  return server;
}

function registerLearnedSyncTests(fixture) {
  test('partial failure and restart retry only unacknowledged writes', async () => {
    const h = await fixture();
    await h.edit('c1', 'first edit');
    await h.rate('c2', true);
    await h.rate('c3', true);
    h.server.denied.add('c3');
    await h.connect();
    assert.equal(h.status(), 'error');
    assert.equal(h.pending('c1'), false);
    assert.equal(h.pending('c2'), false);
    assert.equal(h.pending('c3'), true);
    h.server.cards.get('c1').termRichText = 'later edit on another device';
    h.server.cards.get('c2').learned = false;
    h.server.denied.clear();
    await h.reload();
    await h.connect();
    assert.equal(h.status(), 'synced');
    assert.equal(h.server.cards.get('c1').termRichText, 'later edit on another device');
    assert.equal(h.server.cards.get('c2').learned, false);
    assert.equal(h.server.cards.get('c3').learned, true);
  });

  test('retry reads the queue after late acknowledgements and preserves settled siblings', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const h = await fixture();
    let entered, release;
    const started = new Promise(resolve => { entered = resolve; });
    const waiting = new Promise(resolve => { release = resolve; });
    h.server.beforeUpdate = async id => {
      if (id === 'c2') { entered(); await waiting; }
    };
    await h.rate('c1', true);
    await h.rate('c2', true);
    const first = h.connect();
    await Promise.race([started, first]);
    await new Promise(resolve => setImmediate(resolve));
    try {
      assert.equal(h.pending('c1'), false);
      t.mock.timers.tick(20_000);
      await first;
      assert.equal(h.status(), 'error');
      const retry = h.connect();
      await new Promise(resolve => setImmediate(resolve));
      release();
      await retry;
      assert.equal(h.status(), 'synced');
      assert.deepEqual(h.server.writes.map(write => write.id), ['c1', 'c2']);
    } finally { release(); }
  });

  test('a push-only rating removes a remotely deleted card from durable storage', async () => {
    const h = await fixture();
    await h.connect();
    h.server.cards.delete('c1');
    await h.rate('c1', true);
    await h.flush();
    assert.equal(h.cards().some(card => card.id === 'c1'), false);
    assert.equal(h.pending('c1'), false);
    await h.reload();
    assert.equal(h.cards().some(card => card.id === 'c1'), false);
  });

  test('a concurrent text edit to a remotely deleted card survives under a fresh ID', async () => {
    const h = await fixture();
    let release, entered;
    const waiting = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    h.server.cards.delete('c1');
    h.server.beforeUpdate = async () => { entered(); await waiting; };
    await h.rate('c1', true);
    const syncing = h.connect();
    try {
      await Promise.race([started, syncing]);
      await h.edit('c1', 'keep this concurrent edit');
    } finally { release(); }
    await syncing;
    assert.equal(h.server.cards.has('c1'), false);
    assert.equal(h.cards().some(card => card.id === 'c1'), false);
    const copies = [...h.server.cards.values()].filter(card => card.termRichText === 'keep this concurrent edit');
    assert.equal(copies.length, 1);
    assert.equal(copies[0].deckId, 'd1');
  });

  test('offline ratings preserve another device’s card edits and never recreate deleted cards', async () => {
    const h = await fixture();
    const corrected = { termRichText: '<p>corrected elsewhere</p>', definitionRichText: '<p>new answer</p>',
      frontImageUrl: 'https://example.com/new.png', order: 7 };
    h.server.cards.set('c1', { ...h.server.cards.get('c1'), ...corrected });
    h.server.cards.delete('c2');
    h.server.cards.delete('c3');
    h.server.missingCode.set('c3', 'not-found');
    for (const id of ['c1', 'c2', 'c3']) await h.rate(id, true);
    await h.reload();
    await h.connect();

    assert.deepEqual(h.server.cards.get('c1'), { ...seedData().cards[0], ...corrected, learned: true });
    assert.equal(h.cards().find(card => card.id === 'c1').termRichText, corrected.termRichText);
    assert.equal(h.server.cards.has('c2'), false);
    assert.equal(h.server.cards.has('c3'), false);
    assert.deepEqual(h.cards().map(card => card.id).join(','), 'c1');
    assert.equal(h.status(), 'synced');
    assert.equal(h.pending('c1'), false);
    assert.deepEqual(h.server.writes.map(({ kind, id, data }) => ({ kind, id, data })), [
      { kind: 'update', id: 'c1', data: { learned: true } },
      { kind: 'update', id: 'c2', data: { learned: true } },
      { kind: 'update', id: 'c3', data: { learned: true } },
    ]);
  });

  test('new cards, pending body edits in either order, and legacy operations retain full writes', async () => {
    const h = await fixture({ legacy: true });
    const id = await h.create('<p>new card</p>');
    await h.rate(id, true);
    await h.edit('c1', '<p>edit before rating</p>');
    await h.rate('c1', true);
    await h.rate('c2', true);
    await h.edit('c2', '<p>edit after rating</p>');
    await h.rate('c3', true);
    await h.reload();
    await h.connect();

    for (const [cardId, body] of [[id, '<p>new card</p>'], ['c1', '<p>edit before rating</p>'],
      ['c2', '<p>edit after rating</p>'], ['c3', '<p>legacy queued edit</p>']]) {
      assert.equal(h.server.cards.get(cardId).termRichText, body);
      assert.equal(h.server.cards.get(cardId).learned, true);
      assert.equal(h.pending(cardId), false);
      assert.equal(h.server.writes.find(write => write.id === cardId).kind, 'set');
    }
  });

  test('acknowledging an in-flight learned update leaves a newer body edit queued', async () => {
    const h = await fixture();
    let release, entered;
    const wait = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    h.server.beforeUpdate = async () => { entered(); await wait; };
    await h.rate('c1', true);
    const sync = h.connect();
    await Promise.race([started, sync]);
    try {
      assert.deepEqual(h.server.writes[0]?.data, { learned: true });
      await h.edit('c1', '<p>newer local edit</p>');
      assert.equal(h.pending('c1'), true);
    } finally { release(); }
    await sync;

    const changes = h.server.writes.filter(write => write.id === 'c1');
    assert.deepEqual(changes.map(write => write.kind), ['update', 'set']);
    assert.equal(h.server.cards.get('c1').termRichText, '<p>newer local edit</p>');
    assert.equal(h.server.cards.get('c1').learned, true);
    assert.equal(h.pending('c1'), false);
  });

  test('an update denied for a card still owned by the account remains queued', async () => {
    const h = await fixture();
    h.server.denied.add('c1');
    await h.rate('c1', true);
    await h.connect();
    assert.equal(h.status(), 'error');
    assert.equal(h.pending('c1'), true);
    assert.equal(h.server.cards.get('c1').learned, false);

    h.server.denied.clear();
    await h.connect();
    assert.equal(h.status(), 'synced');
    assert.equal(h.pending('c1'), false);
    assert.equal(h.server.cards.get('c1').learned, true);
  });

  test('saving another card in the deck does not turn a rating into a full write', async () => {
    const h = await fixture();
    await h.rate('c1', true);
    h.server.cards.set('c1', { ...h.server.cards.get('c1'), termRichText: '<p>remote edit</p>' });
    await h.editInDeck('c2', '<p>local edit</p>');
    await h.connect();

    assert.equal(h.server.cards.get('c1').termRichText, '<p>remote edit</p>');
    assert.equal(h.server.cards.get('c1').learned, true);
    assert.equal(h.server.cards.get('c2').termRichText, '<p>local edit</p>');
    assert.deepEqual(h.server.writes.filter(write => write.name === 'flashcard_cards').map(
      ({ id, kind }) => [id, kind],
    ), [['c2', 'set'], ['c1', 'update']]);
  });
}

module.exports = { firestoreFixture, registerLearnedSyncTests, seedData };
