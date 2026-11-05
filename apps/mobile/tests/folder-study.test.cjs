const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { harness: storeHarness, item, load } = require('./helpers.cjs');
const { folderCards } = load('core/content.ts');

const externals = ['react', 'react-native', 'expo-haptics', '../platform/runtime', '../editor/RichText', './kit', './CardComposer', './Icon', './useSwipeMotion', './FolderForm', './FolderPicker', './Library', './Typography', './theme'];
const sources = Object.fromEntries(['Study', 'Library', 'DeckDetail', 'StudySetup'].map(name => [name, esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, `../src/ui/${name}.tsx`)], bundle: true, platform: 'node', format: 'cjs',
  write: false, external: externals, tsconfigRaw: { compilerOptions: { jsx: 'react' } },
}).outputFiles[0].text]));

// Render the actual screen functions with deterministic hooks and native view stubs.
function screenHarness(store, screen, exportName = screen === 'Library' ? 'DeckLibrary' : screen, dimensions = { width: 390, fontScale: 1 }) {
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
  const native = { useWindowDimensions: () => dimensions, StyleSheet: { create: value => value }, Animated: { Value, View: 'Animated.View', timing: () => ({ start() {} }) }, Easing: { inOut: value => value, cubic: 'cubic' },
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
    ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'FlatList', 'ActivityIndicator'].map(name => [name, name])),
  };
  const mocks = {
    './Typography': { Text: 'Text', TextInput: 'TextInput' },
    './theme': { useUI: () => ({ colors: {}, s: {}, uiScale: 1, dark: false }), useThemedStyles: factory => factory({}), radius: { control: 10, card: 12, sheet: 20 } },
    react, 'react-native': native, '../platform/runtime': { store, useStore: () => store.getState() },
    '../editor/RichText': { RichText: 'RichText' }, './CardComposer': { CardComposer: 'CardComposer' },
    './Library': { deckAccent: () => ({ bg: '#FFFFFF', ink: '#000000' }) }, './FolderPicker': { FolderPicker: 'FolderPicker' },
    './Icon': { Icon: 'Icon' }, './FolderForm': { FolderForm: 'FolderForm' },
    './kit': { colors: {}, s: {}, useImage: () => () => {}, showError: error => { throw error; },
      ...Object.fromEntries(['Attachment', 'Button', 'Empty', 'Progress', 'Chips', 'Field', 'Select', 'ProgressRing', 'Sheet'].map(name => [name, name])),
    },
    './useSwipeMotion': { useSwipeMotion: props => { swipeProps = props; return { panHandlers: {}, style: {}, transitioning: false, prepareFlip: () => true }; } },
    'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Light: 'light' } },
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
        tree = module.exports[exportName](props);
        effects.forEach(fn => fn());
        assert.ok(++count < 20, 'screen should settle without a render loop');
      } while (dirty);
      return tree;
    },
    next: () => swipeProps.onNavigate(1, swipeProps.cardId),
    currentId: () => swipeProps.cardId,
    swipeDisabled: () => swipeProps.disabled,
    startSwipe: () => swipeProps.onSwipeStart?.(),
    cleanup: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.ListHeaderComponent), ...nodes(tree.props?.ListFooterComponent)];
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

test('library folder supports filtering and keeps study actions in the study tab', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Library');
  let destination;
  const props = { folderId: f.folder, nav: { go: route => { destination = route; }, back() {} } };
  try {
    let tree = screen.render(props);
    nodes(tree).find(node => node.type === 'Field').props.onChangeText('검색 결과 없음');
    tree = screen.render(props);
    assert.equal(nodes(tree).find(node => node.type === 'FlatList').props.data.length, 0);
    assert.ok(!nodes(tree).some(node => node.type === 'Button' && node.props.title === '폴더 전체 랜덤 학습'));
    const empty = screen.render({ ...props, folderId: f.empty });
    assert.equal(nodes(empty).find(node => node.type === 'FlatList').props.data.length, 0);
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

test('rating marks card as learned without advancing and ignores repeated taps while saving', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  const props = { deckId: f.first, onExit() {} };
  const original = f.store.setLearned.bind(f.store);
  let finishSave, calls = 0;
  f.store.setLearned = async (...args) => {
    calls++;
    await new Promise(resolve => { finishSave = resolve; });
    return original(...args);
  };
  try {
    const tree = screen.render(props);
    const id = screen.currentId();
    const rate = button(tree, '알아요');
    rate.onPress(); rate.onPress();
    assert.equal(calls, 1);
    screen.render(props);
    assert.equal(screen.currentId(), id, 'the card stays visible until durable storage succeeds');
    finishSave();
    await new Promise(resolve => setImmediate(resolve));
    f.store.setLearned = original;
    const currentScreen = screen.render(props);
    assert.equal(f.store.getState().cards.find(card => card.id === id).learned, true);
    assert.equal(screen.currentId(), id, 'the card stays on screen without advancing');
    assert.ok(text(currentScreen).includes('알아요'), 'card displays learned badge');
    assert.ok(button(currentScreen, '몰라요'), 'displays 몰라요 button when card is learned');
    const cancelRate = button(currentScreen, '몰라요');
    cancelRate.onPress();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.store.getState().cards.find(card => card.id === id).learned, false);
    const toggledScreen = screen.render(props);
    assert.ok(button(toggledScreen, '알아요'), 'reverts to 알아요 button when unlearned');
    button(toggledScreen, '알아요').onPress();
    await new Promise(resolve => setImmediate(resolve));
    screen.next();
    const finished = screen.render(props);
    assert.ok(text(finished).includes('모두 기억했어요!'));
    assert.ok(button(finished, '미학습 카드 다시 학습').disabled);
  } finally { screen.cleanup(); }
});

