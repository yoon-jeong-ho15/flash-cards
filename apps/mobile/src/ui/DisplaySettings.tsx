import React, { useState } from 'react';
import { Pressable, View, Text as NativeText } from 'react-native';
import { appearance, useAppearance } from '../platform/appearance';
import { defaultAppearance, type AppearanceSettings } from '../core/appearance';
import { Button, Chips, showError } from './kit';
import { Text } from './Typography';
import { useUI } from './theme';

function FontSetting({ label, setting, value, min, max, step, suffix, preview }: {
  label: string; setting: 'uiScale' | 'questionSize' | 'answerSize'; value: number;
  min: number; max: number; step: number; suffix: string; preview: React.ReactNode;
}) {
  const { colors, s } = useUI();
  const [busy, setBusy] = useState(false);
  const change = (delta: number) => {
    setBusy(true);
    const next = Math.round((value + delta) * 100) / 100;
    void appearance.update({ [setting]: next }).catch(showError).finally(() => setBusy(false));
  };
  return <View style={{ gap: 12 }}>
    <View style={[s.row, { justifyContent: 'space-between', gap: 12 }]}>
      <Text style={[s.text, { fontWeight: '600', flex: 1, minWidth: 120 }]}>{label}</Text>
      <View style={[s.row, { flexWrap: 'nowrap', gap: 8 }]}>
        {([-1, 1] as const).map(direction => <React.Fragment key={direction}>
          {direction === 1 && <Text accessibilityLiveRegion="polite" style={[s.label, { minWidth: 52, textAlign: 'center' }]}>{setting === 'uiScale' ? Math.round(value * 100) : value}{suffix}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${direction === -1 ? '줄이기' : '키우기'}`}
            accessibilityState={{ disabled: busy || (direction === -1 ? value <= min : value >= max) }}
            disabled={busy || (direction === -1 ? value <= min : value >= max)} onPress={() => change(direction * step)}
            style={({ pressed }) => ({ minWidth: 44, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale, opacity: busy || (direction === -1 ? value <= min : value >= max) ? 0.35 : pressed ? 0.7 : 1 })}>
            <Text style={[s.h2, { color: colors.primary }]}>{direction === -1 ? '−' : '+'}</Text>
          </Pressable>
        </React.Fragment>)}
      </View>
    </View>
    <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.bg }}>{preview}</View>
  </View>;
}

export function DisplaySettings() {
  const settings = useAppearance();
  const { colors, s } = useUI();
  return <View style={{ gap: 14 }}>
    <Text style={s.h2}>화면 설정</Text>
    <View style={[s.box, { gap: 22 }]}>
      <View style={{ gap: 12 }}><Text style={[s.text, { fontWeight: '600' }]}>화면 모드</Text>
        <Chips value={settings.theme} options={[[ 'system', '기기 설정' ], [ 'light', '라이트' ], [ 'dark', '다크' ]]}
          onChange={(theme: AppearanceSettings['theme']) => { void appearance.update({ theme }).catch(showError); }} />
      </View>
      <FontSetting label="UI 글자 크기" setting="uiScale" value={settings.uiScale} min={0.8} max={1.5} step={0.1} suffix="%" preview={<Text style={s.text}>가나다 Aa 123</Text>} />
      <FontSetting label="질문 글자 크기" setting="questionSize" value={settings.questionSize} min={12} max={40} step={2} suffix="px"
        preview={<NativeText allowFontScaling={false} style={{ color: colors.ink, fontSize: settings.questionSize, lineHeight: settings.questionSize * 1.625, fontWeight: '700' }}>질문 Aa 123</NativeText>} />
      <FontSetting label="답변 글자 크기" setting="answerSize" value={settings.answerSize} min={12} max={40} step={2} suffix="px"
        preview={<NativeText allowFontScaling={false} style={{ color: colors.ink, fontSize: settings.answerSize, lineHeight: settings.answerSize * 1.625 }}>답변 Aa 123</NativeText>} />
      <Button title="화면 설정 초기화" tone="secondary" onPress={() => { void appearance.update(defaultAppearance).catch(showError); }} />
    </View>
  </View>;
}
