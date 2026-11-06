import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Text } from './Typography';
import { radius, useUI } from './theme';

export function StudyOrderModal({ title, onClose, onChoose }: {
  title: string;
  onClose: () => void;
  onChoose: (shuffle: boolean) => void;
}) {
  const { colors, s } = useUI();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#09090B66' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="학습 순서 선택 닫기"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 20 }} pointerEvents="box-none">
          <View
            accessibilityViewIsModal
            style={{ width: '100%', maxWidth: 400, maxHeight: '100%', alignSelf: 'center',
              backgroundColor: colors.card, borderRadius: radius.sheet,
              borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}
          >
            <ScrollView bounces={false} contentContainerStyle={{ padding: 20, gap: 16 }}>
              <View style={[s.row, { flexWrap: 'nowrap', justifyContent: 'space-between' }]}>
                <Text accessibilityRole="header" style={[s.h2, { flex: 1, fontSize: 20, lineHeight: 28 }]}>학습 순서 선택</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
                  onPress={onClose}
                  style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radius.control,
                    alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.subtle : 'transparent' })}
                >
                  <Icon name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
              <View style={{ gap: 6 }}>
                <Text numberOfLines={3} style={[s.text, { fontWeight: '700' }]}>{title}</Text>
                <Text style={s.muted}>어떤 순서로 학습할까요?</Text>
              </View>
              <View style={{ gap: 10 }}>
                {([
                  [false, 'layers', '정방향 학습', '카드를 등록된 순서대로 학습해요.'],
                  [true, 'shuffle', '랜덤 학습', '카드를 무작위로 섞어서 학습해요.'],
                ] as const).map(([shuffle, icon, label, description]) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}, ${description}`}
                    onPress={() => onChoose(shuffle)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 14, borderRadius: radius.card, borderWidth: 1,
                      borderColor: pressed ? colors.primary : colors.border,
                      backgroundColor: pressed ? colors.pale : colors.card })}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: radius.control,
                      backgroundColor: shuffle ? colors.pale : colors.infoBg, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={icon} size={22} color={shuffle ? colors.primary : colors.info} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.h2}>{label}</Text>
                      <Text style={[s.muted, { fontSize: 12, lineHeight: 18 }]}>{description}</Text>
                    </View>
                    <Icon name="chevron" size={16} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
