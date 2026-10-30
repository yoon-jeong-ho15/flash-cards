const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { harness: storeHarness, item, load } = require('./helpers.cjs');
const { folderCards } = load('core/content.ts');

const externals = ['react', 'react-native', '../platform/runtime', '../editor/RichText', './kit', './CardComposer', './Icon', './useSwipeMotion', './FolderForm'];
const sources = Object.fromEntries(['Study', 'Library'].map(name => [name, esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, `../src/ui/${name}.tsx`)], bundle: true, platform: 'node', format: 'cjs',
  write: false, external: externals, tsconfigRaw: { compilerOptions: { jsx: 'react' } },
}).outputFiles[0].text]));

// Render the actual screen functions with deterministic hooks and native view stubs.
function screenHarness(store, screen) {
  const slots = [];
  let cursor = 0, dirty = false, effects = [], swipeProps;
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
  const effect = (fn, deps) => {
    const i = cursor++;
    if (changed(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: 'Fragment',
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect: effect, useLayoutEffect: effect, useDeferredValue: value => value,
  };
  class Value { setValue() {} stopAnimation() {} interpolate() { return 0; } }
  const native = { StyleSheet: { create: value => value }, Animated: { Value, View: 'Animated.View' }, Easing: {},
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
    ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'FlatList', 'ActivityIndicator'].map(name => [name, name])),
  };
  const mocks = {
    react, 'react-native': native, '../platform/runtime': { store, useStore: () => store.getState() },
    '../editor/RichText': { RichText: 'RichText' }, './CardComposer': { CardComposer: 'CardComposer' },
    './Icon': { Icon: 'Icon' }, './FolderForm': { FolderForm: 'FolderForm' },
    './kit': { colors: {}, s: {}, useImage: () => () => {}, showError: error => { throw error; },
      ...Object.fromEntries(['Attachment', 'Button', 'Empty', 'Progress', 'Chips', 'Field', 'Select', 'ProgressRing', 'Sheet'].map(name => [name, name])),
    },
    './useSwipeMotion': { useSwipeMotion: props => { swipeProps = props; return { panHandlers: {}, style: {}, transitioning: false }; } },
  };
  const module = { exports: {} };
  const deterministicMath = Object.assign(Object.create(Math), { random: () => 0 });
  new Function('require', 'module', 'exports', 'Math', sources[screen])(name => {
    assert.ok(name in mocks, `Unexpected screen dependency: ${name}`);
    return mocks[name];
  }, module, module.exports, deterministicMath);
  return {
    render(props) {
      let tree, count = 0;
      do {
        dirty = false; cursor = 0; effects = [];
        tree = module.exports[screen === 'Library' ? 'DeckLibrary' : 'Study'](props);
        effects.forEach(fn => fn());
        assert.ok(++count < 20, 'screen should settle without a render loop');
      } while (dirty);
      return tree;
    },
    next: () => swipeProps.onNavigate(1, swipeProps.cardId),
    currentId: () => swipeProps.cardId,
    cleanup: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.ListHeaderComponent)];
}
const button = (tree, title) => {
  const found = nodes(tree).find(node => node.type === 'Button' && node.props.title === title);
  assert.ok(found, `Missing button: ${title}`);
  return found.props;
};
const text = tree => !tree || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree)
  : Array.isArray(tree) ? tree.map(text).join('') : text(tree.props?.children);

async function fixture() {
  const { store } = storeHarness();
  await store.switchUser(null);
  const folder = await store.saveFolder(undefined, '전체 학습', '');
  const other = await store.saveFolder(undefined, '다른 폴더', '');
  const empty = await store.saveFolder(undefined, '빈 폴더', '');
  const first = await store.saveDeck(undefined, { title: '영어', folderId: folder }, [item('apple'), item('banana')]);
  const second = await store.saveDeck(undefined, { title: '수학', folderId: folder }, [item('원의 넓이')]);
  await store.saveDeck(undefined, { title: '다른 덱', folderId: other }, [item('outside')]);
  await store.saveDeck(undefined, { title: '미분류 덱' }, [item('root')]);
  const own = folderCards(store.getState().cards, store.getState().decks, folder);
  await store.setLearned(own[0].id, true);
  await store.setPreferences({ lastStudiedDeckId: first });
  return { store, folder, other, empty, first, second, ids: own.map(card => card.id) };
}

