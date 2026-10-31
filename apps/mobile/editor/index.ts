import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import DOMPurify from 'dompurify';
import { createElement, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, List, ListOrdered, Heading2, SquareCode, Quote, Undo2, Redo2, ImagePlus, type IconNode } from 'lucide';

declare global { interface Window { ReactNativeWebView?: { postMessage(value: string): void }; nativeReceive: (data: Command) => void } }
interface Command { type: 'init' | 'set' | 'get' | 'image' | 'appearance'; html?: string; editable?: boolean; label?: string; id?: string; url?: string; presentation?: 'default' | 'study-front' | 'study-back' }
const send = (data: unknown) => window.ReactNativeWebView?.postMessage(JSON.stringify(data));
export const safeImage = (url: string) => /^(https:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(url);
export function sanitize(value: string): string {
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p','br','strong','b','em','i','u','s','strike','mark','code','pre','ul','ol','li','span','blockquote','h1','h2','h3','h4','h5','h6','sub','sup','img'],
    ALLOWED_ATTR: ['src','alt','title','style','width','height'],
  });
  const template = document.createElement('template'); template.innerHTML = clean;
  template.content.querySelectorAll('img').forEach(img => { if (!safeImage(img.getAttribute('src') || '')) img.remove(); });
  template.content.querySelectorAll('[style]').forEach(el => { if (/url\s*\(|expression|@import/i.test(el.getAttribute('style') || '')) el.removeAttribute('style'); });
  return template.innerHTML;
}
let editor: Editor | null = null;
const root = document.getElementById('content')!;
const toolbar = document.getElementById('toolbar')!;
const reportHeight = () => send({ type: 'height', value: Math.ceil(root.getBoundingClientRect().height + (toolbar.hidden ? 0 : toolbar.getBoundingClientRect().height)) });
const emit = () => { if (editor) send({ type: 'change', html: editor.getHTML() }); reportHeight(); };
const actions: Array<[string, IconNode, (editor: Editor) => void]> = [
  ['굵게',Bold, e => e.chain().focus().toggleBold().run()],
  ['기울임',Italic, e => e.chain().focus().toggleItalic().run()],
  ['밑줄',UnderlineIcon, e => e.chain().focus().toggleUnderline().run()],
  ['취소선',Strikethrough, e => e.chain().focus().toggleStrike().run()],
  ['형광펜',Highlighter, e => e.chain().focus().toggleHighlight().run()],
  ['글머리 목록',List, e => e.chain().focus().toggleBulletList().run()],
  ['번호 목록',ListOrdered, e => e.chain().focus().toggleOrderedList().run()],
  ['제목',Heading2, e => e.chain().focus().toggleHeading({ level: 2 }).run()],
  ['코드 블록',SquareCode, e => e.chain().focus().toggleCodeBlock().run()],
  ['인용',Quote, e => e.chain().focus().toggleBlockquote().run()],
  ['실행 취소',Undo2, e => e.chain().focus().undo().run()],
  ['다시 실행',Redo2, e => e.chain().focus().redo().run()],
  ['본문 이미지 추가',ImagePlus, () => send({ type: 'pick-image' })],
];
actions.forEach(([label, icon, action]) => {
  const button = document.createElement('button');
  const svg = createElement(icon, { width: 18, height: 18, 'stroke-width': 2, 'aria-hidden': 'true' });
  button.append(svg); button.setAttribute('aria-label', label); button.title = label;
  button.addEventListener('pointerdown', event => event.preventDefault());
  button.addEventListener('click', () => { if (editor) action(editor); });
  toolbar.append(button);
});
window.nativeReceive = data => {
  if (data.type === 'init' || data.type === 'appearance') {
    document.body.className = data.presentation === 'study-front' ? 'study-front' : data.presentation === 'study-back' ? 'study-back' : '';
    reportHeight();
  }
  if (data.type === 'init') {
    editor?.destroy(); root.replaceChildren(); toolbar.hidden = !data.editable;
    const html = sanitize(data.html || '');
    if (data.editable) {
      editor = new Editor({ element: root, extensions: [StarterKit, Underline, Highlight, Image.configure({ allowBase64: true })],
        content: html, onUpdate: emit, editorProps: { attributes: { 'aria-label': data.label || '카드 내용', role: 'textbox', 'aria-multiline': 'true' },
          transformPastedHTML: sanitize } });
    } else { editor = null; root.innerHTML = html || '<p class="empty">내용이 없어요</p>'; }
    reportHeight();
  }
  if (data.type === 'get') send({ type: 'value', id: data.id, html: editor?.getHTML() || root.innerHTML });
  if (data.type === 'set') {
    const html = sanitize(data.html || '');
    if (editor) editor.commands.setContent(html, false);
    else root.innerHTML = html || '<p class="empty">내용이 없어요</p>';
    reportHeight();
  }
  if (data.type === 'image' && data.url && safeImage(data.url)) editor?.chain().focus().setImage({ src: data.url }).run();
};
let touch: { x: number; y: number; moved: boolean; dragging: boolean } | null = null;
let suppressClickUntil = 0;
const studyViewer = () => !editor && /\bstudy-(front|back)\b/.test(document.body.className);
const pointX = (point: Touch) => point.screenX ?? point.clientX;
const pointY = (point: Touch) => point.screenY ?? point.clientY;
const cancelDrag = () => { if (touch?.dragging) send({ type: 'card-drag', phase: 'cancel', dx: 0, dy: 0 }); touch = null; suppressClickUntil = Date.now() + 500; };
root.addEventListener('touchstart', event => {
  if (touch?.dragging) cancelDrag();
  // A fresh tap is a new intent, even immediately after a swipe. Only the
  // synthetic click from the moved/cancelled gesture should be suppressed.
  if (studyViewer() && event.touches.length === 1) suppressClickUntil = 0;
  touch = studyViewer() && event.touches.length === 1 ? { x: pointX(event.touches[0]), y: pointY(event.touches[0]), moved: false, dragging: false } : null;
}, { passive: true });
root.addEventListener('touchmove', event => {
  if (!touch) return;
  if (event.touches.length !== 1) { cancelDrag(); return; }
  const dx = pointX(event.touches[0]) - touch.x;
  const dy = pointY(event.touches[0]) - touch.y;
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) touch.moved = true;
  if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.4) touch.dragging = true;
  if (touch.dragging) { event.preventDefault(); send({ type: 'card-drag', phase: 'move', dx, dy }); }
}, { passive: false });
root.addEventListener('touchend', event => {
  const start = touch; touch = null;
  if (!start || !event.changedTouches.length) return;
  const dx = pointX(event.changedTouches[0]) - start.x;
  const dy = pointY(event.changedTouches[0]) - start.y;
  if (start.moved || Math.abs(dx) > 10 || Math.abs(dy) > 10) suppressClickUntil = Date.now() + 500;
  if (start.dragging) send({ type: 'card-drag', phase: 'end', dx, dy });
}, { passive: true });
root.addEventListener('touchcancel', cancelDrag);
root.addEventListener('click', event => {
  if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
  const image = (event.target as Element).closest('img');
  if (image && safeImage(image.src)) send({ type: 'image', url: image.src });
  else if (!editor) send({ type: 'flip' });
});
document.addEventListener('click', event => { if ((event.target as Element).closest('a')) event.preventDefault(); });
new ResizeObserver(reportHeight).observe(document.body);
document.addEventListener('load', reportHeight, true);
send({ type: 'ready' });
