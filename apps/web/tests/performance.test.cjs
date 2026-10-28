const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed } = require('./support.cjs');
const { hookRenderer } = require('./hookRenderer.cjs');

test('card indexes are cached and preserve unaffected deck selections', () => {
  const h=createHarness(); const {indexCards,selectDeckCards}=h.load(path.join(h.root,'store/cardSelectors.ts'));
  const a={...seed.card,id:'a',deckId:'d1',order:1};
  const b={...seed.card,id:'b',deckId:'d2',order:0};
  const cards=[a,b]; const first=indexCards(cards);
  assert.equal(indexCards(cards),first);
  const selection=selectDeckCards({cards},'d1');
  const changed=[a,{...b,learned:false}];
  assert.equal(selectDeckCards({cards:changed},'d1'),selection);
  assert.notEqual(indexCards(changed).byId.get('b'),b);
  assert.equal(selectDeckCards({cards},'missing'),selectDeckCards({cards:changed},'missing'));
});

test('sync metadata updates reuse serialized collections and remain atomic', () => {
  const h=createHarness(); const {writeAccount}=h.load(path.join(h.root,'store/accountStorage.ts'));
  let serializations=0;
  const card={...seed.card,id:'c1',deckId:'d1',toJSON(){serializations++;return {id:this.id,deckId:this.deckId};}};
  const state={...h.store.getState(),cards:[card]};
  writeAccount(state);
  writeAccount({...state,pendingSync:{...state.pendingSync,cardIds:['c1']},mutationRevision:2});
  assert.equal(serializations,1);
  const persisted=JSON.parse(h.storage.get('flashcards_account_v1:guest'));
  assert.equal(persisted.cards[0].id,'c1');
  assert.deepEqual(persisted.pendingSync.cardIds,['c1']);
});

test('ephemeral sync state changes do not write account snapshots', () => {
  const h=createHarness();let writes=0;
  const original=h.localStorage.setItem;
  h.localStorage.setItem=(...args)=>{writes++;original(...args);};
  h.store.getState().setSyncStatus('syncing');
  h.store.getState().setSyncStatus('synced');
  assert.equal(writes,0);
});

test('study sessions resolve current card content without copying or resetting order', () => {
  const h=createHarness();h.navigator.onLine=false;
  const snapshot=seed.snapshot();snapshot.cards.forEach(card=>{card.learned=false});
  h.storage.set('flashcards_account_v1:user:a',JSON.stringify(snapshot));
  h.store.getState().setUser({uid:'a'});
  const renderer=hookRenderer();
  const mockStore=Object.assign(selector=>selector(h.store.getState()),{getState:h.store.getState});
  const loader=createHarness({},h.storage,{react:renderer.react,
    [path.join(h.root,'store/useFlashcardStore.ts')]:{useFlashcardStore:mockStore}});
  const {useStudySession}=loader.load(path.join(h.root,'hooks/useStudySession.ts'));
  const render=()=>renderer.render(()=>useStudySession({deckId:'d1',onExit:()=>{}}));
  try {
    let session=render();assert.equal(session.currentCard.id,'c1');
    session.handleNext();session=render();assert.equal(session.currentCard.id,'c2');
    h.store.getState().updateCard('c2',{termRichText:'updated elsewhere'});
    session=render();assert.equal(session.currentCard.termRichText,'updated elsewhere');
    session.handleToggleKnow();session=render();assert.equal(session.currentCard.learned,true);
    assert.equal(session.currentIndex,1);
    h.store.getState().deleteCard('c2');session=render();assert.equal(session.currentCard.id,'c1');
  } finally { renderer.cleanup(); }
});

test('account switching does not write snapshots and logout works when storage is full', () => {
  const h=createHarness();h.navigator.onLine=false;
  h.store.getState().setUser({uid:'a'});
  h.store.getState().addDeck({title:'private'});
  h.localStorage.setItem=()=>{throw Error('quota')};
  h.store.getState().setUser(null);
  assert.equal(h.store.getState().user,null);
  assert.equal(h.store.getState().decks.length,0);
  h.store.getState().setUser({uid:'a'});
  assert.equal(h.store.getState().decks[0].title,'private');
});
