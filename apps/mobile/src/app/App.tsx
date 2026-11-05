import { radius, useUI, useThemedStyles, type Palette } from '../ui/theme';
import { appearance, useAppearance } from '../platform/appearance';
import { Text } from '../ui/Typography';
import React, { Component, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Appearance, AppState, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import NetInfo from '@react-native-community/netinfo';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../platform/firebase';
import { store, useStore } from '../platform/runtime';
import { Account } from '../ui/Account';
import { DeckDetail } from '../ui/DeckDetail';
import { DeckEditor } from '../ui/DeckEditor';
import { Dashboard, DeckLibrary, FolderLibrary, Search, StudyLibrary } from '../ui/Library';
import { FolderForm } from '../ui/FolderForm';
import { Study } from '../ui/Study';
import { StudyFolder, DeckStudyOptions } from '../ui/StudySetup';
import { Button, ImageProvider, showError } from '../ui/kit';
import type { Navigation, Route } from '../ui/navigation';
import { Icon, iconFonts, type IconName } from '../ui/Icon';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ErrorMessage onRetry={() => this.setState({ failed: false })} /> : this.props.children; }
}
function ErrorMessage({ onRetry }: { onRetry: () => void }) {
  const { s } = useUI();
  return <View style={s.page}><Text style={s.title}>화면을 불러오지 못했어요</Text><Button title="화면 다시 열기" onPress={onRetry} /></View>;
}
const tabs: Array<[Route, string, IconName]> = [
  [{ type: 'dashboard' }, '홈', 'home'], [{ type: 'all-folders' }, '라이브러리', 'layers'],
  [{ type: 'study-library' }, '학습하기', 'play'], [{ type: 'search' }, '검색', 'search'], [{ type: 'account' }, '마이', 'user'],
];
function Workspace() {
  const { colors, s } = useUI();
  const styles = useThemedStyles(createStyles);
  const state = useStore();
  const [history, setHistory] = useState<Route[]>([{ type: 'dashboard' }]);
  const [folderForm, setFolderForm] = useState(false);
  const guard = useRef<(() => void) | null>(null);
  const route = history[history.length - 1];
  const pop = () => setHistory(previous => previous.length > 1 ? previous.slice(0, -1) : [{ type: 'dashboard' }]);
  const nav: Navigation = {
    go: next => setHistory(previous => [...previous, next]),
    back: () => { if (guard.current) guard.current(); else pop(); },
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (folderForm) { setFolderForm(false); return true; }
      if (history.length > 1 || guard.current) { nav.back(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [history, folderForm]);
  const isStudying = route.type === 'study' || route.type === 'folder-study';
  const immersive = isStudying || route.type === 'edit-deck';
  const topLevel = ['dashboard', 'all-decks', 'all-folders', 'study-library', 'search', 'account'].includes(route.type);
  const activeTab = ['study-folder', 'study-options'].includes(route.type) ? 'study-library' : ['all-decks', 'folder', 'deck'].includes(route.type) ? 'all-folders' : route.type;
  const title = ['study-library', 'study-folder', 'study-options'].includes(route.type) ? '학습하기' : route.type === 'dashboard' ? 'Flashcards' : route.type === 'all-decks' || route.type === 'all-folders' ? '라이브러리' : route.type === 'search' ? '검색' : route.type === 'account' ? '마이 페이지' : route.type === 'edit-deck' ? '카드 만들기' : route.type === 'folder' ? '폴더' : '학습 세트';
  return <View style={{ flex: 1 }}>
    {!isStudying && <View style={styles.header}>
      {(!topLevel || immersive) && <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={nav.back} style={styles.iconButton}><Icon name={immersive ? 'close' : 'back'} color={colors.icon} /></Pressable>}
      {route.type === 'dashboard' && <View style={styles.brand}><Icon name="layers" color={colors.onPrimary} size={20} /></View>}
      <Text numberOfLines={1} style={[styles.headerTitle, { flex: 1 }]}>{title}</Text>
      {!immersive && <Pressable accessibilityRole="button" accessibilityLabel="계정 및 동기화 상태" onPress={() => nav.go({ type: 'account' })} style={styles.avatar}>
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>{(state.user?.displayName || state.user?.email || '나')[0].toUpperCase()}</Text>
        <View style={[styles.statusDot, { backgroundColor: state.status === 'error' ? colors.red : state.online ? colors.success : colors.muted }]} />
      </Pressable>}
      {immersive && <View style={[s.row, { gap: 5 }]}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success }} /><Text style={s.label}>자동 임시 저장</Text></View>}
    </View>}
    {(!state.online || state.status === 'error') && <Pressable accessibilityRole="button" disabled={immersive} onPress={() => nav.go({ type: 'account' })} style={styles.notice}><Text style={[s.label, { color: state.status === 'error' ? colors.red : colors.muted }]}>{state.status === 'error' ? '동기화를 확인해 주세요 · 자세히 보기' : '오프라인이에요. 학습 내용은 기기에 저장돼요.'}</Text></Pressable>}
    {state.error && state.status !== 'error' && <Text accessibilityRole="alert" style={[s.error, { padding: 12 }]}>{state.error}</Text>}
    <View style={{ flex: 1 }}>
      {route.type === 'dashboard' && <Dashboard nav={nav} onNewFolder={() => setFolderForm(true)} />}
      {route.type === 'study-library' && <StudyLibrary nav={nav} />}
      {route.type === 'study-folder' && <StudyFolder key={route.folderId} folderId={route.folderId} nav={nav} />}
      {route.type === 'study-options' && <DeckStudyOptions key={route.deckId} deckId={route.deckId} nav={nav} />}
      {route.type === 'all-decks' && <DeckLibrary nav={nav} onFolders={() => setHistory([{ type: 'all-folders' }])} />}
      {route.type === 'all-folders' && <FolderLibrary nav={nav} onNewFolder={() => setFolderForm(true)} onDecks={() => setHistory([{ type: 'all-decks' }])} />}
      {route.type === 'folder' && <DeckLibrary key={route.folderId} folderId={route.folderId} nav={nav} />}
      {route.type === 'deck' && <DeckDetail key={route.deckId} deckId={route.deckId} nav={nav} />}
      {route.type === 'search' && <Search nav={nav} />}
      {route.type === 'account' && <Account />}
      {route.type === 'edit-deck' && <DeckEditor key={`${route.deckId || 'new'}:${route.folderId || ''}`} deckId={route.deckId} folderId={route.folderId} focusCardId={route.focusCardId} appendCard={route.appendCard} onClose={pop} guard={guard}
        onSaved={id => setHistory(previous => [...previous.slice(0, -1), { type: 'deck', deckId: id }])} />}
      {route.type === 'study' && <Study key={`${route.deckId}:${route.shuffle}`} deckId={route.deckId} shuffle={route.shuffle} unlearnedOnly={route.onlyDifficult}
        onExit={() => setHistory(previous => previous[previous.length - 2]?.type === 'study-options' ? previous.slice(0, -1) : [...previous.slice(0, -1), { type: 'deck', deckId: route.deckId }])} />}
      {route.type === 'folder-study' && <Study key={`folder:${route.folderId}:${route.shuffle ?? true}`} folderId={route.folderId} shuffle={route.shuffle ?? true} onExit={pop} />}
    </View>
    {!immersive ? <SafeAreaView edges={['bottom']} style={styles.tabArea}><View style={styles.tabs}>{tabs.map(([target, label, icon]) => {
      const selected = activeTab === target.type;
      const study = target.type === 'study-library';
      return <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => setHistory([target])} style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.6 : 1 }]}>
        <View style={[styles.tabIcon, selected && { backgroundColor: colors.pale }, study && styles.studyTabIcon, study && selected && styles.studyTabSelected]}><Icon name={icon} color={study ? colors.onPrimary : selected ? colors.primary : colors.icon} size={22} /></View>
        <Text style={{ fontSize: 11, fontWeight: selected ? '700' : study ? '600' : '500', color: selected || study ? colors.primary : colors.muted }}>{label}</Text>
      </Pressable>;
    })}</View></SafeAreaView> : <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card }} />}
    {folderForm && <FolderForm onClose={() => setFolderForm(false)} onSaved={id => { setFolderForm(false); nav.go({ type: 'folder', folderId: id }); }} />}
  </View>;
}
function Bootstrap() {
  const { colors, s } = useUI();
  const state = useStore();
  const [iconsReady, iconError] = useFonts(iconFonts);
  useEffect(() => {
    const switchAccount = (user: User | null) => {
      void store.switchUser(user ? { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL } : null).catch(() => {});
    };
    const unsubscribeAuth = auth ? onAuthStateChanged(auth, switchAccount, showError) : (switchAccount(null), () => {});
    const unsubscribeNet = NetInfo.addEventListener(info => store.setOnline(info.isConnected !== false && info.isInternetReachable !== false));
    const active = AppState.addEventListener('change', status => { if (status === 'active') void store.sync(); });
    return () => { unsubscribeAuth(); unsubscribeNet(); active.remove(); };
  }, []);
  if (iconError) throw iconError;
  if (!state.ready || !iconsReady) return <View style={[s.page, { flex: 1, justifyContent: 'center' }]}>{state.error ? <><Text style={s.error}>{state.error}</Text><Button title="저장 자료 다시 불러오기" onPress={() => { void store.switchUser(state.user).catch(() => {}); }} /></> : <><ActivityIndicator color={colors.primary} /><Text style={s.muted}>학습 자료를 불러오고 있어요…</Text></>}</View>;
  return <Workspace key={state.session} />;
}
export default function App() {
  const { colors, dark } = useUI();
  const settings = useAppearance();
  useEffect(() => { void appearance.load(); }, []);
  useEffect(() => { Appearance.setColorScheme(settings.theme === 'system' ? 'auto' : settings.theme); }, [settings.theme]);
  if (!settings.ready) return null;
  return <SafeAreaProvider><SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}><StatusBar style={dark ? "light" : "dark"} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ErrorBoundary><ImageProvider><Bootstrap /></ImageProvider></ErrorBoundary></KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>;
}
const createStyles = (colors: Palette) => StyleSheet.create({
  header: { paddingHorizontal: 16, minHeight: 56, paddingVertical: 6, gap: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.ink, fontSize: 18, letterSpacing: -0.5, fontWeight: '700' },
  brand: { width: 32, height: 32, borderRadius: radius.control, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  statusDot: { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.bg },
  notice: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.subtle },
  tabArea: { backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border },
  tabs: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', paddingHorizontal: 10, paddingTop: 5, paddingBottom: 4, alignItems: 'center' },
  tab: { flex: 1, minHeight: 56, gap: 4, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { width: 48, height: 32, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  studyTabIcon: { width: 52, height: 36, borderRadius: 12, backgroundColor: colors.primary, boxShadow: `0px 2px 6px ${colors.ring}` },
  studyTabSelected: { boxShadow: `0px 0px 0px 3px ${colors.ring}` },
});
