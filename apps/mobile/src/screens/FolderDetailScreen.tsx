import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFlashcardStore } from '../store/flashcardStore';
import { Header } from '../components/common/Header';
import { DeckCard } from '../components/deck/DeckCard';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FolderModal } from '../components/folder/FolderModal';
import { formatDate } from '../utils/textUtils';
import type { DeckSortOption } from '@flashcards/types';

interface FolderDetailScreenProps {
  folderId: string;
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onCreateDeckInFolder: (folderId: string) => void;
  onBack: () => void;
}

export const FolderDetailScreen: React.FC<FolderDetailScreenProps> = ({
  folderId,
  onNavigateDeck,
  onStartStudy,
  onCreateDeckInFolder,
  onBack,
}) => {
  const { folders, decks, cards, deleteFolder } = useFlashcardStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<DeckSortOption>('date-desc');

  const folder = useMemo(() => folders.find((f) => f.id === folderId), [folders, folderId]);
  const folderDecks = useMemo(() => decks.filter((d) => d.folderId === folderId), [decks, folderId]);

  const sortedDecks = useMemo(() => {
    const list = [...folderDecks];
    switch (sortBy) {
      case 'name-asc':
        return list.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
      case 'name-desc':
        return list.sort((a, b) => b.title.localeCompare(a.title, 'ko'));
      case 'date-asc':
        return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      case 'date-desc':
      default:
        return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  }, [folderDecks, sortBy]);

  if (!folder) {
    return (
      <View style={styles.container}>
        <Header title="폴더 상세" onBack={onBack} />
        <View style={styles.notFoundContent}>
          <Text style={styles.notFoundText}>존재하지 않는 폴더입니다.</Text>
          <Button variant="default" onPress={onBack}>
            대시보드로 돌아가기
          </Button>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    deleteFolder(folder.id, false);
    setShowDeleteConfirm(false);
    onBack();
  };

  return (
    <View style={styles.container}>
      <Header
        title={folder.title}
        subtitle={`소속 덱 ${folderDecks.length}개`}
        onBack={onBack}
        rightActions={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.iconBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.iconBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 폴더 메인 정보 카드 */}
        <View style={styles.folderCard}>
          <View style={styles.folderHeaderRow}>
            <View style={styles.folderIconBox}>
              <Text style={styles.folderEmoji}>📁</Text>
            </View>
            <View style={styles.folderInfo}>
              <Badge variant="secondary" style={styles.badgeStyle}>
                폴더
              </Badge>
              <Text style={styles.folderTitle}>{folder.title}</Text>
            </View>
          </View>

          {folder.description && (
            <Text style={styles.folderDesc}>{folder.description}</Text>
          )}

          <View style={styles.folderMetaRow}>
            <Text style={styles.metaText}>덱 {folderDecks.length}개</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>생성일: {formatDate(folder.createdAt)}</Text>
          </View>

          <View style={styles.ctaRow}>
            <Button
              variant="default"
              size="md"
              onPress={() => onCreateDeckInFolder(folder.id)}
              style={styles.addDeckBtn}
            >
              + 이 폴더에 새 덱 추가
            </Button>
          </View>
        </View>

        {/* 소속 덱 목록 헤더 */}
        <View style={styles.listHeaderRow}>
          <View style={styles.listTitleContainer}>
            <Text style={styles.listTitle}>소속 카드 덱</Text>
            <Badge variant="secondary">{folderDecks.length}</Badge>
          </View>

          {folderDecks.length > 0 && (
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => {
                setSortBy((prev) =>
                  prev === 'date-desc'
                    ? 'name-asc'
                    : prev === 'name-asc'
                    ? 'date-asc'
                    : 'date-desc'
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.sortBtnText}>
                {sortBy === 'date-desc' ? '최신순' : sortBy === 'name-asc' ? '이름순' : '오래된순'} ⟳
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 덱 목록 그리드 */}
        {sortedDecks.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="이 폴더에 아직 덱이 없습니다."
            description="새로운 플래시카드 덱을 만들어 추가해 보세요."
            action={
              <Button
                variant="default"
                size="sm"
                onPress={() => onCreateDeckInFolder(folder.id)}
              >
                새 덱 만들기
              </Button>
            }
          />
        ) : (
          <View>
            {sortedDecks.map((deck) => {
              const deckCards = cards.filter((c) => c.deckId === deck.id);
              const learned = deckCards.filter((c) => c.learned).length;

              return (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  cardsCount={deckCards.length}
                  learnedCount={learned}
                  showFolderBadge={false}
                  onPress={() => onNavigateDeck(deck.id)}
                  onStartStudy={() => onStartStudy(deck.id)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 폴더 수정 모달 */}
      <FolderModal
        isOpen={showEditModal}
        folderId={folder.id}
        onClose={() => setShowEditModal(false)}
      />

      {/* 폴더 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="폴더 삭제"
        message={`'${folder.title}' 폴더를 삭제하시겠습니까?\n폴더 안의 덱들은 삭제되지 않고 미분류(루트)로 안전하게 이동됩니다.`}
        confirmText="폴더 삭제"
        isDanger={true}
      />
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
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 14,
  },
  notFoundContent: {
    padding: 40,
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 16,
  },
  folderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  folderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  folderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  folderEmoji: {
    fontSize: 22,
  },
  folderInfo: {
    flex: 1,
  },
  badgeStyle: {
    marginBottom: 2,
  },
  folderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  folderDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginVertical: 10,
  },
  folderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 14,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metaDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  ctaRow: {
    width: '100%',
  },
  addDeckBtn: {
    width: '100%',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
});
