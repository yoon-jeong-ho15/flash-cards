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
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import type { DeckSortOption } from '@flashcards/types';

interface AllDecksScreenProps {
  onNavigateDeck: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onCreateDeck: () => void;
  onBack: () => void;
}

export const AllDecksScreen: React.FC<AllDecksScreenProps> = ({
  onNavigateDeck,
  onStartStudy,
  onCreateDeck,
  onBack,
}) => {
  const { decks, folders, cards } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'root'>('all');
  const [sortBy, setSortBy] = useState<DeckSortOption>('date-desc');

  const filteredDecks = useMemo(() => {
    let result = decks;

    if (activeTab === 'root') {
      result = result.filter((d) => !d.folderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => {
        const titleMatch = d.title.toLowerCase().includes(q);
        const descMatch = d.description?.toLowerCase().includes(q);
        const cardMatch = cards
          .filter((c) => c.deckId === d.id)
          .some(
            (c) =>
              c.termRichText.toLowerCase().includes(q) ||
              c.definitionRichText.toLowerCase().includes(q)
          );
        return titleMatch || descMatch || cardMatch;
      });
    }

    const list = [...result];
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
  }, [decks, cards, searchQuery, activeTab, sortBy]);

  return (
    <View style={styles.container}>
      <Header
        title="모든 덱"
        subtitle="전체 플래시카드 덱을 조회하고 학습을 시작하세요"
        onBack={onBack}
        rightActions={
          <Button
            variant="default"
            size="sm"
            onPress={onCreateDeck}
          >
            + 새 덱
          </Button>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 컨트롤 영역: 검색, 탭 필터, 정렬 */}
        <View style={styles.controls}>
          <Input
            placeholder="덱 제목, 카드 단어 검색..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.filterRow}>
            {/* 탭 필터 */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                  전체 ({decks.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'root' && styles.tabItemActive]}
                onPress={() => setActiveTab('root')}
              >
                <Text style={[styles.tabText, activeTab === 'root' && styles.tabTextActive]}>
                  미분류
                </Text>
              </TouchableOpacity>
            </View>

            {/* 정렬 버튼 토글 */}
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
                정렬: {sortBy === 'date-desc' ? '최신순' : sortBy === 'name-asc' ? '이름순' : '오래된순'} ⟳
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 덱 목록 그리드 */}
        {filteredDecks.length === 0 ? (
          <EmptyState
            icon="📖"
            title={searchQuery ? '검색 결과와 일치하는 덱이 없습니다.' : '등록된 덱이 없습니다.'}
            description={
              searchQuery
                ? '다른 검색어로 다시 시도해 보세요.'
                : '새로운 카드 덱을 생성하여 플래시카드 학습을 시작해 보세요.'
            }
            action={
              !searchQuery ? (
                <Button variant="default" size="sm" onPress={onCreateDeck}>
                  새 덱 만들기
                </Button>
              ) : undefined
            }
          />
        ) : (
          <View>
            {filteredDecks.map((deck) => {
              const deckCards = cards.filter((c) => c.deckId === deck.id);
              const learned = deckCards.filter((c) => c.learned).length;
              const parentFolder = deck.folderId
                ? folders.find((f) => f.id === deck.folderId)
                : null;

              return (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  cardsCount={deckCards.length}
                  learnedCount={learned}
                  parentFolderTitle={parentFolder?.title}
                  onPress={() => onNavigateDeck(deck.id)}
                  onStartStudy={() => onStartStudy(deck.id)}
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
  controls: {
    marginBottom: 16,
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
});
