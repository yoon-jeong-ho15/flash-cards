import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useUI } from './theme';

export function useCollectionGrid() {
  const { width, fontScale } = useWindowDimensions();
  const { uiScale } = useUI();
  const availableWidth = Math.min(width, 720);
  const columns = availableWidth < 350 || fontScale * uiScale > 1.3 ? 1 : availableWidth >= 600 ? 3 : 2;
  const itemStyle: ViewStyle = {
    width: `${100 / columns}%`,
    paddingHorizontal: columns > 1 ? 4 : 0,
    paddingBottom: 12,
  };
  const rowStyle: ViewStyle = { marginHorizontal: columns > 1 ? -4 : 0 };
  const wrapStyle: ViewStyle = { ...rowStyle, flexDirection: 'row', flexWrap: 'wrap' };
  return { columns, itemStyle, rowStyle, wrapStyle };
}
