import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { auth, configured, db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable, type UploadTaskSnapshot } from 'firebase/storage';
import type { Card, Data, Kind, Transport } from '../core/types';

const names: Record<Kind, string> = { folders: 'flashcard_folders', decks: 'flashcard_decks', cards: 'flashcard_cards' };
async function bounded<T>(work: PromiseLike<T>, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('연결 시간이 초과되었습니다. 다시 동기화해 주세요.')), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
export async function uploadImage(dataUrl: string, uid: string, active: () => boolean): Promise<string> {
  if (!storage || !active() || auth?.currentUser?.uid !== uid) throw new Error('로그인 상태를 확인해 주세요.');
  const format = dataUrl.match(/^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/i);
  if (!format) throw new Error('지원하지 않는 이미지 형식입니다.');
  const [, contentType, extension, encoded] = format;
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const path = `cards/${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension === 'jpeg' ? 'jpg' : extension}`;
  const task = uploadBytesResumable(ref(storage, path), bytes, { contentType, cacheControl: 'public,max-age=31536000' });
  try {
    const completed = new Promise<UploadTaskSnapshot>((resolve, reject) => task.then(resolve, reject));
    const result = await bounded(completed, 8000);
    if (!active() || auth?.currentUser?.uid !== uid) throw new Error('계정이 변경되었습니다.');
    return await bounded(getDownloadURL(result.ref), 8000);
  } catch (error) { task.cancel(); throw error; }
}
async function uploadEmbeddedImages(card: Card, uid: string, active: () => boolean, cache: Map<string, string>): Promise<Card> {
  const output = { ...card };
  const upload = async (url: string) => {
    if (!url.startsWith('data:image/')) return url;
    if (!cache.has(url)) cache.set(url, await uploadImage(url, uid, active));
    return cache.get(url)!;
  };
  for (const key of ['frontImageUrl', 'backImageUrl', 'imageUrl'] as const) if (output[key]) output[key] = await upload(output[key]!);
  for (const key of ['termRichText', 'definitionRichText'] as const) {
    const urls = [...output[key].matchAll(/<img\b[^>]*\bsrc=["'](data:image\/[^"']+)["']/gi)].map(match => match[1]);
    for (const url of urls) output[key] = output[key].split(url).join(await upload(url));
  }
  return output;
}
export const cloud: Transport = {
  available: configured,
  async push(uid, snapshot, active) {
    if (!db) throw new Error('Firebase 설정을 확인해 주세요.');
    const cache = new Map<string, string>();
    const operations = Object.values(snapshot.outbox);
    // Keep the same 400-operation limit as the web app. Replays are idempotent.
    for (let i = 0; i < operations.length; i += 400) {
      const batch = writeBatch(db);
      for (const operation of operations.slice(i, i + 400)) {
        if (!active() || auth?.currentUser?.uid !== uid) throw new Error('계정이 변경되었습니다.');
        const target = doc(db, names[operation.kind], operation.id);
        if (operation.deleted) { batch.delete(target); continue; }
        const item = snapshot[operation.kind].find(item => item.id === operation.id);
        if (!item) throw new Error('동기화할 자료를 찾을 수 없습니다.');
        const normalized = operation.kind === 'cards' ? await uploadEmbeddedImages(item as Card, uid, active, cache) : item;
        const data: Record<string, unknown> = { ...normalized, userId: uid };
        for (const key of operation.kind === 'cards' ? ['frontImageUrl', 'backImageUrl', 'imageUrl'] : ['description']) data[key] ??= null;
        for (const key of Object.keys(data)) if (data[key] === undefined) data[key] = null;
        batch.set(target, data, { merge: true });
      }
      if (!active() || auth?.currentUser?.uid !== uid) throw new Error('계정이 변경되었습니다.');
      await bounded(batch.commit());
    }
  },
  async pull(uid) {
    if (!db || auth?.currentUser?.uid !== uid) throw new Error('로그인 상태를 확인해 주세요.');
    const kinds: Kind[] = ['folders', 'decks', 'cards'];
    const snapshots = await bounded(Promise.all(kinds.map(kind => getDocs(query(collection(db!, names[kind]), where('userId', '==', uid))))));
    const folders = snapshots[0].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, title: v.title || '', description: v.description || '', createdAt: Number(v.createdAt || 0) }; });
    const decks = snapshots[1].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, title: v.title || '', description: v.description || '', folderId: v.folderId || null, createdAt: Number(v.createdAt || 0), updatedAt: Number(v.updatedAt || 0) }; });
    const ids = new Set(decks.map(d => d.id));
    const cards = snapshots[2].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, deckId: v.deckId || '', order: v.order == null ? undefined : Number(v.order), termRichText: v.termRichText || '', definitionRichText: v.definitionRichText || '', learned: Boolean(v.learned), frontImageUrl: v.frontImageUrl || undefined, backImageUrl: v.backImageUrl || v.imageUrl || undefined, imageUrl: v.backImageUrl || v.imageUrl || undefined }; }).filter(c => ids.has(c.deckId));
    return { folders, decks, cards } satisfies Data;
  },
};
