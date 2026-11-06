import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { radius, useUI } from './theme';
import { Icon } from './Icon';
import { Text } from './Typography';

function folderOutline(width: number, height: number) {
  // Use layout coordinates so the stroke and corners stay the same size in every layout.
  const left = 0.5;
  const right = width - 0.5;
  const bottom = height - 0.5;
  const tabRight = Math.min(width * 0.32, 64) - 0.5;
  const top = 8.5;
  const r = radius.card;
  return [
    `M ${left} 6.5`,
    `Q ${left} 0.5 6.5 0.5`,
    `H ${tabRight - 6}`,
    `Q ${tabRight} 0.5 ${tabRight} 6.5`,
    `V ${top}`,
    `H ${right - r}`,
    `Q ${right} ${top} ${right} ${top + r}`,
    `V ${bottom - r}`,
    `Q ${right} ${bottom} ${right - r} ${bottom}`,
    `H ${left + r}`,
    `Q ${left} ${bottom} ${left} ${bottom - r}`,
    'Z',
  ].join(' ');
}

/** A clean, modern surface for folders and decks with minimal clutter. */
export function CollectionSurface({ kind, children, style, pressed = false }: {
  kind: 'folder' | 'deck';
  pressed?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, s } = useUI();
  const folder = kind === 'folder';
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        setSize((previous) => previous.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height });
      }}
      style={{ flexGrow: 1, width: folder ? '100%' : '92%', alignSelf: 'center',
        paddingTop: folder ? 8 : 0, paddingBottom: folder ? 0 : 8, paddingRight: folder ? 0 : 8 }}
    >
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {size.width > 0 && size.height > 0 && (
          <Svg width="100%" height="100%">
            {folder ? (
              <Path
                d={folderOutline(size.width, size.height)}
                fill={pressed ? colors.pale : colors.card}
                stroke={pressed ? colors.primary : colors.border}
                strokeWidth={1}
              />
            ) : (
              // Draw back to front, leaving two visible edges at four-point intervals.
              [8, 4, 0].map((offset) => (
                <Rect
                  key={offset}
                  x={offset + 0.5}
                  y={offset + 0.5}
                  width={Math.max(0, size.width - 9)}
                  height={Math.max(0, size.height - 9)}
                  rx={radius.card}
                  ry={radius.card}
                  fill={offset === 0 ? (pressed ? colors.pale : colors.card) : '#FFFFFF'}
                  stroke={offset === 0 && pressed ? colors.primary : colors.border}
                  strokeWidth={1}
                />
              ))
            )}
          </Svg>
        )}
      </View>
      <View style={[
        s.box,
        { flexGrow: 1 },
        style,
        { backgroundColor: 'transparent', borderColor: 'transparent', boxShadow: 'none' },
      ]}>
        {children}
      </View>
    </View>
  );
}

/** Full-width heading for the compact deck cards, whose content padding is 10. */
export function DeckCardHeader({ title, pressed = false }: { title: string; pressed?: boolean }) {
  const { colors, s } = useUI();
  return (
    <View style={{
      marginTop: -10,
      marginHorizontal: -10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 40,
      justifyContent: 'center',
      backgroundColor: pressed ? colors.deckHeaderPressed : colors.iconBg,
      borderTopLeftRadius: radius.card - 1,
      borderTopRightRadius: radius.card - 1,
      borderBottomWidth: 1,
      borderBottomColor: colors.accentBorder,
    }}>
      <Text numberOfLines={2} style={[s.h2, { fontSize: 14, lineHeight: 20 }]}>{title}</Text>
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
