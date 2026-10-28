import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { login, logout } from '../platform/auth';
import { store, useStore } from '../platform/runtime';
import { Button, confirm, s, showError } from './kit';
export function Account() {
  const state = useStore();
  const [busy, setBusy] = useState(false);
  const labels = { syncing: '동기화 중', synced: '동기화 완료', offline: '기기에 저장됨', error: '동기화 실패' };
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>내 계정</Text>
    <View style={s.box}><Text style={s.h2}>{state.user?.displayName || '게스트로 사용 중'}</Text><Text style={s.muted}>{state.user?.email || '로그인 없이 기기에 자료를 저장하며 학습할 수 있어요.'}</Text>
      {state.user ? <Button title="로그아웃" tone="secondary" onPress={() => confirm('로그아웃할까요?', '이 계정의 기기 저장 자료는 유지됩니다. 같은 계정으로 로그인하면 다시 볼 수 있습니다.', logout)} /> :
        <Button title="Google로 로그인" busy={busy} onPress={() => { setBusy(true); void login().catch(showError).finally(() => setBusy(false)); }} />}
    </View>
    <View style={s.box}><Text style={s.h2}>{labels[state.status]}</Text><Text style={s.text}>{state.online ? '네트워크 연결됨' : '오프라인'}</Text>
      <Text style={s.muted}>동기화 대기 작업 {Object.keys(state.outbox).length}개</Text>
      {state.lastSyncedAt && <Text style={s.muted}>최근 동기화 · {new Date(state.lastSyncedAt).toLocaleString('ko-KR')}</Text>}
      {state.error && <Text accessibilityRole="alert" style={s.error}>{state.error}</Text>}
      <Button title="지금 동기화 / 다시 시도" disabled={!state.user || !state.online} busy={state.status === 'syncing'} onPress={() => { void store.sync(); }} />
    </View>
    <Text style={s.muted}>로그인하면 웹과 같은 Firebase 계정의 자료를 동기화합니다. 게스트 자료와 계정 자료는 각각 저장되며, 로그인할 때 자동으로 합쳐지지 않습니다.</Text>
    <Text style={s.muted}>네트워크가 복구되거나 앱으로 돌아오면 동기화를 다시 시도합니다. 저장 대기 작업은 앱을 종료해도 유지됩니다.</Text>
  </ScrollView>;
}
