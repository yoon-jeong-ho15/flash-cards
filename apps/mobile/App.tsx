import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import type { Deck, Card } from '@flashcards/types';

// 샘플 데모 데이터 (공통 Card, Deck 타입 준수)
const DEMO_DECKS: Deck[] = [
  {
    id: 'deck-1',
    title: 'CS 네트워크 핵심 요약',
    description: 'OSI 7계층, TCP/UDP, HTTP/HTTPS 핵심',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'deck-2',
    title: 'React & React Native',
    description: 'Hook, 라이프사이클, 리렌더링 최적화',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const DEMO_CARDS: Card[] = [
  {
    id: 'card-1',
    deckId: 'deck-1',
    termRichText: '<p>TCP와 UDP의 가장 큰 차이점은?</p>',
    definitionRichText: '<p>TCP는 연결 지향적이고 신뢰성을 보장하며, UDP는 비연결형으로 빠른 속도를 보장합니다.</p>',
    learned: false,
  },
  {
    id: 'card-2',
    deckId: 'deck-1',
    termRichText: '<p>HTTP 3의 주요 전송 계층 프로토콜은?</p>',
    definitionRichText: '<p>UDP 기반의 QUIC 프로토콜을 사용합니다.</p>',
    learned: false,
  },
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

export default function App() {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCards = DEMO_CARDS.filter((c) => c.deckId === selectedDeck?.id);
  const currentCard = currentCards[cardIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedDeck ? selectedDeck.title : '플래시카드 (Flashcards)'}
        </Text>
        {selectedDeck && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedDeck(null);
              setCardIndex(0);
              setIsFlipped(false);
            }}
          >
            <Text style={styles.backButtonText}>덱 목록</Text>
          </TouchableOpacity>
        )}
      </View>

      {!selectedDeck ? (
        /* 덱 목록 뷰 */
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>학습할 덱을 선택하세요</Text>
          <FlatList
            data={DEMO_DECKS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.deckCard}
                onPress={() => setSelectedDeck(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.deckTitle}>{item.title}</Text>
                <Text style={styles.deckDescription}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
        /* 학습 뷰 */
        <View style={styles.content}>
          {currentCard ? (
            <View style={styles.studyContainer}>
              <Text style={styles.progressText}>
                {cardIndex + 1} / {currentCards.length}
              </Text>

              {/* 플래시카드 영역 (탭하여 뒤집기) */}
              <TouchableOpacity
                style={[styles.flashcard, isFlipped && styles.flashcardFlipped]}
                onPress={() => setIsFlipped(!isFlipped)}
                activeOpacity={0.9}
              >
                <Text style={styles.cardBadge}>
                  {isFlipped ? '정답 (뒷면)' : '질문 (앞면)'}
                </Text>
                <Text style={styles.cardContent}>
                  {isFlipped
                    ? stripHtml(currentCard.definitionRichText)
                    : stripHtml(currentCard.termRichText)}
                </Text>
                <Text style={styles.flipHint}>탭하여 뒤집기 🔄</Text>
              </TouchableOpacity>

              {/* 컨트롤 버튼 */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.navButton, cardIndex === 0 && styles.disabledButton]}
                  disabled={cardIndex === 0}
                  onPress={() => {
                    setCardIndex((prev) => Math.max(0, prev - 1));
                    setIsFlipped(false);
                  }}
                >
                  <Text style={styles.navButtonText}>이전</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.primaryButton,
                    cardIndex === currentCards.length - 1 && styles.disabledButton,
                  ]}
                  disabled={cardIndex === currentCards.length - 1}
                  onPress={() => {
                    setCardIndex((prev) => Math.min(currentCards.length - 1, prev + 1));
                    setIsFlipped(false);
                  }}
                >
                  <Text style={[styles.navButtonText, styles.primaryButtonText]}>다음</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>등록된 카드가 없습니다.</Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
  },
  deckCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  deckTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  deckDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  studyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
  },
  flashcard: {
    width: '100%',
    minHeight: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  flashcardFlipped: {
    borderColor: '#6366F1',
    backgroundColor: '#FDFEFE',
  },
  cardBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 28,
  },
  flipHint: {
    fontSize: 13,
    color: '#94A3B8',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    width: '100%',
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 40,
  },
});
