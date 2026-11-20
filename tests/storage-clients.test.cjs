const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual upload entry points, with only browser/native/Firebase I/O mocked.
function load(relativePath, dependencies, globals = {}) {
  const source = ts.transpileModule(readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = vm.createContext({ console: { info() {}, warn() {} }, setTimeout, clearTimeout, ...globals });
  const module = { exports: {} };
  vm.runInContext(`(function(require,module,exports){${source}\n})`, context)(id => {
    assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
    return dependencies[id];
  }, module, module.exports);
  return module.exports;
}

function webFixture(fail = false) {
  const calls = [];
  const storage = {
    ref: (_, name) => name,
    uploadBytesResumable: (ref, file, metadata) => {
      calls.push({ ref, file, metadata });
      const task = fail ? Promise.reject(new Error('storage/unauthorized')) : Promise.resolve({ ref });
      task.cancel = () => {};
      return task;
    },
    getDownloadURL: async ref => `https://example.com/${ref}`,
  };
  class FileReader {
    readAsDataURL(file) {
      file.arrayBuffer().then(data => {
        this.result = `data:${file.type};base64,${Buffer.from(data).toString('base64')}`;
        this.onload();
      });
    }
  }
  return { calls, ...load('apps/web/src/services/storageService.ts', {
    './imageSync': { bounded: async work => await work },
    'firebase/storage': storage, '../lib/firebase': { storage: {}, isFirebaseConfigured: true },
  }, { navigator: { onLine: true }, FileReader }) };
}

test('web guest stores a local data URL without a Storage request', async () => {
  const { calls, uploadCardImage } = webFixture();
  assert.equal(await uploadCardImage(new File(['abc'], 'card.webp', { type: 'image/webp' })), 'data:image/webp;base64,YWJj');
  assert.equal(calls.length, 0);
});

test('web account upload retains UID path and WebP content type', async () => {
  const { calls, uploadCardImage } = webFixture();
  const url = await uploadCardImage(new File(['abc'], 'card.webp', { type: 'image/webp' }), 'alice');
  assert.match(calls[0].ref, /^cards\/alice\/\d+_[a-z0-9]+\.webp$/);
  assert.equal(calls[0].metadata.contentType, 'image/webp');
  assert.equal(url, `https://example.com/${calls[0].ref}`);
});

test('web denied upload preserves the existing local fallback', async () => {
  const { uploadCardImage } = webFixture(true);
  assert.equal(await uploadCardImage(new File(['abc'], 'card.webp', { type: 'image/webp' }), 'alice'), 'data:image/webp;base64,YWJj');
});

for (const user of [null, { uid: 'alice' }]) {
  test(`mobile ${user ? 'account uploads JPEG under its UID' : 'guest retains local JPEG without uploading'}`, async () => {
    const calls = [];
    const { chooseImage } = load('apps/mobile/src/platform/images.ts', {
      'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'local.jpg', width: 100, height: 100, fileSize: 3 }] }) },
      'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: () => ({ resize() {}, renderAsync: async () => ({ saveAsync: async () => ({ base64: 'YWJj' }) }) }) } },
      './runtime': { store: { getState: () => ({ session: 1, user, online: true }) } },
      './cloud': { uploadImage: async (data, uid, active) => { calls.push({ data, uid }); assert.equal(active(), true); return `https://example.com/cards/${uid}/image.jpg`; } },
    });
    const result = await chooseImage();
    if (user) {
      assert.equal(calls[0].uid, 'alice');
      assert.equal(calls[0].data, 'data:image/jpeg;base64,YWJj');
      assert.equal(result, 'https://example.com/cards/alice/image.jpg');
    } else {
      assert.equal(result, 'data:image/jpeg;base64,YWJj');
      assert.equal(calls.length, 0);
    }
  });
}
