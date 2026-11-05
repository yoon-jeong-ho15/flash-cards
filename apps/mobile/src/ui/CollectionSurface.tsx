import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, useUI } from './theme';
import { Icon } from './Icon';

/** A clean, modern surface for folders and decks with minimal clutter. */
export function CollectionSurface({ kind, children, style, pressed = false }: {
  kind: 'folder' | 'deck';
  pressed?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, s } = useUI();
  const folder = kind === 'folder';
  return (
    <View style={{ flexGrow: 1, paddingTop: folder ? 8 : 0, paddingBottom: folder ? 0 : 4, paddingRight: folder ? 0 : 4 }}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {folder ? (
          <View style={{
            position: 'absolute', top: 0, left: 0, width: '32%', maxWidth: 64, height: 18,
            borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 1, borderBottomWidth: 0,
            borderColor: colors.border, backgroundColor: colors.iconBg,
          }} />
        ) : (
          <View style={{
            position: 'absolute', top: 4, bottom: 0, left: 4, right: 0,
            borderRadius: radius.card,
            backgroundColor: colors.stackBack,
            opacity: 0.7,
          }} />
        )}
      </View>
      <View style={[
        s.box,
        { flexGrow: 1 },
        folder && { borderTopLeftRadius: 0, borderRadius: radius.card },
        style,
        pressed && { backgroundColor: colors.pale, borderColor: colors.primary },
      ]}>
        {children}
      </View>
    </View>
  );
}

/** Keep the original Lucide artwork; only the surrounding collection surface changes shape. */
export function CollectionIcon({ kind, size = 36 }: { kind: 'folder' | 'deck'; size?: number }) {
  const { colors } = useUI();
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, flexShrink: 0, borderRadius: size >= 56 ? 16 : radius.control,
        backgroundColor: colors.iconBg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={kind === 'folder' ? 'folder' : 'layers'} size={Math.round(size * 0.55)} color={colors.icon} />
    </View>
  );
}
