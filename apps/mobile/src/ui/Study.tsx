import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Card, CardInput } from '../core/types';
import { folderCards, orderedCards } from '../core/content';
import { reconcileSession, startSession, stepSession } from '../core/study';
import { RichText } from '../editor/RichText';
import { store, useStore } from '../platform/runtime';
import { Attachment, Button, Empty, Progress, Sheet, colors, confirm, s, showError, useImage } from './kit';
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
  const [session, setSession] = useState(() => startSession(own, shuffle, folderId === undefined));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
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
    disabled: busy || editing || turning, reduceMotion,
    onNavigate: (delta, sourceId) => setSession(previous => previous.ids[previous.index] === sourceId ? stepSession(previous, delta) : previous),
    onFlipReady: () => flipReady.current(),
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
  if (session.finished || !current) return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.label}>{source.title} · {session.round}회차</Text><Text style={s.title}>{learned === own.length && own.length ? '모두 익혔어요!' : '이번 학습을 마쳤어요'}</Text>
    <View style={s.box}><Text style={s.text}>전체 {own.length}장 · 익힌 카드 {learned}장 · 남은 카드 {own.length - learned}장</Text><Progress learned={learned} total={own.length} /></View>
    <Button title="미학습 카드 다시 학습" disabled={learned === own.length} onPress={() => restart(true)} />
    <Button title="전체 카드 다시 학습" tone="secondary" disabled={!own.length} onPress={() => restart(false)} />
    {Boolean(current) && <Button title="현재 카드로 돌아가기" tone="secondary" onPress={() => setSession(previous => ({ ...previous, finished: false }))} />}
    <Button title={folderId !== undefined ? '폴더로 돌아가기' : '덱으로 돌아가기'} tone="secondary" onPress={onExit} />
  </ScrollView>;
  const percentage = own.length ? Math.round(learned / own.length * 100) : 0;
  const last = session.index === session.ids.length - 1;
  const renderFace = (back: boolean) => {
    const image = back ? current.backImageUrl || current.imageUrl : current.frontImageUrl;
    const visible = session.flipped === back;
    return <Animated.View key={String(back)} pointerEvents={visible ? 'auto' : 'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[study.card, study.faceLayer, { borderColor: back ? '#26695766' : colors.border, transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [0, 1], outputRange: back ? ['180deg', '360deg'] : ['0deg', '180deg'] }) }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="카드 뒤집기" accessibilityHint="왼쪽으로 밀면 다음 카드, 오른쪽으로 밀면 이전 카드"
        accessibilityActions={[{ name: 'increment', label: last ? '학습 결과 보기' : '다음 카드' }, { name: 'decrement', label: '이전 카드' }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'increment') swipe.navigate(1); if (event.nativeEvent.actionName === 'decrement') swipe.navigate(-1); }} onPress={flip} style={study.cardHeader}>
        <Text style={[study.face, back && { backgroundColor: '#FFFBEB', color: '#B45309' }]}>{back ? '뒷면 · 정의 / 해설' : '앞면 · 개념 / 질문'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="카드 내용 수정" disabled={busy} onPress={() => setEditing(true)} style={study.smallButton}><Icon name="pencil" size={14} color={colors.muted} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="카드 삭제" disabled={busy} onPress={() => confirm('현재 카드를 삭제할까요?', '덱에서도 이 카드가 삭제됩니다.', async () => { await store.deleteCard(current.id); })} style={study.smallButton}><Icon name="trash" size={14} color={colors.muted} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={back ? '앞면 보기' : '뒤집기'} onPress={flip} style={[study.smallButton, { flexDirection: 'row', gap: 4, width: undefined, paddingHorizontal: 4 }]}><Icon name="rotate" size={14} color={colors.muted} /><Text style={s.muted}>{back ? '앞면 보기' : '뒤집기'}</Text></Pressable>
        </View>
      </Pressable>
      <Pressable onPress={flip} style={{ flex: 1 }} accessible={false}>
        <ScrollView ref={back ? backScroll : frontScroll} nestedScrollEnabled style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="카드 뒤집기" onPress={flip}><Attachment url={image} /><RichText html={back ? current.definitionRichText : current.termRichText} presentation={back ? 'study-back' : 'study-front'} onImage={openImage} onFlip={flip} onCardDrag={event => swipe.onDrag(event, current.id)} /></Pressable>
        </ScrollView>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="카드 뒤집기" onPress={flip} style={study.cardFooter}><Text style={[s.muted, { color: colors.green }]}>{image ? '이미지 첨부됨' : ''}</Text><Text style={s.muted}>{back ? '다시 터치하여 앞면으로 뒤집기' : '터치하여 정답 확인'}</Text></Pressable>
    </Animated.View>;
  };
  return <><View style={study.bar}>
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="학습 나가기" onPress={onExit} style={study.smallButton}><Icon name="back" size={20} color={colors.muted} /></Pressable>
      <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', flexShrink: 1 }}>{source.title}</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {session.round > 1 && <Text style={[study.badge, { color: colors.green }]}>{session.round}R</Text>}
      {shuffle && <Text accessibilityLabel="랜덤 학습" style={study.badge}>⤨</Text>}
      <Text accessibilityLiveRegion="polite" style={study.badge}><Text style={{ color: colors.muted }}>카드 </Text>{session.index + 1}/{session.ids.length}</Text>
      <View style={[study.badge, { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}><Icon name="check" size={12} color="#047857" /><Text style={{ fontSize: 12, fontWeight: '600', color: '#047857' }}>{learned}/{own.length}</Text></View>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{percentage}%</Text>
    </View>
  </View>
  <ScrollView contentContainerStyle={study.page} keyboardShouldPersistTaps="handled">
    {folderId !== undefined && currentDeck && <Text numberOfLines={1} style={[s.muted, { marginBottom: 12 }]}>현재 덱: {currentDeck.title}</Text>}
    <View style={{ gap: 8, marginBottom: 20 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={[s.muted, { flex: 1, fontSize: 12 }]}>{session.flipped ? '정답을 확인하고, 기억했는지 표시해 보세요.' : '먼저 떠올려 보고, 카드를 뒤집어 보세요.'}</Text><Text style={s.muted}>{learned} / {own.length}장</Text></View><Progress learned={learned} total={own.length} compact /></View>
    <View {...swipe.panHandlers} pointerEvents={turning ? 'none' : 'auto'} style={{ height: 420 }} accessible={false}>
    <Animated.View style={[{ height: 420 }, swipe.style]} accessible={false}>
      {renderFace(false)}{renderFace(true)}
    </Animated.View>
    </View>
    <Text style={[s.muted, { textAlign: 'center', marginTop: 16 }]}>오른쪽으로 밀면 이전 · 왼쪽으로 밀면 {last ? '학습 결과' : '다음'}</Text>
    <View style={study.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={current.learned ? '알아요 완료됨, 다시 누르면 해제' : '알아요, 암기 완료로 표시'} accessibilityState={{ selected: current.learned, disabled: busy || swipe.transitioning }} disabled={busy || swipe.transitioning} onPress={() => { setBusy(true); void store.setLearned(current.id, !current.learned).catch(showError).finally(() => setBusy(false)); }} style={[study.control, { flex: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 10 }, current.learned && { borderColor: '#10B981', backgroundColor: '#10B981' }]}>
        <View style={[study.iconBox, current.learned && { backgroundColor: '#059669' }]}>{busy ? <ActivityIndicator size="small" color={colors.green} /> : <Icon name={current.learned ? 'check' : 'thumb'} size={16} color={current.learned ? '#FFFFFF' : colors.muted} />}</View>
        <View style={{ flexShrink: 1 }}><Text numberOfLines={1} style={[study.controlTitle, current.learned && { color: '#FFFFFF' }]}>{current.learned ? '알아요 (완료됨)' : '알아요'}</Text><Text numberOfLines={1} style={[s.muted, { fontSize: 12 }, current.learned && { color: '#FFFFFFCC' }]}>{current.learned ? '다시 누르면 해제' : '암기 완료로 표시'}</Text></View>
      </Pressable>
    </View>
  </ScrollView>{editing && <EditCard card={current} onClose={() => setEditing(false)} />}</>;
}

const study = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  badge: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, color: colors.ink },
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  card: { height: 420, backgroundColor: colors.card, borderWidth: 1, borderRadius: 16, padding: 20, boxShadow: '0px 1px 2px #0000000D' },
  faceLayer: { position: 'absolute', top: 0, left: 0, right: 0, backfaceVisibility: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  face: { fontSize: 12, color: colors.green, backgroundColor: colors.pale, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, flexShrink: 1, overflow: 'hidden' },
  smallButton: { minWidth: 32, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  cardFooter: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8, minHeight: 36 },
  controls: { marginTop: 24, flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  control: { minHeight: 82, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  controlTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  iconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F2F0ED', alignItems: 'center', justifyContent: 'center' },
});
