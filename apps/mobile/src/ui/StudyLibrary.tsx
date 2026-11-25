import { CollectionLayoutToggle } from './CollectionLayoutToggle';
import { CollectionIcon, CollectionSurface, SetSummary } from './CollectionSurface';
import { StudyOrderModal } from './StudyOrderModal';
import { useCollectionGrid } from './useCollectionGrid';
import { useUI, useThemedStyles, type Palette } from './theme';
import { Text } from './Typography';
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { sortSets } from "../core/content";
import { useStore } from "../platform/runtime";
import { Button, Empty } from "./kit";
import { Icon } from "./Icon";
import type { Navigation } from "./navigation";

export function StudyLibrary({ nav }: { nav: Navigation }) {
  const { colors, s } = useUI();
  const styles = useThemedStyles(createStyles);
  const { folders, sets, cards, preferences } = useStore();
  const grid = useCollectionGrid();
  const { columns } = grid;
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const { topics, unfiled } = useMemo(() => {
    const counts = new Map<string, { count: number; learned: number }>();
    cards.forEach((card) => {
      const value = counts.get(card.setId) || { count: 0, learned: 0 };
      value.count++;
      if (card.learned) value.learned++;
      counts.set(card.setId, value);
    });
    const folderCounts = new Map<
      string,
      { setCount: number; count: number; learned: number }
    >();
    sets.forEach((cardSet) => {
      if (!cardSet.folderId) return;
      const value = folderCounts.get(cardSet.folderId) || {
        setCount: 0,
        count: 0,
        learned: 0,
      };
      const own = counts.get(cardSet.id);
      value.setCount++;
      value.count += own?.count || 0;
      value.learned += own?.learned || 0;
      folderCounts.set(cardSet.folderId, value);
    });
    const folderIds = new Set(folders.map((folder) => folder.id));
    return {
      topics: sortSets(folders, preferences.folderSort || "date-desc").map(
        (folder) => ({
          ...folder,
          ...(folderCounts.get(folder.id) || {
            setCount: 0,
            count: 0,
            learned: 0,
          }),
        }),
      ),
      unfiled: sortSets(
        sets.filter((cardSet) => !cardSet.folderId || !folderIds.has(cardSet.folderId)),
        preferences.setSort || "date-desc",
      ).map((cardSet) => ({
        ...cardSet,
        ...(counts.get(cardSet.id) || { count: 0, learned: 0 }),
      })),
    };
  }, [folders, sets, cards, preferences.folderSort, preferences.setSort]);
  const hasContent = topics.length > 0 || unfiled.length > 0;
  const selectedSet = unfiled.find((cardSet) => cardSet.id === selectedSetId);

  return (
    <>
      <FlatList
        key={columns}
        numColumns={columns}
        data={topics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.page, styles.page]}
        columnWrapperStyle={columns > 1 ? grid.rowStyle : undefined}
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
                  <Text style={styles.summaryValue}>{sets.length}</Text> 세트
                </Text>
                <View style={styles.dot} />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryValue}>{cards.length}</Text> 카드
                </Text>
              </View>
            )}
            {hasContent && (
              <View style={styles.sectionHeading}>
                <Text numberOfLines={1} style={[styles.sectionTitle, { flex: 1, minWidth: 0 }]}>{topics.length ? '폴더' : '미분류 세트'}</Text>
                <Text numberOfLines={1} style={styles.sectionCount}>{topics.length || unfiled.length}개</Text>
                <CollectionLayoutToggle />
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
                onPress={() => nav.go({ type: "edit-set" })}
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
              style={grid.itemStyle}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, 세트 ${item.setCount}개, 카드 ${item.count}장, 기억한 카드 ${item.learned}장, 폴더 열기`}
                onPress={() =>
                  nav.go({ type: "study-folder", folderId: item.id })
                }
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  <CollectionSurface pressed={pressed} kind="folder" style={styles.folder}>
                    <View style={styles.folderTop}>
                      <CollectionIcon kind="folder" size={30} />
                      <Icon name="chevron" size={15} color={colors.warm} />
                    </View>
                    <View style={styles.folderInfo}>
                      <Text numberOfLines={2} style={styles.folderTitle}>
                        {item.title}
                      </Text>
                      <View style={{ minHeight: 18 }} />
                    </View>
                    <View style={styles.progressArea}>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressLabel}>기억한 카드</Text>
                        <Text style={[styles.progressValue, { color: colors.success }]}>
                          {item.learned}
                          <Text style={styles.progressTotal}>/{item.count}</Text>
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${percent}%`, backgroundColor: colors.success },
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
              {topics.length > 0 && (
                <View style={[styles.sectionHeading, styles.unfiledHeading]}>
                  <Text style={styles.sectionTitle}>미분류 세트</Text>
                  <Text style={styles.sectionCount}>{unfiled.length}개</Text>
                </View>
              )}
              <View style={grid.wrapStyle}>
                {unfiled.map((cardSet) => (
                  <View key={cardSet.id} style={grid.itemStyle}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${cardSet.title}, 카드 ${cardSet.count}장, ${cardSet.count ? "학습 순서 선택" : "학습할 카드 없음"}`}
                      accessibilityState={{ disabled: !cardSet.count }}
                      disabled={!cardSet.count}
                      style={{ flex: 1 }}
                      onPress={() => setSelectedSetId(cardSet.id)}
                    >
                      {({ pressed }) => (
                        <SetSummary hideDetails pressed={pressed} title={cardSet.title} count={cardSet.count} learned={cardSet.learned} />
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : undefined
        }
      />
      {selectedSet && (
        <StudyOrderModal
          title={selectedSet.title}
          onClose={() => setSelectedSetId(null)}
          onChoose={(shuffle) => {
            setSelectedSetId(null);
            nav.go({ type: "study", setId: selectedSet.id, shuffle, onlyDifficult: false });
          }}
        />
      )}
    </>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  page: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24, gap: 0 },
  header: { paddingBottom: 10, gap: 12 },
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
    flexWrap: "nowrap",
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
  empty: { paddingTop: 16, gap: 12 },
});
