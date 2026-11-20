import type { Card } from './types';

export const imageFields = ['frontImageUrl', 'backImageUrl', 'imageUrl'] as const;
const htmlFields = ['termRichText', 'definitionRichText'] as const;
// Match complete tags/attributes, so data-src and text containing the same URL stay intact.
const tags = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const attributes = /(\s+)([^\s=/>]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
export function mapSources(html: string, map: (url: string) => string): string {
  return html.replace(tags, tag => tag.replace(attributes, (all, space, name, equals, double, single, bare) => {
    if (name.toLowerCase() !== 'src') return all;
    const value = double ?? single ?? bare;
    const next = map(value);
    const quote = double !== undefined ? '"' : single !== undefined ? "'" : '"';
    return next === value ? all : `${space}${name}${equals}${quote}${next}${quote}`;
  }));
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
