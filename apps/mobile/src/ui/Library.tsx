import React, { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Deck, DeckSortOption } from '../core/types';
import { cardMatches, folderCards, matches, sortDecks } from '../core/content';
import { store, useStore } from '../platform/runtime';
import { Button, Chips, Empty, Field, Progress, Select, Sheet, attempt, colors, confirm, s } from './kit';
import { Icon } from './Icon';
import { FolderForm } from './FolderForm';
import type { Navigation } from './navigation';

const sortOptions: Array<[DeckSortOption, string]> = [['date-desc', '최근 수정순'], ['date-asc', '오래된 순'], ['name-asc', '이름 오름차순'], ['name-desc', '이름 내림차순']];
const accents = [{ bg: '#EEECFF', ink: '#6155E8' }, { bg: '#E6F5EF', ink: '#21856F' }, { bg: '#FFF0E7', ink: '#BA7549' }, { bg: '#E9F0FF', ink: '#4E79C9' }];
export const deckAccent = (title: string) => accents[Array.from(title).reduce((sum, c) => sum + c.charCodeAt(0), 0) % accents.length];

function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}><Text style={[s.h2, { flex: 1 }]}>{title}</Text>{onPress && <Pressable accessibilityRole="button" onPress={onPress} style={l.textAction}><Text style={[s.label, { color: colors.primary }]}>{action || '전체 보기'}</Text><Icon name="chevron" size={15} /></Pressable>}</View>;
}
export function DeckTile({ deck, nav }: { deck: Deck; nav: Navigation }) {
  const { cards, folders } = useStore();
  const own = cards.filter(c => c.deckId === deck.id);
  const learned = own.filter(c => c.learned).length;
  const accent = deckAccent(deck.title);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${deck.title} 덱 열기, 카드 ${own.length}장, ${learned}장 학습 완료`} onPress={() => nav.go({ type: 'deck', deckId: deck.id })}
    style={({ pressed }) => [s.box, { marginBottom: 12, gap: 16, opacity: pressed ? 0.75 : 1 }]}>
    <View style={[s.row, { flexWrap: 'nowrap', gap: 14 }]}><View style={[l.deckIcon, { backgroundColor: accent.bg }]}><Icon name="layers" size={24} color={accent.ink} /></View>
      <View style={{ flex: 1, gap: 4 }}><Text numberOfLines={2} style={[s.h2, { fontSize: 17, lineHeight: 24 }]}>{deck.title}</Text><Text numberOfLines={1} style={s.muted}>{own.length}장 · {folders.find(f => f.id === deck.folderId)?.title || '미분류'}</Text></View><Icon name="chevron" size={18} color={colors.muted} />
    </View>
    {Boolean(deck.description) && <Text numberOfLines={2} style={s.muted}>{deck.description}</Text>}
    <View style={[s.row, { flexWrap: 'nowrap', gap: 12 }]}><View style={{ flex: 1 }}><Progress learned={learned} total={own.length} compact /></View><Text style={[s.label, { color: learned === own.length && own.length ? colors.success : colors.muted }]}>{learned === own.length && own.length ? '학습 완료' : `${learned}/${own.length} 학습`}</Text></View>
  </Pressable>;
}
function CardArt() {
  return <View pointerEvents="none" accessible={false} style={{ height: 120, width: 115 }}>
    <View style={[l.artCard, { backgroundColor: '#BDB6FF', transform: [{ rotate: '-16deg' }], left: 2, top: 13 }]} />
    <View style={[l.artCard, { backgroundColor: '#DAD6FF', transform: [{ rotate: '9deg' }], left: 19, top: 7 }]} />
    <View style={[l.artCard, { backgroundColor: '#FFFFFF', transform: [{ rotate: '20deg' }], left: 28, top: 16, alignItems: 'center', justifyContent: 'center', gap: 10 }]}><View style={{ backgroundColor: colors.pale, padding: 9, borderRadius: 13 }}><Icon name="sparkles" size={24} /></View><View style={{ width: 40, height: 4, borderRadius: 3, backgroundColor: '#DFDCF6' }} /><View style={{ width: 28, height: 4, borderRadius: 3, backgroundColor: '#EEECFA' }} /></View>
  </View>;
}
export function Dashboard({ nav, onNewFolder }: { nav: Navigation; onNewFolder: () => void }) {
  const { cards, decks, folders, preferences, user } = useStore();
  const [creating, setCreating] = useState(false);
  const recent = sortDecks(decks, 'date-desc');
  const unfinished = recent.filter(d => cards.some(c => c.deckId === d.id && !c.learned));
  const featured = unfinished.find(d => d.id === preferences.lastStudiedDeckId) || unfinished[0] || recent.find(d => cards.some(c => c.deckId === d.id));
  const learned = cards.filter(c => c.learned).length;
  const featuredCards = cards.filter(c => c.deckId === featured?.id);
  const sample = () => {
    setCreating(true);
    void attempt(async () => {
      const id = await store.saveDeck(undefined, { title: '하루 6개, 여행 영어', description: '여행에서 바로 쓰는 표현으로 첫 학습을 시작해 보세요.' }, [
        ['Where is the nearest station?', '가장 가까운 역이 어디인가요?'], ['Could I see the menu, please?', '메뉴를 볼 수 있을까요?'],
        ['I would like to check in.', '체크인하고 싶어요.'], ['How much is this?', '이것은 얼마인가요?'], ['Can I pay by card?', '카드로 결제할 수 있나요?'], ['Thank you for your help.', '도와주셔서 감사합니다.'],
      ].map(([front, back]) => ({ termRichText: `<p>${front}</p>`, definitionRichText: `<p>${back}</p>` })));
      nav.go({ type: 'deck', deckId: id });
    }).finally(() => setCreating(false));
  };
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.page, { gap: 26 }]}>
    <View style={{ gap: 6 }}><Text style={s.muted}>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</Text><Text style={s.title}>{user?.displayName ? `${user.displayName}님,` : '반가워요,'}{'\n'}오늘도 하나씩 기억해요<Text style={{ color: colors.primary }}>.</Text></Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="내 학습 자료 검색" onPress={() => nav.go({ type: 'search' })} style={l.search}><Icon name="search" color={colors.muted} /><Text style={[s.muted, { flex: 1 }]}>어떤 내용을 공부할까요?</Text></Pressable>
    <View style={l.hero}>
      <View style={[s.row, { flexWrap: 'nowrap', alignItems: 'center', gap: 4 }]}><View style={{ flex: 1, gap: 12 }}><Text style={l.heroLabel}>{featured ? 'READY TO LEARN' : 'A LITTLE, EVERY DAY'}</Text><Text style={l.heroTitle}>{featured ? '오늘도 한 걸음' : '작은 카드 한 장,\n커다란 배움의 시작'}</Text><Text style={l.heroDetail}>{featured ? featuredCards.every(c => c.learned) ? '모든 카드를 익혔어요.' : `복습할 카드 ${featuredCards.filter(c => !c.learned).length}장` : '나만의 카드를 만들고\n가볍게 학습을 시작해요.'}</Text></View><CardArt /></View>
      {featured && <View style={{ backgroundColor: '#FFFFFF16', padding: 14, borderRadius: 15, gap: 8 }}><Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{featured.title}</Text><View style={{ height: 4, backgroundColor: '#FFFFFF30', borderRadius: 4 }}><View style={{ height: 4, borderRadius: 4, backgroundColor: '#C5F1C9', width: `${featuredCards.length ? featuredCards.filter(c => c.learned).length / featuredCards.length * 100 : 0}%` }} /></View></View>}
      <Pressable accessibilityRole="button" onPress={() => nav.go(featured ? { type: 'study', deckId: featured.id } : { type: 'edit-deck' })} style={({ pressed }) => [l.heroButton, { opacity: pressed ? 0.8 : 1 }]}><Icon name={featured ? 'play' : 'plus'} size={18} /><Text style={{ flex: 1, textAlign: 'center', color: colors.primary, fontSize: 15, fontWeight: '800' }}>{featured ? featuredCards.every(c => c.learned) ? '한 번 더 복습하기' : '학습 이어가기' : '첫 학습 세트 만들기'}</Text><Icon name="arrow" size={18} /></Pressable>
    </View>
    <View style={l.stats}>{[[decks.length, '학습 세트'], [cards.length, '전체 카드'], [learned, '기억한 카드']].map(([value, label], i) => <View key={label} style={[l.stat, i > 0 && { borderLeftWidth: 1, borderColor: colors.border }]}><Text style={[s.h2, { fontSize: 23, color: i === 2 ? colors.primary : colors.ink }]}>{value}</Text><Text style={s.label}>{label}</Text></View>)}</View>
    <View style={{ gap: 14 }}><Section title="최근 학습 세트" onPress={() => nav.go({ type: 'all-decks' })} />{recent.slice(0, 3).map(d => <DeckTile key={d.id} deck={d} nav={nav} />)}{!recent.length && <View style={[s.box, { gap: 16 }]}><View style={s.row}><View style={[l.deckIcon, { backgroundColor: colors.mint }]}><Icon name="book" color={colors.success} /></View><View style={{ flex: 1 }}><Text style={s.h2}>처음이라면 가볍게</Text><Text style={s.muted}>여행 영어 6장으로 사용법 익히기</Text></View></View><Button title="샘플 세트로 시작하기" tone="secondary" busy={creating} onPress={sample} /></View>}</View>
    <View style={{ gap: 14 }}><Section title="주제별로 모아두기" action="폴더 만들기" onPress={onNewFolder} />{folders.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{folders.slice(0, 6).map(folder => <Pressable key={folder.id} accessibilityRole="button" onPress={() => nav.go({ type: 'folder', folderId: folder.id })} style={[s.box, { width: 170, backgroundColor: colors.peach, borderWidth: 0 }]}><Icon name="folder" color="#BA7549" size={26} /><Text numberOfLines={1} style={[s.text, { fontWeight: '700' }]}>{folder.title}</Text><Text style={s.muted}>세트 {decks.filter(d => d.folderId === folder.id).length}개</Text></Pressable>)}</ScrollView> : <Pressable accessibilityRole="button" onPress={onNewFolder} style={[s.box, s.row, { gap: 14 }]}><Icon name="folder" size={26} color="#BA7549" /><View style={{ flex: 1 }}><Text style={[s.text, { fontWeight: '600' }]}>배우는 주제마다, 나만의 폴더</Text><Text style={s.muted}>관련된 세트를 한곳에 모아보세요.</Text></View><Icon name="chevron" size={18} color={colors.muted} /></Pressable>}</View>
    {!user && <Text style={[s.muted, { textAlign: 'center', fontSize: 12 }]}>지금은 이 기기에 저장돼요. 마이 페이지에서 계정을 연결해 보세요.</Text>}
  </ScrollView>;
}
export function DeckLibrary({ nav, folderId, onFolders }: { nav: Navigation; folderId?: string; onFolders?: () => void }) {
  const state = useStore();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [tab, setTab] = useState<'all' | 'root'>('all');
  const [filter, setFilter] = useState<'all' | 'unlearned' | 'completed'>('all');
  const [editFolder, setEditFolder] = useState(false);
  const [actions, setActions] = useState(false);
  const folder = state.folders.find(f => f.id === folderId);
  const folderCardsCount = useMemo(() => folderId !== undefined ? folderCards(state.cards, state.decks, folderId).length : 0, [state.cards, state.decks, folderId]);
  const sort = (folderId ? state.preferences.folderDeckSort : state.preferences.deckSort) || 'date-desc';
  const decks = useMemo(() => sortDecks(state.decks.filter(d => {
    if (folderId && d.folderId !== folderId) return false;
    if (!folderId && tab === 'root' && d.folderId) return false;
    const own = state.cards.filter(c => c.deckId === d.id);
    if (filter === 'unlearned' && !own.some(c => !c.learned)) return false;
    if (filter === 'completed' && !(own.length && own.every(c => c.learned))) return false;
    return matches(`${d.title} ${d.description || ''}`, deferred) || own.some(c => cardMatches(c, deferred));
  }), sort), [state.decks, state.cards, folderId, tab, filter, deferred, sort]);
  if (folderId && !folder) return <View style={s.page}><Empty title="폴더를 찾을 수 없어요" detail="다른 기기에서 삭제되었을 수 있습니다." /><Button title="돌아가기" onPress={nav.back} /></View>;
  return <><FlatList data={decks} keyExtractor={d => d.id} contentContainerStyle={s.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    refreshing={state.status === 'syncing'} onRefresh={() => { void store.sync(); }}
    ListHeaderComponent={<View style={{ gap: 20 }}>
      {folder ? <><View style={[s.row, { flexWrap: 'nowrap' }]}><View style={{ flex: 1, gap: 6 }}><View style={s.row}><Icon name="folder" color="#BA7549" /><Text style={s.label}>내 폴더</Text></View><Text style={s.title}>{folder.title}</Text>{Boolean(folder.description) && <Text style={s.muted}>{folder.description}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel="폴더 관리" onPress={() => setActions(true)} style={l.textAction}><Icon name="more" color={colors.ink} /></Pressable></View><View style={[s.box, { backgroundColor: colors.pale, borderWidth: 0 }]}><Text style={[s.text, { fontWeight: '700' }]}>폴더 전체 카드 {folderCardsCount}장</Text><Text style={s.muted}>세트를 넘나들며 모든 카드를 섞어 복습해요.</Text><Button title="폴더 전체 랜덤 학습" disabled={!folderCardsCount} onPress={() => nav.go({ type: 'folder-study', folderId: folder.id })} /></View></> : <><Text style={s.title}>나의 배움이 모이는 곳</Text><View style={l.libraryTabs}><Text style={l.selectedTab}>학습 세트</Text><Pressable accessibilityRole="button" accessibilityLabel="폴더 보기" onPress={onFolders || (() => nav.go({ type: 'all-folders' }))} style={l.textAction}><Text style={l.unselectedTab}>폴더</Text></Pressable></View></>}
      <Field label="세트·카드 검색" placeholder="제목이나 카드 내용으로 찾아보세요" value={query} onChangeText={setQuery} returnKeyType="search" />
      {!folderId && <Chips value={tab} options={[[ 'all', '전체 세트' ], ['root', '미분류']]} onChange={setTab} />}
      <View style={[s.row, { flexWrap: 'nowrap' }]}><Select label="학습 상태" value={filter} options={[[ 'all', '모든 학습 상태' ], ['unlearned', '학습 중'], ['completed', '학습 완료']]} onChange={setFilter} /><Select label="정렬" value={sort} options={sortOptions} onChange={value => { void attempt(() => store.setPreferences(folderId ? { folderDeckSort: value } : { deckSort: value })); }} /></View>
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}><Text style={s.label}>학습 세트 {decks.length}개</Text><Pressable accessibilityRole="button" onPress={() => nav.go({ type: 'edit-deck', folderId })} style={l.textAction}><Icon name="plus" size={16} /><Text style={[s.label, { color: colors.primary }]}>새 세트</Text></Pressable></View>
    </View>}
    ListEmptyComponent={<View style={{ gap: 14 }}><Empty title={query || filter !== 'all' ? '조건에 맞는 세트가 없어요' : '첫 세트를 만들어 보세요'} detail="기억하고 싶은 내용을 카드 한 장에 담아보세요." />{query || filter !== 'all' || tab !== 'all' ? <Button title="검색 및 필터 초기화" tone="secondary" onPress={() => { setQuery(''); setFilter('all'); setTab('all'); }} /> : <Button title="학습 세트 만들기" onPress={() => nav.go({ type: 'edit-deck', folderId })} />}</View>}
    renderItem={({ item }) => <DeckTile deck={item} nav={nav} />} />
    {actions && folder && <Sheet title="폴더 관리" onClose={() => setActions(false)}><Button title="폴더 수정" tone="secondary" onPress={() => { setActions(false); setEditFolder(true); }} /><Button title="폴더 삭제" tone="danger" onPress={() => confirm('폴더를 삭제할까요?', '안에 있는 덱은 미분류로 이동하며 카드는 유지됩니다.', async () => { await store.deleteFolder(folder.id); setActions(false); nav.back(); })} /></Sheet>}
    {editFolder && <FolderForm id={folderId} onClose={() => setEditFolder(false)} onSaved={() => setEditFolder(false)} />}
  </>;
}
export function FolderLibrary({ nav, onNewFolder, onDecks }: { nav: Navigation; onNewFolder: () => void; onDecks?: () => void }) {
  const { folders, decks, preferences } = useStore();
  const [query, setQuery] = useState('');
  const sort = preferences.folderSort || 'date-desc';
  const visible = sortDecks(folders.filter(f => matches(`${f.title} ${f.description || ''}`, query)), sort);
  return <FlatList contentContainerStyle={s.page} data={visible} keyExtractor={f => f.id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
    ListHeaderComponent={<View style={{ gap: 20 }}><Text style={s.title}>나의 배움이 모이는 곳</Text><View style={l.libraryTabs}><Pressable accessibilityRole="button" onPress={onDecks || (() => nav.go({ type: 'all-decks' }))} style={l.textAction}><Text style={l.unselectedTab}>학습 세트</Text></Pressable><Text style={l.selectedTab}>폴더</Text></View><Field label="폴더 검색" placeholder="폴더 이름으로 찾아보세요" value={query} onChangeText={setQuery} /><View style={[s.row, { flexWrap: 'nowrap' }]}><Select label="폴더 정렬" value={sort} options={sortOptions} onChange={value => { void attempt(() => store.setPreferences({ folderSort: value })); }} /><Button title="새 폴더" icon="plus" onPress={onNewFolder} /></View><Text style={[s.label, { marginBottom: 4 }]}>폴더 {visible.length}개</Text></View>}
    ListEmptyComponent={<Empty title={query ? '검색 결과가 없어요' : '주제별로 정리해 보세요'} detail="폴더를 만들고 관련된 학습 세트를 모아보세요." />}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 폴더 열기`} style={[s.box, { marginBottom: 12 }]} onPress={() => nav.go({ type: 'folder', folderId: item.id })}><View style={[s.row, { gap: 14, flexWrap: 'nowrap' }]}><View style={[l.deckIcon, { backgroundColor: colors.peach }]}><Icon name="folder" color="#BA7549" size={26} /></View><View style={{ flex: 1, gap: 4 }}><Text style={s.h2}>{item.title}</Text><Text style={s.muted}>학습 세트 {decks.filter(d => d.folderId === item.id).length}개</Text></View><Icon name="chevron" size={18} color={colors.muted} /></View>{Boolean(item.description) && <Text style={s.muted}>{item.description}</Text>}</Pressable>} />;
}
export function Search({ nav }: { nav: Navigation }) {
  const { decks, folders, cards } = useStore();
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query);
  const matchingDecks = sortDecks(decks.filter(d => matches(`${d.title} ${d.description || ''}`, q) || cards.some(c => c.deckId === d.id && cardMatches(c, q))), 'date-desc');
  const matchingFolders = q.trim() ? folders.filter(f => matches(`${f.title} ${f.description || ''}`, q)) : [];
  return <FlatList data={matchingDecks} keyExtractor={d => d.id} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
    ListHeaderComponent={<View style={{ gap: 20 }}><View style={{ gap: 6 }}><Text style={s.title}>기억의 시작은, 찾기</Text><Text style={s.muted}>세트부터 카드 속 한 단어까지 찾아보세요.</Text></View><Field label="내 학습 자료 검색" placeholder="세트, 폴더, 카드 내용 검색" value={query} onChangeText={setQuery} autoFocus returnKeyType="search" clearButtonMode="while-editing" />
      {Boolean(query) && <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={[l.textAction, { alignSelf: 'flex-end' }]}><Text style={s.label}>검색어 지우기</Text></Pressable>}
      {matchingFolders.length > 0 && <View style={{ gap: 8 }}><Text style={s.label}>폴더 {matchingFolders.length}개</Text>{matchingFolders.map(f => <Button key={f.id} title={`폴더 · ${f.title}`} tone="secondary" onPress={() => nav.go({ type: 'folder', folderId: f.id })} />)}</View>}
      <Text accessibilityLiveRegion="polite" style={[s.label, { marginBottom: 6 }]}>{q.trim() ? `검색된 학습 세트 ${matchingDecks.length}개` : '최근 수정한 학습 세트'}</Text>
    </View>}
    ListEmptyComponent={!matchingFolders.length ? <Empty title={q.trim() ? '검색 결과가 없어요' : '아직 학습 자료가 없어요'} detail={q.trim() ? '다른 단어나 더 짧은 검색어로 찾아보세요.' : '하단의 + 버튼으로 첫 세트를 만들어 보세요.'} /> : null}
    renderItem={({ item }) => <DeckTile deck={item} nav={nav} />} />;
}
const l = StyleSheet.create({
  textAction: { minHeight: 44, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  search: { backgroundColor: '#EDEEF5', paddingHorizontal: 17, minHeight: 54, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hero: { padding: 22, gap: 20, borderRadius: 26, backgroundColor: colors.primary, overflow: 'hidden' },
  heroLabel: { color: '#DBD7FF', fontWeight: '700', fontSize: 10, letterSpacing: 1.6 },
  heroTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 23, lineHeight: 33, letterSpacing: -0.6 },
  heroDetail: { color: '#E2DEFF', fontSize: 13, lineHeight: 21 },
  heroButton: { minHeight: 50, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 8 },
  artCard: { position: 'absolute', width: 76, height: 98, borderRadius: 14 },
  stats: { flexDirection: 'row', paddingVertical: 20, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  stat: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 5 },
  deckIcon: { width: 50, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  libraryTabs: { flexDirection: 'row', alignItems: 'center', gap: 28, borderBottomWidth: 1, borderColor: colors.border },
  selectedTab: { fontSize: 16, fontWeight: '800', color: colors.primary, paddingVertical: 15, borderBottomWidth: 3, borderColor: colors.primary },
  unselectedTab: { fontSize: 16, fontWeight: '600', color: colors.muted },
});
