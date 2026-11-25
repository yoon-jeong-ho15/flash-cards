const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { harness: storeHarness, item, load, tick } = require('./helpers.cjs');
const { folderCards } = load('core/content.ts');

const externals = ['react-native-safe-area-context', 'react-native-svg', 'react', 'react-native', 'expo-haptics', '../platform/runtime', '../editor/RichText', './kit', './CardComposer', './Icon', './useSwipeMotion', './FolderForm', './FolderPicker', './Typography', './theme'];
const sources = Object.fromEntries(['Study', 'DeckLibrary', 'FolderLibrary', 'Search', 'StudyLibrary', 'DeckDetail', 'StudySetup'].map(name => [name, esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, `../src/ui/${name}.tsx`)], bundle: true, platform: 'node', format: 'cjs',
  write: false, external: externals, tsconfigRaw: { compilerOptions: { jsx: 'react' } },
}).outputFiles[0].text]));

// Render the actual screen functions with deterministic hooks and native view stubs.
function screenHarness(store, screen, exportName = screen, dimensions = { width: 390, fontScale: 1 }) {
  const slots = [];
  const cardSlots = [];
  const flipAnimations = [];
  let activeSlots = slots, cursor = 0, dirty = false, effects = [], swipeProps, reduceMotionChanged;
  const cleanup = (hooks) => hooks.splice(0).forEach(slot => slot?.cleanup?.());
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
  const effect = (fn, deps) => {
    const i = cursor++;
    const hooks = activeSlots;
    if (changed(hooks[i]?.deps, deps)) effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: 'Fragment',
    useState(initial) {
      const i = cursor++;
      const hooks = activeSlots;
      if (!hooks[i]) {
        const slot = { value: typeof initial === 'function' ? initial() : initial };
        slot.set = next => {
          const value = typeof next === 'function' ? next(slot.value) : next;
          if (!Object.is(value, slot.value)) { slot.value = value; dirty = true; }
        };
        hooks[i] = slot;
      }
      return [hooks[i].value, hooks[i].set];
    },
    useRef(value) { const i = cursor++; return activeSlots[i] ??= { current: value }; },
    useMemo(fn, deps) { const i = cursor++; if (changed(activeSlots[i]?.deps, deps)) activeSlots[i] = { deps, value: fn() }; return activeSlots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useImperativeHandle(ref, create) {
      effect(() => {
        ref.current = create();
        return () => { ref.current = null; };
      });
    },
    useEffect: effect, useLayoutEffect: effect, useDeferredValue: value => value,
  };
  class Value { setValue() {} stopAnimation() {} interpolate() { return 0; } }
  const native = { useWindowDimensions: () => dimensions, StyleSheet: { create: value => value }, Animated: { Value, View: 'Animated.View', timing: (_, config) => ({ start: () => flipAnimations.push(config) }) }, Easing: { inOut: value => value, cubic: 'cubic' },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => false,
      addEventListener: (_, listener) => {
        reduceMotionChanged = listener;
        return { remove: () => { reduceMotionChanged = undefined; } };
      },
    },
    ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'FlatList', 'ActivityIndicator', 'Modal'].map(name => [name, name])),
  };
  const mocks = {
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native-svg': { __esModule: true, default: 'Svg', Path: 'Svg.Path', Rect: 'Svg.Rect' },
    './Typography': { Text: 'Text', TextInput: 'TextInput' },
    './theme': { useUI: () => ({ colors: {}, s: {}, uiScale: 1, dark: false }), useThemedStyles: factory => factory({}), radius: { control: 10, card: 12, sheet: 20 } },
    react, 'react-native': native, '../platform/runtime': { store, useStore: () => store.getState() },
    '../editor/RichText': { RichText: 'RichText' }, './CardComposer': { CardComposer: 'CardComposer' },
    './FolderPicker': { FolderPicker: 'FolderPicker' },
    './Icon': { Icon: 'Icon' }, './FolderForm': { FolderForm: 'FolderForm' },
    './kit': { colors: {}, s: {}, useImage: () => () => {}, attempt: fn => fn(), showError: error => { throw error; },
      ...Object.fromEntries(['Attachment', 'Button', 'Empty', 'Progress', 'Chips', 'Field', 'Select', 'ProgressRing', 'Sheet'].map(name => [name, name])),
    },
    './useSwipeMotion': { useSwipeMotion: props => {
      swipeProps = props;
      return {
        panHandlers: {}, style: {}, transitioning: false,
        isTap: () => true, prepareFlip: () => true,
        navigate: delta => props.onNavigate(delta, props.cardId),
      };
    } },
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
        dirty = false; cursor = 0; effects = []; activeSlots = slots;
        tree = module.exports[exportName](props);
        const card = nodes(tree).find(node => node.type?.name === 'StudyCard');
        if (card) {
          activeSlots = cardSlots;
          cursor = 0;
          card.props.children = [card.type(card.props)];
        } else {
          cleanup(cardSlots);
        }
        effects.forEach(fn => fn());
        assert.ok(++count < 20, 'screen should settle without a render loop');
      } while (dirty);
      return tree;
    },
    next: () => swipeProps.onNavigate(1, swipeProps.cardId),
    currentId: () => swipeProps.cardId,
    swipeDisabled: () => swipeProps.disabled,
    startSwipe: () => swipeProps.onSwipeStart?.(),
    swipe: () => swipeProps,
    setReduceMotion: (enabled) => reduceMotionChanged(enabled),
    flipAnimations,
    cleanup: () => { cleanup(cardSlots); cleanup(slots); },
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
const component = (tree, name) => {
  const found = nodes(tree).find(node => typeof node.type === 'function' && node.type.name === name);
  assert.ok(found, `Missing component: ${name}`);
  return found;
};
const accessible = (tree, role, label) => {
  const found = nodes(tree).filter(node => node.props?.accessibilityRole === role && node.props.accessibilityLabel === label);
  assert.equal(found.length, 1, `Expected one ${role}: ${label}`);
  return found[0].props;
};
async function chooseLayout(tree, layout) {
  const selector = component(tree, 'CollectionLayoutToggle');
  const control = selector.type(selector.props);
  accessible(control, 'radiogroup', '목록 표시 방식');
  accessible(control, 'radio', layout === 'list' ? '목록 보기' : '그리드 보기').onPress();
  // The control handles the promise; wait for the store's durable serial write.
  await tick();
}

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
  const screen = screenHarness(f.store, 'DeckLibrary');
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
    screen.render(props);
    await tick();
    let tree = screen.render(props);
    flipControl(tree).props.onPress();
    tree = screen.render(props);
    const visibleFace = nodes(tree).find(node => node.props?.importantForAccessibility === 'auto');
    assert.ok(text(visibleFace).includes('답변'));
    assert.equal(button(tree, '알아요').disabled, true, 'rating stays disabled while the flip animation is in progress');
    assert.equal(screen.swipeDisabled(), false, 'flipping must not block a new swipe');
    screen.startSwipe();
    tree = screen.render(props);
    assert.equal(button(tree, '알아요').disabled, false, 'the new swipe immediately cancels the flip');
    screen.next();
    assert.ok(button(screen.render(props), '전체 카드 다시 학습'));
  } finally { screen.cleanup(); }
});

