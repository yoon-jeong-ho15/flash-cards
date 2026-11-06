import { CollectionIcon, CollectionSurface, DeckCardHeader } from './CollectionSurface';
import { StudyOrderModal } from './StudyOrderModal';
import { useCollectionGrid } from './useCollectionGrid';
import { useUI, useThemedStyles, type Palette } from './theme';
import { Text } from './Typography';
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { sortDecks } from "../core/content";
import { useStore } from "../platform/runtime";
import { Button, Empty, Progress } from "./kit";
import { Icon } from "./Icon";
import type { Navigation } from "./navigation";

export function StudyLibrary({ nav }: { nav: Navigation }) {
  const { colors, s } = useUI();
  const styles = useThemedStyles(createStyles);
  const { folders, decks, cards, preferences } = useStore();
  const grid = useCollectionGrid();
  const { columns } = grid;
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const { topics, unfiled } = useMemo(() => {
    const counts = new Map<string, { count: number; learned: number }>();
    cards.forEach((card) => {
      const value = counts.get(card.deckId) || { count: 0, learned: 0 };
      value.count++;
      if (card.learned) value.learned++;
      counts.set(card.deckId, value);
    });
    const folderCounts = new Map<
      string,
      { deckCount: number; count: number; learned: number }
    >();
    decks.forEach((deck) => {
      if (!deck.folderId) return;
      const value = folderCounts.get(deck.folderId) || {
        deckCount: 0,
        count: 0,
        learned: 0,
      };
      const own = counts.get(deck.id);
      value.deckCount++;
      value.count += own?.count || 0;
      value.learned += own?.learned || 0;
      folderCounts.set(deck.folderId, value);
    });
    const folderIds = new Set(folders.map((folder) => folder.id));
    return {
      topics: sortDecks(folders, preferences.folderSort || "date-desc").map(
        (folder) => ({
          ...folder,
          ...(folderCounts.get(folder.id) || {
            deckCount: 0,
            count: 0,
            learned: 0,
          }),
        }),
      ),
      unfiled: sortDecks(
        decks.filter((deck) => !deck.folderId || !folderIds.has(deck.folderId)),
        preferences.deckSort || "date-desc",
      ).map((deck) => ({
        ...deck,
        ...(counts.get(deck.id) || { count: 0, learned: 0 }),
      })),
    };
  }, [folders, decks, cards, preferences.folderSort, preferences.deckSort]);
  const hasContent = topics.length > 0 || unfiled.length > 0;
  const selectedDeck = unfiled.find((deck) => deck.id === selectedDeckId);

  return (
    <>
      <FlatList
        key={columns}
        numColumns={columns}
        data={topics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.page, styles.page]}
        columnWrapperStyle={columns > 1 ? styles.columns : undefined}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {hasContent && (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryValue}>{folders.length}</Text> 폴더
                </Text>
                <View style={styles.dot} />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryValue}>{decks.length}</Text> 덱
                </Text>
                <View style={styles.dot} />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryValue}>{cards.length}</Text> 카드
                </Text>
              </View>
            )}
            {topics.length > 0 && (
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>폴더</Text>
                <Text style={styles.sectionCount}>{topics.length}개</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !hasContent ? (
            <View style={styles.empty}>
              <Empty
                title="학습할 자료가 없어요"
              />
              <Button
                title="학습 세트 만들기"
                icon="plus"
                onPress={() => nav.go({ type: "edit-deck" })}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const percent = item.count
            ? Math.round((item.learned / item.count) * 100)
            : 0;
          return (
            <View
              style={{
                width: `${100 / columns}%`,
                paddingHorizontal: columns > 1 ? 4 : 0,
                paddingBottom: 10,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, 덱 ${item.deckCount}개, 카드 ${item.count}장, 기억한 카드 ${item.learned}장, 폴더 열기`}
                onPress={() =>
                  nav.go({ type: "study-folder", folderId: item.id })
                }
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  <CollectionSurface pressed={pressed} kind="folder" style={styles.folder}>
                    <View style={styles.folderTop}>
                      <CollectionIcon kind="folder" size={30} />
                      <Icon name="chevron" size={15} color={colors.icon} />
                    </View>
                    <View style={styles.folderInfo}>
                      <Text numberOfLines={2} style={styles.folderTitle}>
                        {item.title}
                      </Text>
                      <Text style={styles.metadata}>
                        덱 {item.deckCount}개<Text style={styles.separator}> · </Text>
                        카드 {item.count}장
                      </Text>
                    </View>
                    <View style={styles.progressArea}>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressLabel}>기억한 카드</Text>
                        <Text style={[styles.progressValue, { color: colors.primary }]}>
                          {item.learned}
                          <Text style={styles.progressTotal}>/{item.count}</Text>
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${percent}%`, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                    </View>
                  </CollectionSurface>
                )}
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          unfiled.length ? (
            <View
              style={[styles.unfiledSection, !topics.length && { marginTop: 0 }]}
            >
              <View style={[styles.sectionHeading, styles.unfiledHeading]}>
                <Text style={styles.sectionTitle}>미분류 덱</Text>
                <Text style={styles.sectionCount}>{unfiled.length}개</Text>
              </View>
              <View style={grid.wrapStyle}>
                {unfiled.map((deck) => (
                  <View key={deck.id} style={grid.itemStyle}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${deck.title}, 카드 ${deck.count}장, ${deck.count ? "학습 순서 선택" : "학습할 카드 없음"}`}
                      accessibilityState={{ disabled: !deck.count }}
                      disabled={!deck.count}
                      style={{ flex: 1 }}
                      onPress={() => setSelectedDeckId(deck.id)}
                    >
                      {({ pressed }) => (
                        <CollectionSurface pressed={pressed} kind="deck" style={styles.deck}>
                          <DeckCardHeader title={deck.title} pressed={pressed} />
                          <View style={styles.deckInfo}>
                            <Text style={styles.metadata}>
                              {deck.count
                                ? `카드 ${deck.count}장\n기억한 카드 ${deck.learned}장`
                                : "학습할 카드가 없어요"}
                            </Text>
                          </View>
                          <Progress learned={deck.learned} total={deck.count} compact />
                        </CollectionSurface>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : undefined
        }
      />
      {selectedDeck && (
        <StudyOrderModal
          title={selectedDeck.title}
          onClose={() => setSelectedDeckId(null)}
          onChoose={(shuffle) => {
            setSelectedDeckId(null);
            nav.go({ type: "study", deckId: selectedDeck.id, shuffle, onlyDifficult: false });
          }}
        />
      )}
    </>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  page: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24, gap: 0 },
  header: { paddingBottom: 10 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 0,
    marginBottom: 12,
  },
  summaryText: { fontSize: 12, lineHeight: 18, color: colors.muted },
  summaryValue: { fontWeight: "700", color: colors.primary },
  dot: { width: 3, height: 4, borderRadius: 2, backgroundColor: colors.border },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.4,
    fontWeight: "700",
    color: colors.ink,
  },
  sectionCount: { fontSize: 12, lineHeight: 18, color: colors.muted },
  columns: { marginHorizontal: -4 },
  folder: { minHeight: 144, padding: 12, gap: 8 },
  folderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  folderInfo: { flex: 1, gap: 4 },
  folderTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  metadata: { fontSize: 12, lineHeight: 18, color: colors.muted },
  separator: { color: colors.border },
  progressArea: { gap: 5 },
  progressLabels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  progressLabel: { fontSize: 11, lineHeight: 16, color: colors.muted },
  progressValue: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
  progressTotal: { fontWeight: "400", color: colors.muted },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.track,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
  unfiledSection: { marginTop: 14 },
  unfiledHeading: { marginBottom: 10 },
  deck: {
    gap: 6,
    padding: 10,
    minHeight: 136,
  },
  deckInfo: { flex: 1, gap: 3 },
  empty: { paddingTop: 16, gap: 12 },
});
