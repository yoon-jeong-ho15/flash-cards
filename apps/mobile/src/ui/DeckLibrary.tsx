import React, { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { cardMatches, matches, sortDecks } from '../core/content';
import { store, useStore } from '../platform/runtime';
import { DeckTile } from './DeckTile';
import { FolderForm } from './FolderForm';
import { Icon } from './Icon';
import { Button, Empty, Field, Select, Sheet, attempt, confirm } from './kit';
import { deckSortOptions, libraryStyles } from './libraryShared';
import type { Navigation } from './navigation';
import { radius, useThemedStyles, useUI, type Palette } from './theme';
import { Text } from './Typography';
import { useCollectionGrid } from './useCollectionGrid';

type DeckStatusFilter = 'all' | 'root' | 'unlearned' | 'completed';

/** Displays all decks or the decks inside a specific folder with search, status filters, and sort options. */
export function DeckLibrary({
  nav,
  folderId,
}: {
  nav: Navigation;
  folderId?: string;
  onFolders?: () => void;
}) {
  const { colors, s } = useUI();
  const styles = useThemedStyles(createStyles);
  const { cards, decks, folders, preferences, status } = useStore();
  const collectionGrid = useCollectionGrid('list');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<DeckStatusFilter>('all');
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [isFolderActionsOpen, setIsFolderActionsOpen] = useState(false);
  const currentFolder = folders.find((folder) => folder.id === folderId);
  const statusFilterOptions: Array<[DeckStatusFilter, string]> = folderId
    ? [
        ['all', '전체'],
        ['unlearned', '학습 중'],
        ['completed', '완료'],
      ]
    : [
        ['all', '전체'],
        ['root', '미분류'],
        ['unlearned', '학습 중'],
        ['completed', '완료'],
      ];
  const sortOption =
    (folderId ? preferences.folderDeckSort : preferences.deckSort) || 'date-desc';

  const filteredDecks = useMemo(
    () =>
      sortDecks(
        decks.filter((deck) => {
          if (folderId && deck.folderId !== folderId) return false;
          if (!folderId && statusFilter === 'root' && deck.folderId) return false;
          const deckCards = cards.filter((card) => card.deckId === deck.id);
          if (statusFilter === 'unlearned' && !deckCards.some((card) => !card.learned)) {
            return false;
          }
          if (
            statusFilter === 'completed' &&
            !(deckCards.length && deckCards.every((card) => card.learned))
          ) {
            return false;
          }
          return (
            matches(`${deck.title} ${deck.description || ''}`, deferredQuery) ||
            deckCards.some((card) => cardMatches(card, deferredQuery))
          );
        }),
        sortOption
      ),
    [decks, cards, folderId, statusFilter, deferredQuery, sortOption]
  );

  if (folderId && !currentFolder) {
    return (
      <View style={s.page}>
        <Empty
          title="폴더를 찾을 수 없어요"
          detail="다른 기기에서 삭제되었을 수 있습니다."
        />
        <Button title="돌아가기" onPress={nav.back} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        key={collectionGrid.columns}
        numColumns={collectionGrid.columns}
        columnWrapperStyle={
          collectionGrid.columns > 1 ? collectionGrid.rowStyle : undefined
        }
        data={filteredDecks}
        keyExtractor={(deck) => deck.id}
        contentContainerStyle={[s.page, { gap: 0 }]}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={status === 'syncing'}
        onRefresh={() => {
          void store.sync();
        }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {currentFolder ? (
              <View style={[s.row, { flexWrap: 'nowrap' }]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={s.row}>
                    <Icon name="folder" color={colors.warm} />
                    <Text style={s.label}>내 폴더</Text>
                  </View>
                  <Text style={s.title}>{currentFolder.title}</Text>
                  {Boolean(currentFolder.description) && (
                    <Text style={s.muted}>{currentFolder.description}</Text>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="폴더 관리"
                  onPress={() => setIsFolderActionsOpen(true)}
                  style={libraryStyles.textAction}
                >
                  <Icon name="more" color={colors.icon} />
                </Pressable>
              </View>
            ) : (
              <Text style={s.title}>나의 배움이 모이는 곳</Text>
            )}
            <Field
              label="세트·카드 검색"
              placeholder="제목이나 카드 내용으로 찾아보세요"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            <View
              style={[
                s.row,
                {
                  justifyContent: 'space-between',
                  flexWrap: 'nowrap',
                  gap: 8,
                  alignItems: 'center',
                },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, alignItems: 'center' }}
                style={{ flexShrink: 1 }}
              >
                {statusFilterOptions.map(([optionValue, label]) => {
                  const isSelected = statusFilter === optionValue;
                  return (
                    <Pressable
                      key={optionValue}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setStatusFilter(optionValue)}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextActive,
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
                  value={sortOption}
                  options={deckSortOptions}
                  onChange={(value) => {
                    void attempt(() =>
                      store.setPreferences(
                        folderId
                          ? { folderDeckSort: value }
                          : { deckSort: value }
                      )
                    );
                  }}
                />
              </View>
            </View>
            <View
              style={[
                s.row,
                {
                  justifyContent: 'space-between',
                  flexWrap: 'nowrap',
                  marginBottom: 4,
                },
              ]}
            >
              <Text numberOfLines={1} style={[s.label, { flex: 1, minWidth: 0 }]}>
                학습 세트 {filteredDecks.length}개
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => nav.go({ type: 'edit-deck', folderId })}
                style={[libraryStyles.textAction, { flexShrink: 0 }]}
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
                query || statusFilter !== 'all'
                  ? '조건에 맞는 세트가 없어요'
                  : '첫 세트를 만들어 보세요'
              }
            />
            {query || statusFilter !== 'all' ? (
              <Button
                title="검색 및 필터 초기화"
                tone="secondary"
                onPress={() => {
                  setQuery('');
                  setStatusFilter('all');
                }}
              />
            ) : (
              <Button
                title="학습 세트 만들기"
                onPress={() => nav.go({ type: 'edit-deck', folderId })}
              />
            )}
          </View>
        }
        renderItem={({ item: deck }) => (
          <View style={collectionGrid.itemStyle}>
            <DeckTile deck={deck} nav={nav} />
          </View>
        )}
      />
      {isFolderActionsOpen && currentFolder && (
        <Sheet title="폴더 관리" onClose={() => setIsFolderActionsOpen(false)}>
          <Button
            title="폴더 수정"
            tone="secondary"
            onPress={() => {
              setIsFolderActionsOpen(false);
              setIsEditFolderOpen(true);
            }}
          />
          <Button
            title="폴더 삭제"
            tone="danger"
            onPress={() =>
              confirm(
                '폴더를 삭제할까요?',
                '안에 있는 덱은 미분류로 이동하며 카드는 유지됩니다.',
                async () => {
                  await store.deleteFolder(currentFolder.id);
                  setIsFolderActionsOpen(false);
                  nav.back();
                }
              )
            }
          />
        </Sheet>
      )}
      {isEditFolderOpen && (
        <FolderForm
          id={folderId}
          onClose={() => setIsEditFolderOpen(false)}
          onSaved={() => setIsEditFolderOpen(false)}
        />
      )}
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    filterChip: {
      minHeight: 38,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.control + 2,
      backgroundColor: colors.subtle,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipActive: {
      backgroundColor: colors.pale,
      borderColor: colors.accentBorder,
      boxShadow: `0px 1px 2px ${colors.shadow}`,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.muted,
    },
    filterChipTextActive: {
      fontWeight: '700',
      color: colors.primary,
    },
  });
