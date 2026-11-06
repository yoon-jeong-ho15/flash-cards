export function collectionColumns(layout: 'grid' | 'list', width: number, fontScale: number, uiScale: number) {
  const availableWidth = Math.min(width, 720);
  if (layout === 'list' || availableWidth < 350 || fontScale * uiScale > 1.3) return 1;
  return availableWidth >= 600 ? 3 : 2;
}
