import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFlashcardStore } from '../store/flashcardStore';
import { Header } from '../components/common/Header';
import { FolderCard } from '../components/folder/FolderCard';
import { EmptyState } from '../components/common/EmptyState';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

interface AllFoldersScreenProps {
  onNavigateFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onBack: () => void;
}

export const AllFoldersScreen: React.FC<AllFoldersScreenProps> = ({
  onNavigateFolder,
  onCreateFolder,
  onBack,
}) => {
  const { folders, decks } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const q = searchQuery.toLowerCase();
    return folders.filter((f) => {
      const titleMatch = f.title.toLowerCase().includes(q);
      const descMatch = f.description?.toLowerCase().includes(q);
      return titleMatch || descMatch;
    });
  }, [folders, searchQuery]);

  return (
    <View style={styles.container}>
      <Header
        title="모든 폴더"
        subtitle="전체 폴더 목록을 조회하고 관리합니다"
        onBack={onBack}
        rightActions={
          <Button
            variant="default"
            size="sm"
            onPress={onCreateFolder}
          >
            + 새 폴더
          </Button>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchRow}>
          <View style={styles.countBadgeRow}>
            <Text style={styles.countLabel}>총 폴더</Text>
            <Badge variant="secondary">{filteredFolders.length}</Badge>
          </View>
          <View style={styles.inputContainer}>
            <Input
              placeholder="폴더 이름, 설명 검색..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {filteredFolders.length === 0 ? (
          <EmptyState
            icon="📁"
            title={searchQuery ? '검색 결과와 일치하는 폴더가 없습니다.' : '등록된 폴더가 없습니다.'}
            description={
              searchQuery
                ? '다른 검색어로 다시 시도해 보세요.'
                : '폴더를 생성하여 관련된 카드 덱을 체계적으로 묶어보세요.'
            }
            action={
              !searchQuery ? (
                <Button variant="default" size="sm" onPress={onCreateFolder}>
                  새 폴더 만들기
                </Button>
              ) : undefined
            }
          />
        ) : (
          <View>
            {filteredFolders.map((folder) => {
              const count = decks.filter((d) => d.folderId === folder.id).length;
              return (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  decksCount={count}
                  onPress={() => onNavigateFolder(folder.id)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  searchRow: {
    marginBottom: 16,
    gap: 10,
  },
  countBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputContainer: {
    width: '100%',
  },
});
