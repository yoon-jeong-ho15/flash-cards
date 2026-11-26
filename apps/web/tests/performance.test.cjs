const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createHarness, seed } = require('./support.cjs');
const { hookRenderer } = require('./hookRenderer.cjs');

test('card indexes are cached and preserve unaffected set selections', async () => {
  const h=createHarness(); const {indexCards,selectSetCards}=h.load(path.join(h.root,'store/cardSelectors.ts'));
  const a={...seed.card,id:'a',setId:'s1',order:1};
  const b={...seed.card,id:'b',setId:'s2',order:0};
  const cards=[a,b]; const first=indexCards(cards);
  assert.equal(indexCards(cards),first);
  const selection=selectSetCards({cards},'s1');
  const changed=[a,{...b,learned:false}];
  assert.equal(selectSetCards({cards:changed},'s1'),selection);
  assert.notEqual(indexCards(changed).byId.get('b'),b);
  assert.equal(selectSetCards({cards},'missing'),selectSetCards({cards:changed},'missing'));
});

test('data and outbox persist in the same atomic write', async () => {
  const h = createHarness(); h.navigator.onLine = false;
  let writes = 0;
  const original = h.localStorage.setItem;
  h.localStorage.setItem = (...args) => { writes++; original(...args); };
  const id = await h.store.getState().addSet({ title: 'atomic' }, [seed.card]);
  assert.equal(writes, 1);
  const persisted = JSON.parse(h.storage.get('flashcards_account_v1:guest'));
  assert.equal(persisted.sets[0].id, id);
  assert.deepEqual(persisted.pendingSync.setIds, [id]);
  assert.deepEqual(persisted.pendingSync.cardIds, [persisted.cards[0].id]);
});

test('ephemeral sync state changes do not write account snapshots', async () => {
  const h=createHarness();let writes=0;
  const original=h.localStorage.setItem;
  h.localStorage.setItem=(...args)=>{writes++;original(...args);};
  h.store.getState().setSyncStatus('syncing');
  h.store.getState().setSyncStatus('synced');
  assert.equal(writes,0);
});

test('study sessions resolve current card content without copying or resetting order', async () => {
  const h=createHarness();h.navigator.onLine=false;
  const snapshot=seed.snapshot();snapshot.cards.forEach(card=>{card.learned=false});
  h.storage.set('flashcards_account_v1:user:a',JSON.stringify(snapshot));
  h.store.getState().setUser({uid:'a'});
  const renderer=hookRenderer();
  const mockStore=Object.assign(selector=>selector(h.store.getState()),{getState:h.store.getState});
  const loader=createHarness({},h.storage,{react:renderer.react,
    [path.join(h.root,'store/useFlashcardStore.ts')]:{useFlashcardStore:mockStore}});
  const {useStudySession}=loader.load(path.join(h.root,'hooks/useStudySession.ts'));
  const render=()=>renderer.render(()=>useStudySession({setId:'s1',onExit:()=>{}}));
  try {
    let session=render();assert.equal(session.currentCard.id,'c1');
    session.handleNext();session=render();assert.equal(session.currentCard.id,'c2');
    await h.store.getState().updateCard('c2',{termRichText:'updated elsewhere'});
    session=render();assert.equal(session.currentCard.termRichText,'updated elsewhere');
    await session.handleToggleKnow();session=render();assert.equal(session.currentCard.learned,true);
    assert.equal(session.currentIndex,1);
    await h.store.getState().deleteCard('c2');session=render();assert.equal(session.currentCard.id,'c1');
  } finally { renderer.cleanup(); }
});

test('account switching does not write snapshots and logout works when storage is full', async () => {
  const h=createHarness();h.navigator.onLine=false;
  h.store.getState().setUser({uid:'a'});
  await h.store.getState().addSet({title:'private'});
  h.localStorage.setItem=()=>{throw Error('quota')};
  h.store.getState().setUser(null);
  assert.equal(h.store.getState().user,null);
  assert.equal(h.store.getState().sets.length,0);
  h.store.getState().setUser({uid:'a'});
  assert.equal(h.store.getState().sets[0].title,'private');
});

test('acknowledgements reuse collection serialization while still rereading durable storage', async () => {
  const h = createHarness();
  const { transactAccount } = h.load(path.join(h.root, 'store/accountStorage.ts'));
  let serializations = 0; let reads = 0;
  const card = { ...seed.card, id: 'c1', setId: 's1', toJSON() { serializations++; return { id: this.id, setId: this.setId }; } };
  const original = h.localStorage.getItem;
  h.localStorage.getItem = key => { reads++; return original(key); };
  await transactAccount(undefined, latest => ({ ...latest, cards: [card] }), () => {});
  const firstReads = reads;
  await transactAccount(undefined, latest => ({ ...latest, mutationRevision: 2 }), () => {});
  assert.ok(reads > firstReads);
  assert.equal(serializations, 1);
});
