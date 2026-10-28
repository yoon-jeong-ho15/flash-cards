/** Search visible rich text instead of matching HTML tags and image URLs. */
export function richTextToText(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
}