test('review starts immediately for an already mastered deck and Again clears the learned flag', async () => {
  const f = await fixture();
  await f.store.setLearned(f.ids[1], true);
  const screen = screenHarness(f.store, 'Study');
  const props = { deckId: f.first, onExit() {} };
  try {
    const tree = screen.render(props);
    assert.equal(screen.currentId(), f.ids[0], 'all learned cards are included in a new review');
    button(tree, '다시 볼게요').onPress();
    await new Promise(resolve => setImmediate(resolve));
    screen.render(props);
    assert.equal(f.store.getState().cards.find(card => card.id === f.ids[0]).learned, false);
    assert.equal(screen.currentId(), f.ids[1], 'the next card follows automatically');
  } finally { screen.cleanup(); }
});

test('a swipe interrupts card flipping instead of waiting for the flip animation', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  const props = { deckId: f.first, onExit() {} };
  const flipControl = tree => nodes(tree).find(node => node.type === 'Pressable'
    && node.props.accessibilityLabel === '카드 뒤집기');
  try {
    let tree = screen.render(props);
    flipControl(tree).props.onPress();
    tree = screen.render(props);
    assert.equal(button(tree, '알아요').disabled, true, 'rating stays disabled while the flip animation is in progress');
    assert.equal(screen.swipeDisabled(), false, 'flipping must not block a new swipe');
    screen.startSwipe();
    tree = screen.render(props);
    assert.equal(button(tree, '알아요').disabled, false, 'the new swipe immediately cancels the flip');
    screen.next();
    assert.ok(button(screen.render(props), '전체 카드 다시 학습'));
  } finally { screen.cleanup(); }
});


test('study picker separates folder tiles from unfiled decks and preserves setup navigation', async () => {
  const f = await fixture();
  const emptyDeck = await f.store.saveDeck(undefined, { title: '빈 미분류 덱' }, [item()]);
  await f.store.deleteCard(f.store.getState().cards.find(card => card.deckId === emptyDeck).id);
  const screen = screenHarness(f.store, 'Library', 'StudyLibrary');
  let destination;
  try {
    const tree = screen.render({ nav: { go: route => { destination = route; } } });
    const list = nodes(tree).find(node => node.type === 'FlatList');
    assert.equal(list.props.data.length, 3);
    const row = item => nodes(list.props.renderItem({ item })).find(node => node.type === 'Pressable').props;
    const folder = list.props.data.find(item => item.id === f.folder);
    assert.equal(folder.count, 3, 'folder includes learned cards and cards from all its decks');
    assert.equal(folder.learned, 1);
    row(folder).onPress();
    assert.deepEqual(destination, { type: 'study-folder', folderId: f.folder });
    row(list.props.data.find(item => item.id === f.empty)).onPress();
    assert.deepEqual(destination, { type: 'study-folder', folderId: f.empty });
    const unfiled = nodes(list.props.ListFooterComponent).filter(node => node.type === 'Pressable');
    assert.equal(unfiled.length, 2);
    const deck = unfiled.find(node => node.props.accessibilityLabel.startsWith('미분류 덱,'));
    deck.props.onPress();
    assert.deepEqual(destination, { type: 'study-options', deckId: f.store.getState().decks.find(deck => deck.title === '미분류 덱').id });
    assert.equal(unfiled.find(node => node.props.accessibilityLabel.startsWith('빈 미분류 덱,')).props.disabled, true);
  } finally { screen.cleanup(); }
});

