import { CollectionLayoutToggle } from './CollectionLayoutToggle';
import { CollectionIcon, CollectionSurface, DeckSummary } from './CollectionSurface';
import { useCollectionGrid } from './useCollectionGrid';
import { radius, useUI, useThemedStyles, type Palette } from './theme';
import { Text } from './Typography';
import React, { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Deck, DeckSortOption } from "../core/types";
import { cardMatches, folderCards, matches, sortDecks } from "../core/content";
import { store, useStore } from "../platform/runtime";
import { Button, Chips, Empty, Field, Select, Sheet, attempt, confirm } from "./kit";
import { Icon } from "./Icon";
import { FolderForm } from "./FolderForm";
import type { Navigation } from "./navigation";

const sortOptions: Array<[DeckSortOption, string]> = [
  ["date-desc", "최근 수정순"],
  ["date-asc", "오래된 순"],
  ["name-asc", "이름 오름차순"],
  ["name-desc", "이름 내림차순"],
];
function Section({
  title,
  action,
  onPress,
  accessory,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  accessory?: React.ReactNode;
}) {
  const { colors, s } = useUI();
  const l = useThemedStyles(createStyles);
  return (
    <View
      style={[s.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}
    >
      <Text numberOfLines={1} style={[s.h2, { flex: 1, minWidth: 0 }]}>{title}</Text>
      {accessory}
      {onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={l.textAction}
        >
          <Text style={[s.label, { color: colors.primary }]}>
            {action || "전체 보기"}
          </Text>
          <Icon name="chevron" size={15} />
        </Pressable>
      )}
    </View>
  );
}
export function DeckTile({ deck, nav }: { deck: Deck; nav: Navigation }) {
  const { cards, folders } = useStore();
  const own = cards.filter((c) => c.deckId === deck.id);
  const learned = own.filter((c) => c.learned).length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deck.title} 덱 열기, 카드 ${own.length}장, ${learned}장 학습 완료`}
      onPress={() => nav.go({ type: "deck", deckId: deck.id })}
      style={{ flex: 1 }}
    >
      {({ pressed }) => (
        <DeckSummary
          pressed={pressed}
          title={deck.title}
          count={own.length}
          learned={learned}
          detail={`카드 ${own.length}장 · ${folders.find((f) => f.id === deck.folderId)?.title || "미분류"}`}
          description={deck.description}
        />
      )}
    </Pressable>
  );
}
export function Dashboard({
  nav,
  onNewFolder,
}: {
  nav: Navigation;
  onNewFolder: () => void;
}) {
  const { colors, s } = useUI();
  const l = useThemedStyles(createStyles);
  const { cards, decks, folders, user } = useStore();
  const [creating, setCreating] = useState(false);
  const recent = sortDecks(decks, "date-desc");
  const grid = useCollectionGrid();
  const learned = cards.filter((c) => c.learned).length;
  const sample = () => {
    setCreating(true);
    void attempt(async () => {
      const id = await store.saveDeck(
        undefined,
        {
          title: "하루 6개, 여행 영어",
          description: "여행에서 바로 쓰는 표현으로 첫 학습을 시작해 보세요.",
        },
        [
          ["Where is the nearest station?", "가장 가까운 역이 어디인가요?"],
          ["Could I see the menu, please?", "메뉴를 볼 수 있을까요?"],
          ["I would like to check in.", "체크인하고 싶어요."],
          ["How much is this?", "이것은 얼마인가요?"],
          ["Can I pay by card?", "카드로 결제할 수 있나요?"],
          ["Thank you for your help.", "도와주셔서 감사합니다."],
        ].map(([front, back]) => ({
          termRichText: `<p>${front}</p>`,
          definitionRichText: `<p>${back}</p>`,
        })),
      );
      nav.go({ type: "deck", deckId: id });
    }).finally(() => setCreating(false));
  };
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.page, { gap: 16 }]}
    >
      <View style={{ gap: 6 }}>
        <Text style={s.muted}>
          {new Intl.DateTimeFormat("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "long",
          }).format(new Date())}
        </Text>
        <Text style={s.title}>
          {user?.displayName ? `${user.displayName}님,` : "반가워요,"}
          {"\n"}오늘도 하나씩 기억해요
          <Text style={{ color: colors.primary }}>.</Text>
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="내 학습 자료 검색"
        onPress={() => nav.go({ type: "search" })}
        style={l.search}
      >
        <Icon name="search" color={colors.icon} />
        <Text style={[s.muted, { flex: 1 }]}>어떤 내용을 공부할까요?</Text>
      </Pressable>
      <View style={l.stats}>
        {[
          [decks.length, "학습 세트"],
          [cards.length, "전체 카드"],
          [learned, "기억한 카드"],
        ].map(([value, label], i) => (
          <View
            key={label}
            style={[
              l.stat,
              i > 0 && { borderLeftWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                s.h2,
                { fontSize: 22, lineHeight: 28, color: colors.ink },
              ]}
            >
              {value}
            </Text>
            <Text style={s.label}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Section
          title="최근 학습 세트"
          accessory={<CollectionLayoutToggle />}
          onPress={() => nav.go({ type: "all-decks" })}
        />
        <View style={grid.wrapStyle}>
          {recent.slice(0, 3).map((d) => (
            <View key={d.id} style={grid.itemStyle}>
              <DeckTile deck={d} nav={nav} />
            </View>
          ))}
        </View>
        {!recent.length && (
          <View style={[s.box, { gap: 12 }]}>
            <View style={s.row}>
              <View style={[l.deckIcon, { backgroundColor: colors.iconBg }]}>
                <Icon name="book" color={colors.icon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>처음이라면 가볍게</Text>
                <Text style={s.muted}>여행 영어 6장으로 사용법 익히기</Text>
              </View>
            </View>
            <Button
              title="샘플 세트로 시작하기"
              tone="secondary"
              busy={creating}
              onPress={sample}
            />
          </View>
        )}
      </View>
      <View style={{ gap: 10 }}>
        <Section
          title="주제별로 모아두기"
          action="폴더 만들기"
          onPress={onNewFolder}
        />
        {folders.length ? (
          <View style={grid.wrapStyle}>
            {folders.slice(0, 6).map((folder) => (
              <Pressable
                key={folder.id}
                accessibilityRole="button"
                onPress={() => nav.go({ type: "folder", folderId: folder.id })}
                style={grid.itemStyle}
              >
                {({ pressed }) => (
                  <CollectionSurface pressed={pressed} kind="folder">
                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                      <CollectionIcon kind="folder" size={32} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text numberOfLines={2} style={[s.text, { fontWeight: "700" }]}>{folder.title}</Text>
                        <Text style={s.muted}>세트 {decks.filter((d) => d.folderId === folder.id).length}개</Text>
                      </View>
                    </View>
                  </CollectionSurface>
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onNewFolder}
            style={[s.box, s.row, { gap: 10 }]}
          >
            <Icon name="folder" size={26} color={colors.icon} />
            <View style={{ flex: 1 }}>
              <Text style={[s.text, { fontWeight: "600" }]}>
                배우는 주제마다, 나만의 폴더
              </Text>
            </View>
            <Icon name="chevron" size={18} color={colors.icon} />
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
export function DeckLibrary({
  nav,
  folderId,
}: {
  nav: Navigation;
  folderId?: string;
  onFolders?: () => void;
}) {
  const { colors, s } = useUI();
  const l = useThemedStyles(createStyles);
  const state = useStore();
  const grid = useCollectionGrid('list');
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [filter, setFilter] = useState<"all" | "root" | "unlearned" | "completed">("all");
  const [editFolder, setEditFolder] = useState(false);
  const [actions, setActions] = useState(false);
  const folder = state.folders.find((f) => f.id === folderId);
  const filterOptions: Array<["all" | "root" | "unlearned" | "completed", string]> = folderId
    ? [
        ["all", "전체"],
        ["unlearned", "학습 중"],
        ["completed", "완료"],
      ]
    : [
        ["all", "전체"],
        ["root", "미분류"],
        ["unlearned", "학습 중"],
        ["completed", "완료"],
      ];
  const folderCardsCount = useMemo(
    () =>
      folderId !== undefined
        ? folderCards(state.cards, state.decks, folderId).length
        : 0,
    [state.cards, state.decks, folderId],
  );
  const sort =
    (folderId
      ? state.preferences.folderDeckSort
      : state.preferences.deckSort) || "date-desc";
  const decks = useMemo(
    () =>
      sortDecks(
        state.decks.filter((d) => {
          if (folderId && d.folderId !== folderId) return false;
          if (!folderId && filter === "root" && d.folderId) return false;
          const own = state.cards.filter((c) => c.deckId === d.id);
          if (filter === "unlearned" && !own.some((c) => !c.learned))
            return false;
          if (
            filter === "completed" &&
            !(own.length && own.every((c) => c.learned))
          )
            return false;
          return (
            matches(`${d.title} ${d.description || ""}`, deferred) ||
            own.some((c) => cardMatches(c, deferred))
          );
        }),
        sort,
      ),
    [state.decks, state.cards, folderId, filter, deferred, sort],
  );
  if (folderId && !folder)
    return (
      <View style={s.page}>
        <Empty
          title="폴더를 찾을 수 없어요"
          detail="다른 기기에서 삭제되었을 수 있습니다."
        />
        <Button title="돌아가기" onPress={nav.back} />
      </View>
    );
  return (
    <>
      <FlatList
        key={grid.columns}
        numColumns={grid.columns}
        columnWrapperStyle={grid.columns > 1 ? grid.rowStyle : undefined}
        data={decks}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[s.page, { gap: 0 }]}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={state.status === "syncing"}
        onRefresh={() => {
          void store.sync();
        }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {folder ? (
              <>
                <View style={[s.row, { flexWrap: "nowrap" }]}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={s.row}>
                      <Icon name="folder" color={colors.icon} />
                      <Text style={s.label}>내 폴더</Text>
                    </View>
                    <Text style={s.title}>{folder.title}</Text>
                    {Boolean(folder.description) && (
                      <Text style={s.muted}>{folder.description}</Text>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="폴더 관리"
                    onPress={() => setActions(true)}
                    style={l.textAction}
                  >
                    <Icon name="more" color={colors.icon} />
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={s.title}>나의 배움이 모이는 곳</Text>

              </>
            )}
            <Field
              label="세트·카드 검색"
              placeholder="제목이나 카드 내용으로 찾아보세요"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            <View style={[s.row, { justifyContent: "space-between", flexWrap: "nowrap", gap: 8, alignItems: "center" }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, alignItems: "center" }}
                style={{ flexShrink: 1 }}
              >
                {filterOptions.map(([key, label]) => {
                  const selected = filter === key;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setFilter(key)}
                      style={[
                        l.filterChip,
                        selected && l.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          l.filterChipText,
                          selected && l.filterChipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={{ minWidth: 120, flexShrink: 0 }}>
                <Select
                  label="정렬"
                  value={sort}
                  options={sortOptions}
                  onChange={(value) => {
                    void attempt(() =>
                      store.setPreferences(
                        folderId
                          ? { folderDeckSort: value }
                          : { deckSort: value },
                      ),
                    );
                  }}
                />
              </View>
            </View>
            <View
              style={[
                s.row,
                { justifyContent: "space-between", flexWrap: "nowrap", marginBottom: 4 },
              ]}
            >
              <Text numberOfLines={1} style={[s.label, { flex: 1, minWidth: 0 }]}>학습 세트 {decks.length}개</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => nav.go({ type: "edit-deck", folderId })}
                style={[l.textAction, { flexShrink: 0 }]}
              >
                <Icon name="plus" size={16} />
                <Text numberOfLines={1} style={[s.label, { color: colors.primary }]}>
                  새 세트
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ gap: 10 }}>
            <Empty
              title={
                query || filter !== "all"
                  ? "조건에 맞는 세트가 없어요"
                  : "첫 세트를 만들어 보세요"
              }
            />
            {query || filter !== "all" ? (
              <Button
                title="검색 및 필터 초기화"
                tone="secondary"
                onPress={() => {
                  setQuery("");
                  setFilter("all");
                }}
              />
            ) : (
              <Button
                title="학습 세트 만들기"
                onPress={() => nav.go({ type: "edit-deck", folderId })}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={grid.itemStyle}>
            <DeckTile deck={item} nav={nav} />
          </View>
        )}
      />
      {actions && folder && (
        <Sheet title="폴더 관리" onClose={() => setActions(false)}>
          <Button
            title="폴더 수정"
            tone="secondary"
            onPress={() => {
              setActions(false);
              setEditFolder(true);
            }}
          />
          <Button
            title="폴더 삭제"
            tone="danger"
            onPress={() =>
              confirm(
                "폴더를 삭제할까요?",
                "안에 있는 덱은 미분류로 이동하며 카드는 유지됩니다.",
                async () => {
                  await store.deleteFolder(folder.id);
                  setActions(false);
                  nav.back();
                },
              )
            }
          />
        </Sheet>
      )}
      {editFolder && (
        <FolderForm
          id={folderId}
          onClose={() => setEditFolder(false)}
          onSaved={() => setEditFolder(false)}
        />
      )}
    </>
  );
}
export function FolderLibrary({
  nav,
  onNewFolder,
}: {
  nav: Navigation;
  onNewFolder: () => void;
  onDecks?: () => void;
}) {
  const { colors, s } = useUI();
  const { folders, decks, preferences } = useStore();
  const grid = useCollectionGrid('list');
  const sort = preferences.folderSort || "date-desc";
  const visible = sortDecks(folders, sort);
  const folderIds = new Set(folders.map((folder) => folder.id));
  const unfiled = sortDecks(
    decks.filter((deck) => !deck.folderId || !folderIds.has(deck.folderId)),
    preferences.deckSort || "date-desc",
  );
  return (
    <FlatList
      key={grid.columns}
      numColumns={grid.columns}
      columnWrapperStyle={grid.columns > 1 ? grid.rowStyle : undefined}
      contentContainerStyle={[s.page, { gap: 0 }]}
      ListHeaderComponentStyle={{ marginBottom: 12 }}
      data={visible}
      keyExtractor={(f) => f.id}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View style={[s.row, { flexWrap: "nowrap" }]}>
            <Select
              label="폴더 정렬"
              value={sort}
              options={sortOptions}
              onChange={(value) => {
                void attempt(() => store.setPreferences({ folderSort: value }));
              }}
            />
            <Button title="새 폴더" icon="plus" onPress={onNewFolder} />
          </View>
          <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap', marginBottom: 4 }]}>
            <Text numberOfLines={1} style={[s.label, { flex: 1, minWidth: 0 }]}>폴더 {visible.length}개</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        !unfiled.length && !visible.length ? <Empty title="아직 학습 자료가 없어요" /> : undefined
      }
      ListFooterComponent={
        <View style={{ gap: 12, marginTop: visible.length ? 12 : 0 }}>
          <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}>
            <Text numberOfLines={1} style={[s.h2, { flex: 1 }]}>미분류 세트 {unfiled.length}개</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 미분류 세트 만들기"
              onPress={() => nav.go({ type: 'edit-deck' })}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Icon name="plus" size={16} />
              <Text style={[s.label, { color: colors.primary }]}>새 세트</Text>
            </Pressable>
          </View>
          <View style={grid.wrapStyle}>
            {unfiled.map((deck) => (
              <View key={deck.id} style={grid.itemStyle}>
                <DeckTile deck={deck} nav={nav} />
              </View>
            ))}
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={grid.itemStyle}>
          <Pressable
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} 폴더 열기`}
            onPress={() => nav.go({ type: "folder", folderId: item.id })}
          >
            {({ pressed }) => (
              <CollectionSurface pressed={pressed} kind="folder" style={{ minHeight: 144 }}>
                <View style={{ flex: 1, gap: 10 }}>
                  <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}>
                    <CollectionIcon kind="folder" />
                    <Icon name="chevron" size={18} color={colors.icon} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.h2}>{item.title}</Text>
                    <Text style={s.muted}>
                      학습 세트 {decks.filter((d) => d.folderId === item.id).length}개
                    </Text>
                  </View>
                </View>
                {Boolean(item.description) && (
                  <Text style={s.muted}>{item.description}</Text>
                )}
              </CollectionSurface>
            )}
          </Pressable>
        </View>
      )}
    />
  );
}
export { StudyLibrary } from "./StudyLibrary";

