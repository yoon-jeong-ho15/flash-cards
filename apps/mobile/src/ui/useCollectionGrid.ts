import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useUI } from './theme';
import { useStore } from '../platform/runtime';
import { collectionColumns } from '../core/collectionLayout';

export function useCollectionGrid(fixedLayout?: 'grid' | 'list') {
  const { width, fontScale } = useWindowDimensions();
  const { uiScale } = useUI();
  const { preferences } = useStore();
  const layout = fixedLayout ?? (preferences.collectionLayout === 'list' ? 'list' : 'grid');
  const columns = collectionColumns(layout, width, fontScale, uiScale);
  const itemStyle: ViewStyle = {
    width: `${100 / columns}%`,
    paddingHorizontal: columns > 1 ? 4 : 0,
    paddingBottom: 12,
  };
  const rowStyle: ViewStyle = { marginHorizontal: columns > 1 ? -4 : 0 };
  const wrapStyle: ViewStyle = { ...rowStyle, flexDirection: 'row', flexWrap: 'wrap' };
  return { layout, columns, itemStyle, rowStyle, wrapStyle };
}
