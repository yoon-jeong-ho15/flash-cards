import React from 'react';
import { Pressable, View } from 'react-native';
import { store, useStore } from '../platform/runtime';
import { radius, useUI } from './theme';
import { Icon } from './Icon';
import { attempt } from './kit';

export function CollectionLayoutToggle() {
  const { colors } = useUI();
  const { preferences } = useStore();
  const layout = preferences.collectionLayout === 'list' ? 'list' : 'grid';
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="목록 표시 방식"
      style={{
        flexDirection: 'row',
        flexWrap: 'nowrap',
        flexShrink: 0,
        alignSelf: 'center',
        borderRadius: radius.control,
        padding: 1,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.subtle,
      }}
    >
      {([
        ['grid', 'grid', '그리드'],
        ['list', 'list', '목록'],
      ] as const).map(([value, icon, label]) => (
        <Pressable
          key={value}
          accessibilityRole="radio"
          accessibilityLabel={`${label} 보기`}
          accessibilityState={{ checked: layout === value }}
          onPress={() => { void attempt(() => store.setPreferences({ collectionLayout: value })); }}
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: radius.control - 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: layout === value ? colors.pale : 'transparent',
          }}
        >
          <Icon name={icon} size={18} color={layout === value ? colors.primary : colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}
