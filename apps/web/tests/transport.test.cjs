const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createHarness,seed}=require('./support.cjs');

test('cloud reads never delete or migrate documents, and writes check account ownership',async()=>{
  const operations=[];let commits=0;
  const auth={currentUser:{uid:'a'}};
  const snapshots={flashcard_folders:[],flashcard_decks:seed.data().decks,
    flashcard_cards:[...seed.data().cards,{...seed.card,id:'orphan',deckId:'missing'}]};
  const firestore={
    collection:(_db,name)=>name,query:name=>name,where:()=>{},doc:(_db,name,id)=>({name,id}),
    getDocs:async name=>({docs:snapshots[name].map(item=>({id:item.id,data:()=>item}))}),
    writeBatch:()=>({set:(ref,data)=>operations.push({type:'set',ref,data}),delete:ref=>operations.push({type:'delete',ref}),
      commit:async()=>{commits++;}}),
  };
  const h=createHarness({},new Map(),{
    [path.resolve(__dirname,'../src/services/flashcardService.ts')]:null,
    [path.resolve(__dirname,'../src/lib/firebase.ts')]:{db:{},auth,isFirebaseConfigured:true},
    'firebase/firestore':firestore,
  });
  const {flashcardService}=h.load(path.join(h.root,'services/flashcardService.ts'));
  const data=await flashcardService.fetchAllData('a');
  assert.equal(data.cards.length,2);
  assert.equal(commits,0);
  const snapshot=seed.snapshot();snapshot.pendingSync={...snapshot.pendingSync,deckIds:['d1'],cardIds:['c1'],deletedCardIds:['c2']};
  await flashcardService.commitChanges(snapshot,'a',()=>true);
  assert.equal(commits,1);
  assert.equal(operations.filter(op=>op.type==='set').length,2);
  assert.equal(operations.find(op=>op.ref.id==='c1').data.frontImageUrl,null);
  assert.ok(operations.filter(op=>op.type==='set').every(op=>op.data.userId==='a'));
  auth.currentUser.uid='b';
  await assert.rejects(flashcardService.commitChanges(snapshot,'a',()=>true),/session changed/);
  assert.equal(commits,1);
});
