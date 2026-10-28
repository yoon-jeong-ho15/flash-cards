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
import { DeckCardPreviewItem } from '../components/deck/DeckCardPreviewItem';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { ProgressBar } from '../components/common/ProgressBar';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { MoveDeckModal } from '../components/deck/MoveDeckModal';

interface DeckDetailScreenProps {
  deckId: string;
  onStartStudy: (deckId: string) => void;
  onEditDeck: (deckId: string, focusCardId?: string) => void;
  onNavigateFolder: (folderId: string) => void;
  onBack: () => void;
}

export const DeckDetailScreen: React.FC<DeckDetailScreenProps> = ({
  deckId,
  onStartStudy,
  onEditDeck,
  onNavigateFolder,
  onBack,
}) => {
  const { decks, cards, folders, deleteDeck, resetDeckProgress } = useFlashcardStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [cardFilter, setCardFilter] = useState<'all' | 'unlearned' | 'learned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const deck = useMemo(() => decks.find((d) => d.id === deckId), [decks, deckId]);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deckId), [cards, deckId]);
  const folder = useMemo(
    () => (deck?.folderId ? folders.find((f) => f.id === deck.folderId) : null),
    [folders, deck]
  );

  const learnedCount = deckCards.filter((c) => c.learned).length;
  const unlearnedCount = deckCards.length - learnedCount;
  const progressPercent =
    deckCards.length > 0 ? Math.round((learnedCount / deckCards.length) * 100) : 0;

  // 카드 필터링 및 검색
  const filteredCards = useMemo(() => {
    let result = deckCards;
    if (cardFilter === 'learned') {
      result = result.filter((c) => c.learned);
    } else if (cardFilter === 'unlearned') {
      result = result.filter((c) => !c.learned);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.termRichText.toLowerCase().includes(q) ||
          c.definitionRichText.toLowerCase().includes(q)
      );
    }
    return result;
  }, [deckCards, cardFilter, searchQuery]);

  // 원본 덱 내에서의 카드 순번(0-based 인덱스) 매핑 (검색/필터 시에도 원래 번호 유지)
  const cardIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    deckCards.forEach((c, index) => {
      map.set(c.id, index);
    });
    return map;
  }, [deckCards]);

  if (!deck) {
    return (
      <View style={styles.container}>
        <Header title="덱 상세" onBack={onBack} />
        <View style={styles.notFoundContent}>
          <Text style={styles.notFoundText}>존재하지 않는 덱입니다.</Text>
          <Button variant="default" onPress={onBack}>
            대시보드로 돌아가기
          </Button>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    deleteDeck(deck.id);
    setShowDeleteConfirm(false);
    onBack();
  };

  const handleReset = () => {
    resetDeckProgress(deck.id);
    setShowResetConfirm(false);
  };

  return (
    <View style={styles.container}>
      <Header
        title={deck.title}
        subtitle={`${deckCards.length}개 카드`}
        onBack={onBack}
        rightActions={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => onEditDeck(deck.id)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.iconBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMoveModal(true)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.iconBtnText}>📁</Text>
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
        {/* 상단 덱 요약 카드 */}
        <View style={styles.summaryCard}>
          {folder && (
            <TouchableOpacity
              onPress={() => onNavigateFolder(folder.id)}
              style={styles.folderTag}
              activeOpacity={0.7}
            >
              <Text style={styles.folderTagText}>📁 {folder.title}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.deckTitle}>{deck.title}</Text>
          {deck.description ? (
            <Text style={styles.deckDesc}>{deck.description}</Text>
          ) : null}

          {/* 진행도 통계 수치 */}
          <View style={styles.statsSection}>
            <View style={styles.statLine}>
              <Text style={styles.statLabel}>총 카드 수</Text>
              <Text style={styles.statVal}>{deckCards.length}개</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={[styles.statLabel, { color: '#10B981' }]}>✓ 암기 완료</Text>
              <Text style={[styles.statVal, { color: '#10B981' }]}>
                {learnedCount}개 ({progressPercent}%)
              </Text>
            </View>
            <View style={styles.statLine}>
              <Text style={[styles.statLabel, { color: '#F59E0B' }]}>⏳ 학습 필요</Text>
              <Text style={[styles.statVal, { color: '#F59E0B' }]}>{unlearnedCount}개</Text>
            </View>
            <View style={styles.progressWrapper}>
              <ProgressBar
                value={progressPercent}
                size="md"
                color={progressPercent === 100 ? '#10B981' : '#4F46E5'}
              />
            </View>
          </View>

          {/* 메인 학습 CTA 버튼 */}
          <View style={styles.ctaGroup}>
            <Button
              variant="default"
              size="lg"
              onPress={() => onStartStudy(deck.id)}
              disabled={deckCards.length === 0}
              style={styles.mainStudyBtn}
            >
              플래시카드 학습 시작 ▶
            </Button>

            <View style={styles.secondaryBtnRow}>
              <Button
                variant="outline"
                size="sm"
                onPress={() => onEditDeck(deck.id)}
                style={styles.secondaryBtn}
              >
                + 카드 추가 / 편집
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => setShowResetConfirm(true)}
                style={styles.secondaryBtn}
              >
                진행도 초기화 🔄
              </Button>
            </View>
          </View>

          {/* 카드 필터 탭 */}
          {deckCards.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>카드 필터</Text>
              <View style={styles.filterTabs}>
                <TouchableOpacity
                  style={[styles.filterTab, cardFilter === 'all' && styles.filterTabActive]}
                  onPress={() => setCardFilter('all')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      cardFilter === 'all' && styles.filterTabTextActive,
                    ]}
                  >
                    전체 ({deckCards.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    cardFilter === 'unlearned' && styles.filterTabActive,
                  ]}
                  onPress={() => setCardFilter('unlearned')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      cardFilter === 'unlearned' && [
                        styles.filterTabTextActive,
                        { color: '#F59E0B' },
                      ],
                    ]}
                  >
                    학습중 ({unlearnedCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    cardFilter === 'learned' && styles.filterTabActive,
                  ]}
                  onPress={() => setCardFilter('learned')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      cardFilter === 'learned' && [
                        styles.filterTabTextActive,
                        { color: '#10B981' },
                      ],
                    ]}
                  >
                    완료 ({learnedCount})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 카드 목록 헤더 및 검색창 */}
        <View style={styles.cardListHeader}>
          <View style={styles.listTitleRow}>
            <Text style={styles.listSectionTitle}>
              {cardFilter === 'learned'
                ? '암기 완료된 카드'
                : cardFilter === 'unlearned'
                ? '학습 필요한 카드'
                : '이 덱의 모든 카드'}
            </Text>
            <Badge variant="secondary">{filteredCards.length}</Badge>
          </View>

          <Input
            placeholder="카드 내용 검색..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchContainer}
          />
        </View>

        {/* 카드 프리뷰 리스트 */}
        {filteredCards.length === 0 ? (
          <EmptyState
            icon="🗃️"
            title={
              searchQuery
                ? '검색 결과와 일치하는 카드가 없습니다.'
                : cardFilter === 'learned'
                ? '아직 암기 완료된 카드가 없습니다.'
                : cardFilter === 'unlearned'
                ? '모든 카드를 마스터했습니다! 🎉'
                : '등록된 카드가 없습니다.'
            }
            description={
              deckCards.length === 0
                ? '카드를 추가하여 나만의 플래시카드 덱을 완성해 보세요.'
                : '필터 조건을 변경하거나 새로운 카드를 추가해 보세요.'
            }
            action={
              deckCards.length === 0 ? (
                <Button variant="default" size="sm" onPress={() => onEditDeck(deck.id)}>
                  카드 추가하기
                </Button>
              ) : cardFilter !== 'all' ? (
                <Button variant="outline" size="sm" onPress={() => setCardFilter('all')}>
                  전체 카드 보기
                </Button>
              ) : undefined
            }
          />
        ) : (
          <View>
            {filteredCards.map((card, index) => (
              <DeckCardPreviewItem
                key={card.id}
                card={card}
                index={cardIndexMap.get(card.id) ?? index}
                onEdit={(cId) => onEditDeck(deck.id, cId)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 덱 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="덱 삭제"
        message={`'${deck.title}' 덱을 삭제하시겠습니까?\n덱에 포함된 모든 카드(${deckCards.length}개)도 함께 삭제되며, 이 작업은 취소할 수 없습니다.`}
        confirmText="덱 삭제"
        isDanger={true}
      />

      {/* 진행도 초기화 확인 모달 */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="학습 진행도 초기화"
        message={`'${deck.title}' 덱의 학습 진행도를 처음으로 되돌리시겠습니까?\n모든 카드가 '학습 대기' 상태로 변경됩니다.`}
        confirmText="초기화 실행"
        isDanger={false}
      />

      {/* 덱 이동 모달 */}
      <MoveDeckModal
        isOpen={showMoveModal}
        deckId={deck.id}
        currentFolderId={deck.folderId}
        onClose={() => setShowMoveModal(false)}
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
  headerRightActions: {
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  folderTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  folderTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
  },
  deckDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 6,
  },
  statsSection: {
    marginVertical: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  statVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressWrapper: {
    marginTop: 4,
  },
  ctaGroup: {
    gap: 8,
  },
  mainStudyBtn: {
    width: '100%',
  },
  secondaryBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
  },
  filterSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  cardListHeader: {
    marginBottom: 12,
    gap: 8,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchContainer: {
    marginTop: 4,
  },
});