test('study picker adapts to narrow screens and enlarged text and supports unfiled-only and empty libraries', async () => {
  const f = await fixture();
  const nav = { go() {}, back() {} };
  for (const [dimensions, columns] of [
    [{ width: 390, fontScale: 1 }, 2], [{ width: 320, fontScale: 1 }, 1],
    [{ width: 390, fontScale: 1.5 }, 1], [{ width: 768, fontScale: 1 }, 3],
  ]) {
    const screen = screenHarness(f.store, 'Library', 'StudyLibrary', dimensions);
    assert.equal(screen.render({ nav }).props.numColumns, columns);
    screen.cleanup();
  }
  for (const folder of f.store.getState().folders) await f.store.deleteFolder(folder.id);
  const screen = screenHarness(f.store, 'Library', 'StudyLibrary');
  try {
    const tree = screen.render({ nav });
    assert.equal(tree.props.data.length, 0);
    assert.equal(tree.props.ListEmptyComponent, undefined);
    assert.equal(nodes(tree.props.ListFooterComponent).filter(node => node.type === 'Pressable').length, f.store.getState().decks.length);
    for (const deck of f.store.getState().decks) await f.store.deleteDeck(deck.id);
    const empty = screen.render({ nav });
    assert.equal(empty.props.ListFooterComponent, undefined);
    assert.ok(empty.props.ListEmptyComponent);
  } finally { screen.cleanup(); }
});


test('deck detail prioritizes adding and editing cards instead of starting study', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'DeckDetail');
  let destination;
  try {
    const props = { deckId: f.first, nav: { go: route => { destination = route; }, back() {} } };
    const tree = screen.render(props);
    const displayedText = nodes(tree).filter(node => node.type === 'Text').map(text).join('');
    assert.ok(displayedText.includes('카드 관리'));
    assert.ok(!displayedText.includes('어떻게 학습할까요?'));
    assert.equal(nodes(tree).filter(node => node.props?.accessibilityRole === 'radio').length, 0);
    assert.equal(nodes(tree).filter(node => node.type === 'Button' && /학습 시작|전체 카드 복습/.test(node.props.title)).length, 0);
    button(tree, '카드 추가하기').onPress();
    assert.deepEqual(destination, { type: 'edit-deck', deckId: f.first, appendCard: true });
    assert.equal(button(tree, '학습하기').tone, 'secondary');
    button(tree, '학습하기').onPress();
    assert.deepEqual(destination, { type: 'study-options', deckId: f.first });
    const list = nodes(tree).find(node => node.type === 'FlatList');
    const card = list.props.data[0];
    const edit = nodes(list.props.renderItem({ item: card })).find(node => node.props?.accessibilityLabel === '카드 수정');
    edit.props.onPress();
    assert.deepEqual(destination, { type: 'edit-deck', deckId: f.first, focusCardId: card.id });
    nodes(tree).find(node => node.type === 'Field').props.onChangeText('검색 결과 없음');
    assert.equal(button(screen.render(props), '학습하기').disabled, false);
    for (const card of f.store.getState().cards.filter(card => card.deckId === f.first)) await f.store.deleteCard(card.id);
    assert.equal(button(screen.render(props), '학습하기').disabled, true);
  } finally { screen.cleanup(); }
});


test('study folder offers ordered and random study plus compact per-deck setup actions', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'StudySetup', 'StudyFolder');
  let destination;
  const props = { folderId: f.folder, nav: { go: route => { destination = route; }, back() {} } };
  try {
    const tree = screen.render(props);
    button(tree, '폴더 전체 정방향 학습').onPress();
    assert.deepEqual(destination, { type: 'folder-study', folderId: f.folder, shuffle: false });
    button(tree, '폴더 전체 랜덤 학습').onPress();
    assert.deepEqual(destination, { type: 'folder-study', folderId: f.folder, shuffle: true });
    const list = nodes(tree).find(node => node.type === 'FlatList');
    assert.deepEqual(new Set(list.props.data.map(deck => deck.id)), new Set([f.first, f.second]));
    const play = nodes(list.props.renderItem({ item: list.props.data[0] })).find(node => node.props?.accessibilityLabel === `${list.props.data[0].title} 학습하기`);
    assert.equal(play.props.accessibilityRole, 'button');
    play.props.onPress();
    assert.deepEqual(destination, { type: 'study-options', deckId: list.props.data[0].id });
    const empty = screen.render({ ...props, folderId: f.empty });
    assert.equal(nodes(empty).find(node => node.type === 'FlatList').props.data.length, 0);
    assert.equal(button(empty, '폴더 전체 정방향 학습').disabled, true);
    assert.equal(button(empty, '폴더 전체 랜덤 학습').disabled, true);
    await f.store.deleteFolder(f.folder);
    assert.ok(nodes(screen.render(props)).some(node => node.type === 'Empty' && node.props.title === '폴더를 찾을 수 없어요'));
  } finally { screen.cleanup(); }
});

