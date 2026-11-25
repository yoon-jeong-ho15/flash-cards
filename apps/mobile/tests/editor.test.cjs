const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { harness, load, user, accountKey, emptySnapshot } = require('./helpers.cjs');
const generated = fs.readFileSync(path.join(__dirname, '../src/editor/document.generated.ts'), 'utf8');
const html = JSON.parse(generated.slice(generated.indexOf(' = ') + 3).trim().replace(/;$/, ''));
function document() {
  const messages = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://local.invalid', beforeParse(window) {
    window.ResizeObserver = class { observe() {} disconnect() {} };
    window.ReactNativeWebView = { postMessage(value) { messages.push(JSON.parse(value)); } };
  } });
  return { window: dom.window, messages, close: () => dom.window.close() };
}
test('bundled read-only document sanitizes scripts, event handlers, SVG/file images, and CSS URLs while retaining safe rich content', () => {
  const { window, messages, close } = document();
  try {
    assert.ok(messages.some(m => m.type === 'ready'));
    window.nativeReceive({ type: 'init', editable: false, html: '<p><strong>굵게</strong><mark>강조</mark></p><script>window.stolen=true</script><img src="https://example.com/safe.jpg" onerror="window.stolen=true"><img src="file:///private/data"><img src="data:image/svg+xml;base64,PHN2Zz4="><span style="background:url(https://evil.invalid)">text</span>' });
    const content = window.document.getElementById('content');
    assert.equal(content.querySelectorAll('script').length, 0); assert.equal(content.querySelectorAll('[onerror]').length, 0);
    assert.equal(content.querySelectorAll('img').length, 1); assert.equal(content.querySelectorAll('[style]').length, 0);
    assert.equal(content.querySelector('strong').textContent, '굵게'); assert.equal(window.stolen, undefined);
    content.querySelector('img').click(); assert.equal(messages.at(-1).type, 'image');
  } finally { close(); }
});
test('offline editable Tiptap round-trips web HTML and explicitly flushes the current document before save', () => {
  const { window, messages, close } = document();
  try {
    window.nativeReceive({ type: 'init', editable: true, label: '카드 앞면', html: '<p><strong>A</strong> <u>B</u> <mark>C</mark></p><ul><li><p>항목</p></li></ul>' });
    window.nativeReceive({ type: 'get', id: 'save-1' });
    const response = messages.find(m => m.type === 'value' && m.id === 'save-1');
    assert.match(response.html, /<strong>A<\/strong>/); assert.match(response.html, /<u>B<\/u>/); assert.match(response.html, /<mark>C<\/mark>/); assert.match(response.html, /<ul>/);
    assert.equal(window.document.querySelector('[role="textbox"]').getAttribute('aria-label'), '카드 앞면');
    window.nativeReceive({ type: 'set', html: '<p>최신 원본</p>' });
    window.nativeReceive({ type: 'get', id: 'reload' });
    assert.equal(messages.find(m => m.id === 'reload').html, '<p>최신 원본</p>');
  } finally { close(); }
});

