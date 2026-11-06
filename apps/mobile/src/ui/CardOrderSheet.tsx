import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Card } from '../core/types';
import { plainText } from '../core/content';
import { radius, useThemedStyles, type Palette } from './theme';
import { Text } from './Typography';
import { Icon } from './Icon';
import { Button, Sheet, attempt } from './kit';

export function CardOrderSheet({ cards, deckTitle, onClose, onSave }: {
  cards: Card[];
  deckTitle: string;
  onClose: () => void;
  onSave: (ids: string[]) => Promise<unknown>;
}) {
  const styles = useThemedStyles(createStyles);
  const [order, setOrder] = useState(() => cards.map(card => card.id));
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const inFlight = useRef(false);
  const savingRef = useRef(false);
  const version = useRef(0);
  const heights = useRef(new Map<string, number>());
  const offsets = useRef(new Map<string, Animated.Value>());
  const byId = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards]);
  const offsetFor = (id: string) => {
    let value = offsets.current.get(id);
    if (!value) {
      value = new Animated.Value(0);
      offsets.current.set(id, value);
    }
    return value;
  };

  useLayoutEffect(() => {
    offsets.current.forEach(value => value.setValue(0));
    inFlight.current = false;
    setMoving(false);
  }, [order]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (active) setReduceMotion(value);
    });
    return () => {
      active = false;
      version.current++;
      offsets.current.forEach(value => value.stopAnimation());
      listener.remove();
    };
  }, []);

  const move = (id: string, delta: -1 | 1) => {
    const from = order.indexOf(id);
    const to = from + delta;
    if (savingRef.current || inFlight.current || from < 0 || to < 0 || to >= order.length) return;
    const neighborId = order[to];
    const commit = () => setOrder(previous => {
      const index = previous.indexOf(id);
      const target = index + delta;
      if (index < 0 || previous[target] !== neighborId) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setActiveId(id);
    const height = heights.current.get(id);
    const neighborHeight = heights.current.get(neighborId);
    if (reduceMotion || !height || !neighborHeight) {
      commit();
      return;
    }
    inFlight.current = true;
    setMoving(true);
    const animationVersion = ++version.current;
    const timing = (value: Animated.Value, toValue: number) => Animated.timing(value, {
      toValue,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    Animated.parallel([
      timing(offsetFor(id), delta * neighborHeight),
      timing(offsetFor(neighborId), -delta * height),
    ]).start(() => {
      if (animationVersion === version.current) commit();
    });
  };
  const close = () => {
    if (!savingRef.current && !inFlight.current) onClose();
  };
  const save = () => {
    if (savingRef.current || inFlight.current) return;
    savingRef.current = true;
    setSaving(true);
    void attempt(async () => {
      await onSave(order);
      onClose();
    }).finally(() => {
      savingRef.current = false;
      setSaving(false);
    });
  };

  return (
    <Sheet
      title="카드 순서 변경"
      onClose={close}
      scrollable={false}
      footer={
        <View style={styles.footer}>
          <Text style={styles.saveHint}>변경한 순서는 저장 후 적용돼요.</Text>
          <Button title="순서 저장" icon="check" busy={saving} disabled={saving || moving} onPress={save} />
        </View>
      }
    >
      <View style={styles.summary}>
        <Text numberOfLines={1} style={styles.deckTitle}>{deckTitle}</Text>
        <Text style={styles.count}>전체 {order.length}장</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!moving}
      >
        {order.map((id, index) => {
          const card = byId.get(id);
          const question = card ? plainText(card.termRichText) : '';
          const answer = card ? plainText(card.definitionRichText) : '';
          const active = activeId === id;
          return (
            <Animated.View
              key={id}
              onLayout={({ nativeEvent: { layout } }) => { heights.current.set(id, layout.height); }}
              style={[styles.rowSlot, { zIndex: active ? 1 : 0, transform: [{ translateY: offsetFor(id) }] }]}
            >
              <View style={[styles.card, active && styles.activeCard]}>
                <Text style={[styles.number, active && styles.activeNumber]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={styles.preview}>
                  <Text numberOfLines={2} style={styles.question}>
                    {card ? question || (card.frontImageUrl ? '이미지 카드' : '질문 없음') : '삭제된 카드'}
                  </Text>
                  {Boolean(answer || card?.backImageUrl || card?.imageUrl) && (
                    <Text numberOfLines={1} style={styles.answer}>{answer || '이미지 답변'}</Text>
                  )}
                </View>
                <View style={styles.controls}>
                  {([[-1, 'arrow-up', '위로'], [1, 'arrow-down', '아래로']] as const).map(([delta, icon, label]) => {
                    const edge = index + delta < 0 || index + delta >= order.length;
                    const disabled = saving || moving || edge;
                    return (
                      <Pressable
                        key={delta}
                        accessibilityRole="button"
                        accessibilityLabel={`${index + 1}번 카드 ${label} 이동`}
                        accessibilityState={{ disabled }}
                        disabled={disabled}
                        onPress={() => move(id, delta)}
                        style={({ pressed }) => [styles.moveButton, edge && styles.disabledButton, pressed && styles.pressedButton]}
                      >
                        <Icon name={icon} size={18} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  summary: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
  },
  deckTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.ink },
  count: { fontSize: 12, lineHeight: 18, color: colors.muted, flexShrink: 0 },
  scroll: { flex: 1 },
  list: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  rowSlot: { paddingBottom: 10 },
  card: {
    minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: radius.card, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.card,
  },
  activeCard: { borderColor: colors.primary, boxShadow: `0px 3px 12px ${colors.shadow}` },
  number: { minWidth: 24, fontSize: 12, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.muted },
  activeNumber: { color: colors.primary },
  preview: { flex: 1, minWidth: 0, gap: 6 },
  question: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.ink },
  answer: { fontSize: 12, lineHeight: 18, color: colors.muted },
  controls: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, flexShrink: 0, overflow: 'hidden' },
  moveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.25 },
  pressedButton: { backgroundColor: colors.subtle },
  footer: { width: '100%', maxWidth: 688, alignSelf: 'center', gap: 10 },
  saveHint: { fontSize: 12, lineHeight: 18, textAlign: 'center', color: colors.muted },
});
