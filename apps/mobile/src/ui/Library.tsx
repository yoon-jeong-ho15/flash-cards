import React, { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import type { Deck, DeckSortOption } from '../core/types';
import { cardMatches, folderCards, matches, sortDecks } from '../core/content';
import { store, useStore } from '../platform/runtime';
import { Button, Chips, Empty, Field, Progress, ProgressRing, Select, attempt, colors, confirm, s } from './kit';
import { Icon, type IconName } from './Icon';
import { FolderForm } from './FolderForm';
import type { Navigation } from './navigation';

const sortOptions: Array<[DeckSortOption, string]> = [['date-desc', '최근 수정'], ['date-asc', '오래된 순'], ['name-asc', '이름 ↑'], ['name-desc', '이름 ↓']];
export function DeckTile({ deck, nav }: { deck: Deck; nav: Navigation }) {
  const { cards, folders } = useStore();
  const own = cards.filter(c => c.deckId === deck.id);
  const complete = own.length > 0 && own.every(c => c.learned);
  return <View style={s.box}><Pressable accessibilityRole="button" accessibilityLabel={`${deck.title} 덱 열기`} onPress={() => nav.go({ type: 'deck', deckId: deck.id })} style={{ gap: 12 }}>
    <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}><View style={{ padding: 10, borderRadius: 12, backgroundColor: colors.pale }}><Icon name="layers" /></View><View style={[s.row, { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, maxWidth: '70%' }]}><Icon name="folder" size={12} color={colors.muted} /><Text numberOfLines={1} style={[s.muted, { flexShrink: 1, fontSize: 11 }]}>{folders.find(f => f.id === deck.folderId)?.title || '미분류'}</Text></View></View>
    <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={[s.h2, { fontSize: 16, flex: 1 }]} numberOfLines={2}>{deck.title}</Text><Text style={s.muted}>↗</Text></View>
    <Text style={s.muted} numberOfLines={2}>{deck.description || `카드 ${own.length}장 · 나만의 속도로 차근차근 학습해요.`}</Text>
    </Pressable>
    <Progress learned={own.filter(c => c.learned).length} total={own.length} />
    <View style={[s.row, { justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 }]}><Text style={[s.muted, { fontSize: 11 }]}>{new Date(deck.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 수정</Text><Button title={complete ? '✓ 다시 복습' : '▷ 학습하기'} tone="secondary" disabled={!own.length} onPress={() => nav.go({ type: 'study', deckId: deck.id })} /></View>
  </View>;
}
export function Dashboard({ nav, onNewFolder }: { nav: Navigation; onNewFolder: () => void }) {
  const { cards, decks, folders, preferences, user } = useStore();
  const recent = sortDecks(decks, 'date-desc');
  const unfinished = recent.filter(d => cards.some(c => c.deckId === d.id && !c.learned));
  const featured = unfinished.find(d => d.id === preferences.lastStudiedDeckId) || unfinished[0];
  const learned = cards.filter(c => c.learned).length;
  const progress = cards.length ? Math.round(learned / cards.length * 100) : 0;
  const featuredCards = cards.filter(c => c.deckId === featured?.id);
  return <ScrollView contentContainerStyle={[s.page, { gap: 32 }]}><View style={{ gap: 8 }}><Text style={[s.label, { letterSpacing: 1.8 }]}>MY LEARNING SPACE</Text>
    <Text style={s.title}>{user?.displayName ? `${user.displayName}님, 오늘도 한 걸음.` : '오늘도, 기억에 남는 학습.'}</Text>
    <Text style={[s.muted, { fontSize: 14 }]}>작은 반복이 쌓여, 확실한 내 지식이 됩니다.</Text><Text style={[s.muted, { marginTop: 8 }]}>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</Text></View>
    <View style={[s.box, { backgroundColor: '#E8EEE5', borderColor: '#D3DFD5', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 28, gap: 16, overflow: 'hidden' }]}>
      <View pointerEvents="none" style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#F5EDCF', opacity: 0.45, right: -100, top: -130 }} />
      <View style={[s.row, { alignSelf: 'flex-start', backgroundColor: '#FFFFFF99', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#26695719' }]}><Icon name="sparkles" size={14} /><Text style={[s.label, { color: colors.green }]}>{featured ? featured.id === preferences.lastStudiedDeckId ? '이어서 학습하기' : '오늘의 학습' : cards.length ? '모든 카드 학습 완료' : '나만의 학습을 시작해요'}</Text></View>
      <Text style={s.title}>{featured?.title || (cards.length ? '차곡차곡 쌓은 지식, 멋져요.' : '배우고 싶은 것을\n오래 기억하는 방법.')}</Text>
      <Text style={[s.text, { color: '#516159' }]}>{featured ? `${featuredCards.length}장 중 ${featuredCards.filter(c => c.learned).length}장을 익혔어요. 남은 카드도 차근차근 학습해 보세요.` : cards.length ? '익힌 카드를 한 번 더 복습하고 기억을 단단하게 만들어 보세요.' : '질문과 답을 카드에 담아 보세요. 나에게 맞는 속도로 학습하고 복습할 수 있어요.'}</Text>
      <View style={{ alignSelf: 'flex-start', marginTop: 8 }}><Button title={featured ? '▷ 학습 이어가기  →' : cards.length ? '복습할 덱 둘러보기  →' : '＋ 첫 번째 덱 만들기  →'} onPress={() => nav.go(featured ? { type: 'study', deckId: featured.id } : cards.length ? { type: 'all-decks' } : { type: 'edit-deck' })} /></View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{([
      ['내 학습 덱', decks.length, '개', 'layers', colors.pale, colors.green], ['전체 카드', cards.length, '장', 'book', '#F5EDDB', '#947031'],
      ['익힌 카드', learned, '장', 'check', '#EAF1E3', '#618044'], ['전체 달성률', progress, '%', 'target', '#ECE9F4', '#7C6A9B'],
    ] as Array<[string, number, string, IconName, string, string]>).map(([label, value, unit, icon, bg, color]) => <View key={label} style={[s.box, { width: '47%', flexGrow: 1, padding: 16, gap: 12 }]}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.muted}>{label}</Text><View style={{ padding: 8, borderRadius: 8, backgroundColor: bg }}><Icon name={icon} color={color} size={16} /></View></View><Text style={[s.title, { fontWeight: '600' }]}>{value.toLocaleString()}<Text style={[s.muted, { fontSize: 14 }]}> {unit}</Text></Text></View>)}</View>
    <View style={{ gap: 16 }}><View style={[s.row, { justifyContent: 'space-between' }]}><View><Text style={s.h2}>내 학습 덱</Text><Text style={[s.muted, { marginTop: 4 }]}>최근 수정한 덱부터 모아봤어요.</Text></View><Pressable accessibilityRole="button" onPress={() => nav.go({ type: 'all-decks' })} style={{ padding: 10 }}><Text style={s.muted}>전체 보기  →</Text></Pressable></View>
    {!recent.length && <View style={[s.box, { borderStyle: 'dashed', paddingVertical: 32, gap: 24 }]}><Text style={[s.h2, { textAlign: 'center', fontSize: 16 }]}>첫 학습, 이렇게 시작해 보세요</Text>{[['01', '덱 만들기', '배우고 싶은 주제를 정해요.'], ['02', '카드 채우기', '질문과 답을 한 장에 담아요.'], ['03', '반복하며 기억하기', '카드를 뒤집으며 복습해요.']].map(([step, title, detail]) => <View key={step} style={{ gap: 6 }}><Text style={[s.label, { color: colors.green }]}>{step}</Text><Text style={s.text}>{title}</Text><Text style={s.muted}>{detail}</Text></View>)}<Button title="＋ 새 덱 만들기" tone="secondary" onPress={() => nav.go({ type: 'edit-deck' })} /></View>}{recent.slice(0, 4).map(d => <DeckTile key={d.id} deck={d} nav={nav} />)}</View>
    <View style={s.box}><Text style={[s.label, { letterSpacing: 1.8 }]}>LEARNING PROGRESS</Text><Text style={s.h2}>나의 학습 페이스</Text><View style={[s.row, { marginVertical: 8, gap: 16 }]}><ProgressRing percent={progress} /><View><Text style={s.text}>조금씩, 꾸준하게</Text><Text style={s.muted}>{learned}장의 카드를{'\n'}내 지식으로 만들었어요.</Text></View></View><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.muted}>진행 중인 덱</Text><Text style={s.label}>{unfinished.length}개</Text></View><Progress learned={learned} total={cards.length} compact /></View>
    <Pressable accessibilityRole="button" onPress={onNewFolder} style={[s.box, s.row, { gap: 12 }]}><View style={{ padding: 10, borderRadius: 12, backgroundColor: '#F5EDDB' }}><Icon name="folder" color="#947031" /></View><View style={{ flex: 1 }}><Text style={s.text}>주제별로 정리하기</Text><Text style={s.muted}>폴더로 덱을 모아보세요.</Text></View><Icon name="arrow" size={16} color={colors.muted} /></Pressable>
    <Text style={s.muted}>{user ? '로그인한 계정으로 학습 자료가 클라우드에 동기화됩니다.' : '게스트 학습 자료는 이 기기에 저장돼요. Google에 로그인하면 계정별로 학습할 수 있어요.'}</Text>
    <View style={[s.row, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 20, justifyContent: 'space-between' }]}><Text style={[s.muted, { fontSize: 11 }]}>매일 조금씩, 오래 기억하세요.</Text><Text style={s.label}>FlashCards</Text></View>
  </ScrollView>;
}
export function DeckLibrary({ nav, folderId }: { nav: Navigation; folderId?: string }) {
  const state = useStore();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [tab, setTab] = useState<'all' | 'root'>('all');
  const [filter, setFilter] = useState<'all' | 'unlearned' | 'completed'>('all');
  const [editFolder, setEditFolder] = useState(false);
  const folder = state.folders.find(f => f.id === folderId);
  const folderCardsCount = useMemo(() => folderId !== undefined
    ? folderCards(state.cards, state.decks, folderId).length : 0,
  [state.cards, state.decks, folderId]);
  const sort = (folderId ? state.preferences.folderDeckSort : state.preferences.deckSort) || 'date-desc';
  const decks = useMemo(() => sortDecks(state.decks.filter(d => {
    if (folderId && d.folderId !== folderId) return false;
    if (!folderId && tab === 'root' && d.folderId) return false;
    const cards = state.cards.filter(c => c.deckId === d.id);
    if (filter === 'unlearned' && !cards.some(c => !c.learned)) return false;
    if (filter === 'completed' && !(cards.length && cards.every(c => c.learned))) return false;
    return matches(`${d.title} ${d.description || ''}`, deferred) || cards.some(c => cardMatches(c, deferred));
  }), sort), [state.decks, state.cards, folderId, tab, filter, deferred, sort]);
  if (folderId && !folder) return <View style={s.page}><Empty title="폴더를 찾을 수 없어요" detail="다른 기기에서 삭제되었을 수 있습니다." /><Button title="돌아가기" onPress={nav.back} /></View>;
  return <><FlatList data={decks} keyExtractor={d => d.id} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"
    refreshing={state.status === 'syncing'} onRefresh={() => { void store.sync(); }}
    ListHeaderComponent={<View style={{ gap: 24 }}><View style={{ gap: 12 }}><Text style={s.title}>{folder?.title || '모든 덱'}</Text><Text style={s.muted}>{folder?.description || '전체 플래시카드 덱을 조회하고 학습을 시작하세요.'}</Text>
      <View style={s.row}><Button title="＋ 새 덱 만들기" onPress={() => nav.go({ type: 'edit-deck', folderId })} />{folder && <><Button title="폴더 수정" tone="secondary" onPress={() => setEditFolder(true)} />
        <Button title="폴더 삭제" tone="danger" onPress={() => confirm('폴더를 삭제할까요?', '안에 있는 덱은 미분류로 이동하며 카드는 유지됩니다.', async () => { await store.deleteFolder(folder.id); nav.back(); })} /></>}</View>
      {folder && <View style={[s.box, { padding: 16 }]}>
        <Text style={s.text}>폴더 전체 카드 {folderCardsCount}장</Text>
        <Button title="폴더 전체 랜덤 학습" disabled={!folderCardsCount} onPress={() => nav.go({ type: 'folder-study', folderId: folder.id })} />
        <Text style={s.muted}>{folderCardsCount
          ? `이 폴더의 모든 카드 ${folderCardsCount}장을 덱 구분 없이 섞어서 학습합니다. '알아요' 카드도 포함됩니다.`
          : '폴더 안의 덱에 카드를 추가하면 랜덤 학습을 시작할 수 있습니다.'}</Text>
      </View>}
      </View><View style={[s.box, { padding: 16, gap: 16 }]}><View style={s.row}><Icon name="book" size={16} /><Text style={s.text}>학습 덱</Text><Text style={{ color: colors.green, backgroundColor: colors.pale, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 12 }}>{decks.length}</Text></View>
      {!folderId && <Chips value={tab} options={[[ 'all', '전체' ], ['root', '미분류']]} onChange={setTab} />}
      <Field label="덱 제목·카드 내용 검색" placeholder="덱 제목, 카드 내용 검색…" value={query} onChangeText={setQuery} returnKeyType="search" />
      <View style={[s.row, { flexWrap: 'nowrap' }]}><Select label="학습 상태" value={filter} options={[[ 'all', '모든 학습 상태' ], ['unlearned', '학습할 카드 있음'], ['completed', '학습 완료']]} onChange={setFilter} />
      <Select label="정렬" value={sort} options={sortOptions} onChange={value => { void attempt(() => store.setPreferences(folderId ? { folderDeckSort: value } : { deckSort: value })); }} /></View>
      </View></View>}
    ListEmptyComponent={<><Empty title="표시할 덱이 없어요" detail="새 덱을 만들거나 검색 및 필터를 변경해 보세요." /><Button title="검색 및 필터 초기화" tone="secondary" onPress={() => { setQuery(''); setFilter('all'); setTab('all'); }} /></>}
    renderItem={({ item }) => <DeckTile deck={item} nav={nav} />} />
    {editFolder && <FolderForm id={folderId} onClose={() => setEditFolder(false)} onSaved={() => setEditFolder(false)} />}
  </>;
}
export function FolderLibrary({ nav, onNewFolder }: { nav: Navigation; onNewFolder: () => void }) {
  const { folders, decks, preferences } = useStore();
  const [query, setQuery] = useState('');
  const sort = preferences.folderSort || 'date-desc';
  const visible = sortDecks(folders.filter(f => matches(`${f.title} ${f.description || ''}`, query)), sort);
  return <FlatList contentContainerStyle={s.page} data={visible} keyExtractor={f => f.id} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<View style={{ gap: 24 }}><View style={{ gap: 12 }}><Text style={s.title}>모든 폴더</Text><Text style={s.muted}>주제별로 학습 덱을 모아 관리하세요.</Text><View style={s.row}><Button title="＋ 새 폴더 만들기" onPress={onNewFolder} /></View></View><View style={[s.box, { padding: 16 }]}><Text style={s.text}>내 폴더 · {visible.length}개</Text><Field label="폴더 이름·설명 검색" placeholder="폴더 검색…" value={query} onChangeText={setQuery} />
      <View style={s.row}><Select label="폴더 정렬" value={sort} options={sortOptions} onChange={value => { void attempt(() => store.setPreferences({ folderSort: value })); }} /></View></View></View>}
    ListEmptyComponent={<Empty title={query ? '검색 결과가 없어요' : '폴더를 만들어 보세요'} />}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 폴더 열기`} style={s.box} onPress={() => nav.go({ type: 'folder', folderId: item.id })}><View style={[s.row, { justifyContent: 'space-between' }]}><View style={{ padding: 12, borderRadius: 12, backgroundColor: '#F5EDDB' }}><Icon name="folder" color="#947031" /></View><Text style={s.muted}>↗</Text></View><Text style={[s.h2, { fontSize: 16 }]}>{item.title}</Text><Text style={s.muted}>{item.description || '관련된 학습 덱을 한곳에 모아보세요.'}</Text><View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 }}><Text style={s.label}>덱 {decks.filter(d => d.folderId === item.id).length}개</Text></View></Pressable>} />;
}
export function Search({ nav }: { nav: Navigation }) {
  const { decks, folders, cards } = useStore();
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query);
  const matchingDecks = sortDecks(decks.filter(d => matches(`${d.title} ${d.description || ''}`, q) || cards.some(c => c.deckId === d.id && cardMatches(c, q))), 'date-desc');
  const matchingFolders = q.trim() ? folders.filter(f => matches(`${f.title} ${f.description || ''}`, q)) : [];
  return <FlatList data={matchingDecks} keyExtractor={d => d.id} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<View style={{ gap: 16 }}><Text style={s.title}>학습 자료 검색</Text><Field label="덱·폴더·카드 내용 검색" value={query} onChangeText={setQuery} autoFocus returnKeyType="search" />
      <Button title="검색어 지우기" tone="secondary" onPress={() => setQuery('')} /><Text style={s.muted}>{q.trim() ? `덱 ${matchingDecks.length}개 · 폴더 ${matchingFolders.length}개 검색됨` : '최근 수정한 덱'}</Text>
      {matchingFolders.map(f => <Button key={f.id} title={`폴더 · ${f.title}`} tone="secondary" onPress={() => nav.go({ type: 'folder', folderId: f.id })} />)}</View>}
    ListEmptyComponent={!matchingFolders.length ? <Empty title="검색 결과가 없어요" detail="다른 단어나 짧은 검색어로 찾아보세요." /> : null}
    renderItem={({ item }) => <DeckTile deck={item} nav={nav} />} />;
}