export function Search({ nav }: { nav: Navigation }) {
  const { colors, s } = useUI();
  const l = useThemedStyles(createStyles);
  const { decks, folders, cards } = useStore();
  const grid = useCollectionGrid();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);
  const matchingDecks = sortDecks(
    decks.filter(
      (d) =>
        matches(`${d.title} ${d.description || ""}`, q) ||
        cards.some((c) => c.deckId === d.id && cardMatches(c, q)),
    ),
    "date-desc",
  );
  const matchingFolders = q.trim()
    ? folders.filter((f) => matches(`${f.title} ${f.description || ""}`, q))
    : [];
  return (
    <FlatList
      key={grid.columns}
      numColumns={grid.columns}
      columnWrapperStyle={grid.columns > 1 ? grid.rowStyle : undefined}
      data={matchingDecks}
      keyExtractor={(d) => d.id}
      contentContainerStyle={[s.page, { gap: 0 }]}
      ListHeaderComponentStyle={{ marginBottom: 12 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}>
            <Text numberOfLines={1} style={[s.title, { flex: 1, minWidth: 0 }]}>검색</Text>
            <CollectionLayoutToggle />
          </View>
          <Field
            label="내 학습 자료 검색"
            placeholder="세트, 폴더, 카드 내용 검색"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {Boolean(query) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setQuery("")}
              style={[l.textAction, { alignSelf: "flex-end" }]}
            >
              <Text style={s.label}>검색어 지우기</Text>
            </Pressable>
          )}
          {matchingFolders.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={s.label}>폴더 {matchingFolders.length}개</Text>
              <View style={grid.wrapStyle}>
                {matchingFolders.map((f) => (
                  <View key={f.id} style={grid.itemStyle}>
                    <Button
                      title={`폴더 · ${f.title}`}
                      tone="secondary"
                      onPress={() => nav.go({ type: "folder", folderId: f.id })}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
          <Text
            accessibilityLiveRegion="polite"
            style={[s.label, { marginBottom: 6 }]}
          >
            {q.trim()
              ? `검색된 학습 세트 ${matchingDecks.length}개`
              : "최근 수정한 학습 세트"}
          </Text>
        </View>
      }
      ListEmptyComponent={
        !matchingFolders.length ? (
          <Empty
            title={q.trim() ? "검색 결과가 없어요" : "아직 학습 자료가 없어요"}
            detail={
              q.trim()
                ? "다른 단어나 더 짧은 검색어로 찾아보세요."
                : "라이브러리에서 첫 세트를 만들어 보세요."
            }
          />
        ) : undefined
      }
      renderItem={({ item }) => (
        <View style={grid.itemStyle}>
          <DeckTile deck={item} nav={nav} />
        </View>
      )}
    />
  );
}
const createStyles = (colors: Palette) => StyleSheet.create({
  textAction: {
    minHeight: 44,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.input,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: radius.control,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stats: {
    flexDirection: "row",
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 5 },
  deckIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
    borderRadius: radius.control + 4,
    backgroundColor: colors.subtle,
  },
  selectedTab: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "600",
    color: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radius.control,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  libraryTabAction: { flex: 1, minHeight: 44, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  unselectedTab: { fontSize: 14, lineHeight: 22, fontWeight: "500", color: colors.muted },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.control + 2,
    backgroundColor: colors.subtle,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    boxShadow: `0px 1px 2px ${colors.shadow}`,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  filterChipTextActive: {
    fontWeight: "700",
    color: colors.primary,
  },
});
