import { digest, CryptoDigestAlgorithm } from 'expo-crypto';
import { cardDataImages, replaceCardImage } from '../core/imageSync';
import { collection, doc, documentId, getDocsFromServer, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, configured, db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable, type UploadTaskSnapshot } from 'firebase/storage';
import type { Card, Data, Kind, Transport, ImageUpload } from '../core/types';

const names: Record<Kind, string> = { folders: 'flashcard_folders', decks: 'flashcard_decks', cards: 'flashcard_cards' };
async function bounded<T>(work: PromiseLike<T>, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('연결 시간이 초과되었습니다. 다시 동기화해 주세요.')), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

// A timed-out write may still settle. Wait for it before submitting a retry or a newer edit.
let outstandingWrite: Promise<void> = Promise.resolve();
async function commitWrite(write: () => Promise<void>, active: () => boolean) {
  await bounded(outstandingWrite);
  if (!active()) throw new Error('계정이 변경되었습니다.');
  const work = write();
  outstandingWrite = work.catch(() => {});
  await bounded(work);
}

async function updateLearned(id: string, learned: boolean, uid: string, active: () => boolean) {
  try {
    await updateDoc(doc(db!, names.cards, id), { learned });
  } catch (error) {
    if (!active()) throw new Error('계정이 변경되었습니다.');
    const code = (error as { code?: string }).code;
    if (code === 'not-found') return;
    if (code !== 'permission-denied') throw error;

    // Missing documents can also be denied by the ownership rule. Confirm on the server.
    const cards = collection(db!, names.cards);
    const owned = await getDocsFromServer(query(cards, where('userId', '==', uid), where(documentId(), '==', id)));
    if (!active()) throw new Error('계정이 변경되었습니다.');
    if (!owned.empty) throw error;
  }
}
export async function uploadImage(dataUrl: string, uid: string, active: () => boolean): Promise<string> {
  if (!storage || !active() || auth?.currentUser?.uid !== uid) throw new Error('로그인 상태를 확인해 주세요.');
  const format = dataUrl.match(/^data:(image\/(png|jpe?g|gif|webp));base64,([a-z0-9+/=\s]+)$/i);
  if (!format) throw new Error('지원하지 않는 이미지 형식입니다.');
  const [, contentType, extension, encoded] = format;
  const bytes = Uint8Array.from(atob(encoded.replace(/\s/g, '')), char => char.charCodeAt(0));
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('5MB 이하의 이미지를 선택해 주세요.');
  const hash = Array.from(new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, bytes)), n => n.toString(16).padStart(2, '0')).join('');
  const check = () => { if (!active() || auth?.currentUser?.uid !== uid) throw new Error('계정이 변경되었습니다.'); };
  check();
  const path = `cards/${uid}/sha256_${hash}.${extension.toLowerCase().replace('jpeg', 'jpg')}`;
  try {
    const url = await bounded(getDownloadURL(ref(storage, path)), 8000);
    check();
    return url;
  } catch (error) { if ((error as { code?: string }).code !== 'storage/object-not-found') throw error; }
  check();
  const task = uploadBytesResumable(ref(storage, path), bytes, { contentType: contentType.toLowerCase(), cacheControl: 'public,max-age=31536000' });
  try {
    const completed = new Promise<UploadTaskSnapshot>((resolve, reject) => task.then(resolve, reject));
    const result = await bounded(completed, 15000);
    if (!active() || auth?.currentUser?.uid !== uid) throw new Error('계정이 변경되었습니다.');
    const url = await bounded(getDownloadURL(result.ref), 8000);
    check();
    return url;
  } catch (error) { task.cancel(); throw error; }
}
async function uploadEmbeddedImages(card: Card, uid: string, active: () => boolean, cache: Map<string, string>, onImage?: (image: ImageUpload) => Promise<void>): Promise<Card> {
  let output = card;
  for (const original of cardDataImages(card)) {
    if (!cache.has(original)) cache.set(original, await uploadImage(original, uid, active));
    const url = cache.get(original)!;
    // Persist each upload before a batch commit; partial failures retain reusable results.
    await onImage?.({ cardId: card.id, original, url });
    output = replaceCardImage(output, original, url);
  }
  return output;
}
export const cloud: Transport = {
  available: configured,
  async push(uid, snapshot, active, onImage) {
    if (!db) throw new Error('Firebase 설정을 확인해 주세요.');
    const canWrite = () => active() && auth?.currentUser?.uid === uid;
    const cache = new Map<string, string>(Object.entries(snapshot.imageCache || {}).map(([url, data]) => [data, url]));
    const learned: Card[] = [];
    const operations = Object.values(snapshot.outbox).filter(operation => {
      if (operation.kind !== 'cards' || operation.deleted || !operation.learnedOnly) return true;
      const card = snapshot.cards.find(card => card.id === operation.id);
      if (!card) throw new Error('동기화할 자료를 찾을 수 없습니다.');
      learned.push(card);
      return false;
    });
    // Keep the same 400-operation limit as the web app. Replays are idempotent.
    for (let i = 0; i < operations.length; i += 400) {
      const batch = writeBatch(db);
      for (const operation of operations.slice(i, i + 400)) {
        if (!canWrite()) throw new Error('계정이 변경되었습니다.');
        const target = doc(db, names[operation.kind], operation.id);
        if (operation.deleted) { batch.delete(target); continue; }
        const item = snapshot[operation.kind].find(item => item.id === operation.id);
        if (!item) throw new Error('동기화할 자료를 찾을 수 없습니다.');
        const normalized = operation.kind === 'cards' ? await uploadEmbeddedImages(item as Card, uid, active, cache, onImage) : item;
        const data: Record<string, unknown> = { ...normalized, userId: uid };
        for (const key of operation.kind === 'cards' ? ['frontImageUrl', 'backImageUrl', 'imageUrl'] : ['description']) data[key] ??= null;
        for (const key of Object.keys(data)) if (data[key] === undefined) data[key] = null;
        batch.set(target, data, { merge: true });
      }
      await commitWrite(() => batch.commit(), canWrite);
    }
    for (let i = 0; i < learned.length; i += 25) {
      const chunk = learned.slice(i, i + 25);
      await commitWrite(async () => {
        const results = await Promise.allSettled(chunk.map(card =>
          updateLearned(card.id, Boolean(card.learned), uid, canWrite)));
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
      }, canWrite);
    }
  },
  async pull(uid) {
    if (!db || auth?.currentUser?.uid !== uid) throw new Error('로그인 상태를 확인해 주세요.');
    const kinds: Kind[] = ['folders', 'decks', 'cards'];
    const snapshots = await bounded(Promise.all(kinds.map(kind =>
      getDocsFromServer(query(collection(db!, names[kind]), where('userId', '==', uid))),
    )));
    const folders = snapshots[0].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, title: v.title || '', description: v.description || '', createdAt: Number(v.createdAt || 0) }; });
    const decks = snapshots[1].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, title: v.title || '', description: v.description || '', folderId: v.folderId || null, createdAt: Number(v.createdAt || 0), updatedAt: Number(v.updatedAt || 0) }; });
    const ids = new Set(decks.map(d => d.id));
    const cards = snapshots[2].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, deckId: v.deckId || '', order: v.order == null ? undefined : Number(v.order), termRichText: v.termRichText || '', definitionRichText: v.definitionRichText || '', learned: Boolean(v.learned), frontImageUrl: v.frontImageUrl || undefined, backImageUrl: v.backImageUrl || v.imageUrl || undefined, imageUrl: v.backImageUrl || v.imageUrl || undefined }; }).filter(c => ids.has(c.deckId));
    return { folders, decks, cards } satisfies Data;
  },
};
