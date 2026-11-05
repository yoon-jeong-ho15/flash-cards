const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('node:path');
const { load, harness, user } = require('./helpers.cjs');
const { AppearanceStore, appearanceKey, defaultAppearance } = load('core/appearance.ts');

function fixture(map = new Map()) {
  const storage = { getItem: async key => map.get(key) ?? null, setItem: async (key,value) => { map.set(key,value); }, removeItem: async key => map.delete(key) };
  return { store: new AppearanceStore(storage), storage, map };
}
test('display settings persist separately from accounts with three independent font controls', async () => {
  const f = fixture();
  await f.store.load();
  await Promise.all([f.store.update({ uiScale: 1.3 }), f.store.update({ questionSize: 32 }), f.store.update({ answerSize: 22, theme: 'dark' })]);
  const account = harness({}, f.map);
  await account.store.switchUser(user('test')); await account.store.switchUser(null);
  const next = new AppearanceStore(f.storage);
  await next.load();
  assert.deepEqual(next.getState(), { ready: true, uiScale: 1.3, questionSize: 32, answerSize: 22, theme: 'dark' });
  await next.update(defaultAppearance);
  assert.deepEqual(JSON.parse(f.map.get(appearanceKey)), defaultAppearance);
});
test('display settings recover from invalid storage, clamp font sizes and do not acknowledge failed writes', async () => {
  const f = fixture(new Map([[appearanceKey, '{broken']]));
  await f.store.load();
  assert.deepEqual(f.store.getState(), { ...defaultAppearance, ready: true });
  await f.store.update({ uiScale: 20, questionSize: -5, answerSize: Infinity });
  assert.equal(f.store.getState().uiScale, 1.5);
  assert.equal(f.store.getState().questionSize, 12);
  assert.equal(f.store.getState().answerSize, 18);
  f.storage.setItem = async () => { throw new Error('full'); };
  await assert.rejects(f.store.update({ theme: 'dark' }), /full/);
  assert.equal(f.store.getState().theme, 'system');
});

test('UI text scales once, nested text inherits and input uses the same scale and keyboard theme', () => {
  const source = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/ui/Typography.tsx')], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react', 'react-native', './theme'], tsconfigRaw: { compilerOptions: { jsx: 'react' } } }).outputFiles[0].text;
  let nested = false;
  const flatten = style => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style || {};
  const native = { Text: 'NativeText', TextInput: 'NativeTextInput', StyleSheet: { flatten } };
  const react = { createContext: () => ({ Provider: 'Provider' }), useContext: () => nested, forwardRef: fn => fn, createElement: (type,props,...children) => ({type,props:{...props,children}}) };
  const module = { exports: {} };
  new Function('require','module','exports',source)(id => ({react, 'react-native':native, './theme':{useUI:()=>({uiScale:1.3,dark:true,colors:{ink:'#eee',muted:'#aaa',primary:'#87f'}})}})[id],module,module.exports);
  let text = module.exports.Text({style:{fontSize:20,lineHeight:30}},null).props.children[0];
  assert.equal(flatten(text.props.style).fontSize,26);
  assert.equal(flatten(text.props.style).lineHeight,39);
  nested=true;
  text=module.exports.Text({style:{fontWeight:'700'}},null).props.children[0];
  assert.equal(flatten(text.props.style).fontSize,undefined,'nested labels inherit instead of applying the scale twice');
  const input=module.exports.TextInput({style:{fontSize:16}},null);
  assert.equal(flatten(input.props.style).fontSize,20.8);
  assert.equal(input.props.keyboardAppearance,'dark');
});

test('theme follows system changes or an explicit preference and rebuilds shared surfaces consistently', () => {
  const source = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/ui/theme.ts')], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react', 'react-native', '../platform/appearance'] }).outputFiles[0].text;
  let settings={...defaultAppearance,ready:true}, system='light';
  const module={exports:{}};
  const mocks={react:{useMemo:fn=>fn()},'react-native':{StyleSheet:{create:value=>value},useColorScheme:()=>system},'../platform/appearance':{useAppearance:()=>settings}};
  new Function('require','module','exports',source)(id=>mocks[id],module,module.exports);
  const ui=module.exports;
  const light=ui.useUI();
  system='dark';
  const dark=ui.useUI();
  assert.equal(light.dark,false); assert.equal(dark.dark,true);
  assert.notEqual(light.colors.card,dark.colors.card);
  assert.equal(dark.s.box.backgroundColor,dark.colors.card);
  assert.equal(dark.s.title.color,dark.colors.ink);
  assert.equal(ui.useThemedStyles(colors=>({surface:colors.bg})).surface,dark.colors.bg);
  settings={...settings,theme:'light'};
  assert.equal(ui.useUI().dark,false);
  settings={...settings,theme:'dark'};system='light';
  assert.equal(ui.useUI().dark,true);
});