test('the card scrolls its visible face first and hands only the residual movement to the page', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  const props = { deckId: f.first, onExit() {} };
  const scrollViews = tree => nodes(tree).filter(node => node.type === 'ScrollView');
  const attach = (view, { y, height, content }) => {
    const positions = [];
    const enabled = [];
    view.props.ref.current = {
      scrollTo: value => positions.push(value),
      setNativeProps: ({ scrollEnabled }) => enabled.push(scrollEnabled),
    };
    view.props.onScroll({ nativeEvent: { contentOffset: { y } } });
    view.props.onLayout({ nativeEvent: { layout: { height } } });
    view.props.onContentSizeChange(0, content);
    return { positions, enabled };
  };
  try {
    screen.render(props);
    await tick();
    const [page, front, back] = scrollViews(screen.render(props));
    const outer = attach(page, { y: 40, height: 200, content: 420 });
    const question = attach(front, { y: 30, height: 100, content: 150 });
    const answer = attach(back, { y: 0, height: 100, content: 300 });
    screen.swipe().onTouchActive(true);
    assert.deepEqual(scrollViews(screen.render(props)).map(view => view.props.scrollEnabled), [false, false, false]);
    assert.deepEqual(outer.enabled, [false]);

    screen.swipe().onVerticalDrag(-12);
    assert.deepEqual(question.positions, [{ y: 42, animated: false }]);
    assert.deepEqual(outer.positions, []);

    screen.swipe().onVerticalDrag(-28);
    assert.deepEqual(question.positions.at(-1), { y: 50, animated: false });
    assert.deepEqual(outer.positions, [{ y: 60, animated: false }]);
    screen.swipe().onVerticalDrag(100);
    assert.deepEqual(question.positions.at(-1), { y: 0, animated: false });
    assert.deepEqual(outer.positions.at(-1), { y: 10, animated: false });
    assert.deepEqual(answer.positions, []);

    screen.swipe().onVerticalRelease(-0.5);
    assert.deepEqual(question.positions.at(-1), { y: 50, animated: true });
    assert.deepEqual(outer.positions.at(-1), { y: 40, animated: true });
    screen.swipe().onTouchActive(false);
    assert.deepEqual(scrollViews(screen.render(props)).map(view => view.props.scrollEnabled), [true, true, true]);

    screen.swipe().onTouchActive(true);
    screen.next();
    assert.ok(button(screen.render(props), '전체 카드 다시 학습'));
    assert.deepEqual(outer.enabled, [false, true, false, true], 'unmount releases the page scroll lock');
  } finally { screen.cleanup(); }
});

