import { radius, useUI, useThemedStyles, type Palette } from './theme';
import { Text } from './Typography';
import * as Haptics from 'expo-haptics';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Card, CardInput } from "../core/types";
import { folderCards, orderedCards, orderedFolderCards } from "../core/content";
import { reconcileSession, startSession, stepSession } from "../core/study";
import { offsetAfterTouch, type ScrollMetrics } from "../core/studyScroll";
import { store, useStore } from "../platform/runtime";
import { Button, Empty, Progress, ProgressRing, Sheet, confirm, showError } from "./kit";
import { CardComposer, type ComposerHandle } from "./CardComposer";
import { StudyFontSettingsModal } from "./DisplaySettings";
import { Icon } from "./Icon";
import { StudyCard, type StudyCardHandle } from "./StudyCard";

function EditCard({ card, onClose }: { card: Card; onClose: () => void }) {
  const [value, setValue] = useState<CardInput>(card);
  const [base] = useState(() => ({ contentVersion: card.contentVersion }));
  const [busy, setBusy] = useState(false);
  const editor = useRef<ComposerHandle>(null);
  return (
    <Sheet title="학습 중 카드 수정" onClose={onClose}>
      <CardComposer ref={editor} card={value} onChange={setValue} />
      <Button
        title="수정 저장"
        busy={busy}
        onPress={() => {
          setBusy(true);
          void (async () => {
            if (!editor.current) throw new Error("편집기를 불러오는 중입니다.");
            const next = await editor.current.flush();
            await store.updateCard(card.id, next, base);
            onClose();
          })()
            .catch(showError)
            .finally(() => setBusy(false));
        }}
      />
      <Button
        title="카드 삭제"
        tone="danger"
        disabled={busy}
        onPress={() =>
          confirm(
            "현재 카드를 삭제할까요?",
            "세트에서도 이 카드가 삭제됩니다.",
            async () => {
              await store.deleteCard(card.id);
              onClose();
            },
          )
        }
      />
    </Sheet>
  );
}
export function Study({
  setId,
  folderId,
  shuffle = folderId !== undefined,
  unlearnedOnly,
  onExit,
}: {
  setId?: string;
  folderId?: string;
  shuffle?: boolean;
  unlearnedOnly?: boolean;
  onExit: () => void;
}) {
  const { colors, s } = useUI();
  const study = useThemedStyles(createStyles);
  const { sets, cards, folders, preferences } = useStore();
  const cardSet = sets.find((d) => d.id === setId);
  const source =
    folderId !== undefined ? folders.find((f) => f.id === folderId) : cardSet;
  const own = useMemo(
    () =>
      folderId !== undefined
        ? shuffle
          ? folderCards(cards, sets, folderId)
          : orderedFolderCards(
              cards,
              sets,
              folderId,
              preferences.folderSetSort,
            )
        : orderedCards(cards, setId ?? ""),
    [cards, sets, setId, folderId, shuffle, preferences.folderSetSort],
  );
  const [session, setSession] = useState(() =>
    startSession(
      own,
      shuffle,
      unlearnedOnly ??
        (folderId === undefined && own.some((card) => !card.learned)),
    ),
  );
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);
  const [cardTouchActive, setCardTouchActive] = useState(false);
  const ratingInFlight = useRef(false);
  const cardView = useRef<StudyCardHandle>(null);
  const pageScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const pagePosition = useRef<ScrollMetrics>({ y: 0, height: 0, content: 0 });
  const setCardTouch = useCallback((active: boolean) => {
    pageScroll.current?.setNativeProps({ scrollEnabled: !active });
    setCardTouchActive(active);
  }, []);
  const scrollPageBy = (dy: number, animated: boolean) => {
    const page = pagePosition.current;
    const y = offsetAfterTouch(page, dy);
    if (y === page.y) return;
    page.y = y;
    pageScroll.current?.scrollTo({ y, animated });
  };
  useEffect(() => {
    if (setId !== undefined)
      void store.setPreferences({ lastStudiedSetId: setId }).catch(showError);
  }, [setId]);
  useEffect(() => {
    setSession((previous) => reconcileSession(previous, own));
  }, [own]);
  const current = own.find((c) => c.id === session.ids[session.index]);
  const currentSet = sets.find((d) => d.id === current?.setId);
  const learned = own.filter((c) => c.learned).length;
  if (!source)
    return (
      <View style={s.page}>
        <Empty
          title={
            folderId !== undefined
              ? "폴더를 찾을 수 없어요"
              : "세트를 찾을 수 없어요"
          }
        />
        <Button title="학습 나가기" onPress={onExit} />
      </View>
    );
  if (!own.length)
    return (
      <View style={s.page}>
        <Empty
          title="학습할 카드가 없어요"
          detail={`'${source.title}' ${folderId !== undefined ? "폴더 안의 세트에" : "세트에"} 카드를 추가해 주세요.`}
        />
        <Button
          title={folderId !== undefined ? "폴더로 돌아가기" : "세트로 돌아가기"}
          onPress={onExit}
        />
      </View>
    );
  const restart = (unlearned: boolean) => {
    const latest = store.getState();
    const target =
      folderId !== undefined
        ? shuffle
          ? folderCards(latest.cards, latest.sets, folderId)
          : orderedFolderCards(
              latest.cards,
              latest.sets,
              folderId,
              latest.preferences.folderSetSort,
            )
        : orderedCards(latest.cards, setId ?? "");
    setSession(
      startSession(
        target,
        shuffle,
        unlearned,
        unlearned ? session.round + 1 : 1,
      ),
    );
  };
  if (session.finished || !current)
    return (
      <ScrollView contentContainerStyle={[s.page, { paddingTop: 44, gap: 24 }]}>
        <View style={{ alignItems: "center", gap: 20 }}>
          <View style={study.celebration}>
            <Icon name="check" size={42} color={colors.success} />
          </View>
          <Text style={s.label}>
            {source.title} · {session.round}회차
          </Text>
          <Text style={[s.title, { textAlign: "center" }]}>
            {learned === own.length && own.length
              ? "모두 기억했어요!"
              : "학습을 마쳤어요"}
          </Text>
        </View>
        <View
          style={[
            s.box,
            { alignItems: "center", gap: 20, paddingVertical: 28 },
          ]}
        >
          <ProgressRing
            percent={own.length ? Math.round((learned / own.length) * 100) : 0}
          />
          <Text style={s.label}>세트 학습 현황 · 전체 {own.length}장</Text>
          <View
            style={[s.row, { width: "100%", justifyContent: "space-around" }]}
          >
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={[s.title, { color: colors.success }]}>
                {learned}
              </Text>
              <Text style={s.muted}>기억했어요</Text>
            </View>
            <View
              style={{ width: 1, height: 42, backgroundColor: colors.border }}
            />
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={[s.title, { color: colors.warm }]}>
                {own.length - learned}
              </Text>
              <Text style={s.muted}>다시 볼 카드</Text>
            </View>
          </View>
        </View>
        <Button
          title="미학습 카드 다시 학습"
          disabled={learned === own.length}
          onPress={() => restart(true)}
        />
        <Button
          title="전체 카드 다시 학습"
          tone="secondary"
          disabled={!own.length}
          onPress={() => restart(false)}
        />
        {Boolean(current) && (
          <Button
            title="현재 카드로 돌아가기"
            tone="secondary"
            onPress={() =>
              setSession((previous) => ({ ...previous, finished: false }))
            }
          />
        )}
        <Button
          title={folderId !== undefined ? "폴더로 돌아가기" : "세트로 돌아가기"}
          tone="secondary"
          onPress={onExit}
        />
      </ScrollView>
    );
  const last = session.index === session.ids.length - 1;
  const navigate = (delta: -1 | 1, sourceId: string) =>
    setSession((previous) =>
      !previous.finished && previous.ids[previous.index] === sourceId
        ? stepSession(previous, delta)
        : previous,
    );
  const rate = (known: boolean) => {
    if (
      ratingInFlight.current ||
      busy ||
      editing ||
      settingsOpen ||
      controlsLocked
    )
      return;
    const id = current.id;
    ratingInFlight.current = true;
    setBusy(true);

    if (known) {
      const nextLearned = !current.learned;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      void store
        .setLearned(id, nextLearned)
        .catch(showError)
        .finally(() => {
          ratingInFlight.current = false;
          setBusy(false);
        });
    } else {
      void store
        .setLearned(id, false)
        .then(() => navigate(1, id))
        .catch(showError)
        .finally(() => {
          ratingInFlight.current = false;
          setBusy(false);
        });
    }
  };
  return (
    <>
      <ScrollView
        ref={pageScroll}
        scrollEnabled={!cardTouchActive}
        scrollEventThrottle={16}
        onScroll={(event) => {
          pagePosition.current.y = event.nativeEvent.contentOffset.y;
        }}
        onLayout={(event) => {
          pagePosition.current.height = event.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, height) => {
          pagePosition.current.content = height;
        }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={study.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="학습 나가기"
            onPress={onExit}
            style={study.smallButton}
          >
            <Icon name="close" size={22} color={colors.icon} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <Text numberOfLines={1} style={[s.text, { fontWeight: "700" }]}>
              {source.title}
            </Text>
            <Text style={s.label}>
              {shuffle ? "랜덤 학습" : "플래시카드"} · {session.round}회차
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text accessibilityLiveRegion="polite" style={study.badge}>
              카드 {session.index + 1}/{session.ids.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="학습 설정"
              disabled={busy || editing}
              onPress={() => setSettingsOpen(true)}
              style={study.smallButton}
            >
              <Icon name="settings" size={20} color={colors.icon} />
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>
          <Progress
            learned={session.index}
            total={session.ids.length}
            compact
          />
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={[s.label, { color: colors.success }]}>
              기억한 카드 {learned}장
            </Text>
          </View>
        </View>
        <View style={study.page}>
          {folderId !== undefined && currentSet && (
            <Text numberOfLines={1} style={[s.label, { marginBottom: 10 }]}>
              현재 세트: {currentSet.title}
            </Text>
          )}
          <StudyCard
            ref={cardView}
            card={current}
            flipped={session.flipped}
            round={session.round}
            isFirst={session.index === 0}
            isLast={last}
            disabled={busy || editing || settingsOpen}
            onEdit={() => setEditing(true)}
            onFlip={() => setSession((previous) =>
              !previous.finished && previous.ids[previous.index] === current.id
                ? { ...previous, flipped: !previous.flipped }
                : previous,
            )}
            onNavigate={navigate}
            onControlsLockedChange={setControlsLocked}
            onTouchActiveChange={setCardTouch}
            onVerticalOverflow={scrollPageBy}
          />
        </View>
        <View style={study.dock}>
          <View
            style={[
              s.row,
              { justifyContent: "space-between", flexWrap: "nowrap" },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 카드"
              disabled={session.index === 0 || busy || controlsLocked}
              onPress={() => cardView.current?.navigate(-1)}
              style={[
                study.navButton,
                { opacity: session.index === 0 ? 0.3 : 1 },
              ]}
            >
              <Icon name="back" size={20} color={colors.icon} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={last ? "학습 결과 보기" : "다음 카드"}
              disabled={busy || controlsLocked}
              onPress={() => cardView.current?.navigate(1)}
              style={study.navButton}
            >
              <Icon name="arrow" size={20} color={colors.icon} />
            </Pressable>
          </View>
          <View style={[s.row, { flexWrap: "nowrap", gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Button
                title="다시 볼게요"
                tone="secondary"
                disabled={busy || controlsLocked}
                onPress={() => rate(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={current.learned ? "몰라요" : "알아요"}
                icon={current.learned ? "close" : "check"}
                iconPosition="end"
                tone={current.learned ? "secondary" : "primary"}
                disabled={busy || controlsLocked}
                busy={busy}
                onPress={() => rate(true)}
              />
            </View>
          </View>
        </View>
      </ScrollView>
      {editing && <EditCard card={current} onClose={() => setEditing(false)} />}
      {settingsOpen && (
        <StudyFontSettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
const createStyles = (colors: Palette) => StyleSheet.create({
  bar: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    borderRadius: 10,
    backgroundColor: colors.pale,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    overflow: "hidden",
  },
  page: {
    flex: 1,
    minHeight: 240,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  smallButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dock: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 10,
  },
  navButton: {
    width: 46,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  celebration: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
});
