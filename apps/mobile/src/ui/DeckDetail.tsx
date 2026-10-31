import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { cardMatches, orderedCards } from '../core/content';
import { RichText } from '../editor/RichText';
import { store, useStore } from '../platform/runtime';
import { Attachment, Button, Chips, Empty, Field, Progress, Sheet, attempt, colors, confirm, s, useImage } from './kit';
import { Icon } from './Icon';
import { FolderPicker } from './FolderPicker';
import { deckAccent } from './Library';
import type { Navigation } from './navigation';

export function DeckDetail({ deckId, nav }: { deckId: string; nav: Navigation }) {
  const { decks, folders, cards } = useStore();
  const deck = decks.find(d => d.id === deckId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'learned' | 'unlearned'>('all');
  const [moving, setMoving] = useState(false);
  const [actions, setActions] = useState(false);
  const [mode, setMode] = useState<'ordered' | 'shuffle'>('ordered');
  const openImage = useImage();
  const own = orderedCards(cards, deckId);
  const learned = own.filter(c => c.learned).length;
  const visible = own.filter(c => (filter === 'all' || c.learned === (filter === 'learned')) && cardMatches(c, query));
  if (!deck) return <View style={s.page}><Empty title="덱을 찾을 수 없어요" detail="다른 기기에서 삭제되었을 수 있습니다." /><Button title="돌아가기" onPress={nav.back} /></View>;
  const folder = folders.find(f => f.id === deck.folderId);
  const accent = deckAccent(deck.title);
  return <><FlatList data={visible} keyExtractor={c => c.id} contentContainerStyle={s.page} windowSize={3} initialNumToRender={3} maxToRenderPerBatch={3} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
    ListHeaderComponent={<View style={{ gap: 22 }}>
      <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}><Pressable accessibilityRole="button" accessibilityLabel={folder ? `${folder.title} 폴더로 이동` : '미분류 학습 세트'} onPress={() => folder && nav.go({ type: 'folder', folderId: folder.id })} style={[s.row, { minHeight: 44, flexShrink: 1 }]}><Icon name="folder" size={16} color={colors.muted} /><Text numberOfLines={1} style={[s.label, { flexShrink: 1 }]}>{folder?.title || '미분류'}</Text><Icon name="chevron" size={14} color={colors.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="학습 세트 관리" onPress={() => setActions(true)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="more" color={colors.ink} /></Pressable></View>
      <View style={{ gap: 14 }}><View style={{ width: 64, height: 68, borderRadius: 20, backgroundColor: accent.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="layers" color={accent.ink} size={32} /></View><Text style={s.title}>{deck.title}</Text>{Boolean(deck.description) && <Text style={s.muted}>{deck.description}</Text>}<Text style={s.label}>{own.length}장의 카드 · {new Date(deck.updatedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 수정</Text></View>
      <View style={[s.box, { gap: 14 }]}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={[s.text, { fontWeight: '700' }]}>차곡차곡, 나의 학습</Text><Text style={[s.h2, { color: colors.primary }]}>{own.length ? Math.round(learned / own.length * 100) : 0}%</Text></View><Progress learned={learned} total={own.length} compact /><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={[s.label, { color: colors.success }]}>기억했어요 {learned}장</Text><Text style={s.label}>더 배울 카드 {own.length - learned}장</Text></View></View>
      <View style={{ gap: 12 }}><Text style={s.h2}>어떻게 학습할까요?</Text><View style={[s.row, { flexWrap: 'nowrap', gap: 12 }]}>{([['ordered', 'layers', '플래시카드', '차례대로 떠올리기'], ['shuffle', 'shuffle', '랜덤 학습', '순서를 섞어 복습하기']] as const).map(([key, icon, title, detail]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: mode === key }} onPress={() => setMode(key)} style={{ flex: 1, minHeight: 138, borderRadius: 20, borderWidth: 1.5, borderColor: mode === key ? colors.primary : colors.border, backgroundColor: mode === key ? colors.pale : colors.card, padding: 16, gap: 9 }}><View style={[s.row, { justifyContent: 'space-between' }]}><Icon name={icon} color={mode === key ? colors.primary : colors.muted} size={24} /><View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: mode === key ? 5 : 1.5, borderColor: mode === key ? colors.primary : colors.border }} /></View><Text style={[s.text, { fontWeight: '700', color: mode === key ? colors.primary : colors.ink }]}>{title}</Text><Text style={[s.muted, { fontSize: 11 }]}>{detail}</Text></Pressable>)}</View></View>
      <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.h2}>카드 둘러보기</Text><Pressable accessibilityRole="button" onPress={() => nav.go({ type: 'edit-deck', deckId })} style={[s.row, { minHeight: 44 }]}><Icon name="pencil" size={16} /><Text style={[s.label, { color: colors.primary }]}>편집</Text></Pressable></View>
      <Field label="카드 내용 검색" placeholder="찾고 싶은 카드가 있나요?" value={query} onChangeText={setQuery} />
      <Chips value={filter} options={[[ 'all', `전체 ${own.length}` ], ['unlearned', '학습 중'], ['learned', '기억했어요']]} onChange={setFilter} /><Text style={[s.label, { marginBottom: 6 }]}>{visible.length}장의 카드</Text>
    </View>}
    ListEmptyComponent={<View style={{ gap: 12 }}><Empty title={own.length ? '조건에 맞는 카드가 없어요' : '첫 카드를 채워보세요'} detail={own.length ? '검색어나 학습 상태를 변경해 보세요.' : '질문과 답을 입력하면 학습을 시작할 수 있어요.'} />{!own.length && <Button title="카드 추가하기" onPress={() => nav.go({ type: 'edit-deck', deckId })} />}</View>}
    renderItem={({ item }) => <View style={[s.box, { marginBottom: 14, padding: 18, gap: 14 }]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.label}>{String(own.findIndex(c => c.id === item.id) + 1).padStart(2, '0')}</Text><Pressable accessibilityRole="button" accessibilityLabel="카드 수정" onPress={() => nav.go({ type: 'edit-deck', deckId, focusCardId: item.id })} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="pencil" size={16} color={colors.muted} /></Pressable></View>
      <View style={{ gap: 6 }}><Text style={[s.label, { color: colors.primary }]}>질문</Text><RichText html={item.termRichText} onImage={openImage} /><Attachment url={item.frontImageUrl} /></View>
      <View style={{ height: 1, backgroundColor: colors.border }} /><View style={{ gap: 6 }}><Text style={s.label}>답변</Text><RichText html={item.definitionRichText} onImage={openImage} /><Attachment url={item.backImageUrl || item.imageUrl} /></View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.learned }} onPress={() => { void attempt(() => store.setLearned(item.id, !item.learned)); }} style={[s.row, { minHeight: 44, alignSelf: 'flex-start', gap: 8 }]}><View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: item.learned ? colors.success : colors.border, backgroundColor: item.learned ? colors.mint : colors.card, justifyContent: 'center', alignItems: 'center' }}>{item.learned && <Icon name="check" size={13} color={colors.success} />}</View><Text style={[s.label, { color: item.learned ? colors.success : colors.muted }]}>{item.learned ? '기억했어요' : '기억한 카드로 표시'}</Text></Pressable>
    </View>} />
    <View style={s.dock}><Button title={own.length && learned === own.length ? '전체 카드 복습하기' : '학습 시작하기'} disabled={!own.length} onPress={() => nav.go({ type: 'study', deckId, shuffle: mode === 'shuffle' })} /></View>
    {moving && <FolderPicker value={deck.folderId || null} onClose={() => setMoving(false)} onSelect={folderId => { void attempt(async () => { await store.moveDeck(deckId, folderId); setMoving(false); }); }} />}
    {actions && <Sheet title="학습 세트 관리" onClose={() => setActions(false)}><Text style={s.h2}>{deck.title}</Text><Button title="세트 편집" tone="secondary" onPress={() => { setActions(false); nav.go({ type: 'edit-deck', deckId }); }} /><Button title="폴더 이동" tone="secondary" onPress={() => { setActions(false); setMoving(true); }} /><Button title="진행도 초기화" tone="secondary" onPress={() => confirm('학습 진행도를 초기화할까요?', '모든 카드를 미학습 상태로 변경합니다.', async () => { await store.resetProgress(deckId); setActions(false); })} /><Button title="세트 삭제" tone="danger" onPress={() => confirm('학습 세트를 삭제할까요?', '세트와 모든 카드가 삭제됩니다.', async () => { await store.deleteDeck(deckId); setActions(false); nav.back(); })} /></Sheet>}
  </>;
}