test('an editor-serialized image URL round-trips through offline reopen and save', async () => {
  const remote = 'https://firebasestorage.googleapis.com/v0/b/demo/o/cards%2Fimage.webp?alt=media&token=a%26b&size=2';
  const escaped = remote.replaceAll('&', '&amp;');
  const original = 'data:image/webp;base64,YWJj';
  const seedEditor = document();
  let serialized;
  try {
    seedEditor.window.nativeReceive({ type: 'init', editable: true, html: `<img src="${remote}" alt="질문">` });
    seedEditor.window.nativeReceive({ type: 'get', id: 'first-save' });
    serialized = seedEditor.messages.find(message => message.id === 'first-save').html;
    assert.ok(serialized.includes(`src="${escaped}"`));
  } finally { seedEditor.close(); }

  const account = user('a');
  const map = new Map([[accountKey(account.uid), JSON.stringify({
    ...emptySnapshot(), imageCache: { [remote]: original },
  })]]);
  const openOffline = async () => {
    const { store } = harness({}, map);
    store.setOnline(false);
    await store.switchUser(account);
    return store;
  };
  const initial = await openOffline();
  await initial.saveDeck(undefined, { title: '오프라인 세트' }, [{ termRichText: serialized, definitionRichText: '' }]);

  for (let pass = 0; pass < 2; pass++) {
    const store = await openOffline();
    const card = store.getState().cards[0];
    const editor = document();
    try {
      editor.window.nativeReceive({ type: 'init', editable: true, html: store.displayHTML(card.termRichText) });
      assert.equal(editor.window.document.querySelector('#content img').getAttribute('src'), original);
      editor.window.nativeReceive({ type: 'get', id: 'offline-save' });
      const localHtml = editor.messages.find(message => message.id === 'offline-save').html;
      const remoteHtml = store.canonicalHTML(localHtml);
      assert.ok(remoteHtml.includes(`src="${escaped}"`));
      assert.doesNotMatch(remoteHtml, /&amp;amp;/);
      assert.equal(store.canonicalHTML(remoteHtml), remoteHtml);
      const template = editor.window.document.createElement('template');
      template.innerHTML = remoteHtml;
      assert.equal(template.content.querySelector('img').getAttribute('src'), remote);
      await store.updateCard(card.id, { termRichText: remoteHtml });
    } finally { editor.close(); }
  }
});
test('study faces switch typography without resetting rich content or image interaction', () => {
  const { window, messages, close } = document();
  try {
    const content = window.document.getElementById('content');
    content.getBoundingClientRect = () => ({ height: content.textContent.includes('해설') ? 1000 : 60 });
    window.nativeReceive({ type: 'init', editable: false, presentation: 'study-front', html: '<p>질문</p>' });
    assert.equal(window.getComputedStyle(window.document.getElementById('content')).textAlign, 'center');
    window.nativeReceive({ type: 'set', html: '<p>해설</p><img src="https://example.com/a.jpg">' });
    window.nativeReceive({ type: 'appearance', presentation: 'study-back' });
    assert.equal(messages.at(-1).value, 1000);
    assert.equal(window.getComputedStyle(window.document.getElementById('content')).textAlign, 'left');
    assert.match(window.document.getElementById('content').innerHTML, /해설/);
    window.document.querySelector('img').click();
    assert.equal(messages.at(-1).type, 'image');
    window.document.querySelector('p').click();
    assert.equal(messages.at(-1).type, 'flip');
    window.nativeReceive({ type: 'set', html: '<p>질문</p>' });
    assert.equal(messages.at(-1).value, 60, 'a short front must shrink after a long back');
  } finally { close(); }
});
test('study swipes navigate in both directions without flipping, while vertical scrolling and short drags do not navigate', () => {
  const { window, messages, close } = document();
  try {
    window.nativeReceive({ type: 'init', editable: false, presentation: 'study-front', html: '<p>질문</p>' });
    const content = window.document.getElementById('content');
    let now = 1000;
    window.Date.now = () => now;
    const touch = (type, x, y) => {
      const event = new window.Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, { timeStamp: { value: now }, touches: { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] }, changedTouches: { value: [{ clientX: x, clientY: y }] } });
      content.dispatchEvent(event);
    };
    const drag = (x, y) => { touch('touchstart', 150, 150); now += 40; touch('touchmove', x, y); now += 10; touch('touchend', x, y); content.click(); };
    messages.length = 0;
    drag(40, 155);
    assert.deepEqual(messages, [{ type: 'card-drag', phase: 'move', dx: -110, dy: 0 }, { type: 'card-drag', phase: 'end', dx: -110, dy: 0, velocityX: -2.2, velocityY: 0.1 }]);
    messages.length = 0;
    touch('touchstart', 150, 150); touch('touchend', 150, 150); content.click();
    assert.deepEqual(messages, [{ type: 'flip' }], 'a fresh tap immediately after a swipe must flip without waiting for the suppression timeout');
    now += 1000; messages.length = 0;
    drag(260, 155);
    assert.deepEqual(messages, [{ type: 'card-drag', phase: 'move', dx: 110, dy: 0 }, { type: 'card-drag', phase: 'end', dx: 110, dy: 0, velocityX: 2.2, velocityY: 0.1 }]);
    messages.length = 0;
    touch('touchstart', 300, 150); now += 80; touch('touchmove', 90, 150);
    now += 200; touch('touchend', 90, 150);
    assert.equal(messages.at(-1).velocityX, 0, 'holding at the edge loses flick velocity');
    for (const [x, y] of [[150, 300], [220, 260]]) {
      now += 1000; messages.length = 0;
      drag(x, y);
      assert.deepEqual(messages, [], 'vertical gestures must not move or flip the card');
    }
    now += 1000; messages.length = 0;
    drag(130, 152);
    assert.deepEqual(messages, [{ type: 'card-drag', phase: 'move', dx: -20, dy: 0 }, { type: 'card-drag', phase: 'end', dx: -20, dy: 0, velocityX: -0.4, velocityY: 0.04 }], 'short horizontal drags must report the offset so the native card can spring back');
    now += 1000; messages.length = 0;
    touch('touchstart', 150, 150); touch('touchmove', 90, 150); touch('touchcancel', 90, 150);
    assert.deepEqual(messages.at(-1), { type: 'card-drag', phase: 'cancel', dx: 0, dy: 0 });
    now += 1000; messages.length = 0;
    touch('touchstart', 150, 150); touch('touchcancel', 150, 150); touch('touchend', 40, 150); content.click();
    assert.deepEqual(messages, []);
    now += 1000; messages.length = 0;
    touch('touchstart', 150, 150); touch('touchend', 150, 150); content.click();
    assert.deepEqual(messages, [{ type: 'flip' }], 'a tap must still flip');
    window.nativeReceive({ type: 'init', editable: true, html: '<p>편집 중</p>' });
    messages.length = 0;
    touch('touchstart', 150, 150); touch('touchmove', 40, 150); touch('touchend', 40, 150);
    assert.deepEqual(messages, [], 'editing must not enable study gestures');
  } finally { close(); }
});

