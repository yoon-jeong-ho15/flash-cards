import { Parser } from 'htmlparser2';
import type { Card } from './types';

export const imageFields = ['frontImageUrl', 'backImageUrl', 'imageUrl'] as const;
const htmlFields = ['termRichText', 'definitionRichText'] as const;
export function mapSources(html: string, map: (url: string) => string): string {
  let isImage = false;
  let source: { url: string; start: number; end: number; quote: string | null | undefined } | undefined;
  const parts: string[] = [];
  let offset = 0;
  const parser = new Parser({
    onopentagname(name) {
      isImage = name === 'img';
      source = undefined;
    },
    onattribute(name, url, quote) {
      if (isImage && name === 'src' && !source) {
        source = { url, quote, start: parser.startIndex, end: parser.endIndex };
      }
    },
    onopentag(name) {
      if (name !== 'img' || !source || source.quote === undefined) return;
      // The parser has decoded HTML character references in the attribute once.
      const next = map(source.url);
      if (next === source.url) return;

      // Replace just the value's original span, preserving surrounding markup.
      let start = html.indexOf('=', source.start) + 1;
      while (/[\t\n\f\r ]/.test(html.charAt(start))) start++;
      const quote = source.quote ?? '"';
      const escaped = next.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const value = quote === "'" ? escaped.replace(/'/g, '&#39;') : escaped.replace(/"/g, '&quot;');
      parts.push(html.slice(offset, start), quote, value, quote);
      offset = source.end;
    },
  });
  parser.end(html);
  return parts.length ? parts.join('') + html.slice(offset) : html;
}
export function cardDataImages(card: Card): string[] {
  const urls = new Set<string>();
  const collect = (url: string) => { if (/^data:/i.test(url)) urls.add(url); return url; };
  for (const key of imageFields) if (card[key]) collect(card[key]!);
  for (const key of htmlFields) mapSources(card[key], collect);
  return [...urls];
}
// Apply to the latest card, never to an old whole-card snapshot. Deleted cards are never recreated.
export function replaceCardImage(card: Card, original: string, url: string): Card {
  const next = { ...card };
  for (const key of imageFields) if (next[key] === original) next[key] = url;
  for (const key of htmlFields) next[key] = mapSources(next[key], value => value === original ? url : value);
  return [...imageFields, ...htmlFields].some(key => next[key] !== card[key]) ? next : card;
}

/** Only convert fields that contained this source when the upload started. */
export function mergeCardImage(current: Card, sent: Card, original: string, url: string): Card {
  const source = replaceCardImage(sent, original, url);
  const converted = replaceCardImage(current, original, url);
  const next = { ...current };
  for (const key of [...imageFields, ...htmlFields]) {
    if (source[key] !== sent[key]) next[key] = converted[key]!;
  }
  return next;
}
