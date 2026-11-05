import { useUI } from './theme';
import { Text } from './Typography';
import React, { useState } from "react";
import { isRunningInExpoGo } from "expo";
import { ScrollView, View } from 'react-native';
import { login, logout } from "../platform/auth";
import { mockAuthEnabled } from "../platform/testAuth";
import { store, useStore } from "../platform/runtime";
import { Icon } from "./Icon";
import { Button, Progress, confirm, showError } from "./kit";
import { DisplaySettings } from "./DisplaySettings";

export function Account() {
  const { colors, s } = useUI();
  const state = useStore();
  const expoGo = isRunningInExpoGo();
  const [busy, setBusy] = useState(false);
  const learned = state.cards.filter((card) => card.learned).length;
  const labels = {
    syncing: "자료를 동기화하고 있어요",
    synced: "모든 자료가 동기화되었어요",
    offline: state.user
      ? "기기에 안전하게 저장돼요"
      : "게스트로 학습하고 있어요",
    error: "동기화를 다시 확인해 주세요",
  };
  return (
    <ScrollView
      contentContainerStyle={[s.page, { gap: 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[s.box, { gap: 12 }]}
      >
        <View style={[s.row, { flexWrap: "nowrap", gap: 12 }]}>
          <View style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 22,
            borderWidth: 1, borderColor: colors.border, backgroundColor: colors.iconBg,
            alignItems: "center", justifyContent: "center" }}>
            <Icon name="user" size={22} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.h2}>{state.user?.displayName || "나의 학습 공간"}</Text>
            {state.user?.email && <Text style={s.muted}>{state.user.email}</Text>}
          </View>
        </View>
        {!state.user && (!expoGo || mockAuthEnabled) && (
          <View style={{ alignSelf: "stretch" }}>
            <Button
              title={
                mockAuthEnabled
                  ? "테스트 계정으로 로그인"
                  : "Google 계정으로 시작하기"
              }
              busy={busy}
              onPress={() => {
                setBusy(true);
                void login()
                  .catch(showError)
                  .finally(() => setBusy(false));
              }}
            />
          </View>
        )}
        {mockAuthEnabled && state.user && (
          <Text style={[s.label, { color: colors.ink }]}>
            테스트 로그인 · 기기 저장 전용
          </Text>
        )}
      </View>
      <DisplaySettings />
      <View style={{ gap: 10 }}>
        <Text style={s.h2}>지금까지 쌓은 배움</Text>
        <View style={[s.box, { gap: 12 }]}>
          <View style={[s.row, { justifyContent: "space-around" }]}>
            {[
              [state.decks.length, "학습 세트"],
              [state.cards.length, "전체 카드"],
              [learned, "기억한 카드"],
            ].map(([value, label]) => (
              <View key={label} style={{ alignItems: "center", gap: 6 }}>
                <Text
                  style={[s.title, { color: colors.ink, fontSize: 22, lineHeight: 28 }]}
                >
                  {value}
                </Text>
                <Text style={s.label}>{label}</Text>
              </View>
            ))}
          </View>
          <Progress learned={learned} total={state.cards.length} />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={s.h2}>저장 및 동기화</Text>
        <View style={[s.box, { gap: 12 }]}>
          <View style={[s.row, { flexWrap: "nowrap", gap: 12 }]}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor:
                  state.status === "error" ? colors.dangerBg : colors.subtle,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={state.status === "syncing" ? "rotate" : "check"}
                color={state.status === "error" ? colors.red : colors.success}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[s.text, { fontWeight: "600" }]}>
                {mockAuthEnabled && state.user
                  ? "테스트 계정 자료를 기기에 저장해요"
                  : labels[state.status]}
              </Text>
              <Text style={s.label}>
                {state.online ? "네트워크 연결됨" : "오프라인"}
                {!mockAuthEnabled &&
                  ` · 대기 작업 ${Object.keys(state.outbox).length}개`}
              </Text>
            </View>
          </View>
          {state.lastSyncedAt && (
            <Text style={s.muted}>
              최근 동기화 ·{" "}
              {new Date(state.lastSyncedAt).toLocaleString("ko-KR")}
            </Text>
          )}
          {state.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {state.error}
            </Text>
          )}
          {!mockAuthEnabled && (
            <Button
              title={
                state.status === "error" ? "동기화 다시 시도" : "지금 동기화"
              }
              tone="secondary"
              disabled={!state.user || !state.online}
              busy={state.status === "syncing"}
              onPress={() => {
                void store.sync();
              }}
            />
          )}
        </View>
      </View>
      {state.user && (
        <Button
          title="로그아웃"
          tone="secondary"
          onPress={() =>
            confirm(
              "로그아웃할까요?",
              "이 계정의 기기 저장 자료는 유지됩니다. 같은 계정으로 로그인하면 다시 볼 수 있습니다.",
              logout,
            )
          }
        />
      )}
      <View style={{ alignItems: "center", gap: 4, paddingVertical: 12 }}>
        <Text style={[s.h2, { color: colors.primary, fontSize: 16 }]}>
          Flashcards
        </Text>
      </View>
    </ScrollView>
  );
}
