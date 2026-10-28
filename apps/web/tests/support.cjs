const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createRequire } = require('node:module');
const webRequire = createRequire(path.resolve(__dirname, '../package.json'));
const root = path.resolve(__dirname, '../src');
const emptyPending = { folderIds: [], deckIds: [], cardIds: [], deletedFolderIds: [], deletedDeckIds: [], deletedCardIds: [] };
const card = { termRichText: 'old', definitionRichText: 'answer', learned: true };
const seed = { card, data: () => ({ folders: [], decks: [{id:'d1',title:'deck',createdAt:1,updatedAt:1}],
  cards: ['c1','c2'].map(id => ({...card,id,deckId:'d1'})) }) };
seed.snapshot = () => ({ ...seed.data(), pendingSync: emptyPending, pendingVersions: {}, mutationRevision: 0 });

function createHarness(service = {}, storage = new Map(), overrides = {}) {
  const navigator = { onLine: true };
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) };
  const transport = { commitChanges: async () => {}, fetchAllData: async () => null, sortCardsByOrder: cards => [...cards].sort((a,b)=>(a.order??0)-(b.order??0)), ...service };
  const mocks = {
    [path.join(root,'lib/firebase.ts')]: {isFirebaseConfigured:true,auth:{},googleProvider:{}},
    [path.join(root,'services/flashcardService.ts')]: {flashcardService:transport,sortCardsByOrder:transport.sortCardsByOrder},
    [path.join(root,'services/storageService.ts')]: {extractAllFirebaseImageUrlsFromCard:()=>[],deleteImagesByUrls:async()=>{}},
    'firebase/auth': {signInWithPopup:async()=>{},signOut:async()=>{}},
    ...overrides,
  };
  const cache = new Map();
  const context = vm.createContext({console, navigator, localStorage, crypto:require('node:crypto').webcrypto, setTimeout,clearTimeout});
  function load(file) {
    if (mocks[file]) return mocks[file];
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports:{}}; cache.set(file,module);
    const source = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const localRequire = id => {
      if (mocks[id]) return mocks[id];
      if (!id.startsWith('.')) return webRequire(id);
      let target = path.resolve(path.dirname(file),id);
      for (const suffix of ['.ts','.tsx','/index.ts']) if (fs.existsSync(target+suffix)) return load(target+suffix);
      throw Error(`Cannot resolve ${id} from ${file}`);
    };
    vm.runInContext(`(function(require,module,exports){${source}\n})`,context,{filename:file})(localRequire,module,module.exports);
    return module.exports;
  }
  const store = load(path.join(root,'store/useFlashcardStore.ts')).useFlashcardStore;
  return {store,storage,localStorage,navigator,load,root};
}
const deferred = () => { let resolve; const promise = new Promise(r=>{resolve=r}); return {promise,resolve}; };
const tick = () => new Promise(resolve=>setImmediate(resolve));
module.exports = {createHarness,seed,deferred,tick};