test('reduced motion flips to the answer immediately and keeps dock navigation working', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'Study');
  const props = { deckId: f.first, unlearnedOnly: false, onExit() {} };
  try {
    screen.render(props);
    await tick();
    screen.setReduceMotion(true);
    let tree = screen.render(props);
    assert.equal(screen.swipe().reduceMotion, true);
    const flip = nodes(tree).find(node => node.type === 'Pressable' && node.props.accessibilityLabel === '카드 뒤집기');
    flip.props.onPress();
    tree = screen.render(props);
    const visibleFace = nodes(tree).find(node => node.props?.importantForAccessibility === 'auto');
    assert.ok(text(visibleFace).includes('답변'));
    assert.deepEqual(screen.flipAnimations, []);
    assert.equal(button(tree, '몰라요').disabled, false);

    const next = accessible(tree, 'button', '다음 카드');
    next.onPress();
    next.onPress();
    tree = screen.render(props);
    assert.equal(screen.currentId(), f.ids[1]);
    const nextFace = nodes(tree).find(node => node.props?.importantForAccessibility === 'auto');
    assert.ok(text(nextFace).includes('질문'));
    accessible(tree, 'button', '이전 카드').onPress();
    screen.render(props);
    assert.equal(screen.currentId(), f.ids[0]);
  } finally { screen.cleanup(); }
});


test('study picker separates folder tiles from unfiled decks and preserves setup navigation', async () => {
  const f = await fixture();
  const emptyDeck = await f.store.saveDeck(undefined, { title: '빈 미분류 덱' }, [item()]);
  await f.store.deleteCard(f.store.getState().cards.find(card => card.deckId === emptyDeck).id);
  const screen = screenHarness(f.store, 'StudyLibrary');
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
    const modal = nodes(screen.render({ nav: { go: route => { destination = route; } } })).find(node => node.props?.title === '미분류 덱' && node.props.onChoose);
    assert.ok(modal, 'the unfiled deck opens its study order chooser');
    modal.props.onChoose(true);
    assert.deepEqual(destination, { type: 'study', deckId: f.store.getState().decks.find(deck => deck.title === '미분류 덱').id, shuffle: true, onlyDifficult: false });
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
    const screen = screenHarness(f.store, 'StudyLibrary', 'StudyLibrary', dimensions);
    assert.equal(nodes(screen.render({ nav })).find(node => node.type === 'FlatList').props.numColumns, columns);
    screen.cleanup();
  }
  for (const folder of f.store.getState().folders) await f.store.deleteFolder(folder.id);
  const screen = screenHarness(f.store, 'StudyLibrary');
  try {
    const tree = nodes(screen.render({ nav })).find(node => node.type === 'FlatList');
    assert.equal(tree.props.data.length, 0);
    assert.equal(tree.props.ListEmptyComponent, undefined);
    assert.equal(nodes(tree.props.ListFooterComponent).filter(node => node.type === 'Pressable').length, f.store.getState().decks.length);
    for (const deck of f.store.getState().decks) await f.store.deleteDeck(deck.id);
    const empty = nodes(screen.render({ nav })).find(node => node.type === 'FlatList');
    assert.equal(empty.props.ListFooterComponent, undefined);
    assert.ok(empty.props.ListEmptyComponent);
  } finally { screen.cleanup(); }
});


