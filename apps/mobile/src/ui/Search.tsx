import React, { useDeferredValue, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { cardMatches, matches, sortDecks } from '../core/content';
import { useStore } from '../platform/runtime';
import { CollectionLayoutToggle } from './CollectionLayoutToggle';
import { DeckTile } from './DeckTile';
import { Button, Empty, Field } from './kit';
import { libraryStyles } from './libraryShared';
import type { Navigation } from './navigation';
import { useUI } from './theme';
import { Text } from './Typography';
import { useCollectionGrid } from './useCollectionGrid';

/** Searches across folders, decks, and card content. */
export function Search({ nav }: { nav: Navigation }) {
  const { s } = useUI();
  const { decks, folders, cards } = useStore();
  const collectionGrid = useCollectionGrid();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const matchingDecks = sortDecks(
    decks.filter(
      (deck) =>
        matches(`${deck.title} ${deck.description || ''}`, deferredQuery) ||
        cards.some(
          (card) => card.deckId === deck.id && cardMatches(card, deferredQuery)
        )
    ),
    'date-desc'
  );
  const matchingFolders = deferredQuery.trim()
    ? folders.filter((folder) =>
        matches(`${folder.title} ${folder.description || ''}`, deferredQuery)
      )
    : [];

  return (
    <FlatList
      key={collectionGrid.columns}
      numColumns={collectionGrid.columns}
      columnWrapperStyle={
        collectionGrid.columns > 1 ? collectionGrid.rowStyle : undefined
      }
      data={matchingDecks}
      keyExtractor={(deck) => deck.id}
      contentContainerStyle={[s.page, { gap: 0 }]}
      ListHeaderComponentStyle={{ marginBottom: 12 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View
            style={[
              s.row,
              { justifyContent: 'space-between', flexWrap: 'nowrap' },
            ]}
          >
            <Text numberOfLines={1} style={[s.title, { flex: 1, minWidth: 0 }]}>
              검색
            </Text>
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
              onPress={() => setQuery('')}
              style={[libraryStyles.textAction, { alignSelf: 'flex-end' }]}
            >
              <Text style={s.label}>검색어 지우기</Text>
            </Pressable>
          )}
          {matchingFolders.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={s.label}>폴더 {matchingFolders.length}개</Text>
              <View style={collectionGrid.wrapStyle}>
                {matchingFolders.map((folder) => (
                  <View key={folder.id} style={collectionGrid.itemStyle}>
                    <Button
                      title={`폴더 · ${folder.title}`}
                      tone="secondary"
                      onPress={() =>
                        nav.go({ type: 'folder', folderId: folder.id })
                      }
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
            {deferredQuery.trim()
              ? `검색된 학습 세트 ${matchingDecks.length}개`
              : '최근 수정한 학습 세트'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        !matchingFolders.length ? (
          <Empty
            title={
              deferredQuery.trim()
                ? '검색 결과가 없어요'
                : '아직 학습 자료가 없어요'
            }
            detail={
              deferredQuery.trim()
                ? '다른 단어나 더 짧은 검색어로 찾아보세요.'
                : '라이브러리에서 첫 세트를 만들어 보세요.'
            }
          />
        ) : undefined
      }
      renderItem={({ item: deck }) => (
        <View style={collectionGrid.itemStyle}>
          <DeckTile deck={deck} nav={nav} />
        </View>
      )}
    />
  );
}
