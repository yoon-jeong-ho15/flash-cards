const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { hookRenderer } = require('./hookRenderer.cjs');

function createDialogHarness() {
  const listeners = { focusin: new Set(), keydown: new Set() };
  let activeElement = null;
  let activeElementReads = 0;

  class MockHTMLElement {
    constructor(tag = 'DIV', options = {}) {
      this.tagName = tag;
      this.isConnected = true;
      this.children = [];
      this.style = {};
      this.attributes = options.attributes || {};
      this.disabled = Boolean(options.disabled);
      this.tabIndex = options.tabIndex ?? 0;
      this.rectCount = options.visible === false ? 0 : 1;
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    contains(target) {
      if (target === this) return true;
      return this.children.some((child) => child.contains(target));
    }
    focus() {
      const previous = activeElement;
      activeElement = this;
      for (const listener of listeners.focusin) {
        listener({ target: this, relatedTarget: previous });
      }
    }
    querySelector() { return null; }
    querySelectorAll() {
      return this.children.filter((child) => child.tagName === 'BUTTON' || child.tagName === 'INPUT');
    }
    getClientRects() { return this.rectCount ? [{}] : []; }
    closest() { return null; }
    getAttribute(name) { return this.attributes[name] ?? null; }
  }

  const body = new MockHTMLElement('BODY');
  const document = {
    body,
    get activeElement() {
      activeElementReads++;
      return activeElement;
    },
    addEventListener(type, listener) {
      listeners[type]?.add(listener);
    },
    removeEventListener(type, listener) {
      listeners[type]?.delete(listener);
    },
  };

  const renderer = hookRenderer();
  let nextFrameId = 1;
  const frames = new Map();
  const context = vm.createContext({
    console,
    document,
    HTMLElement: MockHTMLElement,
    Symbol,
    requestAnimationFrame: (fn) => {
      const id = nextFrameId++;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  });

  const file = path.resolve(__dirname, '../src/hooks/useDialogFocus.ts');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  vm.runInContext(
    `(function(require,module,exports){${source}\n})`,
    context,
    { filename: file }
  )((id) => (id === 'react' ? renderer.react : {}), mod, mod.exports);

  const dispatchEscape = () => {
    let prevented = false;
    for (const listener of [...listeners.keydown]) {
      listener({
        key: 'Escape',
        defaultPrevented: prevented,
        preventDefault() { prevented = true; },
        stopPropagation() {},
      });
    }
  };

  return {
    useDialogFocus: mod.exports.useDialogFocus,
    MockHTMLElement,
    document,
    get activeElement() { return activeElement; },
    get activeElementReads() { return activeElementReads; },
    dispatchEscape,
    renderer,
  };
}

test('useDialogFocus does not read activeElement during render and restores focus before autoFocus moves it', () => {
  const h = createDialogHarness();
  const trigger = new h.MockHTMLElement('BUTTON');
  const otherTrigger = new h.MockHTMLElement('BUTTON');
  const dialog = new h.MockHTMLElement('DIV');
  const autoFocusInput = new h.MockHTMLElement('INPUT');
  dialog.appendChild(autoFocusInput);
  const dialogRef = { current: null };

  // Render without committing effects first (simulates an uncommitted render).
  trigger.focus();
  const readsBefore = h.activeElementReads;
  h.useDialogFocus(dialogRef, true, () => {});
  assert.equal(h.activeElementReads, readsBefore);

  // Focus changes before commit, and autoFocus moves focus inside the dialog during commit.
  otherTrigger.focus();
  dialogRef.current = dialog;
  autoFocusInput.focus();
  assert.equal(h.activeElement, autoFocusInput);

  h.renderer.render(() => h.useDialogFocus(dialogRef, true, () => {}));
  h.renderer.cleanup();
  assert.equal(h.activeElement, otherTrigger);
});

test('nested dialogs restore focus in LIFO order and send Escape only to the topmost dialog', () => {
  const h = createDialogHarness();
  const pageButton = new h.MockHTMLElement('BUTTON');
  const dialog1 = new h.MockHTMLElement('DIV');
  const buttonInDialog1 = new h.MockHTMLElement('BUTTON');
  dialog1.appendChild(buttonInDialog1);
  const dialog2 = new h.MockHTMLElement('DIV');
  const inputInDialog2 = new h.MockHTMLElement('INPUT');
  dialog2.appendChild(inputInDialog2);

  pageButton.focus();
  const ref1 = { current: dialog1 };
  const ref2 = { current: dialog2 };
  const closed = [];
  try {
    let open1 = true;
    let open2 = false;
    const renderBoth = () =>
      h.renderer.render(() => {
        h.useDialogFocus(ref1, open1, () => { closed.push('first'); open1 = false; });
        h.useDialogFocus(ref2, open2, () => { closed.push('second'); open2 = false; });
      });

    renderBoth();
    assert.equal(h.document.body.style.overflow, 'hidden');

    buttonInDialog1.focus();
    open2 = true;
    inputInDialog2.focus();
    renderBoth();

    h.dispatchEscape();
    assert.deepEqual(closed, ['second']);
    renderBoth();
    assert.equal(h.activeElement, buttonInDialog1);
    assert.equal(h.document.body.style.overflow, 'hidden');

    h.dispatchEscape();
    assert.deepEqual(closed, ['second', 'first']);
    renderBoth();
    assert.equal(h.activeElement, pageButton);
    assert.equal(h.document.body.style.overflow, undefined);
  } finally {
    h.renderer.cleanup();
  }
});
