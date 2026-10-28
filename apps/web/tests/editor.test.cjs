const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed } = require('./support.cjs');

// Deterministic hook scheduler: effects run after each render and clean up on unmount.
function hookRenderer() {
  const slots = []; let cursor = 0; let dirty = false; let effects = [];
  const changed = (a,b) => !a || !b || a.length !== b.length || a.some((x,i)=>!Object.is(x,b[i]));
  const react = {
    useState(initial) { const i=cursor++; if (!slots[i]) slots[i]={value:typeof initial==='function'?initial():initial};
      return [slots[i].value, update=>{ const value=typeof update==='function'?update(slots[i].value):update;
        if (!Object.is(value,slots[i].value)) { slots[i].value=value; dirty=true; } }]; },
    useRef(value) { const i=cursor++; if (!slots[i]) slots[i]={current:value}; return slots[i]; },
    useEffect(effect,deps) { const i=cursor++; if (changed(slots[i]?.deps,deps)) effects.push(()=>{
      slots[i]?.cleanup?.(); slots[i]={deps,cleanup:effect()}; }); },
    useMemo(make,deps) { const i=cursor++; if (changed(slots[i]?.deps,deps)) slots[i]={deps,value:make()}; return slots[i].value; },
    useCallback(fn,deps) { return react.useMemo(()=>fn,deps); },
  };
  return { react, render(fn) { let result; let count=0; do { dirty=false;cursor=0;effects=[];result=fn();effects.forEach(f=>f());
    if (++count>20) throw Error('Render loop'); } while(dirty); return result; },
    cleanup() { slots.forEach(slot=>slot?.cleanup?.()); } };
}

function editorFixture() {
  const h = createHarness(); h.navigator.onLine=false;
  h.storage.set('flashcards_account_v1:user:a',JSON.stringify(seed.snapshot()));
  h.store.getState().setUser({uid:'a'});
  const renderer=hookRenderer();
  const mockStore=Object.assign((selector)=>selector ? selector(h.store.getState()) : h.store.getState(),{getState:h.store.getState});
  const loader=createHarness({},h.storage,{
    react:renderer.react,
    [path.join(h.root,'store/useFlashcardStore.ts')]:{useFlashcardStore:mockStore},
  });
  const {useDeckEditor}=loader.load(path.join(h.root,'hooks/useDeckEditor.ts'));
  const options={deckId:'d1',onSaved:()=>{}};
  return {...h,renderer,render:()=>renderer.render(()=>useDeckEditor(options))};
}

test('draft keys isolate accounts and report persistence failure', () => {
  const h=createHarness(); const drafts=h.load(path.join(h.root,'services/deckDraftStorage.ts'));
  const draft={deckId:'d1',title:'private',description:'',selectedFolderId:null,cardItems:[seed.card],savedAt:1};
  assert.equal(drafts.saveDeckDraft('a',draft),true);
  assert.equal(drafts.loadDeckDraft('b','d1'),null);
  assert.equal(drafts.loadDeckDraft('a','d1').title,'private');
  drafts.removeDeckDraft('a','d1');
  assert.equal(drafts.loadDeckDraft('a','d1'),null);
  h.localStorage.setItem=()=>{throw Error('quota')};
  assert.equal(drafts.saveDeckDraft('a',draft),false);
});

test('remote refresh preserves dirty inputs and offers explicit reload', () => {
  const h=editorFixture();
  try {
    let editor=h.render();editor.setTitle('unsaved title');editor.handleUpdateCard(0,'termRichText','unsaved text');h.render();
    h.store.getState().updateDeck('d1',{title:'remote title'});
    h.store.getState().updateCard('c1',{termRichText:'remote text'});
    editor=h.render();
    assert.equal(editor.title,'unsaved title');
    assert.equal(editor.cardItems[0].termRichText,'unsaved text');
    assert.equal(editor.hasExternalChanges,true);
    editor.reloadOriginal();editor=h.render();
    assert.equal(editor.title,'remote title');
    assert.equal(editor.cardItems[0].termRichText,'remote text');
    assert.equal(editor.hasExternalChanges,false);
  } finally { h.renderer.cleanup(); }
});

test('navigation flushes a draft but saving does not recreate it on unmount', () => {
  const h=editorFixture();let editor=h.render();editor.setTitle('draft');h.render();h.renderer.cleanup();
  assert.equal(JSON.parse(h.storage.get('flashcards_draft_v2:user:a:d1')).title,'draft');
  const saved=editorFixture();editor=saved.render();editor.setTitle('saved');editor=saved.render();editor.handleSave();saved.renderer.cleanup();
  assert.equal(saved.storage.get('flashcards_draft_v2:user:a:d1'),'null');
  assert.equal(saved.store.getState().decks[0].title,'saved');
});

test('deleting one duplicated card retains the shared image on the other', () => {
  let deletions=0;
  const h=createHarness({},new Map(),{
    [path.resolve(__dirname,'../src/services/storageService.ts')]:{
      extractAllFirebaseImageUrlsFromCard:()=>['shared'],deleteImagesByUrls:()=>{deletions++;},
    },
  });h.navigator.onLine=false;
  h.store.getState().addDeck({title:'deck'},[{...seed.card,frontImageUrl:'shared'},{...seed.card,frontImageUrl:'shared'}]);
  h.store.getState().deleteCard(h.store.getState().cards[0].id);
  assert.equal(deletions,0);
  assert.equal(h.store.getState().cards[0].frontImageUrl,'shared');
});
