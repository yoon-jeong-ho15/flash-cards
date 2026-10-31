import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Card, CardInput } from '../core/types';
import { folderCards, orderedCards } from '../core/content';
import { reconcileSession, startSession, stepSession } from '../core/study';
import { RichText } from '../editor/RichText';
import { store, useStore } from '../platform/runtime';
import { Attachment, Button, Empty, Progress, ProgressRing, Sheet, colors, confirm, s, showError, useImage } from './kit';
import { CardComposer, type ComposerHandle } from './CardComposer';
import { Icon } from './Icon';
import { useSwipeMotion } from './useSwipeMotion';

function EditCard({ card, onClose }: { card: Card; onClose: () => void }) {
  const [value, setValue] = useState<CardInput>(card);
  const [busy, setBusy] = useState(false);
  const editor = useRef<ComposerHandle>(null);
  return <Sheet title="학습 중 카드 수정" onClose={onClose}>
    <CardComposer ref={editor} card={value} onChange={setValue} />
    <Button title="수정 저장" busy={busy} onPress={() => {
      setBusy(true);
      void (async () => { if (!editor.current) throw new Error('편집기를 불러오는 중입니다.'); const next = await editor.current.flush(); await store.updateCard(card.id, next); onClose(); })().catch(showError).finally(() => setBusy(false));
    }} />
    <Button title="카드 삭제" tone="danger" disabled={busy} onPress={() => confirm('현재 카드를 삭제할까요?', '덱에서도 이 카드가 삭제됩니다.', async () => { await store.deleteCard(card.id); onClose(); })} />
  </Sheet>;
}
export function Study({ deckId, folderId, shuffle = folderId !== undefined, onExit }: { deckId?: string; folderId?: string; shuffle?: boolean; onExit: () => void }) {
  const { decks, cards, folders } = useStore();
  const deck = decks.find(d => d.id === deckId);
  const source = folderId !== undefined ? folders.find(f => f.id === folderId) : deck;
  const own = useMemo(() => folderId !== undefined ? folderCards(cards, decks, folderId) : orderedCards(cards, deckId ?? ''), [cards, decks, deckId, folderId]);
  const [session, setSession] = useState(() => startSession(own, shuffle, folderId === undefined && own.some(card => !card.learned)));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const ratingInFlight = useRef(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const [turning, setTurning] = useState(false);
  const flipInFlight = useRef(false);
  const animationVersion = useRef(0);
  const flipReady = useRef<() => void>(() => {});
  const frontScroll = useRef<ScrollView>(null);
  const backScroll = useRef<ScrollView>(null);
  const openImage = useImage();
  useEffect(() => { if (deckId !== undefined) void store.setPreferences({ lastStudiedDeckId: deckId }).catch(showError); }, [deckId]);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => { setSession(previous => reconcileSession(previous, own)); }, [own]);
  const current = own.find(c => c.id === session.ids[session.index]);
  const currentDeck = decks.find(d => d.id === current?.deckId);
  const learned = own.filter(c => c.learned).length;
  const swipe = useSwipeMotion({ cardId: current?.id, round: session.round, finished: session.finished, first: session.index === 0,
    disabled: busy || editing, reduceMotion,
    onNavigate: (delta, sourceId) => setSession(previous => previous.ids[previous.index] === sourceId ? stepSession(previous, delta) : previous),
    onFlipReady: () => flipReady.current(),
    onSwipeStart: () => {
      if (!flipInFlight.current) return;
      animationVersion.current++;
      rotation.stopAnimation();
      rotation.setValue(session.flipped ? 1 : 0);
      flipInFlight.current = false;
      setTurning(false);
    },
  });
  useLayoutEffect(() => { frontScroll.current?.scrollTo({ y: 0, animated: false }); backScroll.current?.scrollTo({ y: 0, animated: false }); }, [current?.id]);
  useLayoutEffect(() => {
    // A different card or an interrupted animation must never inherit a partial turn.
    animationVersion.current++;
    rotation.stopAnimation();
    rotation.setValue(session.flipped ? 1 : 0);
    flipInFlight.current = false;
    setTurning(false);
    return () => { animationVersion.current++; rotation.stopAnimation(); };
  }, [current?.id, session.round, session.finished, reduceMotion]);
  useLayoutEffect(() => {
    if (!flipInFlight.current) rotation.setValue(session.flipped ? 1 : 0);
  }, [session.flipped]);
  const flip = () => {
    if (busy || editing || flipInFlight.current || !swipe.prepareFlip()) return;
    if (reduceMotion) { setSession(previous => ({ ...previous, flipped: !previous.flipped })); return; }
    const version = ++animationVersion.current;
    flipInFlight.current = true;
    setTurning(true);
    setSession(previous => ({ ...previous, flipped: !previous.flipped }));
    Animated.timing(rotation, { toValue: session.flipped ? 0 : 1, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      if (version !== animationVersion.current) return;
      flipInFlight.current = false;
      setTurning(false);
    });
  };
  flipReady.current = flip;
  if (!source) return <View style={s.page}><Empty title={folderId !== undefined ? '폴더를 찾을 수 없어요' : '덱을 찾을 수 없어요'} /><Button title="학습 나가기" onPress={onExit} /></View>;
  if (!own.length) return <View style={s.page}><Empty title="학습할 카드가 없어요" detail={`'${source.title}' ${folderId !== undefined ? '폴더 안의 덱에' : '덱에'} 카드를 추가해 주세요.`} /><Button title={folderId !== undefined ? '폴더로 돌아가기' : '덱으로 돌아가기'} onPress={onExit} /></View>;
  const restart = (unlearned: boolean) => {
    const latest = store.getState();
    const target = folderId !== undefined ? folderCards(latest.cards, latest.decks, folderId) : orderedCards(latest.cards, deckId ?? '');
    setSession(startSession(target, shuffle, unlearned, unlearned ? session.round + 1 : 1));
  };
  if (session.finished || !current) return <ScrollView contentContainerStyle={[s.page, { paddingTop: 44, gap: 24 }]}>
    <View style={{ alignItems: 'center', gap: 20 }}><View style={study.celebration}><Icon name="check" size={42} color={colors.primary} /></View><Text style={s.label}>{source.title} · {session.round}회차</Text><Text style={[s.title, { textAlign: 'center' }]}>{learned === own.length && own.length ? '모두 기억했어요!' : '오늘도 한 걸음 나아갔어요'}</Text><Text style={[s.muted, { textAlign: 'center' }]}>반복할수록 더 오래 기억할 수 있어요.{'\n'}지금까지 쌓은 배움을 확인해 보세요.</Text></View>
    <View style={[s.box, { alignItems: 'center', gap: 20, paddingVertical: 28 }]}><ProgressRing percent={own.length ? Math.round(learned / own.length * 100) : 0} /><Text style={s.label}>세트 학습 현황 · 전체 {own.length}장</Text><View style={[s.row, { width: '100%', justifyContent: 'space-around' }]}><View style={{ alignItems: 'center', gap: 6 }}><Text style={[s.title, { color: colors.success }]}>{learned}</Text><Text style={s.muted}>기억했어요</Text></View><View style={{ width: 1, height: 42, backgroundColor: colors.border }} /><View style={{ alignItems: 'center', gap: 6 }}><Text style={[s.title, { color: '#BA7549' }]}>{own.length - learned}</Text><Text style={s.muted}>다시 볼 카드</Text></View></View></View>
    <Button title="미학습 카드 다시 학습" disabled={learned === own.length} onPress={() => restart(true)} />
    <Button title="전체 카드 다시 학습" tone="secondary" disabled={!own.length} onPress={() => restart(false)} />
    {Boolean(current) && <Button title="현재 카드로 돌아가기" tone="secondary" onPress={() => setSession(previous => ({ ...previous, finished: false }))} />}
    <Button title={folderId !== undefined ? '폴더로 돌아가기' : '덱으로 돌아가기'} tone="secondary" onPress={onExit} />
  </ScrollView>;
  const last = session.index === session.ids.length - 1;
  const rate = (known: boolean) => {
    if (ratingInFlight.current || busy || editing || turning || swipe.transitioning) return;
    const id = current.id;
    ratingInFlight.current = true;
    setBusy(true);
    void store.setLearned(id, known).then(() => {
      setSession(previous => previous.ids[previous.index] === id ? stepSession(previous, 1) : previous);
    }).catch(showError).finally(() => { ratingInFlight.current = false; setBusy(false); });
  };
  const renderFace = (back: boolean) => {
    const image = back ? current.backImageUrl || current.imageUrl : current.frontImageUrl;
    const visible = session.flipped === back;
    return <Animated.View key={String(back)} pointerEvents={visible ? 'auto' : 'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[study.card, study.faceLayer, { borderColor: back ? '#C9C3FF' : colors.border, transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [0, 1], outputRange: back ? ['180deg', '360deg'] : ['0deg', '180deg'] }) }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="카드 뒤집기" accessibilityHint="왼쪽으로 밀면 다음 카드, 오른쪽으로 밀면 이전 카드"
        accessibilityActions={[{ name: 'increment', label: last ? '학습 결과 보기' : '다음 카드' }, { name: 'decrement', label: '이전 카드' }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'increment') swipe.navigate(1); if (event.nativeEvent.actionName === 'decrement') swipe.navigate(-1); }} onPress={flip} style={study.cardHeader}>
        <Text style={[study.face, back && { backgroundColor: colors.mint, color: colors.success }]}>{back ? '답변' : '질문'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="카드 내용 수정" disabled={busy} onPress={event => { event.stopPropagation(); setEditing(true); }} style={study.smallButton}><Icon name="pencil" size={17} color={colors.muted} /></Pressable>
      </Pressable>
      <Pressable onPress={flip} style={{ flex: 1 }} accessible={false}>
        <ScrollView ref={back ? backScroll : frontScroll} nestedScrollEnabled style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="카드 뒤집기" onPress={flip}><Attachment url={image} /><RichText html={back ? current.definitionRichText : current.termRichText} presentation={back ? 'study-back' : 'study-front'} onImage={openImage} onFlip={flip} onCardDrag={event => swipe.onDrag(event, current.id)} /></Pressable>
        </ScrollView>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="카드 뒤집기" onPress={flip} style={study.cardFooter}><Icon name="rotate" size={15} color={colors.muted} /><Text style={s.muted}>{back ? '터치하면 질문으로 돌아가요' : '터치해서 답변을 확인하세요'}</Text></Pressable>
    </Animated.View>;
  };
  return <><ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}><View style={study.bar}>
    <Pressable accessibilityRole="button" accessibilityLabel="학습 나가기" onPress={onExit} style={study.smallButton}><Icon name="close" size={22} color={colors.ink} /></Pressable>
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}><Text numberOfLines={1} style={[s.text, { fontWeight: '700' }]}>{source.title}</Text><Text style={s.label}>{shuffle ? '랜덤 학습' : '플래시카드'} · {session.round}회차</Text></View>
    <Text accessibilityLiveRegion="polite" style={study.badge}>카드 {session.index + 1}/{session.ids.length}</Text>
  </View>
  <View style={{ paddingHorizontal: 22, paddingTop: 8, gap: 10 }}><Progress learned={session.index} total={session.ids.length} compact /><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.label}>{session.flipped ? '얼마나 기억했는지 표시해 보세요' : '답을 보기 전에 먼저 떠올려 보세요'}</Text><Text style={[s.label, { color: colors.success }]}>기억한 카드 {learned}장</Text></View></View>
  <View style={study.page}>
    {folderId !== undefined && currentDeck && <Text numberOfLines={1} style={[s.label, { marginBottom: 10 }]}>현재 덱: {currentDeck.title}</Text>}
    <View style={{ flex: 1, minHeight: 180 }}>
      <View pointerEvents="none" style={[study.stack, { left: 18, right: 18, bottom: -10, backgroundColor: '#E8E6F5' }]} /><View pointerEvents="none" style={[study.stack, { left: 9, right: 9, bottom: -5, backgroundColor: '#F0EEFA' }]} />
      <View {...swipe.panHandlers} pointerEvents={busy ? 'none' : 'auto'} style={{ flex: 1 }} accessible={false}><Animated.View style={[{ flex: 1 }, swipe.style]} accessible={false}>{renderFace(false)}{renderFace(true)}</Animated.View></View>
    </View>
  </View>
  <View style={study.dock}>
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="이전 카드" disabled={session.index === 0 || busy || turning || swipe.transitioning} onPress={() => swipe.navigate(-1)} style={[study.navButton, { opacity: session.index === 0 ? 0.3 : 1 }]}><Icon name="back" size={20} color={colors.ink} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="카드 뒤집기" disabled={busy || turning || swipe.transitioning} onPress={flip} style={[s.row, { minHeight: 44, paddingHorizontal: 12 }]}><Icon name="rotate" size={18} /><Text style={[s.label, { color: colors.primary }]}>카드 뒤집기</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={last ? '학습 결과 보기' : '다음 카드'} disabled={busy || turning || swipe.transitioning} onPress={() => swipe.navigate(1)} style={study.navButton}><Icon name="arrow" size={20} color={colors.ink} /></Pressable>
    </View>
    <View style={[s.row, { flexWrap: 'nowrap', gap: 12 }]}><View style={{ flex: 1 }}><Button title="다시 볼게요" tone="secondary" disabled={busy || turning || swipe.transitioning} onPress={() => rate(false)} /></View><View style={{ flex: 1 }}><Button title="알아요" icon="check" iconPosition="end" disabled={busy || turning || swipe.transitioning} busy={busy} onPress={() => rate(true)} /></View></View>
    <Text style={[s.label, { textAlign: 'center', fontSize: 10 }]}>좌우로 밀어서 이동할 수도 있어요</Text>
  </View></ScrollView>{editing && <EditCard card={current} onClose={() => setEditing(false)} />}</>;
}
const study = StyleSheet.create({
  bar: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { borderRadius: 10, backgroundColor: colors.pale, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: '700', color: colors.primary, overflow: 'hidden' },
  page: { flex: 1, minHeight: 240, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24 },
  card: { height: '100%', backgroundColor: colors.card, borderWidth: 1, borderRadius: 26, padding: 18, boxShadow: '0px 8px 24px #24234708' },
  faceLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backfaceVisibility: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  face: { fontSize: 11, fontWeight: '700', color: colors.primary, backgroundColor: colors.pale, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 9, overflow: 'hidden' },
  smallButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cardFooter: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 42 },
  stack: { position: 'absolute', height: 100, borderRadius: 26 },
  dock: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 14, gap: 10 },
  navButton: { width: 46, height: 44, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  celebration: { width: 96, height: 96, borderRadius: 32, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
});
