const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness } = require('./support.cjs');

function layoutFixture(storage = new Map()) {
  const subscriptions = [];
  const events = new Map();
  let notifications = 0;
  const h = createHarness({}, storage, {
    react: {
      useSyncExternalStore(subscribe, getSnapshot) {
        subscriptions.push(subscribe(() => notifications++));
        return getSnapshot();
      },
    },
  });
  h.window.addEventListener = (event, listener) => events.set(listener, event);
  h.window.removeEventListener = (_event, listener) => events.delete(listener);
  const { useCollectionLayout } = h.load(path.join(h.root, 'hooks/useCollectionLayout.ts'));
  return {
    ...h,
    read: useCollectionLayout,
    notifications: () => notifications,
    storageEvent: (key) => [...events.keys()].forEach((listener) => listener({ key })),
    cleanup: () => subscriptions.forEach((unsubscribe) => unsubscribe()),
    events,
  };
}

test('layout changes update every mounted collection and persist across page reloads', () => {
  const storage = new Map([['flashcard_library_layout', 'list']]);
  const h = layoutFixture(storage);
  assert.equal(h.read().layout, 'list');
  assert.equal(h.read().layout, 'list');
  h.read().setLayout('grid');
  assert.equal(h.notifications(), 3);
  assert.equal(storage.get('flashcard_library_layout'), 'grid');
  assert.equal(h.read().layout, 'grid');
  assert.equal(layoutFixture(storage).read().layout, 'grid');
  h.cleanup();
  assert.equal(h.events.size, 0);
});

test('layout follows changes in another tab, recovers from invalid values and works without storage', () => {
  const h = layoutFixture(new Map([['flashcard_library_layout', 'invalid']]));
  assert.equal(h.read().layout, 'grid');
  h.storage.set('flashcard_library_layout', 'list');
  h.storageEvent('flashcard_library_layout');
  assert.equal(h.read().layout, 'list');
  h.storage.clear();
  h.storageEvent(null);
  assert.equal(h.read().layout, 'grid');
  h.localStorage.setItem = () => { throw new Error('storage disabled'); };
  h.read().setLayout('list');
  assert.equal(h.read().layout, 'list');
  h.cleanup();
});