test('My display controls update the selected size, theme or defaults and enforce size bounds', async () => {
  const source = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/ui/DisplaySettings.tsx')], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react', 'react-native', './kit', './Typography', './theme', '../platform/appearance'], tsconfigRaw: { compilerOptions: { jsx: 'react' } } }).outputFiles[0].text;
  let settings={...defaultAppearance,ready:true};
  const updates=[];
  const react={Fragment:'Fragment',useState:value=>[value,()=>{}],createElement:(type,props,...children)=>({type,props:{...props,children}})};
  const mocks={react,'react-native':{Pressable:'Pressable',View:'View',Text:'NativeText'},'./Typography':{Text:'Text'},'./theme':{useUI:()=>({colors:{},s:{}})},
    './kit':{Button:'Button',Chips:'Chips',Sheet:'Sheet',showError:error=>{throw error;}},'../platform/appearance':{useAppearance:()=>settings,appearance:{update:async value=>{updates.push(value);}}}};
  const module={exports:{}};
  new Function('require','module','exports',source)(id=>mocks[id],module,module.exports);
  const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];
  let tree=module.exports.DisplaySettings();
  const row=key=>{const component=nodes(tree).find(node=>node.props.setting===key);return component.type(component.props);};
  const tap=(key,label)=>nodes(row(key)).find(node=>node.props.accessibilityLabel===label).props.onPress();
  tap('uiScale','UI 글자 크기 키우기');
  tap('questionSize','질문 글자 크기 키우기');
  tap('answerSize','답변 글자 크기 줄이기');
  nodes(tree).find(node=>node.type==='Chips').props.onChange('dark');
  nodes(tree).find(node=>node.props.title==='화면 설정 초기화').props.onPress();
  assert.deepEqual(updates,[{uiScale:1.1},{questionSize:26},{answerSize:16},{theme:'dark'},defaultAppearance]);
  settings={...settings,questionSize:40};tree=module.exports.DisplaySettings();
  assert.equal(nodes(row('questionSize')).find(node=>node.props.accessibilityLabel==='질문 글자 크기 키우기').props.disabled,true);
  await Promise.resolve();
});

test('Study font settings modal allows changing question and answer font sizes during study', async () => {
  const source = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/ui/DisplaySettings.tsx')], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react', 'react-native', './kit', './Typography', './theme', '../platform/appearance'], tsconfigRaw: { compilerOptions: { jsx: 'react' } } }).outputFiles[0].text;
  let settings = { ...defaultAppearance, ready: true };
  const updates = [];
  let closed = false;
  const react = { Fragment: 'Fragment', useState: value => [value, () => {}], createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
  const mocks = {
    react,
    'react-native': { Pressable: 'Pressable', View: 'View', Text: 'NativeText' },
    './Typography': { Text: 'Text' },
    './theme': { useUI: () => ({ colors: {}, s: {} }) },
    './kit': { Button: 'Button', Chips: 'Chips', Sheet: 'Sheet', showError: error => { throw error; } },
    '../platform/appearance': { useAppearance: () => settings, appearance: { update: async value => { updates.push(value); } } },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(id => mocks[id], module, module.exports);
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  let tree = module.exports.StudyFontSettingsModal({ onClose: () => { closed = true; } });
  assert.equal(tree.type, 'Sheet');
  assert.equal(tree.props.title, '글자 크기 설정');
  const row = key => { const component = nodes(tree).find(node => node.props?.setting === key); return component.type(component.props); };
  const tap = (key, label) => nodes(row(key)).find(node => node.props?.accessibilityLabel === label).props.onPress();
  tap('questionSize', '질문 글자 크기 키우기');
  tap('answerSize', '답변 글자 크기 줄이기');
  nodes(tree).find(node => node.props?.title === '기본 크기로 초기화').props.onPress();
  nodes(tree).find(node => node.props?.title === '완료').props.onPress();
  assert.deepEqual(updates, [
    { questionSize: 26 },
    { answerSize: 16 },
    { questionSize: defaultAppearance.questionSize, answerSize: defaultAppearance.answerSize },
  ]);
  assert.equal(closed, true);
  settings = { ...settings, questionSize: 40 };
  tree = module.exports.StudyFontSettingsModal({ onClose: () => {} });
  assert.equal(nodes(row('questionSize')).find(node => node.props?.accessibilityLabel === '질문 글자 크기 키우기').props.disabled, true);
  await Promise.resolve();
});
