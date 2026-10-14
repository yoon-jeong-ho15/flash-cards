import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { Card } from '@flashcards/types';
import { stripHtml } from '../../utils/textUtils';
import { Badge } from '../common/Badge';

interface DeckCardPreviewItemProps {
  card: Card;
  index: number;
  onEdit?: (cardId: string) => void;
}

export const DeckCardPreviewItem: React.FC<DeckCardPreviewItemProps> = ({
  card,
  index,
  onEdit,
}) => {
  const frontImage = card.frontImageUrl;
  const backImage = card.backImageUrl || card.imageUrl;

  return (
    <View style={styles.cardItem}>
      {/* 상단 헤더: 카드 번호 & 학습 상태 뱃지 */}
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>#{index + 1}</Text>
        </View>

        <View style={styles.headerRight}>
          <Badge variant={card.learned ? 'success' : 'warning'}>
            {card.learned ? '✓ 암기완료' : '학습중'}
          </Badge>
          {onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(card.id)}
              style={styles.editBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>편집</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 앞면 영역 */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionLabel}>앞면 (개념/질문)</Text>
        {frontImage ? (
          <Image
            source={{ uri: frontImage }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : null}
        <Text style={styles.termText}>{stripHtml(card.termRichText)}</Text>
      </View>

      <View style={styles.divider} />

      {/* 뒷면 영역 */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionLabel}>뒷면 (정답/해설)</Text>
        {backImage ? (
          <Image
            source={{ uri: backImage }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : null}
        <Text style={styles.definitionText}>
          {stripHtml(card.definitionRichText)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  numberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  contentSection: {
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  termText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  definitionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
});
