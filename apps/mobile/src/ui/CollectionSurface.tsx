import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { radius, useUI } from './theme';
import { Icon } from './Icon';
import { Text } from './Typography';
import { Progress } from './kit';

export function DeckSummary({ title, count, learned, detail, description, pressed = false, hideDetails = false }: {
  title: string;
  count: number;
  learned: number;
  detail?: string;
  description?: string;
  pressed?: boolean;
  hideDetails?: boolean;
}) {
  const { colors, s } = useUI();
  return (
    <CollectionSurface kind="deck" pressed={pressed} style={{ minHeight: 152, padding: 10, gap: 8 }}>
      <DeckCardHeader title={title} pressed={pressed} />
      <View style={{ flex: 1, gap: 4 }}>
        {hideDetails ? <View style={{ minHeight: 18 }} /> : (
          <Text style={[s.muted, { fontSize: 12, lineHeight: 18 }]}>{detail || (count ? `카드 ${count}장 · 기억한 카드 ${learned}장` : '학습할 카드가 없어요')}</Text>
        )}
        {Boolean(description) && <Text numberOfLines={2} style={s.muted}>{description}</Text>}
      </View>
      <Text style={[s.label, { fontSize: 11, color: count && learned === count ? colors.success : colors.muted }]}>
        {count && learned === count ? '학습 완료' : `${learned}/${count} 학습`}
      </Text>
      <Progress learned={learned} total={count} compact />
    </CollectionSurface>
  );
}

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

/** Warm folders and blue deck edges keep collection types easy to recognize. */
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
                fill={pressed ? colors.warmPressed : colors.warmBg}
                stroke={pressed ? colors.warmPressedBorder : colors.warmBorder}
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
                  fill={offset === 0 ? (pressed ? colors.infoBg : colors.card) : colors.infoBg}
                  stroke={offset === 0 && pressed ? colors.info : colors.infoBorder}
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
      borderTopLeftRadius: radius.card - 1,
      borderTopRightRadius: radius.card - 1,
      borderBottomWidth: 1,
      borderBottomColor: colors.infoBorder,
      backgroundColor: pressed ? colors.infoPressed : colors.infoBg,
    }}>
      <Text numberOfLines={2} style={[s.h2, { fontSize: 14, lineHeight: 20, color: colors.info }]}>{title}</Text>
    </View>
  );
}

/** Keep the original Lucide artwork; only the surrounding collection surface changes shape. */
export function CollectionIcon({ kind, size = 36 }: { kind: 'folder' | 'deck'; size?: number }) {
  const { colors } = useUI();
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, flexShrink: 0, borderRadius: size >= 56 ? 16 : radius.control,
        backgroundColor: kind === 'folder' ? colors.warmBg : colors.infoBg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={kind === 'folder' ? 'folder' : 'layers'} size={Math.round(size * 0.55)} color={kind === 'folder' ? colors.warm : colors.info} />
    </View>
  );
}
