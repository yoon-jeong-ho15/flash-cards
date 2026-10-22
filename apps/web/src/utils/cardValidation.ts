/**
 * HTML/리치 텍스트 문자열이 비어있는지 확인합니다.
 * - <img> 태그 등이 포함되어 있으면 비어있지 않은 것으로 판별합니다.
 * - 스페이스(공백), 줄바꿈, 탭, HTML 공백 엔티티(&nbsp;, &#160; 등), 전각 공백, zero-width space 등만 포함된 경우 비어있는 것으로 간주합니다.
 */
export const isRichTextEmpty = (html?: string | null): boolean => {
  if (!html) return true;

  // 1. 이미지가 포함되어 있으면 내용이 있는 것으로 판별
  if (/<img\b[^>]*>/i.test(html)) {
    return false;
  }

  // 2. 공백 관련 HTML 엔티티를 공백으로 치환하거나 제거
  const decoded = html
    .replace(/&(nbsp|#160|#xa0|#xA0|thinsp|ensp|emsp);?/gi, ' ')
    .replace(/&(ZeroWidthSpace|#8203|#x200b|#x200B);?/gi, '');

  // 3. 모든 HTML 태그 제거
  const textWithoutTags = decoded.replace(/<[^>]*>/g, '');

  // 4. 모든 종류의 공백 문자(일반 공백, 줄바꿈 \r \n, 탭 \t, \u00a0, \u200b, \ufeff, \u3000 등) 제거
  const cleanedText = textWithoutTags.replace(/[\s\u00a0\u200b\ufeff\u3000]/g, '');

  return cleanedText.length === 0;
};

/**
 * 카드의 앞면과 뒷면이 모두 비어있는지 판별합니다.
 * - 앞면: termRichText가 비어있고 frontImageUrl도 없는 경우 비어있음
 * - 뒷면: definitionRichText가 비어있고 backImageUrl/imageUrl도 없는 경우 비어있음
 * - 앞뒤가 모두 비어있을 때 true를 반환합니다.
 */
export const isCardItemEmpty = (card: {
  termRichText?: string | null;
  definitionRichText?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  imageUrl?: string | null;
}): boolean => {
  const hasFrontImage = Boolean(card.frontImageUrl && card.frontImageUrl.trim());
  const hasBackImage = Boolean(
    (card.backImageUrl && card.backImageUrl.trim()) ||
    (card.imageUrl && card.imageUrl.trim())
  );

  const isFrontEmpty = !hasFrontImage && isRichTextEmpty(card.termRichText);
  const isBackEmpty = !hasBackImage && isRichTextEmpty(card.definitionRichText);

  return isFrontEmpty && isBackEmpty;
};