test('deck detail prioritizes card management and offers accessible study order choices', async () => {
  const f = await fixture();
  const screen = screenHarness(f.store, 'DeckDetail');
  let destination;
  try {
    const props = { deckId: f.first, nav: { go: route => { destination = route; }, back() {} } };
    let tree = screen.render(props);
    const displayedText = nodes(tree).filter(node => node.type === 'Text').map(text).join('');
    assert.ok(displayedText.includes('카드 관리'));
    assert.ok(!displayedText.includes('어떻게 학습할까요?'));
    assert.equal(nodes(tree).filter(node => node.props?.accessibilityRole === 'radio').length, 0);
    assert.equal(nodes(tree).filter(node => node.type === 'Button' && /학습 시작|전체 카드 복습/.test(node.props.title)).length, 0);
    button(tree, '카드 추가하기').onPress();
    assert.deepEqual(destination, { type: 'edit-deck', deckId: f.first, appendCard: true });
    assert.equal(button(tree, '카드 순서 변경').tone, 'secondary');
    assert.equal(button(tree, '카드 순서 변경').disabled, false);
    assert.equal(nodes(tree).some(node => node.type?.name === 'StudyOrderModal'), false);
    const study = accessible(tree, 'button', '학습하기');
    assert.equal(study.disabled, false);
    assert.deepEqual(study.accessibilityState, { disabled: false });
    const list = nodes(tree).find(node => node.type === 'FlatList');
    const card = list.props.data[0];
    const edit = nodes(list.props.renderItem({ item: card })).find(node => node.props?.accessibilityLabel === '카드 수정');
    edit.props.onPress();
    assert.deepEqual(destination, { type: 'edit-deck', deckId: f.first, focusCardId: card.id });
    nodes(tree).find(node => node.type === 'Field').props.onChangeText('검색 결과 없음');
    tree = screen.render(props);
    assert.equal(nodes(tree).find(node => node.type === 'FlatList').props.data.length, 0);
    assert.equal(accessible(tree, 'button', '학습하기').disabled, false, 'search results do not disable a nonempty deck');

    destination = undefined;
    accessible(tree, 'button', '학습하기').onPress();
    tree = screen.render(props);
    let modal = component(tree, 'StudyOrderModal');
    assert.equal(modal.props.title, '영어');
    assert.equal(destination, undefined, 'opening the chooser must not navigate');
    let choices = modal.type(modal.props);
    assert.ok(nodes(choices).some(node => node.props?.accessibilityViewIsModal));
    accessible(choices, 'button', '닫기').onPress();
    tree = screen.render(props);
    assert.equal(nodes(tree).some(node => node.type?.name === 'StudyOrderModal'), false);
    assert.equal(destination, undefined, 'closing the chooser must not navigate');

    for (const [shuffle, label] of [
      [false, '정방향 학습, 카드를 등록된 순서대로 학습해요.'],
      [true, '랜덤 학습, 카드를 무작위로 섞어서 학습해요.'],
    ]) {
      accessible(tree, 'button', '학습하기').onPress();
      modal = component(screen.render(props), 'StudyOrderModal');
      choices = modal.type(modal.props);
      accessible(choices, 'button', label).onPress();
      assert.deepEqual(destination, { type: 'study', deckId: f.first, shuffle, onlyDifficult: false });
      tree = screen.render(props);
      assert.equal(nodes(tree).some(node => node.type?.name === 'StudyOrderModal'), false);
      const studyScreen = screenHarness(f.store, 'Study');
      const studyProps = { deckId: destination.deckId, shuffle: destination.shuffle, unlearnedOnly: destination.onlyDifficult, onExit() {} };
      try {
        studyScreen.render(studyProps);
        const seen = [studyScreen.currentId()];
        studyScreen.next();
        studyScreen.render(studyProps);
        seen.push(studyScreen.currentId());
        assert.deepEqual(seen, shuffle ? [f.ids[1], f.ids[0]] : [f.ids[0], f.ids[1]], 'study includes learned cards despite the detail search');
      } finally { studyScreen.cleanup(); }
    }

    for (const card of f.store.getState().cards.filter(card => card.deckId === f.first)) await f.store.deleteCard(card.id);
    tree = screen.render(props);
    const disabledStudy = accessible(tree, 'button', '학습하기');
    assert.equal(disabledStudy.disabled, true);
    assert.deepEqual(disabledStudy.accessibilityState, { disabled: true });
    assert.equal(nodes(tree).some(node => node.type?.name === 'StudyOrderModal'), false);
    assert.equal(button(tree, '카드 순서 변경').disabled, true);
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
    const play = nodes(list.props.renderItem({ item: list.props.data[0] })).find(node => node.props?.accessibilityLabel?.startsWith(`${list.props.data[0].title}, 카드`));
    assert.equal(play.props.accessibilityRole, 'button');
    play.props.onPress();
    const modal = nodes(screen.render(props)).find(node => node.props?.onChoose);
    assert.ok(modal, 'the folder deck opens its study order chooser');
    modal.props.onChoose(false);
    assert.deepEqual(destination, { type: 'study', deckId: list.props.data[0].id, shuffle: false, onlyDifficult: false });
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

async function layoutFixture() {
  const f = await fixture();
  const own = f.store.getState().cards.filter(card => card.deckId === f.first);
  await f.store.saveDeck(f.first, { title: '영어', folderId: f.folder }, [...own, item('apricot'), item('제외')]);
  const extra = await f.store.saveDeck(undefined, { title: '추가', folderId: f.folder }, [item('apple extra')]);
  const completed = await f.store.saveDeck(undefined, { title: '완료', folderId: f.folder }, [item('apple completed')]);
  await f.store.setLearned(f.store.getState().cards.find(card => card.deckId === completed).id, true);
  const root = await f.store.saveDeck(undefined, { title: '추가 미분류' }, [item('root two')]);
  await f.store.setPreferences({ collectionLayout: 'grid', folderSort: 'name-desc', deckSort: 'name-desc', folderDeckSort: 'name-desc' });
  return { ...f, extra, completed, root };
}

test('fixed library lists preserve items, sorting and active filters when the shared layout changes elsewhere', async t => {
  const f = await layoutFixture();
  const nav = { go() {}, back() {} };
  for (const [name, props] of [
    ['FolderLibrary', { nav, onNewFolder() {} }],
    ['DeckLibrary', { nav }],
    ['DeckLibrary', { nav, folderId: f.folder }],
  ]) {
    await t.test(`${name}${props.folderId ? ' inside a folder' : ''}`, async () => {
      await f.store.setPreferences({ collectionLayout: 'grid' });
      const screen = screenHarness(f.store, name);
      const controller = screenHarness(f.store, 'Search');
      try {
        let tree = screen.render(props);
        if (name === 'DeckLibrary') {
          nodes(tree).find(node => node.type === 'Field').props.onChangeText('a');
          nodes(tree).find(node => node.type === 'Pressable' && text(node) === '학습 중').props.onPress();
          tree = screen.render(props);
        }
        const expected = name === 'FolderLibrary' ? [f.folder, f.empty, f.other] : [f.extra, f.first];
        for (const layout of ['grid', 'list', 'grid']) {
          await chooseLayout(controller.render({ nav }), layout);
          tree = screen.render(props);
          const list = nodes(tree).find(node => node.type === 'FlatList');
          assert.equal(f.store.getState().preferences.collectionLayout, layout);
          assert.equal(list.props.numColumns, 1, 'library stays a single-column list');
          assert.equal(nodes(tree).some(node => node.type?.name === 'CollectionLayoutToggle'), false, 'fixed lists do not offer a layout choice');
          assert.deepEqual(list.props.data.map(item => item.id), expected, 'items and descending name order are preserved');
          assert.equal(nodes(tree).find(node => node.type === 'Select').props.value, 'name-desc');
          if (name === 'DeckLibrary') {
            assert.equal(nodes(tree).find(node => node.type === 'Field').props.value, 'a');
            assert.equal(nodes(tree).find(node => node.type === 'Pressable' && text(node) === '학습 중').props.accessibilityState.selected, true);
          } else {
            const unfiled = nodes(list.props.ListFooterComponent).filter(node => node.type?.name === 'DeckTile');
            assert.deepEqual(unfiled.map(node => node.props.deck.id), [f.root, f.store.getState().decks.find(deck => deck.title === '미분류 덱').id]);
            for (const tile of unfiled) {
              const wrapper = nodes(list.props.ListFooterComponent).find(node => node.props?.children?.includes(tile));
              assert.equal(wrapper.props.style.width, '100%', 'unfiled decks also stay in list layout');
            }
          }
        }
      } finally { screen.cleanup(); controller.cleanup(); }
    });
  }
});

test('switchable study, search and card collections preserve items, order and active filters in both layouts', async t => {
  const f = await layoutFixture();
  const nav = { go() {}, back() {} };
  for (const [file, name, props] of [
    ['StudyLibrary', 'StudyLibrary', { nav }],
    ['Search', 'Search', { nav }],
    ['StudySetup', 'StudyFolder', { nav, folderId: f.folder }],
    ['DeckDetail', 'DeckDetail', { nav, deckId: f.first }],
  ]) {
    await t.test(name, async () => {
      await f.store.setPreferences({ collectionLayout: 'grid' });
      const screen = screenHarness(f.store, file, name);
      try {
        let tree = screen.render(props);
        if (name === 'Search' || name === 'DeckDetail') {
          nodes(tree).find(node => node.type === 'Field').props.onChangeText('a');
          if (name === 'DeckDetail') nodes(tree).find(node => node.type === 'Chips').props.onChange('unlearned');
          tree = screen.render(props);
        }
        const list = nodes(tree).find(node => node.type === 'FlatList');
        const ids = list.props.data.map(item => item.id);
        assert.equal(list.props.numColumns, 2, name);
        if (name === 'StudyLibrary') assert.deepEqual(ids, [f.folder, f.empty, f.other]);
        if (name === 'StudyFolder') assert.deepEqual(ids, [f.extra, f.completed, f.first, f.second]);
        if (name === 'Search') assert.deepEqual(new Set(ids), new Set([f.first, f.extra, f.completed]), 'search excludes nonmatching decks');
        if (name === 'DeckDetail') {
          const own = f.store.getState().cards.filter(card => card.deckId === f.first);
          assert.deepEqual(ids, [own[1].id, own[2].id], 'both search and learned status filter the cards in their registered order');
        }
        const preferences = f.store.getState().preferences;
        const content = { folders: f.store.getState().folders, decks: f.store.getState().decks, cards: f.store.getState().cards };
        const footerLabels = tree => nodes(tree).filter(node => node.type === 'Pressable' && node.props.accessibilityLabel?.includes('카드')).map(node => node.props.accessibilityLabel);
        const footer = footerLabels(list.props.ListFooterComponent);
        if (name === 'StudyLibrary') assert.equal(footer.length, 2, 'unfiled decks are covered along with folder items');
        for (const [layout, columns] of [['list', 1], ['grid', 2]]) {
          await chooseLayout(tree, layout);
          tree = screen.render(props);
          const updated = nodes(tree).find(node => node.type === 'FlatList');
          assert.equal(updated.props.numColumns, columns, name);
          assert.deepEqual(updated.props.data.map(item => item.id), ids, `${name} keeps the same items and order`);
          assert.deepEqual(footerLabels(updated.props.ListFooterComponent), footer, 'unfiled decks keep their order and summaries');
          const selector = component(tree, 'CollectionLayoutToggle');
          const control = selector.type(selector.props);
          assert.deepEqual(accessible(control, 'radio', '목록 보기').accessibilityState, { checked: layout === 'list' });
          assert.deepEqual(accessible(control, 'radio', '그리드 보기').accessibilityState, { checked: layout === 'grid' });
          assert.deepEqual(f.store.getState().preferences, { ...preferences, collectionLayout: layout }, 'sort preferences survive the layout change');
          assert.deepEqual({ folders: f.store.getState().folders, decks: f.store.getState().decks, cards: f.store.getState().cards }, content);
          if (name === 'Search' || name === 'DeckDetail') assert.equal(nodes(tree).find(node => node.type === 'Field').props.value, 'a');
          if (name === 'DeckDetail') assert.equal(nodes(tree).find(node => node.type === 'Chips').props.value, 'unlearned');
        }
      } finally { screen.cleanup(); }
    });
  }
});
