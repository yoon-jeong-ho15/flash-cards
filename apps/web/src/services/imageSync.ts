import type { Card } from '../types';

export const imageFields = ['frontImageUrl', 'backImageUrl', 'imageUrl'] as const;
const htmlFields = ['termRichText', 'definitionRichText'] as const;
// Match complete tags/attributes, so data-src and text containing the same URL stay intact.
const tags = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const attributes = /(\s+)([^\s=/>]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
function mapSources(html: string, map: (url: string) => string): string {
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

export async function bounded<T>(work: PromiseLike<T>, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('연결 시간이 초과되었습니다. 원본은 보관됩니다. 연결을 확인한 후 다시 동기화해 주세요.')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

export function validateDocument(data: Record<string, unknown>): void {
  // Conservative JSON upper bound for this flat schema, plus room for document names/metadata.
  if (new TextEncoder().encode(JSON.stringify(data)).length > 1024 * 1024 - 16384) {
    throw new Error(`카드 또는 자료(${data.id})가 너무 큽니다. 본문을 나누거나 이미지를 줄인 후 다시 동기화해 주세요. 원본은 보관됩니다.`);
  }
}
