import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, ScrollView, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { CardInput, Draft } from '../core/types';
import { hasContent, orderedCards, plainText } from '../core/content';
import { store, useStore } from '../platform/runtime';
import { Button, Empty, Field, attempt, s, showError } from './kit';
import { CardComposer, type ComposerHandle } from './CardComposer';
import { FolderPicker } from './FolderPicker';

const emptyCard = (): CardInput => ({ id: `temp-${randomUUID()}`, termRichText: '', definitionRichText: '' });
export function DeckEditor({ deckId, folderId, focusCardId, onClose, onSaved, guard }: {
  deckId?: string; folderId?: string; focusCardId?: string; onClose: () => void; onSaved: (id: string) => void;
  guard: React.MutableRefObject<(() => void) | null>;
}) {
  const state = useStore();
  const original = state.decks.find(d => d.id === deckId);
  const originalCards = orderedCards(state.cards, deckId || '');
  const fingerprint = JSON.stringify([original, originalCards]);
  const [baseline, setBaseline] = useState(fingerprint);
  const [draft, setDraft] = useState<Draft>(() => ({ title: original?.title || '', description: original?.description || '', folderId: original?.folderId || folderId || null,
    cards: originalCards.length ? originalCards : [emptyCard(), emptyCard()], savedAt: 0 }));
  const initial = useRef(JSON.stringify(draft));
  const [selected, setSelected] = useState(() => Math.max(0, draft.cards.findIndex(c => c.id === focusCardId)));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [restore, setRestore] = useState<Draft | null>(null);
  const composer = useRef<ComposerHandle>(null);
  const key = useRef(store.draftKey(deckId, folderId)).current;
  const latest = useRef(draft); latest.current = draft;
  const skip = useRef(false);
  const loaded = useRef(false);
  const dirty = initial.current !== JSON.stringify({ ...draft, savedAt: 0 });
  const external = Boolean(deckId && fingerprint !== baseline);
  const change = (update: Partial<Draft>) => setDraft(previous => { const next = { ...previous, ...update }; latest.current = next; return next; });
  const meaningful = (value: Draft) => value.title.trim() || value.description.trim() || value.cards.some(hasContent);
  const write = async () => {
    if (skip.current || !loaded.current || !meaningful(latest.current)) return;
    const value = { ...latest.current, savedAt: Date.now() };
    await store.writeDraft(key, value); setSavedAt(value.savedAt); setDraftError(null);
  };
  useEffect(() => {
    let active = true;
    void store.readDraft(key).then(value => {
      if (!active) return;
      if (value && Array.isArray(value.cards) && value.cards.length && meaningful(value) && JSON.stringify({ ...value, savedAt: 0 }) !== initial.current) setRestore(value);
      else { loaded.current = true; setReady(true); }
    }).catch(error => { if (active) setDraftError(`임시 저장본을 읽지 못했습니다. ${String(error)}`); });
    return () => { active = false; };
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { void write().catch(() => setDraftError('임시 저장에 실패했습니다. 저장 공간을 확인해 주세요.')); }, 1000);
    return () => clearTimeout(timer);
  }, [draft, ready]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => { if (status !== 'active') void write().catch(() => {}); });
    return () => { subscription.remove(); if (!skip.current && loaded.current && meaningful(latest.current)) void store.writeDraft(key, { ...latest.current, savedAt: Date.now() }).catch(showError); };
  }, [key]);
  const flush = async () => {
    if (!composer.current) throw new Error('편집기를 불러오는 중입니다.');
    const card = await composer.current.flush();
    const cards = [...latest.current.cards]; cards[selected] = card;
    const next = { ...latest.current, cards }; latest.current = next; setDraft(next); return next;
  };
  const leave = () => {
    if (busy) return;
    if (!dirty) { onClose(); return; }
    Alert.alert('편집을 마칠까요?', '작성 중인 내용을 임시 저장하거나 버릴 수 있습니다.', [
      { text: '계속 편집', style: 'cancel' },
      { text: '변경 버리기', style: 'destructive', onPress: () => { void attempt(async () => { skip.current = true; try { await store.removeDraft(key); onClose(); } catch (error) { skip.current = false; throw error; } }); } },
      { text: '임시 저장 후 나가기', onPress: () => { void attempt(async () => { await flush(); await write(); onClose(); }); } },
    ]);
  };
  useEffect(() => { guard.current = leave; return () => { guard.current = null; }; });
  const transform = async (action: (cards: CardInput[]) => { cards: CardInput[]; selected: number }) => {
    setBusy(true);
    try { const value = await flush(); const next = action(value.cards); change({ cards: next.cards }); setSelected(next.selected); }
    catch (error) { showError(error); } finally { setBusy(false); }
  };
  const save = async () => {
    if (external) { Alert.alert('원본이 변경되었습니다', '최신 원본을 다시 불러오거나 아래의 변경 덮어쓰기 버튼으로 저장해 주세요.'); return; }
    await saveConfirmed();
  };
  const saveConfirmed = async () => {
    setBusy(true);
    try {
      const value = await flush();
      const id = await store.saveDeck(deckId, { title: value.title, description: value.description, folderId: value.folderId }, value.cards);
      skip.current = true;
      try { await store.removeDraft(key); } catch { /* Saved data is already durable. A stale draft can be discarded next time. */ }
      onSaved(id);
    } catch (error) { showError(error); } finally { setBusy(false); }
  };
  if (deckId && !original) return <View style={s.page}><Empty title="덱이 삭제되었습니다" detail="작성하던 내용은 이 계정의 임시 저장본으로 유지됩니다." /><Button title="돌아가기" onPress={onClose} /></View>;
  if (restore) return <View style={s.page}><Text style={s.title}>작성 중이던 덱이 있어요</Text><Text style={s.text}>{new Date(restore.savedAt).toLocaleString('ko-KR')}에 저장된 내용을 복원할까요?</Text>
    <Button title="임시 저장본 복원" onPress={() => { change(restore); setSelected(0); setSavedAt(restore.savedAt); setRestore(null); loaded.current = true; setReady(true); }} />
    <Button title="임시 저장본 버리기" tone="danger" onPress={() => { void attempt(async () => { await store.removeDraft(key); setRestore(null); loaded.current = true; setReady(true); }); }} />
  </View>;
  if (!ready) return <View style={s.page}><Text style={s.muted}>{draftError || '임시 저장본을 확인하고 있어요…'}</Text>{draftError && <Button title="임시 저장 확인 다시 시도" onPress={() => { void store.readDraft(key).then(value => { if (value) setRestore(value); else { loaded.current = true; setReady(true); } }).catch(showError); }} />}</View>;
  const card = draft.cards[selected];
  return <><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
    <Text style={s.title}>{deckId ? '덱 편집' : '새로운 카드 덱'}</Text>
    <Text accessibilityLiveRegion="polite" style={draftError ? s.error : s.muted}>{draftError || (savedAt ? `기기에 임시 저장됨 · ${new Date(savedAt).toLocaleTimeString('ko-KR')}` : '작성 내용은 기기에 자동으로 임시 저장됩니다.')}</Text>
    {external && <View style={s.box}><Text style={s.error}>다른 화면이나 기기에서 원본이 변경되었습니다.</Text>
      <Button title="최신 원본 다시 불러오기" tone="secondary" onPress={() => Alert.alert('원본을 불러올까요?', '현재 편집 내용을 최신 원본으로 교체합니다.', [{ text: '취소', style: 'cancel' }, { text: '불러오기', onPress: () => { change({ title: original?.title || '', description: original?.description || '', folderId: original?.folderId || null, cards: originalCards.length ? originalCards : [emptyCard()], savedAt: 0 }); setSelected(0); setBaseline(fingerprint); } }])} />
      <Button title="변경 덮어쓰기" tone="danger" busy={busy} onPress={() => Alert.alert('내 편집 내용으로 덮어쓸까요?', '다른 기기의 카드 변경 내용을 대체할 수 있습니다.', [{ text: '취소', style: 'cancel' }, { text: '저장', onPress: () => { void saveConfirmed(); } }])} />
    </View>}
    <Field label="덱 제목" value={draft.title} onChangeText={title => change({ title })} maxLength={200} />
    <Field label="설명" value={draft.description} onChangeText={description => change({ description })} multiline />
    <Button title={`폴더 · ${state.folders.find(f => f.id === draft.folderId)?.title || '미분류'}`} tone="secondary" onPress={() => setPicker(true)} />
    <Text style={s.h2}>카드 목차 · {draft.cards.length}장</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 8 }}>{draft.cards.map((c, index) => <Button key={c.id} title={`${index + 1}. ${plainText(c.termRichText).slice(0, 12) || '새 카드'}`} tone={index === selected ? 'primary' : 'secondary'} disabled={busy} onPress={() => { void transform(cards => ({ cards, selected: index })); }} />)}</ScrollView>
    {card && <View style={s.box}><Text style={s.h2}>카드 {selected + 1}</Text><CardComposer ref={composer} key={card.id} card={card} onChange={next => { const cards = [...latest.current.cards]; cards[selected] = next; change({ cards }); }} />
      <View style={s.row}><Button title="↑ 위로" tone="secondary" disabled={busy || selected === 0} onPress={() => { void transform(cards => { const copy = [...cards]; [copy[selected - 1], copy[selected]] = [copy[selected], copy[selected - 1]]; return { cards: copy, selected: selected - 1 }; }); }} />
        <Button title="↓ 아래로" tone="secondary" disabled={busy || selected === draft.cards.length - 1} onPress={() => { void transform(cards => { const copy = [...cards]; [copy[selected + 1], copy[selected]] = [copy[selected], copy[selected + 1]]; return { cards: copy, selected: selected + 1 }; }); }} />
        <Button title="복제" tone="secondary" disabled={busy} onPress={() => { void transform(cards => { const copy = [...cards]; copy.splice(selected + 1, 0, { ...copy[selected], id: `temp-${randomUUID()}`, learned: false }); return { cards: copy, selected: selected + 1 }; }); }} />
        <Button title="이 뒤에 삽입" tone="secondary" disabled={busy} onPress={() => { void transform(cards => { const copy = [...cards]; copy.splice(selected + 1, 0, emptyCard()); return { cards: copy, selected: selected + 1 }; }); }} />
        <Button title="카드 삭제" tone="danger" disabled={busy || draft.cards.length <= 1} onPress={() => Alert.alert('카드를 삭제할까요?', '덱을 저장하면 이 카드가 삭제됩니다.', [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: () => { void transform(cards => ({ cards: cards.filter((_, i) => i !== selected), selected: Math.max(0, selected - 1) })); } }])} />
      </View></View>}
    <Button title="＋ 카드 추가" tone="secondary" disabled={busy} onPress={() => { void transform(cards => ({ cards: [...cards, emptyCard()], selected: cards.length })); }} />
    <Text style={s.muted}>앞뒤가 모두 비어 있는 카드는 저장 시 제외됩니다. 이미지가 있는 카드는 유지됩니다.</Text>
    <View style={s.row}><Button title="편집 마치기" tone="secondary" disabled={busy} onPress={leave} /><Button title="덱 저장" busy={busy} onPress={() => { void save(); }} /></View>
  </ScrollView>{picker && <FolderPicker value={draft.folderId} onClose={() => setPicker(false)} onSelect={value => { change({ folderId: value }); setPicker(false); }} />}</>;
}
