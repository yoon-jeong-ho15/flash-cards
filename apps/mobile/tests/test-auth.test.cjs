const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { harness, item, tick, load } = require('./helpers.cjs');
const { seedMockData, mockRootDeck } = load('platform/mockData.ts');

const externals = ['expo', 'firebase/*', '@react-native-async-storage/async-storage', './runtime', '@react-native-google-signin/google-signin'];
const sources = Object.fromEntries(['testAuth', 'firebase', 'auth'].map(name => [name, esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, `../src/platform/${name}.ts`)], bundle: true,
  platform: 'node', format: 'cjs', write: false, external: externals,
}).outputFiles[0].text]));
function evaluate(name, { dev = true, expoGo = true, store } = {}) {
  const calls = [];
  const unexpected = name => () => { calls.push(name); throw new Error(`Unexpected live auth call: ${name}`); };
  const modules = {
    expo: { isRunningInExpoGo: () => expoGo }, './runtime': { store },
    '@react-native-async-storage/async-storage': {},
    'firebase/app': { getApps: unexpected('getApps'), getApp: unexpected('getApp'), initializeApp: unexpected('initializeApp') },
    'firebase/auth': { getAuth: unexpected('getAuth'), initializeAuth: unexpected('initializeAuth'), getReactNativePersistence: unexpected('persistence'),
      GoogleAuthProvider: { credential: unexpected('credential') }, signInWithCredential: unexpected('signInWithCredential'), signOut: unexpected('signOut') },
    'firebase/firestore': { initializeFirestore: unexpected('initializeFirestore') },
    'firebase/storage': { getStorage: unexpected('getStorage') },
  };
  const module = { exports: {} };
  const env = { EXPO_PUBLIC_FIREBASE_API_KEY: 'valid-test-key', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'test-project' };
  new Function('require', 'module', 'exports', '__DEV__', 'process', sources[name])(id => {
    assert.ok(id in modules, `Unexpected import: ${id}`);
    return modules[id];
  }, module, module.exports, dev, { env });
  return { ...module.exports, calls };
}

test('mock login is restricted to development in Expo Go', () => {
  assert.equal(evaluate('testAuth').mockAuthEnabled, true);
  assert.equal(evaluate('testAuth', { dev: false }).mockAuthEnabled, false);
  assert.equal(evaluate('testAuth', { expoGo: false }).mockAuthEnabled, false);
  assert.equal(evaluate('testAuth', { dev: false, expoGo: false }).mockAuthEnabled, false);
});

test('Expo Go test mode does not initialize Firebase even when real configuration is present', () => {
  const firebase = evaluate('firebase');
  assert.equal(firebase.configured, false);
  assert.equal(firebase.auth, null);
  assert.equal(firebase.db, null);
  assert.equal(firebase.storage, null);
  assert.deepEqual(firebase.calls, []);
});

test('mock login/logout preserve separate guest and test data without native login or cloud sync', async () => {
  const firebase = evaluate('firebase');
  let networkCalls = 0;
  const f = harness({ available: firebase.configured, push: async () => { networkCalls++; }, pull: async () => { networkCalls++; return { folders: [], decks: [], cards: [] }; } });
  await f.store.switchUser(null);
  const guestDeck = await f.store.saveDeck(undefined, { title: '게스트 자료' }, [item()]);
  const auth = evaluate('auth', { store: f.store });
  await auth.login();
  assert.equal(f.store.getState().user.displayName, '테스트 사용자');
  assert.equal(f.store.getState().folders.length, 6);
  assert.equal(f.store.getState().decks.length, 16);
  assert.equal(f.store.getState().cards.length, 160);
  const testDeck = await f.store.saveDeck(undefined, { title: '테스트 계정 자료' }, [item()]);
  await f.store.setLearned(f.store.getState().cards[0].id, true);
  await f.store.sync();
  f.store.setOnline(false); f.store.setOnline(true);
  await tick();
  assert.equal(networkCalls, 0);
  assert.equal(f.store.getState().status, 'offline');
  await auth.logout();
  assert.equal(f.store.getState().user, null);
  assert.deepEqual(f.store.getState().decks.map(deck => deck.id), [guestDeck]);
  await auth.login();
  assert.equal(f.store.getState().decks.length, 17);
  assert.ok(f.store.getState().decks.some(deck => deck.id === testDeck));
  assert.equal(f.store.getState().cards[0].learned, true);
  assert.deepEqual(auth.calls, []);
});


