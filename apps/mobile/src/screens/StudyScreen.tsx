import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { Card } from '@flashcards/types';
import { useFlashcardStore } from '../store/flashcardStore';
import { Header } from '../components/common/Header';
import { Flashcard } from '../components/study/Flashcard';
import { StudyComplete } from '../components/study/StudyComplete';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ProgressBar } from '../components/common/ProgressBar';

interface StudyScreenProps {
  deckId: string;
  onlyDifficult?: boolean;
  onExit: () => void;
  onEditDeck: (deckId: string) => void;
}

export const StudyScreen: React.FC<StudyScreenProps> = ({
  deckId,
  onlyDifficult = false,
  onExit,
  onEditDeck,
}) => {
  const { decks, cards, setCardLearned } = useFlashcardStore();

  const deck = useMemo(() => decks.find((d) => d.id === deckId), [decks, deckId]);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deckId), [cards, deckId]);

  const [queue, setQueue] = useState<Card[]>([]);
  const [masteredCards, setMasteredCards] = useState<Card[]>([]);
  const [difficultCardIds, setDifficultCardIds] = useState<Set<string>>(new Set());
  const [totalInitialCount, setTotalInitialCount] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [round, setRound] = useState<number>(1);
  const [singleCardNotice, setSingleCardNotice] = useState<boolean>(false);

  // 세션 초기화
  const initSession = useCallback(
    (filterDifficult = false) => {
      let targetCards = deckCards;
      if (filterDifficult && difficultCardIds.size > 0) {
        targetCards = deckCards.filter((c) => difficultCardIds.has(c.id));
      }

      setQueue(targetCards);
      setMasteredCards([]);
      setTotalInitialCount(targetCards.length);
      setIsFlipped(false);
      setRound(1);
      setSingleCardNotice(false);
    },
    [deckCards, difficultCardIds]
  );

  useEffect(() => {
    initSession(onlyDifficult);
  }, [deckId, onlyDifficult]);

  // 카드 뒤집기
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // "알아요 (완료)"
  const handleKnow = useCallback(() => {
    if (queue.length === 0) return;

    const currentCard = queue[0];
    const rest = queue.slice(1);

    setCardLearned(currentCard.id, true);
    setMasteredCards((prev) => [...prev, currentCard]);
    setQueue(rest);
    setIsFlipped(false);

    if (rest.length > 0 && rest.length % Math.max(1, totalInitialCount) === 0) {
      setRound((r) => r + 1);
    }
  }, [queue, totalInitialCount, setCardLearned]);

  // "몰라요 (학습 중)" - 큐 맨 뒤로 재배치
  const handleUnknown = useCallback(() => {
    if (queue.length === 0) return;

    const currentCard = queue[0];
    const rest = queue.slice(1);

    setDifficultCardIds((prev) => new Set(prev).add(currentCard.id));

    if (rest.length === 0) {
      // 1장만 남았을 때
      setSingleCardNotice(true);
      setTimeout(() => setSingleCardNotice(false), 2000);
      setIsFlipped(false);
      return;
    }

    setQueue([...rest, currentCard]);
    setIsFlipped(false);
  }, [queue]);

  if (!deck) {
    return (
      <View style={styles.container}>
        <Header title="학습하기" onBack={onExit} />
        <View style={styles.emptyView}>
          <Text style={styles.emptyText}>덱을 찾을 수 없습니다.</Text>
          <Button variant="default" onPress={onExit}>
            돌아가기
          </Button>
        </View>
      </View>
    );
  }

  if (deckCards.length === 0) {
    return (
      <View style={styles.container}>
        <Header title={deck.title} onBack={onExit} />
        <View style={styles.emptyView}>
          <EmptyState
            icon="📭"
            title="학습할 카드가 없습니다"
            description={`'${deck.title}' 덱에 카드가 아직 등록되지 않았습니다. 카드를 먼저 추가해 주세요.`}
            action={
              <Button variant="default" size="sm" onPress={() => onEditDeck(deck.id)}>
                카드 추가하기
              </Button>
            }
          />
        </View>
      </View>
    );
  }

  // 학습 완료 상태
  const isCompleted = queue.length === 0 && totalInitialCount > 0;
  if (isCompleted) {
    return (
      <View style={styles.container}>
        <Header title={deck.title} onBack={onExit} />
        <StudyComplete
          deck={deck}
          totalCards={totalInitialCount}
          difficultCardsCount={difficultCardIds.size}
          roundCount={round}
          onRestartAll={() => initSession(false)}
          onRestartDifficultOnly={() => initSession(true)}
          onBackToDeck={onExit}
        />
      </View>
    );
  }

  const currentCard = queue[0];
  const percentage =
    totalInitialCount > 0
      ? Math.round((masteredCards.length / totalInitialCount) * 100)
      : 0;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <Header
        title={deck.title}
        subtitle="플래시카드 반복 학습"
        onBack={onExit}
        rightActions={
          <View style={styles.headerStatsRow}>
            {round > 1 && (
              <Badge variant="secondary">R{round}</Badge>
            )}
            <Badge variant="warning">{queue.length} 학습중</Badge>
            <Badge variant="success">
              {masteredCards.length}/{totalInitialCount}
            </Badge>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 진행도 바 */}
        <View style={styles.progressContainer}>
          <ProgressBar value={percentage} size="md" color="#4F46E5" />
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLeftText}>
              남은 카드: <Text style={styles.progressBold}>{queue.length}개</Text>
            </Text>
            <Text style={styles.progressPercent}>{percentage}%</Text>
          </View>
        </View>

        {/* 1장 남았을 때 복습 안내 알림 */}
        {singleCardNotice && (
          <View style={styles.singleNoticeBox}>
            <Text style={styles.singleNoticeText}>
              💡 마지막 1장 남은 카드입니다. 정답을 암기할 때까지 복습하세요!
            </Text>
          </View>
        )}

        {/* 3D 플래시카드 본체 */}
        {currentCard && (
          <Flashcard
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={handleFlip}
          />
        )}

        {/* 하단 평가 버튼 (알아요 / 몰라요) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.rateBtn, styles.knowBtn]}
            onPress={handleKnow}
            activeOpacity={0.8}
          >
            <View style={styles.rateIconCircleGreen}>
              <Text style={styles.rateIconText}>👍</Text>
            </View>
            <View style={styles.rateTextContainer}>
              <Text style={styles.knowTitle}>알아요</Text>
              <Text style={styles.rateSubtitle}>마스터 완료로 이동</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rateBtn, styles.unknownBtn]}
            onPress={handleUnknown}
            activeOpacity={0.8}
          >
            <View style={styles.rateIconCircleAmber}>
              <Text style={styles.rateIconText}>🔄</Text>
            </View>
            <View style={styles.rateTextContainer}>
              <Text style={styles.unknownTitle}>몰라요</Text>
              <Text style={styles.rateSubtitle}>맨 뒤로 보내 재학습</Text>
            </View>
          </TouchableOpacity>
        </View>
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
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyView: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 10,
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLeftText: {
    fontSize: 12,
    color: '#64748B',
  },
  progressBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  singleNoticeBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  singleNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  knowBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  unknownBtn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  rateIconCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateIconCircleAmber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateIconText: {
    fontSize: 16,
  },
  rateTextContainer: {
    flex: 1,
  },
  knowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
  },
  unknownTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B45309',
  },
  rateSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