test('deck setup starts all cards in the chosen order and prevents starting an empty deck', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'StudySetup', 'DeckStudyOptions');
  let destination;
  const props = { deckId: f.first, nav: { go: route => { destination = route; }, back() {} } };
  try {
    let tree = screen.render(props);
    button(tree, '학습 시작하기').onPress();
    assert.deepEqual(destination, { type: 'study', deckId: f.first, shuffle: false, onlyDifficult: false });
    const radio = nodes(tree).find(node => node.props?.accessibilityRole === 'radio' && node.props.accessibilityLabel === '순서 섞어 학습');
    radio.props.onPress();
    tree = screen.render(props);
    assert.equal(nodes(tree).find(node => node.props?.accessibilityLabel === '순서 섞어 학습').props.accessibilityState.checked, true);
    button(tree, '학습 시작하기').onPress();
    assert.deepEqual(destination, { type: 'study', deckId: f.first, shuffle: true, onlyDifficult: false });
    for (const card of f.store.getState().cards.filter(card => card.deckId === f.first)) await f.store.deleteCard(card.id);
    assert.equal(button(screen.render(props), '학습 시작하기').disabled, true);
    await f.store.deleteDeck(f.first);
    assert.ok(nodes(screen.render(props)).some(node => node.type === 'Empty' && node.props.title === '덱을 찾을 수 없어요'));
  } finally { screen.cleanup(); }
});

test('explicit ordered deck study starts at card one including learned cards, while shuffle permutes all cards', async () => {
  const f = await fixture();
  for (const shuffle of [false, true]) {
    const screen = screenHarness(f.store, 'Study');
    const props = { deckId: f.first, shuffle, unlearnedOnly: false, onExit() {} };
    try {
      screen.render(props);
      const seen = [screen.currentId()];
      screen.next();
      screen.render(props);
      seen.push(screen.currentId());
      assert.deepEqual(seen, shuffle ? [f.ids[1], f.ids[0]] : [f.ids[0], f.ids[1]]);
    } finally { screen.cleanup(); }
  }
});


test('ordered folder study follows the visible deck order and each deck card order, including learned cards and restarts', async () => {
  const f = await fixture();
  await f.store.setPreferences({ folderDeckSort: 'name-desc' });
  // Saving the first deck moves its cards after the second deck in storage.
  const deck = f.store.getState().decks.find(item => item.id === f.first);
  await f.store.saveDeck(f.first, { title: deck.title, folderId: f.folder }, f.store.getState().cards.filter(card => card.deckId === f.first));
  const screen = screenHarness(f.store, 'Study');
  const props = { folderId: f.folder, shuffle: false, onExit() {} };
  try {
    const seen = [];
    for (let index = 0; index < 3; index++) {
      screen.render(props);
      seen.push(screen.currentId());
      screen.next();
    }
    assert.deepEqual(seen, [f.ids[0], f.ids[1], f.ids[2]]);
    const finished = screen.render(props);
    button(finished, '전체 카드 다시 학습').onPress();
    screen.render(props);
    assert.equal(screen.currentId(), f.ids[0]);
  } finally { screen.cleanup(); }
});

test('settings button in study bar opens font settings modal during study', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  const props = { folderId: f.folder, onExit() {} };
  try {
    let tree = screen.render(props);
    const settingsButton = nodes(tree).find(node => node.props?.accessibilityLabel === '학습 설정');
    assert.ok(settingsButton, 'Settings button should exist in study bar');
    settingsButton.props.onPress();
    tree = screen.render(props);
    const modal = nodes(tree).find(node => typeof node.type === 'function' && node.type.name === 'StudyFontSettingsModal');
    assert.ok(modal, 'Font settings modal should open on tap');
    assert.equal(screen.swipeDisabled(), true, 'Card swiping should be disabled while settings modal is open');
    modal.props.onClose();
    tree = screen.render(props);
    assert.equal(nodes(tree).find(node => typeof node.type === 'function' && node.type.name === 'StudyFontSettingsModal'), undefined);
    assert.equal(screen.swipeDisabled(), false, 'Card swiping should be re-enabled after closing settings modal');
  } finally { screen.cleanup(); }
});
