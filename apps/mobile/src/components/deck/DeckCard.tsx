import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Deck } from '@flashcards/types';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '../common/Button';

interface DeckCardProps {
  deck: Deck;
  cardsCount: number;
  learnedCount: number;
  parentFolderTitle?: string | null;
  showFolderBadge?: boolean;
  onPress: () => void;
  onStartStudy: () => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  cardsCount,
  learnedCount,
  parentFolderTitle,
  showFolderBadge = true,
  onPress,
  onStartStudy,
}) => {
  const percent = cardsCount > 0 ? Math.round((learnedCount / cardsCount) * 100) : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        {showFolderBadge && parentFolderTitle ? (
          <Badge variant="secondary" style={styles.folderBadge}>
            📁 {parentFolderTitle}
          </Badge>
        ) : (
          <View />
        )}
        <Badge variant={percent === 100 && cardsCount > 0 ? 'success' : 'default'}>
          {cardsCount} 카드
        </Badge>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {deck.title}
      </Text>

      {deck.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {deck.description}
        </Text>
      ) : null}

      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>
            완료: <Text style={styles.highlightVal}>{learnedCount}</Text> / {cardsCount}
          </Text>
          <Text style={styles.progressPercent}>{percent}%</Text>
        </View>
        <ProgressBar value={percent} size="sm" color={percent === 100 ? '#10B981' : '#4F46E5'} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.detailLinkText}>상세 보기 →</Text>
        <Button
          variant="default"
          size="sm"
          onPress={onStartStudy}
          disabled={cardsCount === 0}
          style={styles.studyBtn}
        >
          학습 시작 ▶
        </Button>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  folderBadge: {
    maxWidth: '65%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  progressSection: {
    marginTop: 6,
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  highlightVal: {
    fontWeight: '700',
    color: '#10B981',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  studyBtn: {
    paddingHorizontal: 12,
  },
});
