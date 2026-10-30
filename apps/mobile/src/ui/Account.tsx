import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { login, logout } from '../platform/auth';
import { store, useStore } from '../platform/runtime';
import { Icon } from './Icon';
import { Button, Progress, colors, confirm, s, showError } from './kit';
export function Account() {
  const state = useStore();
  const [busy, setBusy] = useState(false);
  const learned = state.cards.filter(card => card.learned).length;
  const labels = { syncing: '자료를 동기화하고 있어요', synced: '모든 자료가 동기화되었어요', offline: state.user ? '기기에 안전하게 저장돼요' : '게스트로 학습하고 있어요', error: '동기화를 다시 확인해 주세요' };
  return <ScrollView contentContainerStyle={[s.page, { gap: 24 }]} showsVerticalScrollIndicator={false}>
    <View style={[s.box, { alignItems: 'center', paddingVertical: 28, gap: 12 }]}><View style={{ width: 76, height: 76, borderRadius: 28, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }}><Icon name="user" size={36} /></View><Text style={s.title}>{state.user?.displayName || '나의 학습 공간'}</Text><Text style={[s.muted, { textAlign: 'center' }]}>{state.user?.email || '매일 조금씩, 어제보다 더 많이 기억해요.'}</Text>
      {!state.user && <View style={{ alignSelf: 'stretch', marginTop: 8 }}><Button title="Google 계정으로 시작하기" busy={busy} onPress={() => { setBusy(true); void login().catch(showError).finally(() => setBusy(false)); }} /></View>}
    </View>
    <View style={{ gap: 14 }}><Text style={s.h2}>지금까지 쌓은 배움</Text><View style={[s.box, { gap: 20 }]}><View style={[s.row, { justifyContent: 'space-around' }]}>{[[state.decks.length, '학습 세트'], [state.cards.length, '전체 카드'], [learned, '기억한 카드']].map(([value, label]) => <View key={label} style={{ alignItems: 'center', gap: 6 }}><Text style={[s.title, { color: colors.primary, fontSize: 25 }]}>{value}</Text><Text style={s.label}>{label}</Text></View>)}</View><Progress learned={learned} total={state.cards.length} /></View></View>
    <View style={{ gap: 14 }}><Text style={s.h2}>저장 및 동기화</Text><View style={[s.box, { gap: 16 }]}><View style={[s.row, { flexWrap: 'nowrap', gap: 12 }]}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: state.status === 'error' ? '#FCECF0' : colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={state.status === 'syncing' ? 'rotate' : 'check'} color={state.status === 'error' ? colors.red : colors.success} /></View><View style={{ flex: 1, gap: 3 }}><Text style={[s.text, { fontWeight: '600' }]}>{labels[state.status]}</Text><Text style={s.label}>{state.online ? '네트워크 연결됨' : '오프라인'} · 대기 작업 {Object.keys(state.outbox).length}개</Text></View></View>
      {state.lastSyncedAt && <Text style={s.muted}>최근 동기화 · {new Date(state.lastSyncedAt).toLocaleString('ko-KR')}</Text>}
      {state.error && <Text accessibilityRole="alert" style={s.error}>{state.error}</Text>}
      <Button title={state.status === 'error' ? '동기화 다시 시도' : '지금 동기화'} tone="secondary" disabled={!state.user || !state.online} busy={state.status === 'syncing'} onPress={() => { void store.sync(); }} />
      <Text style={s.muted}>{state.user ? '네트워크가 복구되면 자동으로 동기화해요. 오프라인에서도 만들고 학습할 수 있어요.' : '게스트 자료는 이 기기에 저장돼요. 로그인하면 해당 계정의 학습 자료를 불러와요. 게스트 자료는 계정과 자동으로 합쳐지지 않아요.'}</Text>
    </View></View>
    {state.user && <Button title="로그아웃" tone="secondary" onPress={() => confirm('로그아웃할까요?', '이 계정의 기기 저장 자료는 유지됩니다. 같은 계정으로 로그인하면 다시 볼 수 있습니다.', logout)} />}
    <View style={{ alignItems: 'center', gap: 4, paddingVertical: 12 }}><Text style={[s.h2, { color: colors.primary, fontSize: 16 }]}>Flashcards</Text><Text style={[s.label, { fontSize: 10, letterSpacing: 1.2 }]}>A LITTLE, EVERY DAY</Text></View>
  </ScrollView>;
}