test('card appearance updates fonts and dark theme without changing content, formatting or editable state', () => {
  const { window, messages, close } = document();
  try {
    window.nativeReceive({ type: 'init', editable: true, html: '<p><strong>내 질문</strong></p>', fontSize: 30, dark: true, uiScale: 1.2 });
    const root = window.document.getElementById('content');
    assert.equal(window.document.documentElement.dataset.theme, 'dark');
    assert.equal(window.document.body.style.getPropertyValue('--content-font-size'), '30px');
    assert.equal(window.document.body.style.getPropertyValue('--toolbar-font-size'), '16.8px');
    window.nativeReceive({ type: 'appearance', fontSize: 18, dark: false, presentation: 'study-back' });
    assert.equal(window.document.documentElement.dataset.theme, 'light');
    assert.equal(window.document.body.style.getPropertyValue('--content-font-size'), '18px');
    assert.equal(root.querySelector('strong').textContent, '내 질문');
    assert.ok(root.querySelector('[contenteditable="true"]'));
    window.nativeReceive({ type: 'get', id: 'appearance-save' });
    assert.match(messages.find(message => message.id === 'appearance-save').html, /<strong>내 질문<\/strong>/);
  } finally { close(); }
});

test('message parsers accept valid directional messages and reject unknown or malformed payloads', () => {
  const { parseEditorCommand, parseEditorEvent } = load('editor/protocol.ts');

  assert.deepEqual(parseEditorEvent({ type: 'ready' }), { type: 'ready' });
  assert.deepEqual(parseEditorEvent({ type: 'height', value: 120 }), { type: 'height', value: 120 });
  assert.deepEqual(parseEditorEvent({ type: 'change', html: '<p>a</p>' }), { type: 'change', html: '<p>a</p>' });
  assert.deepEqual(parseEditorEvent({ type: 'value', id: 'req-1', html: '<p>b</p>' }), { type: 'value', id: 'req-1', html: '<p>b</p>' });
  assert.deepEqual(parseEditorEvent({ type: 'image', url: 'https://example.com/a.png' }), { type: 'image', url: 'https://example.com/a.png' });
  assert.deepEqual(parseEditorEvent({ type: 'flip' }), { type: 'flip' });
  assert.deepEqual(parseEditorEvent({ type: 'pick-image' }), { type: 'pick-image' });
  assert.deepEqual(parseEditorEvent({ type: 'card-drag', phase: 'move', dx: -12, dy: 0 }), {
    type: 'card-drag',
    phase: 'move',
    dx: -12,
    dy: 0,
    velocityX: undefined,
    velocityY: undefined,
  });

  assert.equal(parseEditorEvent(null), null);
  assert.equal(parseEditorEvent([]), null);
  assert.equal(parseEditorEvent({ type: 'unknown' }), null);
  assert.equal(parseEditorEvent({ type: 'height', value: Number.NaN }), null);
  assert.equal(parseEditorEvent({ type: 'value', html: '<p>missing id</p>' }), null);
  assert.equal(parseEditorEvent({ type: 'image' }), null);
  assert.equal(parseEditorEvent({ type: 'change', html: 123 }), null);
  assert.equal(parseEditorEvent({ type: 'card-drag', phase: 'invalid', dx: 0, dy: 0 }), null);
  assert.equal(parseEditorEvent({ type: 'card-drag', phase: 'end', dx: 10, dy: 0, velocityX: 'fast' }), null);

  assert.equal(parseEditorCommand({ type: 'get', id: 'req-1' }).id, 'req-1');
  assert.equal(parseEditorCommand({ type: 'image', url: 'https://example.com/a.png' }).url, 'https://example.com/a.png');
  assert.equal(parseEditorCommand({ type: 'get' }), null);
  assert.equal(parseEditorCommand({ type: 'image' }), null);
  assert.equal(parseEditorCommand({ type: 'set' }), null);
  assert.equal(parseEditorCommand({ type: 'init' }), null);
  assert.equal(parseEditorCommand({ type: 'unknown' }), null);
});

test('bundled editor ignores unknown and malformed commands without breaking state', () => {
  const { window, messages, close } = document();
  try {
    window.nativeReceive({ type: 'init', editable: true, html: '<p>안전한 내용</p>' });
    const countBefore = messages.length;
    window.nativeReceive({ type: 'unknown', payload: 1 });
    window.nativeReceive({ type: 'get' });
    window.nativeReceive({ type: 'image' });
    window.nativeReceive({ type: 'set' });
    window.nativeReceive({ type: 'init', editable: true });
    assert.equal(messages.length, countBefore);
    window.nativeReceive({ type: 'get', id: 'check-1' });
    assert.equal(messages.find(m => m.type === 'value' && m.id === 'check-1').html, '<p>안전한 내용</p>');
  } finally { close(); }
});
