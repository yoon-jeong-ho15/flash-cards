import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { cardMatches, orderedCards } from '../core/content';
import { RichText } from '../editor/RichText';
import { store, useStore } from '../platform/runtime';
import { Attachment, Button, Chips, Empty, Field, Progress, Sheet, attempt, colors, confirm, s, useImage } from './kit';
import { Icon } from './Icon';
import { FolderPicker } from './FolderPicker';
import type { Navigation } from './navigation';

export function DeckDetail({ deckId, nav }: { deckId: string; nav: Navigation }) {
  const { decks, folders, cards } = useStore();
  const deck = decks.find(d => d.id === deckId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'learned' | 'unlearned'>('all');
  const [moving, setMoving] = useState(false);
  const [actions, setActions] = useState(false);
  const openImage = useImage();
  const own = orderedCards(cards, deckId);
  const visible = own.filter(c => (filter === 'all' || c.learned === (filter === 'learned')) && cardMatches(c, query));
  if (!deck) return <View style={s.page}><Empty title="덱을 찾을 수 없어요" detail="다른 기기에서 삭제되었을 수 있습니다." /><Button title="돌아가기" onPress={nav.back} /></View>;
  const folder = folders.find(f => f.id === deck.folderId);
  return <><FlatList data={visible} keyExtractor={c => c.id} contentContainerStyle={s.page} windowSize={3} initialNumToRender={3} maxToRenderPerBatch={3} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<View style={{ gap: 20 }}><View style={[s.row, { justifyContent: 'space-between' }]}><Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={nav.back} style={{ padding: 10 }}><Icon name="back" size={18} color={colors.muted} /></Pressable><Text style={[s.label, { flex: 1 }]}>{folder?.title || '미분류'}</Text><Button title="⋯ 더보기" tone="secondary" onPress={() => setActions(true)} /></View><Text style={s.title}>{deck.title}</Text>{Boolean(deck.description) && <Text style={s.muted}>{deck.description}</Text>}
      {folder && <Button title={`폴더로 이동 · ${folder.title}`} tone="secondary" onPress={() => nav.go({ type: 'folder', folderId: folder.id })} />}
      <Progress learned={own.filter(c => c.learned).length} total={own.length} />
      <View style={s.row}><Button title="▷ 학습 시작" disabled={!own.length} onPress={() => nav.go({ type: 'study', deckId })} /><Button title="셔플 학습" disabled={!own.length} tone="secondary" onPress={() => nav.go({ type: 'study', deckId, shuffle: true })} /></View>
      <Field label="카드 내용 검색" value={query} onChangeText={setQuery} />
      <Chips value={filter} options={[[ 'all', '전체' ], ['unlearned', '미학습'], ['learned', '학습 완료']]} onChange={setFilter} /><Text style={s.muted}>전체 {own.length}장 중 {visible.length}장 표시</Text>
    </View>}
    ListEmptyComponent={<Empty title="표시할 카드가 없어요" detail="검색어나 필터를 변경하거나 편집에서 카드를 추가해 보세요." />}
    renderItem={({ item }) => <View style={s.box}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.label}>카드 {own.findIndex(c => c.id === item.id) + 1} · {item.learned ? '학습 완료' : '미학습'}</Text><Button title="카드 수정" tone="secondary" onPress={() => nav.go({ type: 'edit-deck', deckId, focusCardId: item.id })} /></View>
      <Text style={s.label}>앞면</Text><RichText html={item.termRichText} onImage={openImage} /><Attachment url={item.frontImageUrl} />
      <Text style={s.label}>뒷면</Text><RichText html={item.definitionRichText} onImage={openImage} /><Attachment url={item.backImageUrl || item.imageUrl} />
      <Button title={item.learned ? '미학습으로 변경' : '알아요 표시'} tone="secondary" onPress={() => { void attempt(() => store.setLearned(item.id, !item.learned)); }} />
    </View>} />
    {moving && <FolderPicker value={deck.folderId || null} onClose={() => setMoving(false)} onSelect={folderId => { void attempt(async () => { await store.moveDeck(deckId, folderId); setMoving(false); }); }} />}
    {actions && <Sheet title="덱 관리" onClose={() => setActions(false)}><Text style={s.h2}>{deck.title}</Text><Button title="덱 편집" tone="secondary" onPress={() => { setActions(false); nav.go({ type: 'edit-deck', deckId }); }} /><Button title="폴더 이동" tone="secondary" onPress={() => { setActions(false); setMoving(true); }} /><Button title="진행도 초기화" tone="secondary" onPress={() => confirm('학습 진행도를 초기화할까요?', '모든 카드를 미학습 상태로 변경합니다.', async () => { await store.resetProgress(deckId); setActions(false); })} /><Button title="덱 삭제" tone="danger" onPress={() => confirm('덱을 삭제할까요?', '덱과 모든 카드가 삭제됩니다.', async () => { await store.deleteDeck(deckId); setActions(false); nav.back(); })} /></Sheet>}
  </>;
}
