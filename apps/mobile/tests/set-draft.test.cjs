const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');
const React = require('react');
const { act } = React;
const { harness, deferred, item, tick, user, accountKey } = require('./helpers.cjs');

const source = esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, '../src/ui/SetEditor.tsx')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  external: [
    'react', 'react-native', 'expo-crypto', '../platform/runtime',
    './theme', './Typography', './kit', './CardComposer', './FolderPicker', './Icon',
  ],
}).outputFiles[0].text;

async function fixture(t) {
  const dom = new JSDOM('<div id="app"></div>');
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  let root;

  const { store, storage, map } = harness();
  const uid = 'author';
  await store.switchUser(user(uid));
  const setId = await store.saveSet(undefined, { title: 'Original' }, [item()]);
  const key = store.draftKey(setId);
  const guard = { current: null };
  const events = [];
  const errors = [];
  const alerts = [];
  const timers = new Map();
  const listeners = new Set();
  let nextTimer = 0;
  let nextCard;
  let composer;
  const passthrough = ({ children }) => children;
  const hidden = () => null;
  const Button = ({ title, disabled, busy, onPress }) =>
    React.createElement('button', { disabled: disabled || busy, onClick: onPress }, title);
  const CardComposer = React.forwardRef(({ card, onChange }, ref) => {
    composer = { card, onChange };
    React.useImperativeHandle(ref, () => ({
      async flush() {
        events.push('flush');
        const value = nextCard ? { ...card, ...nextCard } : card;
        onChange(value);
        return value;
      },
    }));
    return null;
  });
  const stop = () => {
    if (root) {
      act(() => root.unmount());
      root = null;
    }
  };
  t.after(() => {
    stop();
    dom.window.close();
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  const mocks = {
    react: React,
    'react-native': {
      View: passthrough, ScrollView: passthrough, Pressable: passthrough,
      Alert: { alert: (_title, _message, buttons) => alerts.push(buttons) },
      AppState: { addEventListener: (_event, listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      } },
    },
    'expo-crypto': { randomUUID: () => 'temp' },
    '../platform/runtime': {
      store,
      useStore: () => React.useSyncExternalStore(store.subscribe, store.getState, store.getState),
    },
    './theme': { useUI: () => ({ colors: {}, s: {} }) },
    './Typography': { Text: passthrough },
    './kit': {
      Button, Empty: hidden, Field: hidden, Sheet: hidden,
      showError: (error) => errors.push(error.message),
      attempt: async (action) => {
        try { await action(); } catch (error) { errors.push(error.message); }
      },
    },
    './CardComposer': { CardComposer },
    './FolderPicker': { FolderPicker: hidden },
    './Icon': { Icon: hidden },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', source)(
    (name) => mocks[name] ?? require(name), module, module.exports,
    (callback, delay) => {
      const id = ++nextTimer;
      timers.set(id, { callback: () => { timers.delete(id); callback(); }, delay });
      return id;
    },
    (id) => timers.delete(id),
  );

  const setItem = storage.setItem;
  const removeItem = storage.removeItem;
  storage.setItem = async (storageKey, value) => {
    events.push(storageKey === key ? 'write draft' : 'write set');
    await setItem(storageKey, value);
  };
  storage.removeItem = async (storageKey) => {
    events.push('remove draft');
    await removeItem(storageKey);
  };

  return {
    store, storage, map, key, setId, accountKey: accountKey(uid), events, errors, timers, listeners,
    mount: () => act(async () => {
      root = createRoot(dom.window.document.getElementById('app'));
      root.render(React.createElement(module.exports.SetEditor, {
        setId, guard,
        onClose: () => events.push('close'),
        onSaved: () => events.push('saved'),
      }));
    }),
    stop,
    press: (label) => act(async () => {
      const button = [...dom.window.document.querySelectorAll('button')]
        .find((button) => button.textContent === label);
      assert.ok(button, label);
      button.click();
      await tick();
    }),
    leave: (label) => act(async () => {
      guard.current();
      const action = alerts.at(-1)?.find((button) => button.text === label);
      assert.ok(action, label);
      action.onPress();
      await tick();
    }),
    changeCard: (term) => act(() => composer.onChange({ ...composer.card, ...item(term) })),
    editorCard: () => composer.card,
    flushWith: (term) => { nextCard = item(term); },
    appState: (status) => act(async () => {
      for (const listener of listeners) listener(status);
      await tick();
    }),
  };
}

async function seedDraft(h) {
  const value = {
    title: 'Recovered', description: '', folderId: null,
    cards: [{ ...h.store.getState().cards[0], ...item('restored body') }],
    savedAt: 42,
  };
  await h.store.writeDraft(h.key, value);
  h.events.length = 0;
}

test('restore waits for a decision, then saves the latest edit on debounce, background and unmount', async (t) => {
  const h = await fixture(t);
  await seedDraft(h);
  const originalDraft = h.map.get(h.key);
  await h.mount();
  assert.equal(h.timers.size, 0);
  await h.appState('background');
  assert.equal(h.map.get(h.key), originalDraft);

  await h.press('임시 저장본 복원');
  assert.equal(h.editorCard().termRichText, '<p>restored body</p>');
  const oldTimer = [...h.timers.values()][0];
  h.changeCard('debounced edit');
  const [timer] = h.timers.values();
  assert.equal(h.timers.size, 1);
  assert.equal(timer.delay, 1000);
  await act(async () => { oldTimer.callback(); await tick(); });
  assert.deepEqual(h.events, []);
  await act(async () => { timer.callback(); await tick(); });
  assert.equal((await h.store.readDraft(h.key)).cards[0].termRichText, '<p>debounced edit</p>');

  h.changeCard('background edit');
  await h.appState('active');
  assert.equal(h.events.length, 1);
  await h.appState('background');
  assert.equal((await h.store.readDraft(h.key)).cards[0].termRichText, '<p>background edit</p>');

  h.changeCard('unmount edit');
  h.stop();
  await tick();
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.size, 0);
  assert.equal((await h.store.readDraft(h.key)).cards[0].termRichText, '<p>unmount edit</p>');
});

test('discarding a recovery keeps the original set and leaves no draft on exit', async (t) => {
  const h = await fixture(t);
  await seedDraft(h);
  await h.mount();
  await h.press('임시 저장본 버리기');
  assert.equal(h.editorCard().termRichText, '<p>질문</p>');
  assert.equal(h.timers.size, 0);
  await h.appState('background');
  h.stop();
  await tick();
  assert.equal(await h.store.readDraft(h.key), null);
  assert.deepEqual(h.events, ['remove draft']);
});

test('discard and leave deletes after an in-flight draft write and blocks later callbacks', async (t) => {
  const h = await fixture(t);
  await h.mount();
  h.changeCard('discard me');
  const [timer] = h.timers.values();
  const [background] = h.listeners;
  const pendingWrite = deferred();
  const setItem = h.storage.setItem;
  h.storage.setItem = async (...args) => {
    await pendingWrite.promise;
    await setItem(...args);
  };

  await h.appState('background');
  await h.leave('변경 버리기');
  assert.equal(h.timers.size, 0);
  await h.appState('inactive');
  await act(async () => {
    timer.callback();
    pendingWrite.resolve();
    await tick();
  });
  h.stop();
  background('background');
  await tick();
  assert.equal(await h.store.readDraft(h.key), null);
  assert.deepEqual(h.events, ['write draft', 'remove draft', 'close']);
});

test('save draft and leave flushes the editor before persisting and closing', async (t) => {
  const h = await fixture(t);
  await h.mount();
  h.changeCard('edited');
  h.flushWith('latest from editor');
  await h.leave('임시 저장 후 나가기');
  assert.deepEqual(h.events, ['flush', 'write draft', 'close']);
  assert.equal((await h.store.readDraft(h.key)).cards[0].termRichText, '<p>latest from editor</p>');
});

test('successful final save flushes first and removes drafts queued during the save', async (t) => {
  const h = await fixture(t);
  await seedDraft(h);
  await h.mount();
  await h.press('임시 저장본 복원');
  h.flushWith('final body');
  const pendingSave = deferred();
  const setItem = h.storage.setItem;
  h.storage.setItem = async (key, value) => {
    if (key === h.accountKey) await pendingSave.promise;
    await setItem(key, value);
  };

  await h.press('세트 저장');
  assert.deepEqual(h.events, ['flush']);
  const [timer] = h.timers.values();
  await h.appState('background');
  await act(async () => { pendingSave.resolve(); await tick(); });
  assert.equal(h.timers.size, 0);
  await act(async () => { timer.callback(); await tick(); });
  h.stop();
  await tick();
  const saved = JSON.parse(h.map.get(h.accountKey));
  assert.equal(saved.cards[0].termRichText, '<p>final body</p>');
  assert.equal(await h.store.readDraft(h.key), null);
  assert.deepEqual(h.events, ['flush', 'write set', 'write draft', 'remove draft', 'saved']);
});

test('failed final save persists the flushed edits for recovery before closing the editor', async (t) => {
  const h = await fixture(t);
  await h.mount();
  h.flushWith('keep after failure');
  const setItem = h.storage.setItem;
  h.storage.setItem = async (key, value) => {
    if (key === h.accountKey) throw new Error('set write failed');
    await setItem(key, value);
  };

  await h.press('세트 저장');
  assert.deepEqual(h.errors, ['set write failed']);
  assert.deepEqual(h.events, ['flush', 'write draft']);
  assert.equal((await h.store.readDraft(h.key)).cards[0].termRichText, '<p>keep after failure</p>');
  assert.equal(h.store.getState().cards[0].termRichText, '<p>질문</p>');
  h.stop();
  await tick();

  await h.mount();
  await h.press('임시 저장본 복원');
  assert.equal(h.editorCard().termRichText, '<p>keep after failure</p>');
});
