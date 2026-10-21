import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import type { Card } from '@flashcards/types';
import { stripHtml } from '../../utils/textUtils';
import { Badge } from '../common/Badge';

interface FlashcardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  card,
  isFlipped,
  onFlip,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFlipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, animatedValue]);

  // 앞면 회전 인터폴레이션 (0deg -> 180deg)
  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  // 뒷면 회전 인터폴레이션 (180deg -> 360deg)
  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  const frontImage = card.frontImageUrl;
  const backImage = card.backImageUrl || card.imageUrl;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onFlip}
      style={styles.cardContainer}
    >
      {/* 앞면 (Term / 질문) */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.frontCard,
          {
            opacity: frontOpacity,
            transform: [
              { perspective: 1000 },
              { rotateY: frontInterpolate },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Badge variant="secondary">앞면 · 개념 / 질문</Badge>
          <Text style={styles.flipGuideText}>탭하여 뒤집기 🔄</Text>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {frontImage && (
            <Image
              source={{ uri: frontImage }}
              style={styles.cardImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.termMainText}>{stripHtml(card.termRichText)}</Text>
        </ScrollView>

        <View style={styles.cardFooter}>
          <Text style={styles.footerHint}>
            {frontImage ? '🖼️ 이미지 첨부됨  •  ' : ''}카드를 탭하여 정답 확인
          </Text>
        </View>
      </Animated.View>

      {/* 뒷면 (Definition / 정답 & 해설) */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.backCard,
          {
            opacity: backOpacity,
            transform: [
              { perspective: 1000 },
              { rotateY: backInterpolate },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Badge variant="warning">뒷면 · 정답 / 해설</Badge>
          <Text style={styles.flipGuideText}>앞면 보기 🔄</Text>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {backImage && (
            <Image
              source={{ uri: backImage }}
              style={styles.cardImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.definitionMainText}>
            {stripHtml(card.definitionRichText)}
          </Text>
        </ScrollView>

        <View style={styles.cardFooter}>
          <Text style={styles.footerHint}>
            {backImage ? '🖼️ 이미지 첨부됨  •  ' : ''}다시 탭하면 질문으로 이동
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
    marginVertical: 12,
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    backfaceVisibility: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  frontCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  backCard: {
    backgroundColor: '#FAFAFD',
    borderColor: '#4F46E5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  flipGuideText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  scrollBody: {
    flex: 1,
    marginVertical: 12,
  },
  scrollBodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  termMainText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 28,
  },
  definitionMainText: {
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'left',
    lineHeight: 24,
    fontWeight: '500',
    width: '100%',
  },
  cardFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  footerHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
