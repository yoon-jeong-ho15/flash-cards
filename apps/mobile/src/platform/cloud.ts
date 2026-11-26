import type { RecordSyncWrites, SyncWriteResult } from '@flashcards/types';
import { digest, CryptoDigestAlgorithm, randomUUID } from 'expo-crypto';
import { cardDataImages, replaceCardImage } from '../core/imageSync';
import { collection, deleteDoc, doc, documentId, getDocsFromServer, query, updateDoc, where, writeBatch, type DocumentData } from 'firebase/firestore';
import { auth, configured, db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable, type UploadTaskSnapshot } from 'firebase/storage';
import type { Card, Data, Kind, Transport, ImageUpload } from '../core/types';

const names: Record<Kind, string> = { folders: 'flashcard_folders', sets: 'flashcard_sets', cards: 'flashcard_cards' };
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

async function writeExisting(name: string, id: string, uid: string, active: () => boolean, write: () => Promise<void>) {
  try {
    await write();
    return true;
  } catch (error) {
    if (!active()) throw new Error('계정이 변경되었습니다.');
    const code = (error as { code?: string }).code;
    if (code === 'not-found') return false;
    if (code !== 'permission-denied') throw error;

    // Missing documents can also be denied by the ownership rule. Confirm on the server.
    const owned = await getDocsFromServer(query(collection(db!, name), where('userId', '==', uid), where(documentId(), '==', id)));
    if (!active()) throw new Error('계정이 변경되었습니다.');
    if (!owned.empty) throw error;
    return false;
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
function readCard(id: string, data: DocumentData, uid: string): Card {
  return {
    id, userId: uid, setId: data.setId || '', order: data.order == null ? undefined : Number(data.order),
    termRichText: data.termRichText || '', definitionRichText: data.definitionRichText || '',
    learned: Boolean(data.learned), frontImageUrl: data.frontImageUrl || undefined,
    backImageUrl: data.backImageUrl || data.imageUrl || undefined,
    imageUrl: data.backImageUrl || data.imageUrl || undefined,
    ...(typeof data.contentVersion === 'string' && { contentVersion: data.contentVersion }),
  };
}
export const cloud: Transport = {
  available: configured,
  waitForWrites: () => bounded(outstandingWrite),
  async push(uid, snapshot, active, onImage, record) {
    if (!db) throw new Error('Firebase 설정을 확인해 주세요.');
    const canWrite = () => active() && auth?.currentUser?.uid === uid;
    const cache = new Map<string, string>(Object.entries(snapshot.imageCache || {}).map(([url, data]) => [data, url]));
    const individualWrites: Array<() => Promise<SyncWriteResult>> = [];
    const missingDeletes: string[] = [];
    const operations = Object.values(snapshot.outbox).filter(operation => {
      const { kind, id } = operation;
      if (operation.deleted) {
        // A missing delete must not reject a batch of unrelated upserts.
        individualWrites.push(async () => {
          const deleted = await writeExisting(names[kind], id, uid, canWrite,
            () => deleteDoc(doc(db!, names[kind], id)));
          if (!deleted) missingDeletes.push(`${kind}:${id}`);
          return { key: `${kind}:${id}`, outcome: deleted ? 'written' : 'missing' };
        });
        return false;
      }
      if (kind !== 'cards' || !operation.learnedOnly) return true;
      const card = snapshot.cards.find(card => card.id === id);
      if (!card) throw new Error('동기화할 자료를 찾을 수 없습니다.');
      individualWrites.push(async () => {
        const exists = await writeExisting(names.cards, id, uid, canWrite,
          () => updateDoc(doc(db!, names.cards, id), { learned: Boolean(card.learned) }));
        return { key: `cards:${id}`, outcome: exists ? 'written' : 'missing' };
      });
      return false;
    });
    // Keep the same 400-operation limit and card version check as the web app.
    const notSent = new Set(operations.map(operation => `${operation.kind}:${operation.id}`));
    try {
      for (let i = 0; i < operations.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = operations.slice(i, i + 400);
        const cardVersions = new Map<string, { id: string; base: string | null; version: string }>();
        for (const operation of chunk) {
          if (!canWrite()) throw new Error('계정이 변경되었습니다.');
          const target = doc(db, names[operation.kind], operation.id);
          const item = snapshot[operation.kind].find(item => item.id === operation.id);
          if (!item) throw new Error('동기화할 자료를 찾을 수 없습니다.');
          const normalized = operation.kind === 'cards' ? await uploadEmbeddedImages(item as Card, uid, active, cache, onImage) : item;
          const data: Record<string, unknown> = { ...normalized, userId: uid };
          for (const key of operation.kind === 'cards' ? ['frontImageUrl', 'backImageUrl', 'imageUrl'] : ['description']) data[key] ??= null;
          for (const key of Object.keys(data)) if (data[key] === undefined) data[key] = null;
          if (operation.kind === 'cards') {
            const base = (item as Card).contentVersion ?? null;
            const version = randomUUID();
            cardVersions.set(`cards:${operation.id}`, { id: operation.id, base, version });
            data.baseContentVersion = base;
            data.contentVersion = version;
          }
          batch.set(target, data, { merge: true });
        }
        const keys = chunk.map(operation => `${operation.kind}:${operation.id}`);
        let reconciled = false;
        await commitWrite(async () => {
          for (const key of keys) notSent.delete(key);
          try {
            await batch.commit();
          } catch (error) {
            const code = (error as { code?: string }).code;
            if (code === 'permission-denied' || code === 'invalid-argument' || code === 'failed-precondition') {
              const results = await Promise.all(keys.map(async (key): Promise<SyncWriteResult> => {
                const card = cardVersions.get(key);
                if (code === 'permission-denied' && card && canWrite()) {
                  const owned = await getDocsFromServer(query(collection(db!, names.cards),
                    where('userId', '==', uid), where(documentId(), '==', card.id)));
                  const remote = owned.docs[0];
                  if (remote) {
                    const serverCard = readCard(remote.id, remote.data(), uid);
                    if ((serverCard.contentVersion ?? null) !== card.base) {
                      return { key, outcome: 'conflict', serverCard };
                    }
                  } else if (card.base !== null) return { key, outcome: 'missing' };
                }
                return { key, outcome: 'not-sent' };
              }));
              await record?.(results);
              // Reload the durable queue before sending the remaining writes.
              reconciled = Boolean(record && results.some(result => result.outcome !== 'not-sent'));
              if (reconciled) return;
            }
            throw error;
          }
          await record?.(keys.map(key => ({ key, outcome: 'written', contentVersion: cardVersions.get(key)?.version })));
        }, canWrite);
        if (reconciled) {
          if (notSent.size) await record?.(Array.from(notSent, key => ({ key, outcome: 'not-sent' })));
          return missingDeletes;
        }
      }
    } catch (error) {
      if (notSent.size) await record?.(Array.from(notSent, key => ({ key, outcome: 'not-sent' })));
      throw error;
    }
    for (let i = 0; i < individualWrites.length; i += 25) {
      const chunk = individualWrites.slice(i, i + 25);
      await commitWrite(async () => {
        const results = await Promise.allSettled(chunk.map(async write => {
          const result = await write();
          await record?.([result]);
        }));
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
      }, canWrite);
    }
    return missingDeletes;
  },
  async pull(uid) {
    if (!db || auth?.currentUser?.uid !== uid) throw new Error('로그인 상태를 확인해 주세요.');
    const kinds: Kind[] = ['folders', 'sets', 'cards'];
    const snapshots = await bounded(Promise.all(kinds.map(kind =>
      getDocsFromServer(query(collection(db!, names[kind]), where('userId', '==', uid))),
    )));
    const folders = snapshots[0].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, title: v.title || '', description: v.description || '', createdAt: Number(v.createdAt || 0) }; });
    const sets = snapshots[1].docs.map(d => { const v = d.data(); return { id: d.id, userId: uid, title: v.title || '', description: v.description || '', folderId: v.folderId || null, createdAt: Number(v.createdAt || 0), updatedAt: Number(v.updatedAt || 0) }; });
    const ids = new Set(sets.map(item => item.id));
    const cards = snapshots[2].docs.map(d => readCard(d.id, d.data(), uid)).filter(c => ids.has(c.setId));
    return { folders, sets, cards } satisfies Data;
  },
};
