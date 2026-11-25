import { StyleSheet } from 'react-native';
import type { SetSortOption } from '../core/types';

export const setSortOptions: Array<[SetSortOption, string]> = [
  ['date-desc', '최근 수정순'],
  ['date-asc', '오래된 순'],
  ['name-asc', '이름 오름차순'],
  ['name-desc', '이름 내림차순'],
];

export const libraryStyles = StyleSheet.create({
  textAction: {
    minHeight: 44,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