test('mock dataset has six folders, two or three decks per folder, ten cards per deck and varied progress', async () => {
  const f = harness();
  const { mockUser } = evaluate('testAuth');
  await f.store.switchUser(mockUser);
  await seedMockData(f.store, mockUser.uid);
  const state = f.store.getState();
  assert.equal(state.folders.length, 6);
  assert.equal(state.decks.length, 16);
  assert.equal(state.cards.length, 160);
  const root = state.decks.filter(deck => !deck.folderId);
  assert.equal(root.length, 1);
  assert.equal(root[0].title, mockRootDeck.title);
  for (const folder of state.folders) {
    const count = state.decks.filter(deck => deck.folderId === folder.id).length;
    assert.ok(count === 2 || count === 3);
  }
  const progress = new Set();
  for (const deck of state.decks) {
    const cards = state.cards.filter(card => card.deckId === deck.id);
    assert.equal(cards.length, 10);
    assert.equal(new Set(cards.map(card => card.termRichText)).size, 10);
    assert.ok(cards.every(card => card.termRichText && card.definitionRichText && card.userId === mockUser.uid));
    progress.add(cards.filter(card => card.learned).length);
  }
  assert.deepEqual([...progress].sort((a, b) => a - b), [0, 4, 10]);
  const edited = state.cards[0];
  await f.store.updateCard(edited.id, { termRichText: '<p>직접 수정한 카드</p>' });
  await f.store.deleteDeck(state.decks[0].id);
  await f.store.switchUser(null);
  assert.equal(f.store.getState().decks.length, 0);
  await f.store.switchUser(mockUser);
  await seedMockData(f.store, mockUser.uid);
  assert.equal(f.store.getState().decks.length, 15, 'deleted decks are not recreated');
  assert.equal(f.store.getState().cards.find(card => card.id === edited.id).termRichText, '<p>직접 수정한 카드</p>');
});

test('an interrupted mock seed resumes without duplicating folders or decks', async () => {
  const f = harness();
  const { mockUser } = evaluate('testAuth');
  await f.store.switchUser(mockUser);
  const original = f.store.saveDeck;
  f.store.saveDeck = async (...args) => {
    if (args[1].title === '웹 개발 용어') throw new Error('device storage unavailable');
    return original(...args);
  };
  await assert.rejects(seedMockData(f.store, mockUser.uid), /device storage/);
  assert.equal(f.store.getState().preferences.mockDataVersion, undefined);
  f.store.saveDeck = original;
  await seedMockData(f.store, mockUser.uid);
  assert.equal(f.store.getState().folders.length, 6);
  assert.equal(f.store.getState().decks.length, 16);
  assert.equal(f.store.getState().cards.length, 160);
  assert.equal(f.store.getState().preferences.mockDataVersion, 2);
});


test('version-one accounts receive only the unfiled deck and preserve edited or deleted folder data', async () => {
  const f = harness();
  const { mockUser } = evaluate('testAuth');
  await f.store.switchUser(mockUser);
  await seedMockData(f.store, mockUser.uid);
  const before = f.store.getState();
  await f.store.deleteDeck(before.decks.find(deck => !deck.folderId).id);
  const removed = before.decks.find(deck => deck.folderId);
  await f.store.deleteDeck(removed.id);
  const folder = before.folders[0];
  await f.store.saveFolder(folder.id, '내가 바꾼 폴더 이름', '내 설명');
  await f.store.setPreferences({ mockDataVersion: 1 });
  await seedMockData(f.store, mockUser.uid);
  const state = f.store.getState();
  assert.equal(state.folders.length, 6);
  assert.equal(state.folders.find(item => item.id === folder.id).title, '내가 바꾼 폴더 이름');
  assert.ok(!state.decks.some(deck => deck.id === removed.id || deck.title === removed.title));
  const root = state.decks.filter(deck => !deck.folderId);
  assert.equal(root.length, 1);
  assert.equal(state.cards.filter(card => card.deckId === root[0].id).length, 10);
  assert.equal(state.preferences.mockDataVersion, 2);
  await seedMockData(f.store, mockUser.uid);
  assert.equal(f.store.getState().decks.length, state.decks.length);
});
