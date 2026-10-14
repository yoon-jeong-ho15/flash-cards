import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { Deck } from '@flashcards/types';
import { Button } from '../common/Button';

interface StudyCompleteProps {
  deck: Deck;
  totalCards: number;
  difficultCardsCount: number;
  roundCount: number;
  onRestartAll: () => void;
  onRestartDifficultOnly: () => void;
  onBackToDeck: () => void;
}

export const StudyComplete: React.FC<StudyCompleteProps> = ({
  deck,
  totalCards,
  difficultCardsCount,
  roundCount,
  onRestartAll,
  onRestartDifficultOnly,
  onBackToDeck,
}) => {
  const firstTryMastered = Math.max(0, totalCards - difficultCardsCount);
  const accuracyRate = totalCards > 0 ? Math.round((firstTryMastered / totalCards) * 100) : 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 트로피 아이콘 */}
      <View style={styles.trophyWrapper}>
        <Text style={styles.trophyIcon}>🏆</Text>
      </View>

      <Text style={styles.title}>학습을 완료했습니다! 🎉</Text>
      <Text style={styles.subtitle}>
        &lsquo;{deck.title}&rsquo; 덱의 모든 카드를 성공적으로 마스터했습니다.
      </Text>

      {/* 3열 통계 지표 카드 */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{totalCards}</Text>
          <Text style={styles.statLabel}>완료 카드</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#4F46E5' }]}>{accuracyRate}%</Text>
          <Text style={styles.statLabel}>정답률</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{roundCount}</Text>
          <Text style={styles.statLabel}>진행 라운드</Text>
        </View>
      </View>

      {/* 액션 버튼 그룹 */}
      <View style={styles.actions}>
        {difficultCardsCount > 0 && (
          <Button
            variant="warning"
            size="lg"
            onPress={onRestartDifficultOnly}
            style={styles.actionBtn}
          >
            틀렸던 카드만 다시 풀기 ({difficultCardsCount}개)
          </Button>
        )}

        <Button
          variant="default"
          size="lg"
          onPress={onRestartAll}
          style={styles.actionBtn}
        >
          전체 다시 학습하기
        </Button>

        <Button
          variant="outline"
          size="lg"
          onPress={onBackToDeck}
          style={styles.actionBtn}
        >
          덱으로 돌아가기
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  trophyWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    marginBottom: 20,
  },
  trophyIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    width: '100%',
  },
});
