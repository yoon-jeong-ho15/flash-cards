const path = require('node:path');
const esbuild = require('esbuild');
const { createRequire } = require('node:module');
const localRequire = createRequire(path.resolve(__dirname, '../package.json'));
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const source = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src', file)], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const { FlashcardStore } = load('core/store.ts');
const { emptySnapshot, accountKey } = load('core/types.ts');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const user = uid => ({ uid, displayName: uid, email: null, photoURL: null });
function harness(transport = {}, map = new Map()) {
  let count = 0;
  const storage = { getItem: async key => map.get(key) ?? null, setItem: async (key, value) => { map.set(key, value); }, removeItem: async key => { map.delete(key); } };
  const cloud = { available: false, push: async () => {}, pull: async () => ({ folders: [], decks: [], cards: [] }), ...transport };
  return { store: new FlashcardStore(storage, cloud, () => String(++count)), storage, cloud, map };
}
const item = (term = '질문') => ({ termRichText: `<p>${term}</p>`, definitionRichText: '<p>답</p>' });
module.exports = { load, harness, item, deferred, tick, user, accountKey, emptySnapshot };
