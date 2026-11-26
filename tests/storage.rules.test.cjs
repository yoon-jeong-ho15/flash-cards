const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, uploadBytes, uploadBytesResumable, getBytes, getMetadata, getDownloadURL, updateMetadata, deleteObject, listAll } = require('firebase/storage');

const projectId = 'demo-flash-cards-storage';
const maxSize = 5 * 1024 * 1024;
const bytes = Uint8Array.from(Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'));
let env;
const object = (uid, name = 'cards/alice/image.webp') => ref(
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage(), name,
);
const upload = (target, data = bytes, contentType = 'image/webp') => uploadBytes(target, data, { contentType });
const denied = async promise => {
  const error = await assertFails(promise);
  assert.equal(error.code, 'storage/unauthorized');
};

before(async () => {
  // Refuse remote endpoints: tests must never connect to a live Firebase project.
  assert.match(process.env.FIREBASE_STORAGE_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);
  const [host, port] = process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':');
  env = await initializeTestEnvironment({
    projectId,
    storage: { host, port: Number(port), rules: readFileSync(path.resolve(__dirname, '../storage.rules'), 'utf8') },
  });
});
beforeEach(async () => {
  // rules-unit-testing 5's clearStorage only deletes root items, not nested prefixes.
  // Recurse so every case starts with an empty bucket, including cards/{uid}/... .
  await env.withSecurityRulesDisabled(async context => {
    async function clear(directory) {
      const { items, prefixes } = await listAll(directory);
      await Promise.all([...items.map(item => deleteObject(item)), ...prefixes.map(clear)]);
    }
    await clear(ref(context.storage()));
  });
});
after(async () => { if (env) await env.cleanup(); });

for (const uid of [null, 'bob']) {
  test(`${uid || 'unauthenticated'} cannot read, list, create, overwrite, change metadata, delete, or obtain a URL in alice's directory`, async () => {
    await upload(object('alice'));
    const target = object(uid);
    await denied(getBytes(target));
    await denied(getMetadata(target));
    await denied(getDownloadURL(target));
    await denied(listAll(object(uid, 'cards/alice')));
    await denied(upload(object(uid, 'cards/alice/new.webp')));
    await denied(upload(target));
    await denied(updateMetadata(target, { contentType: 'image/png', customMetadata: { uid: uid || 'alice' } }));
    await denied(deleteObject(target));
    assert.equal((await getMetadata(object('alice'))).size, bytes.length);
  });
}

for (const contentType of ['image/webp', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif']) {
  test(`owner can create, read and overwrite ${contentType}`, async () => {
    const target = object('alice');
    await assertSucceeds(upload(target, bytes, contentType));
    assert.deepEqual(new Uint8Array(await getBytes(target)), bytes);
    await assertSucceeds(upload(target, bytes, contentType));
    await assertSucceeds(updateMetadata(target, { cacheControl: 'public,max-age=31536000' }));
    assert.equal((await getMetadata(target)).contentType, contentType);
  });
}

test('web and mobile resumable uploads keep existing UID paths and download URLs', async () => {
  for (const [name, contentType] of [['cards/alice/123_web.webp', 'image/webp'], ['cards/alice/123_mobile.jpg', 'image/jpeg']]) {
    const target = object('alice', name);
    await assertSucceeds(uploadBytesResumable(target, bytes, { contentType, cacheControl: 'public,max-age=31536000' }));
    const url = await assertSucceeds(getDownloadURL(target));
    assert.ok(url.includes(encodeURIComponent(name)));
  }
  const listing = await assertSucceeds(listAll(object('alice', 'cards/alice')));
  assert.equal(listing.items.length, 2);
  await denied(listAll(object('alice', 'cards')));
});

for (const contentType of ['text/plain', 'application/octet-stream', 'image/svg+xml', 'image/heic', 'image/webp; charset=utf-8']) {
  test(`owner cannot create, overwrite or change metadata to ${contentType}`, async () => {
    await denied(upload(object('alice', 'cards/alice/new.webp'), bytes, contentType));
    const target = object('alice');
    await upload(target);
    await denied(upload(target, bytes, contentType));
    await denied(updateMetadata(target, { contentType }));
    assert.equal((await getMetadata(target)).contentType, 'image/webp');
  });
}

test('missing MIME type is denied, regardless of the file extension', async () => {
  await denied(uploadBytes(object('alice', 'cards/alice/no-type'), bytes));
  await denied(uploadBytes(object('alice', 'cards/alice/no-type'), bytes, { contentType: '' }));
});

test('5 MiB is allowed; empty and 5 MiB + 1 byte files cannot be created or overwrite an object', async () => {
  const target = object('alice');
  await assertSucceeds(upload(target, new Uint8Array(maxSize)));
  assert.equal((await getMetadata(target)).size, maxSize);
  for (const size of [0, maxSize + 1]) {
    await denied(upload(object('alice', `cards/alice/new-${size}.webp`), new Uint8Array(size)));
    await denied(upload(target, new Uint8Array(size)));
    assert.equal((await getMetadata(target)).size, maxSize);
  }
});

test('only the owner can delete; deletion does not require request.resource', async () => {
  const target = object('alice');
  await upload(target);
  await assertSucceeds(deleteObject(target));
  await assert.rejects(getMetadata(target), { code: 'storage/object-not-found' });
});

test('legacy oversized/invalid files remain readable and deletable by their owner', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await upload(ref(context.storage(), 'cards/alice/legacy.bin'), new Uint8Array(maxSize + 1), 'application/octet-stream');
  });
  const target = object('alice', 'cards/alice/legacy.bin');
  await assertSucceeds(getBytes(target));
  await denied(updateMetadata(target, { cacheControl: 'private' }));
  await denied(deleteObject(object('bob', 'cards/alice/legacy.bin')));
  await assertSucceeds(deleteObject(target));
});

test('UID ownership also protects nested paths; unmatched and legacy public paths are denied', async () => {
  await assertSucceeds(upload(object('alice', 'cards/alice/nested/image.webp')));
  await denied(getBytes(object('bob', 'cards/alice/nested/image.webp')));
  for (const name of ['outside/alice/image.webp', 'cards/image.webp', 'cards/public/image.webp']) {
    await denied(upload(object('alice', name)));
    await env.withSecurityRulesDisabled(context => upload(ref(context.storage(), name)));
    await denied(getBytes(object('alice', name)));
    await denied(deleteObject(object('alice', name)));
  }
});

test('download token URLs remain bearer links: knowledge of the URL bypasses authenticated SDK reads', async () => {
  await upload(object('alice'));
  const url = await getDownloadURL(object('alice'));
  // No Authorization header, unlike the authenticated SDK request.
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  await denied(getBytes(object(null)));
});