test('folder screen launches all-card study even when its deck list is filtered and disables empty folders', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Library');
  let destination;
  const props = { folderId: f.folder, nav: { go: route => { destination = route; }, back() {} } };
  try {
    let tree = screen.render(props);
    nodes(tree).find(node => node.type === 'Field').props.onChangeText('검색 결과 없음');
    tree = screen.render(props);
    assert.equal(nodes(tree).find(node => node.type === 'FlatList').props.data.length, 0);
    assert.equal(button(tree, '폴더 전체 랜덤 학습').disabled, false);
    button(tree, '폴더 전체 랜덤 학습').onPress();
    assert.deepEqual(destination, { type: 'folder-study', folderId: f.folder });
    const empty = screen.render({ ...props, folderId: f.empty });
    assert.equal(button(empty, '폴더 전체 랜덤 학습').disabled, true);
  } finally { screen.cleanup(); }
});

test('folder study shuffles all cards once, retains learned cards, shows source decks and returns to the folder', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  let exits = 0;
  const props = { folderId: f.folder, onExit: () => exits++ };
  try {
    const seen = [];
    for (let i = 0; i < 3; i++) {
      const tree = screen.render(props);
      seen.push(screen.currentId());
      const card = f.store.getState().cards.find(card => card.id === screen.currentId());
      const deck = f.store.getState().decks.find(deck => deck.id === card.deckId);
      assert.ok(text(tree).includes(`현재 덱: ${deck.title}`));
      screen.next();
    }
    assert.deepEqual(seen, [f.ids[1], f.ids[2], f.ids[0]]);
    assert.equal(f.store.getState().preferences.lastStudiedDeckId, f.first);
    const finished = screen.render(props);
    button(finished, '폴더로 돌아가기').onPress();
    assert.equal(exits, 1);
    button(finished, '미학습 카드 다시 학습').onPress();
    let tree = screen.render(props);
    assert.ok(text(tree).includes('카드 1/2'));
    assert.notEqual(screen.currentId(), f.ids[0]);
    screen.next(); screen.render(props); screen.next();
    tree = screen.render(props);
    button(tree, '전체 카드 다시 학습').onPress();
    assert.ok(text(screen.render(props)).includes('카드 1/3'));
  } finally { screen.cleanup(); }
});

test('folder study preserves position on edits/progress and reconciles deletion and moved decks', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  const props = { folderId: f.folder, onExit() {} };
  try {
    screen.render(props); screen.next(); screen.render(props);
    assert.equal(screen.currentId(), f.ids[2]);
    await f.store.updateCard(f.ids[2], { termRichText: '<p>수정한 질문</p>', definitionRichText: '<p>정답</p>' });
    await f.store.setLearned(f.ids[2], true);
    const edited = screen.render(props);
    assert.equal(screen.currentId(), f.ids[2]);
    assert.ok(nodes(edited).some(node => node.type === 'RichText' && node.props.html === '<p>수정한 질문</p>'));
    assert.equal(f.store.getState().cards.find(card => card.id === f.ids[2]).deckId, f.second);
    await f.store.deleteCard(f.ids[1]); screen.render(props);
    assert.equal(screen.currentId(), f.ids[2]);
    await f.store.moveDeck(f.second, f.other); screen.render(props);
    assert.equal(screen.currentId(), f.ids[0]);
    await f.store.deleteCard(f.ids[0]);
    assert.ok(nodes(screen.render(props)).some(node => node.type === 'Empty' && node.props.title === '학습할 카드가 없어요'));
  } finally { screen.cleanup(); }
});

test('deck study still excludes learned cards and keeps the original ordering', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  try {
    screen.render({ deckId: f.first, onExit() {} });
    assert.equal(screen.currentId(), f.ids[1]);
    screen.next();
    const tree = screen.render({ deckId: f.first, onExit() {} });
    button(tree, '전체 카드 다시 학습').onPress();
    screen.render({ deckId: f.first, onExit() {} });
    assert.equal(screen.currentId(), f.ids[0]);
  } finally { screen.cleanup(); }
});
