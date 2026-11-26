// Real Chromium, two pages, one profile/origin. No Firebase account or browser package required.
// Run: node --test apps/web/tests/browser/multitab.cjs
// Override CHROME_PATH if Chromium is installed elsewhere.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', event => {
      const result = JSON.parse(event.data);
      const pending = this.pending.get(result.id);
      if (!pending) return;
      this.pending.delete(result.id);
      if (result.error) pending.reject(Error(JSON.stringify(result.error))); else pending.resolve(result.result);
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  async evaluate(session, expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, session);
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async page(url) {
    const { targetId } = await this.send('Target.createTarget', { url });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    return { targetId, sessionId };
  }
}
async function until(work) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { const result = await work(); if (result) return result; } catch { /* navigation may replace the execution context */ }
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw Error('Timed out waiting for browser state');
}
const chromePath = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);

test('two real pages preserve folders, cards, deletion, dirty editor input, and release locks on close',
  { timeout: 60000, skip: chromePath ? false : 'Set CHROME_PATH to a Chromium executable' }, async () => {
  const webRoot = path.resolve(__dirname, '../..');
  const previousCwd = process.cwd();
  process.chdir(webRoot);
  const { createServer } = await import(pathToFileURL(path.join(webRoot, 'node_modules/vite/dist/node/index.js')));
  const server = await createServer({ root: webRoot, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  const profile = await mkdtemp(path.join(tmpdir(), 'flashcards-tabs-'));
  let chrome; let ws;
  try {
    await server.listen();
    const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
      `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    const endpoint = await new Promise((resolve, reject) => {
      let stderr = '';
      const timer = setTimeout(() => reject(Error(`Chrome startup timed out: ${stderr}`)), 15000);
      chrome.on('error', error => { clearTimeout(timer); reject(error); });
      chrome.stderr.on('data', chunk => {
        stderr += chunk;
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      chrome.on('exit', code => { clearTimeout(timer); reject(Error(`Chrome exited ${code}: ${stderr}`)); });
    });
    ws = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    const cdp = new CDP(ws);
    const a = await cdp.page(url); const b = await cdp.page(url);
    const evaluate = (page, expression) => cdp.evaluate(page.sessionId, expression);
    for (const page of [a, b]) {
      await until(() => evaluate(page, `document.querySelector('#main-content') !== null`));
      await evaluate(page, `(async () => { window.store = (await import('/src/store/useFlashcardStore.ts')).useFlashcardStore; return true; })()`);
    }
    // Queue both mutations behind the same real Web Lock to force contention.
    await evaluate(a, `navigator.locks.request('flashcards_account_v1:guest:data', async () => { window.held = true; await new Promise(r => window.release = r); }); true`);
    await until(() => evaluate(a, `window.held`));
    const folders = [evaluate(a, `store.getState().addFolder('page a')`), evaluate(b, `store.getState().addFolder('page b')`)];
    await evaluate(a, `window.release(); true`);
    const [fa, fb] = await Promise.all(folders);
    const [sa, sb] = await Promise.all([
      evaluate(a, `store.getState().addSet({title:'set a'}, [{termRichText:'a', definitionRichText:'answer a'}])`),
      evaluate(b, `store.getState().addSet({title:'set b'}, [{termRichText:'b', definitionRichText:'answer b'}])`),
    ]);
    const persisted = () => evaluate(a, `JSON.parse(localStorage.getItem('flashcards_account_v1:guest'))`);
    let saved = await persisted();
    assert.deepEqual(new Set(saved.folders.map(f => f.id)), new Set([fa, fb]));
    assert.deepEqual(new Set(saved.sets.map(s => s.id)), new Set([sa, sb]));
    assert.equal(saved.cards.length, 2);
    // Both whole-set editor forms also retain independently added cards.
    for (const page of [a, b]) await evaluate(page, `(async () => {
      await store.getState().refreshAccount();
      window.formBase = {set:store.getState().sets.find(s=>s.id===${JSON.stringify(sa)}),
        cards:store.getState().cards.filter(c=>c.setId===${JSON.stringify(sa)})};
      return true;
    })()`);
    await Promise.all([a, b].map((page, i) => evaluate(page,
      `store.getState().saveSetWithCards(${JSON.stringify(sa)}, {title:'set a'},
        [...window.formBase.cards, {termRichText:'extra ${i}',definitionRichText:'added'}], window.formBase)`)));
    saved = await persisted();
    assert.equal(saved.cards.length, 4);
    const card = saved.cards.find(c => c.setId === sb).id;
    await Promise.all([
      evaluate(a, `store.getState().deleteFolder(${JSON.stringify(fa)})`),
      evaluate(b, `store.getState().updateCard(${JSON.stringify(card)}, {termRichText:'edited in b'})`),
    ]);
    saved = await persisted();
    assert.deepEqual(saved.folders.map(f => f.id), [fb]);
    assert.equal(saved.cards.find(c => c.id === card).termRichText, 'edited in b');
    assert.ok(saved.pendingSync.deletedFolderIds.includes(fa));
    assert.ok(saved.pendingSync.cardIds.includes(card));

    // Load the actual editor, enter a dirty title, and receive a storage event.
    await cdp.send('Page.navigate', { url: `${url}/sets/${encodeURIComponent(sb)}/edit` }, b.sessionId);
    await until(() => evaluate(b, `document.querySelector('input[value="set b"]') !== null`));
    await evaluate(b, `(() => { const input = document.querySelector('input[value="set b"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'unsaved input');
      input.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
    await until(() => evaluate(b, `document.querySelector('input[value="unsaved input"]') !== null`));
    await evaluate(a, `store.getState().updateSet(${JSON.stringify(sb)}, {title:'external title'})`);
    await until(() => evaluate(b, `document.body.textContent.includes('외부') || document.body.textContent.includes('변경되었')`));
    assert.equal(await evaluate(b, `document.querySelector('input[value="unsaved input"]') !== null`), true);

    // A real asynchronous quota error must leave the editor and durable data intact.
    await evaluate(b, `window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function() { throw new Error('test quota failure'); };
      [...document.querySelectorAll('button')].find(button => button.textContent.trim() === '저장하기').click(); true`);
    await until(() => evaluate(b, `document.body.textContent.includes('test quota failure')`));
    assert.equal(await evaluate(b, `document.querySelector('input[value="unsaved input"]') !== null`), true);
    assert.equal((await persisted()).sets.find(cardSet => cardSet.id === sb).title, 'external title');
    await evaluate(b, `Storage.prototype.setItem = window.originalSetItem; true`);

    // Closing a page holding a lock must allow another page's queued durable edit.
    await evaluate(a, `navigator.locks.request('flashcards_account_v1:guest:data', async () => { window.closeHeld = true; await new Promise(() => {}); }); true`);
    await until(() => evaluate(a, `window.closeHeld`));
    const closingWrite = evaluate(b, `(async () => { const {useFlashcardStore:s} = await import('/src/store/useFlashcardStore.ts'); return await s.getState().addFolder('after close'); })()`);
    await cdp.send('Target.closeTarget', { targetId: a.targetId });
    const finalId = await closingWrite;
    const reload = await cdp.page(url);
    await until(() => evaluate(reload, `document.querySelector('#main-content') !== null`));
    const final = await evaluate(reload, `JSON.parse(localStorage.getItem('flashcards_account_v1:guest'))`);
    assert.equal(final.folders.length, 2); assert.ok(final.folders.some(f => f.id === finalId));
    assert.equal(final.sets.length, 2); assert.equal(final.cards.length, 4);
  } finally {
    if (ws) ws.close();
    if (chrome && chrome.exitCode === null) { chrome.kill(); await new Promise(resolve => chrome.once('exit', resolve)); }
    await server.close();
    process.chdir(previousCwd);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
