import DOMPurify from 'dompurify';

/**
 * XSS 공격 방지를 위해 Tiptap HTML 문자열을 정제합니다.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'mark', 'code', 'pre', 'ul', 'ol', 'li', 'span', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'sub', 'sup', 'img'
    ],
    ALLOWED_ATTR: ['style', 'class', 'data-*', 'src', 'alt', 'title', 'width', 'height', 'loading'],
  });
}
