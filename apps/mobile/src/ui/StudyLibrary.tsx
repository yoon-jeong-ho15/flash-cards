import { useUI, useThemedStyles, type Palette } from './theme';
import { Text } from './Typography';
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { sortDecks } from "../core/content";
import { useStore } from "../platform/runtime";
import { Button, Empty } from "./kit";
import { Icon } from "./Icon";
import type { Navigation } from "./navigation";

const palette = [
  { background: "#EEECFF", ink: "#6155E8" },
  { background: "#E5F3EF", ink: "#287C69" },
  { background: "#FFF0E4", ink: "#A66A35" },
  { background: "#E9F0FC", ink: "#5276B1" },
  { background: "#F8EAF0", ink: "#AC6283" },
  { background: "#F1EDDF", ink: "#8B7843" },
];
const folderColor = (title: string) =>
  palette[
    Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      palette.length
  ];

export function StudyLibrary({ nav }: { nav: Navigation }) {
  const { colors, s, uiScale } = useUI();
  const styles = useThemedStyles(createStyles);
  const { folders, decks, cards, preferences } = useStore();
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 350 || fontScale * uiScale > 1.3 ? 1 : width >= 600 ? 3 : 2;
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

  return (
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
        const accent = folderColor(item.title);
        const percent = item.count
          ? Math.round((item.learned / item.count) * 100)
          : 0;
        return (
          <View
            style={{
              width: `${100 / columns}%`,
              paddingHorizontal: columns > 1 ? 6 : 0,
              paddingBottom: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, 덱 ${item.deckCount}개, 카드 ${item.count}장, 기억한 카드 ${item.learned}장, 폴더 열기`}
              onPress={() =>
                nav.go({ type: "study-folder", folderId: item.id })
              }
              style={({ pressed }) => [
                styles.folder,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.folderTop}>
                <View
                  style={[
                    styles.folderIcon,
                    { backgroundColor: accent.background },
                  ]}
                >
                  <Icon name="folder" size={22} color={accent.ink} />
                </View>
                <Icon name="chevron" size={15} color={colors.muted} />
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
                  <Text style={[styles.progressValue, { color: accent.ink }]}>
                    {item.learned}
                    <Text style={styles.progressTotal}>/{item.count}</Text>
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${percent}%`, backgroundColor: accent.ink },
                    ]}
                  />
                </View>
              </View>
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
            <View style={styles.deckList}>
              {unfiled.map((deck, index) => (
                <Pressable
                  key={deck.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${deck.title}, 카드 ${deck.count}장, ${deck.count ? "학습 방식 선택" : "학습할 카드 없음"}`}
                  accessibilityState={{ disabled: !deck.count }}
                  disabled={!deck.count}
                  onPress={() =>
                    nav.go({ type: "study-options", deckId: deck.id })
                  }
                  style={({ pressed }) => [
                    styles.deck,
                    index > 0 && styles.deckBorder,
                    pressed && styles.pressed,
                    !deck.count && { opacity: 0.5 },
                  ]}
                >
                  <View style={styles.deckIcon}>
                    <Icon name="layers" size={21} />
                  </View>
                  <View style={styles.deckInfo}>
                    <Text numberOfLines={2} style={styles.deckTitle}>
                      {deck.title}
                    </Text>
                    <Text style={styles.metadata}>
                      {deck.count
                        ? `카드 ${deck.count}장 · 기억한 카드 ${deck.learned}장`
                        : "학습할 카드가 없어요"}
                    </Text>
                  </View>
                  <View style={styles.deckArrow}>
                    <Icon
                      name="arrow"
                      size={17}
                      color={deck.count ? colors.primary : colors.muted}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : undefined
      }
    />
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  page: { paddingTop: 14, paddingHorizontal: 22, paddingBottom: 32, gap: 0 },
  header: { paddingBottom: 14 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 0,
    marginBottom: 18,
  },
  summaryText: { fontSize: 12, lineHeight: 18, color: colors.muted },
  summaryValue: { fontWeight: "700", color: colors.ink },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border },
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
  columns: { marginHorizontal: -6 },
  folder: {
    flex: 1,
    minHeight: 172,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 13,
  },
  folderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  folderInfo: { flex: 1, gap: 4 },
  folderTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  metadata: { fontSize: 11, lineHeight: 18, color: colors.muted },
  separator: { color: colors.border },
  progressArea: { gap: 7 },
  progressLabels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  progressLabel: { fontSize: 10, lineHeight: 15, color: colors.muted },
  progressValue: { fontSize: 10, lineHeight: 15, fontWeight: "700" },
  progressTotal: { fontWeight: "400", color: colors.muted },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.track,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
  pressed: { opacity: 0.72 },
  unfiledSection: { marginTop: 18 },
  unfiledHeading: { marginBottom: 14 },
  deckList: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  deck: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    minHeight: 86,
  },
  deckBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  deckIcon: {
    width: 40,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  deckInfo: { flex: 1, gap: 5 },
  deckTitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  deckArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { paddingTop: 24, gap: 18 },
});
