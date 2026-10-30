import React from 'react';
import { View } from 'react-native';
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { colors } from './theme';

export const iconNames = {
  menu: 'menu', search: 'search', home: 'house', layers: 'layers', folder: 'folder',
  plus: 'plus', arrow: 'arrow-right', back: 'arrow-left', close: 'x', check: 'check',
  book: 'book-open', target: 'target', sparkles: 'sparkles', pencil: 'pencil',
  trash: 'trash-2', rotate: 'rotate-ccw', thumb: 'thumbs-up', user: 'user-round',
  play: 'play', shuffle: 'shuffle', chevron: 'chevron-right', more: 'ellipsis',
  'chevron-down': 'chevron-down', 'arrow-up': 'arrow-up', 'arrow-down': 'arrow-down',
} as const satisfies Record<string, LucideIconName>;
export type IconName = keyof typeof iconNames;

// Bundle and preload the same font used by Lucide's dynamic Expo renderer.
export const iconFonts = { Lucide: require('@react-native-vector-icons/lucide/fonts/Lucide.ttf') };

export function Icon({ name, size = 20, color = colors.primary }: { name: IconName; size?: number; color?: string }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
    <Lucide name={iconNames[name]} size={size} color={color} allowFontScaling={false} accessible={false}
      style={{ lineHeight: size, includeFontPadding: false, textAlign: 'center' }} />
  </View>;
}
