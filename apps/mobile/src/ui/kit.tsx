import React, { createContext, useContext, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = { bg: '#F9F8F5', card: '#FFFFFF', ink: '#1F2E2B', muted: '#67746F', green: '#266957', pale: '#E9F1ED', border: '#E4E1DC', red: '#DC3838' };
export const s = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40, gap: 24, width: '100%', maxWidth: 850, alignSelf: 'center' },
  title: { fontSize: 24, lineHeight: 33, letterSpacing: -0.6, fontWeight: '700', color: colors.ink },
  h2: { fontSize: 18, lineHeight: 26, letterSpacing: -0.3, fontWeight: '600', color: colors.ink },
  text: { fontSize: 14, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 12, lineHeight: 20, color: colors.muted },
  label: { fontSize: 11, lineHeight: 17, fontWeight: '600', color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  box: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, padding: 20, borderRadius: 16, gap: 12 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#DEDAD4', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  error: { color: colors.red, fontSize: 14, lineHeight: 22 },
});
export function Button({ title, onPress, tone = 'primary', disabled = false, busy = false }: { title: string; onPress: () => void; tone?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: disabled || busy ? 0.45 : pressed ? 0.7 : 1,
      backgroundColor: tone === 'primary' ? colors.green : tone === 'danger' ? '#FBECE9' : colors.pale })}>
    {busy ? <ActivityIndicator color={tone === 'primary' ? '#FFF' : colors.green} /> : <Text style={{ color: tone === 'primary' ? '#FFF' : tone === 'danger' ? colors.red : colors.green, fontWeight: '600', fontSize: 14 }}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={s.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} accessibilityLabel={label} {...props} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Chips<T extends string>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (value: T) => void }) {
  return <View style={[s.row, { backgroundColor: '#F1EFEB', padding: 4, borderRadius: 10, alignSelf: 'flex-start', gap: 2 }]}>{options.map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)}
    style={{ minHeight: 40, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 7, backgroundColor: key === value ? colors.card : 'transparent' }}>
    <Text style={{ fontSize: 12, fontWeight: '500', color: key === value ? colors.ink : colors.muted }}>{label}</Text></Pressable>)}</View>;
}
export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  return <><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options.find(([key]) => key === value)?.[1]}`} onPress={() => setOpen(true)} style={[s.input, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }]}><Text style={[s.muted, { color: colors.ink, flexShrink: 1 }]}>{options.find(([key]) => key === value)?.[1]}</Text><Text style={s.muted}>⌄</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#15201966' }}><Pressable accessibilityRole="button" accessibilityLabel="선택 닫기" onPress={() => setOpen(false)} style={{ flex: 1 }} /><SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 8 }}><Text style={[s.h2, { marginBottom: 12 }]}>{label}</Text>{options.map(([key, title]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: key === value }} onPress={() => { onChange(key); setOpen(false); }} style={{ padding: 14, borderRadius: 10, backgroundColor: key === value ? colors.pale : colors.card }}><Text style={[s.text, { color: key === value ? colors.green : colors.ink }]}>{key === value ? '✓  ' : ''}{title}</Text></Pressable>)}<Button title="닫기" tone="secondary" onPress={() => setOpen(false)} /></SafeAreaView></View></Modal></>;
}
export function Progress({ learned, total, compact = false }: { learned: number; total: number; compact?: boolean }) {
  const percent = total ? Math.round(learned / total * 100) : 0;
  return <View style={{ gap: 8 }}>{!compact && <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.muted}>{learned} / {total}장 학습</Text><Text style={[s.label, { color: colors.green }]}>{percent}%</Text></View>}<View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total || 1, now: learned, text: `${percent}%` }} style={{ height: 6, borderRadius: 4, backgroundColor: colors.pale, overflow: 'hidden' }}>
    <View style={{ height: 6, width: `${percent}%`, backgroundColor: colors.green }} /></View></View>;
}
export function ProgressRing({ percent }: { percent: number }) {
  return <View accessible accessibilityLabel={`전체 달성률 ${percent}%`} style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
    {Array.from({ length: 100 }, (_, i) => {
      const angle = i * Math.PI / 50 - Math.PI / 2;
      return <View key={i} style={{ position: 'absolute', left: 39 + Math.cos(angle) * 36.5, top: 36.5 + Math.sin(angle) * 36.5, width: 2.5, height: 7, backgroundColor: i < percent ? colors.green : colors.pale, transform: [{ rotate: `${i * 3.6}deg` }] }} />;
    })}<Text style={s.h2}>{percent}<Text style={s.muted}>%</Text></Text>
  </View>;
}
export function Empty({ title = '아직 자료가 없어요', detail = '새로운 학습 자료를 추가해 보세요.' }: { title?: string; detail?: string }) {
  return <View style={[s.box, { paddingVertical: 36, alignItems: 'center' }]}><Text style={s.h2}>{title}</Text><Text style={s.muted}>{detail}</Text></View>;
}
export function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={[s.h2, { flex: 1 }]}>{title}</Text><Button title="닫기" tone="secondary" onPress={onClose} /></View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>{children}</ScrollView></KeyboardAvoidingView>
  </SafeAreaView></Modal>;
}
export const showError = (error: unknown) => Alert.alert('작업을 완료하지 못했어요', error instanceof Error ? error.message : String(error));
export async function attempt(action: () => Promise<unknown>) { try { await action(); } catch (error) { showError(error); } }
export const confirm = (title: string, detail: string, action: () => Promise<unknown>) => Alert.alert(title, detail, [
  { text: '취소', style: 'cancel' }, { text: '확인', style: 'destructive', onPress: () => { void attempt(action); } },
]);
const ImageContext = createContext<(url: string) => void>(() => {});
export const useImage = () => useContext(ImageContext);
export function ImageProvider({ children }: { children: React.ReactNode }) {
  const [url, setURL] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  return <ImageContext.Provider value={value => { if (/^(https:\/\/|data:image\/)/i.test(value)) { setURL(value); setZoom(1); } }}>{children}
    {url && <Modal animationType="fade" onRequestClose={() => setURL(null)}><SafeAreaView style={{ flex: 1, backgroundColor: '#152019' }}>
      <View style={[s.row, { padding: 16, justifyContent: 'flex-end' }]}><Button title="축소" disabled={zoom <= 1} tone="secondary" onPress={() => setZoom(Math.max(1, zoom - 0.5))} /><Button title="확대" disabled={zoom >= 3} tone="secondary" onPress={() => setZoom(Math.min(3, zoom + 0.5))} /><Button title="닫기" onPress={() => setURL(null)} /></View>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}><Image accessibilityLabel="첨부 이미지 확대 보기" source={{ uri: url }} resizeMode="contain" style={{ width: 360 * zoom, height: 580 * zoom }} /></ScrollView></ScrollView>
    </SafeAreaView></Modal>}
  </ImageContext.Provider>;
}
export function Attachment({ url }: { url?: string }) {
  const open = useImage();
  return url ? <Pressable accessibilityRole="button" accessibilityLabel="첨부 이미지 확대" onPress={() => open(url)}><Image source={{ uri: url }} accessibilityLabel="첨부 이미지" resizeMode="contain" style={{ height: 180, width: '100%', borderRadius: 12 }} /></Pressable> : null;
}
