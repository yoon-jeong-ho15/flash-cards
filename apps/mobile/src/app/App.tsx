import React, { Component, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../platform/firebase';
import { store, useStore } from '../platform/runtime';
import { Account } from '../ui/Account';
import { DeckDetail } from '../ui/DeckDetail';
import { DeckEditor } from '../ui/DeckEditor';
import { Dashboard, DeckLibrary, FolderLibrary, Search } from '../ui/Library';
import { FolderForm } from '../ui/FolderForm';
import { Study } from '../ui/Study';
import { Button, ImageProvider, colors, s, showError } from '../ui/kit';
import type { Navigation, Route } from '../ui/navigation';
import { Icon, type IconName } from '../ui/Icon';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <View style={s.page}><Text style={s.title}>화면을 불러오지 못했어요</Text><Text style={s.text}>앱을 다시 시작해 주세요. 기기에 저장된 자료와 임시 저장본은 유지됩니다.</Text><Button title="화면 다시 열기" onPress={() => this.setState({ failed: false })} /></View> : this.props.children; }
}
const tabs: Array<[Route, string, IconName]> = [[{ type: 'dashboard' }, '학습 홈', 'home'], [{ type: 'all-decks' }, '모든 덱', 'layers'], [{ type: 'all-folders' }, '모든 폴더', 'folder'], [{ type: 'account' }, '내 계정', 'check']];
function Workspace() {
  const state = useStore();
  const [history, setHistory] = useState<Route[]>([{ type: 'dashboard' }]);
  const [folderForm, setFolderForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const deck = 'deckId' in route ? state.decks.find(d => d.id === route.deckId) : undefined;
  const title = route.type === 'dashboard' ? '학습 홈' : route.type === 'all-decks' ? '모든 덱' : route.type === 'all-folders' ? '모든 폴더' : route.type === 'folder' ? state.folders.find(f => f.id === route.folderId)?.title : route.type === 'search' ? '학습 자료 검색' : route.type === 'account' ? '내 계정' : isStudying ? '학습 중' : route.type === 'edit-deck' ? deck ? '덱 편집' : '새 덱 만들기' : deck?.title;
  const menuNavigate = (target: Route) => { setMenuOpen(false); setHistory([target]); };
  const status = { offline: state.online && !state.user ? '기기 저장' : '오프라인', syncing: '동기화 중', synced: '동기화됨', error: '동기화 재시도' }[state.status];
  return <View style={{ flex: 1 }}>
    <View style={styles.header}><View style={[s.row, { flex: 1, flexWrap: 'nowrap', gap: 6 }]}>{!isStudying && <Pressable accessibilityRole="button" accessibilityLabel={immersive ? '뒤로' : '메뉴 열기'} onPress={immersive ? nav.back : () => setMenuOpen(true)} style={styles.iconButton}><Icon name={immersive ? 'back' : 'menu'} color={colors.muted} /></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="학습 홈으로 이동" onPress={() => { if (route.type === 'edit-deck') nav.back(); else setHistory([{ type: 'dashboard' }]); }} style={styles.iconButton}><Icon name="home" size={16} color={colors.muted} /></Pressable><Text style={{ color: '#B6BBB6' }}>›</Text><Text numberOfLines={1} style={[s.text, { flexShrink: 1, fontSize: 12, fontWeight: '500' }]}>{title}</Text></View>
      {!immersive && <><Pressable accessibilityRole="button" accessibilityLabel="학습 자료 검색" onPress={() => nav.go({ type: 'search' })} style={styles.iconButton}><Icon name="search" size={18} color={colors.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="내 계정" onPress={() => nav.go({ type: 'account' })} style={{ minHeight: 44, justifyContent: 'center' }}>{state.user ? <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>{(state.user.displayName || state.user.email || 'U')[0].toUpperCase()}</Text></View> : <View style={{ paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}><Text style={s.muted}>로그인</Text></View>}</Pressable></>}
    </View>
    {state.error && state.status !== 'error' && <Text accessibilityRole="alert" style={[s.error, { padding: 12 }]}>{state.error}</Text>}
    <View style={{ flex: 1 }}>
      {route.type === 'dashboard' && <Dashboard nav={nav} onNewFolder={() => setFolderForm(true)} />}
      {route.type === 'all-decks' && <DeckLibrary nav={nav} />}
      {route.type === 'all-folders' && <FolderLibrary nav={nav} onNewFolder={() => setFolderForm(true)} />}
      {route.type === 'folder' && <DeckLibrary key={route.folderId} folderId={route.folderId} nav={nav} />}
      {route.type === 'deck' && <DeckDetail key={route.deckId} deckId={route.deckId} nav={nav} />}
      {route.type === 'search' && <Search nav={nav} />}
      {route.type === 'account' && <Account />}
      {route.type === 'edit-deck' && <DeckEditor key={`${route.deckId || 'new'}:${route.folderId || ''}`} deckId={route.deckId} folderId={route.folderId} focusCardId={route.focusCardId} onClose={pop} guard={guard}
        onSaved={id => setHistory(previous => [...previous.slice(0, -1), { type: 'deck', deckId: id }])} />}
      {route.type === 'study' && <Study key={`${route.deckId}:${route.shuffle}`} deckId={route.deckId} shuffle={route.shuffle}
        onExit={() => setHistory(previous => [...previous.slice(0, -1), { type: 'deck', deckId: route.deckId }])} />}
      {route.type === 'folder-study' && <Study key={`folder:${route.folderId}`} folderId={route.folderId} shuffle onExit={pop} />}
    </View>
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}><View style={{ flex: 1, flexDirection: 'row' }}><SafeAreaView style={{ width: '84%', maxWidth: 340, backgroundColor: '#FDFCF9' }}><View style={[s.row, { paddingHorizontal: 20, height: 64, flexWrap: 'nowrap' }]}><View style={{ backgroundColor: colors.green, borderRadius: 12, padding: 8 }}><Icon name="layers" color="#FFFFFF" /></View><View style={{ flex: 1 }}><Text style={s.h2}>FlashCards</Text><Text style={[s.label, { fontSize: 9, letterSpacing: 1 }]}>A LITTLE, EVERY DAY</Text></View><Pressable accessibilityRole="button" accessibilityLabel="메뉴 닫기" onPress={() => setMenuOpen(false)} style={styles.iconButton}><Icon name="close" color={colors.muted} /></Pressable></View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}><View style={{ marginVertical: 12 }}><Button title="＋ 새 덱 만들기" onPress={() => menuNavigate({ type: 'edit-deck' })} /></View>{tabs.map(([target, label, icon]) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: route.type === target.type }} onPress={() => menuNavigate(target)} style={[s.row, { padding: 12, borderRadius: 12, gap: 12, backgroundColor: route.type === target.type ? colors.pale : 'transparent' }]}><Icon name={icon} size={18} color={route.type === target.type ? colors.green : colors.muted} /><Text style={[s.text, { flex: 1, color: route.type === target.type ? colors.green : colors.muted }]}>{label}</Text>{(target.type === 'all-decks' || target.type === 'all-folders') && <Text style={s.muted}>{target.type === 'all-decks' ? state.decks.length : state.folders.length}</Text>}</Pressable>)}
      <View style={{ borderTopWidth: 1, borderColor: colors.border, marginTop: 16, paddingTop: 20, gap: 8 }}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={[s.label, { letterSpacing: 1.5 }]}>내 라이브러리</Text><Pressable accessibilityRole="button" accessibilityLabel="새 폴더 만들기" onPress={() => { setMenuOpen(false); setFolderForm(true); }} style={styles.iconButton}><Icon name="plus" size={16} color={colors.muted} /></Pressable></View>{state.folders.map(f => <Pressable key={f.id} accessibilityRole="button" onPress={() => menuNavigate({ type: 'folder', folderId: f.id })} style={[s.row, { padding: 10, flexWrap: 'nowrap' }]}><Icon name="folder" size={16} color={colors.muted} /><Text numberOfLines={1} style={[s.muted, { flex: 1 }]}>{f.title}</Text></Pressable>)}{state.decks.filter(d => !d.folderId).map(d => <Pressable key={d.id} accessibilityRole="button" onPress={() => menuNavigate({ type: 'deck', deckId: d.id })} style={[s.row, { padding: 10, flexWrap: 'nowrap' }]}><Icon name="layers" size={14} color={colors.muted} /><Text numberOfLines={1} style={[s.muted, { flex: 1 }]}>{d.title}</Text></Pressable>)}</View>
      </ScrollView><Pressable accessibilityRole="button" onPress={() => menuNavigate({ type: 'account' })} style={{ padding: 20, borderTopWidth: 1, borderColor: colors.border, gap: 4 }}><Text style={s.text}>{state.user?.displayName || '게스트 모드'}</Text><Text style={s.muted}>{status} · 내 계정</Text></Pressable></SafeAreaView><Pressable accessibilityRole="button" accessibilityLabel="메뉴 닫기" onPress={() => setMenuOpen(false)} style={{ flex: 1, backgroundColor: '#15201966' }} /></View></Modal>
    {folderForm && <FolderForm onClose={() => setFolderForm(false)} onSaved={id => { setFolderForm(false); nav.go({ type: 'folder', folderId: id }); }} />}
  </View>;
}
function Bootstrap() {
  const state = useStore();
  useEffect(() => {
    const switchAccount = (user: User | null) => {
      void store.switchUser(user ? { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL } : null).catch(() => {});
    };
    const unsubscribeAuth = auth ? onAuthStateChanged(auth, switchAccount, showError) : (switchAccount(null), () => {});
    const unsubscribeNet = NetInfo.addEventListener(info => store.setOnline(info.isConnected !== false && info.isInternetReachable !== false));
    const active = AppState.addEventListener('change', status => { if (status === 'active') void store.sync(); });
    return () => { unsubscribeAuth(); unsubscribeNet(); active.remove(); };
  }, []);
  if (!state.ready) return <View style={[s.page, { flex: 1, justifyContent: 'center' }]}>{state.error ? <><Text style={s.error}>{state.error}</Text><Button title="저장 자료 다시 불러오기" onPress={() => { void store.switchUser(state.user).catch(() => {}); }} /></> : <><ActivityIndicator color={colors.green} /><Text style={s.muted}>학습 자료를 불러오고 있어요…</Text></>}</View>;
  return <Workspace key={state.session} />;
}
export default function App() {
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><StatusBar style="dark" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ErrorBoundary><ImageProvider><Bootstrap /></ImageProvider></ErrorBoundary></KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, height: 56, gap: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  iconButton: { minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
