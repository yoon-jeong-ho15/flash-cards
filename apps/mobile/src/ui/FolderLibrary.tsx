import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { sortSets } from '../core/content';
import { store, useStore } from '../platform/runtime';
import { CollectionIcon, CollectionSurface } from './CollectionSurface';
import { SetTile } from './SetTile';
import { Icon } from './Icon';
import { Button, Empty, Select, attempt } from './kit';
import { setSortOptions } from './libraryShared';
import type { Navigation } from './navigation';
import { useUI } from './theme';
import { Text } from './Typography';
import { useCollectionGrid } from './useCollectionGrid';

/** Displays folders and unfiled sets in the library tab. */
export function FolderLibrary({
  nav,
  onNewFolder,
}: {
  nav: Navigation;
  onNewFolder: () => void;
  onSets?: () => void;
}) {
  const { colors, s } = useUI();
  const { folders, sets, preferences } = useStore();
  const collectionGrid = useCollectionGrid('list');
  const folderSortOption = preferences.folderSort || 'date-desc';
  const sortedFolders = sortSets(folders, folderSortOption);
  const existingFolderIds = new Set(folders.map((folder) => folder.id));
  const unfiledSets = sortSets(
    sets.filter((cardSet) => !cardSet.folderId || !existingFolderIds.has(cardSet.folderId)),
    preferences.setSort || 'date-desc'
  );

  return (
    <FlatList
      key={collectionGrid.columns}
      numColumns={collectionGrid.columns}
      columnWrapperStyle={
        collectionGrid.columns > 1 ? collectionGrid.rowStyle : undefined
      }
      contentContainerStyle={[s.page, { gap: 0 }]}
      ListHeaderComponentStyle={{ marginBottom: 12 }}
      data={sortedFolders}
      keyExtractor={(folder) => folder.id}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View style={[s.row, { flexWrap: 'nowrap' }]}>
            <Select
              label="폴더 정렬"
              value={folderSortOption}
              options={setSortOptions}
              onChange={(value) => {
                void attempt(() => store.setPreferences({ folderSort: value }));
              }}
            />
            <Button title="새 폴더" icon="plus" onPress={onNewFolder} />
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
              폴더 {sortedFolders.length}개
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        !unfiledSets.length && !sortedFolders.length ? (
          <Empty title="아직 학습 자료가 없어요" />
        ) : undefined
      }
      ListFooterComponent={
        <View style={{ gap: 12, marginTop: sortedFolders.length ? 12 : 0 }}>
          <View
            style={[
              s.row,
              { justifyContent: 'space-between', flexWrap: 'nowrap' },
            ]}
          >
            <Text numberOfLines={1} style={[s.h2, { flex: 1 }]}>
              미분류 세트 {unfiledSets.length}개
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 미분류 세트 만들기"
              onPress={() => nav.go({ type: 'edit-set' })}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="plus" size={16} />
              <Text style={[s.label, { color: colors.primary }]}>새 세트</Text>
            </Pressable>
          </View>
          <View style={collectionGrid.wrapStyle}>
            {unfiledSets.map((cardSet) => (
              <View key={cardSet.id} style={collectionGrid.itemStyle}>
                <SetTile set={cardSet} nav={nav} />
              </View>
            ))}
          </View>
        </View>
      }
      renderItem={({ item: folder }) => (
        <View style={collectionGrid.itemStyle}>
          <Pressable
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`${folder.title} 폴더 열기`}
            onPress={() => nav.go({ type: 'folder', folderId: folder.id })}
          >
            {({ pressed }) => (
              <CollectionSurface
                pressed={pressed}
                kind="folder"
                style={{ minHeight: 144 }}
              >
                <View style={{ flex: 1, gap: 10 }}>
                  <View
                    style={[
                      s.row,
                      { justifyContent: 'space-between', flexWrap: 'nowrap' },
                    ]}
                  >
                    <CollectionIcon kind="folder" />
                    <Icon name="chevron" size={18} color={colors.icon} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.h2}>{folder.title}</Text>
                    <Text style={s.muted}>
                      학습 세트{' '}
                      {sets.filter((cardSet) => cardSet.folderId === folder.id).length}개
                    </Text>
                  </View>
                </View>
                {Boolean(folder.description) && (
                  <Text style={s.muted}>{folder.description}</Text>
                )}
              </CollectionSurface>
            )}
          </Pressable>
        </View>
      )}
    />
  );
}
