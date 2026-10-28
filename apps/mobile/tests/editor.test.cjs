const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
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
      Object.defineProperties(event, { touches: { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] }, changedTouches: { value: [{ clientX: x, clientY: y }] } });
      content.dispatchEvent(event);
    };
    const drag = (x, y) => { touch('touchstart', 150, 150); touch('touchmove', x, y); touch('touchend', x, y); content.click(); };
    messages.length = 0;
    drag(40, 155);
    assert.deepEqual(messages, [{ type: 'swipe', delta: 1 }]);
    now += 1000; messages.length = 0;
    drag(260, 155);
    assert.deepEqual(messages, [{ type: 'swipe', delta: -1 }]);
    for (const [x, y] of [[150, 300], [130, 152], [220, 260]]) {
      now += 1000; messages.length = 0;
      drag(x, y);
      assert.deepEqual(messages, [], 'scrolls, short drags and mostly vertical gestures must not navigate or flip');
    }
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
