import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useFlashcardStore } from '../store/flashcardStore';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { stripHtml } from '../utils/textUtils';

interface CardEditItem {
  id?: string;
  termRichText: string;
  definitionRichText: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

interface DeckEditorScreenProps {
  deckId?: string;
  initialFolderId?: string;
  focusCardId?: string;
  onClose: () => void;
  onSaved: (savedDeckId: string) => void;
}

export const DeckEditorScreen: React.FC<DeckEditorScreenProps> = ({
  deckId,
  initialFolderId,
  onClose,
  onSaved,
}) => {
  const { decks, cards, folders, saveDeckWithCards } = useFlashcardStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId || null);
  const [cardItems, setCardItems] = useState<CardEditItem[]>([]);
  const [errors, setErrors] = useState<{ title?: string; general?: string }>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleRequestClose = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmClose = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  useEffect(() => {
    if (deckId) {
      const existing = decks.find((d) => d.id === deckId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description || '');
        setSelectedFolderId(existing.folderId || null);

        const deckCards = cards
          .filter((c) => c.deckId === deckId)
          .map((c) => ({
            id: c.id,
            termRichText: stripHtml(c.termRichText),
            definitionRichText: stripHtml(c.definitionRichText),
            frontImageUrl: c.frontImageUrl,
            backImageUrl: c.backImageUrl || c.imageUrl,
          }));

        if (deckCards.length > 0) {
          setCardItems(deckCards);
        } else {
          setCardItems([
            { termRichText: '', definitionRichText: '' },
            { termRichText: '', definitionRichText: '' },
          ]);
        }
      }
    } else {
      setTitle('');
      setDescription('');
      setSelectedFolderId(initialFolderId || null);
      setCardItems([
        { termRichText: '', definitionRichText: '' },
        { termRichText: '', definitionRichText: '' },
      ]);
    }
  }, [deckId, initialFolderId, decks, cards]);

  // 카드 추가
  const handleAddCard = () => {
    setCardItems((prev) => [
      ...prev,
      { termRichText: '', definitionRichText: '' },
    ]);
  };

  // 카드 삭제
  const handleRemoveCard = (index: number) => {
    if (cardItems.length <= 1) {
      Alert.alert('알림', '최소 1개의 카드는 유지해야 합니다.');
      return;
    }
    setCardItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 카드 복제
  const handleDuplicateCard = (index: number) => {
    const item = cardItems[index];
    const copy = { ...item, id: undefined };
    const next = [...cardItems];
    next.splice(index + 1, 0, copy);
    setCardItems(next);
  };

  // 카드 위로 이동
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...cardItems];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setCardItems(next);
  };

  // 카드 아래로 이동
  const handleMoveDown = (index: number) => {
    if (index === cardItems.length - 1) return;
    const next = [...cardItems];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setCardItems(next);
  };

  // 카드 필드 수정
  const handleUpdateCard = (
    index: number,
    field: keyof CardEditItem,
    value: string
  ) => {
    setCardItems((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  // 저장 처리
  const handleSave = () => {
    if (!title.trim()) {
      setErrors({ title: '덱 제목을 반드시 입력해 주세요.' });
      Alert.alert('입력 확인', '덱 제목을 입력해 주세요.');
      return;
    }

    const isCardItemEmpty = (c: CardEditItem) => {
      const termEmpty = !c.termRichText.replace(/[\s\u00a0\u200b\ufeff\u3000]/g, '').trim();
      const defEmpty = !c.definitionRichText.replace(/[\s\u00a0\u200b\ufeff\u3000]/g, '').trim();
      const frontImgEmpty = !c.frontImageUrl?.trim();
      const backImgEmpty = !c.backImageUrl?.trim();
      return termEmpty && defEmpty && frontImgEmpty && backImgEmpty;
    };

    // 앞뒤가 비어있는 카드(스페이스, 줄바꿈만 있는 카드 포함) 자동 제외/삭제
    const validCards = cardItems.filter((c) => !isCardItemEmpty(c));

    if (validCards.length === 0) {
      Alert.alert('입력 확인', '최소 1개 이상의 유효한 카드를 작성해 주세요.');
      return;
    }

    if (validCards.length !== cardItems.length) {
      setCardItems(validCards);
    }

    const savedDeckId = saveDeckWithCards(
      deckId || null,
      {
        title: title.trim(),
        description: description.trim() || undefined,
        folderId: selectedFolderId,
      },
      validCards.map((c) => ({
        id: c.id,
        termRichText: c.termRichText.trim(),
        definitionRichText: c.definitionRichText.trim(),
        frontImageUrl: c.frontImageUrl?.trim() || undefined,
        backImageUrl: c.backImageUrl?.trim() || undefined,
      }))
    );

    onSaved(savedDeckId);
  };

  return (
    <View style={styles.container}>
      <Header
        title={deckId ? '덱 수정하기' : '새 플래시카드 덱'}
        subtitle="질문과 정답, 이미지를 등록하세요"
        onBack={handleRequestClose}
        rightActions={
          <Button variant="default" size="sm" onPress={handleSave}>
            저장
          </Button>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 덱 기본 정보 카드 */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>덱 기본 정보</Text>

            <View style={styles.formGroup}>
              <Input
                label="덱 제목"
                required
                placeholder='예: "수능 필수 영단어", "CS 네트워크 요약"'
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  if (errors.title) setErrors({});
                }}
                error={errors.title}
              />
            </View>

            <View style={styles.formGroup}>
              <Input
                label="설명 (선택)"
                placeholder="덱에 대한 간단한 설명을 입력하세요"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            {/* 소속 폴더 선택 */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>소속 폴더</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.folderPickerScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.folderChip,
                    selectedFolderId === null && styles.folderChipActive,
                  ]}
                  onPress={() => setSelectedFolderId(null)}
                >
                  <Text
                    style={[
                      styles.folderChipText,
                      selectedFolderId === null && styles.folderChipTextActive,
                    ]}
                  >
                    📂 미분류
                  </Text>
                </TouchableOpacity>

                {folders.map((f) => {
                  const isSelected = selectedFolderId === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.folderChip, isSelected && styles.folderChipActive]}
                      onPress={() => setSelectedFolderId(f.id)}
                    >
                      <Text
                        style={[
                          styles.folderChipText,
                          isSelected && styles.folderChipTextActive,
                        ]}
                      >
                        📁 {f.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* 카드 목록 섹션 */}
          <View style={styles.cardsHeaderRow}>
            <Text style={styles.cardsSectionTitle}>
              카드 목록 ({cardItems.length})
            </Text>
            <Button variant="outline" size="sm" onPress={handleAddCard}>
              + 카드 추가
            </Button>
          </View>

          {cardItems.map((item, index) => (
            <View key={index} style={styles.cardEditBox}>
              {/* 카드 상단 바 */}
              <View style={styles.cardItemHeader}>
                <View style={styles.cardNumberBadge}>
                  <Text style={styles.cardNumberText}>#{index + 1}</Text>
                </View>

                {/* 카드 순서 및 액션 */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={[styles.iconActionBtn, index === 0 && styles.btnDisabled]}
                  >
                    <Text style={styles.actionIconText}>▲</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleMoveDown(index)}
                    disabled={index === cardItems.length - 1}
                    style={[
                      styles.iconActionBtn,
                      index === cardItems.length - 1 && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.actionIconText}>▼</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDuplicateCard(index)}
                    style={styles.iconActionBtn}
                  >
                    <Text style={styles.actionIconText}>📑</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRemoveCard(index)}
                    style={[styles.iconActionBtn, { backgroundColor: '#FEF2F2' }]}
                  >
                    <Text style={[styles.actionIconText, { color: '#EF4444' }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 앞면 입력 */}
              <View style={styles.cardFormGroup}>
                <Input
                  label="앞면 (개념 / 단어 / 질문)"
                  placeholder="앞면에 들어갈 내용을 입력하세요"
                  value={item.termRichText}
                  onChangeText={(val) => handleUpdateCard(index, 'termRichText', val)}
                  multiline
                />
                <Input
                  placeholder="앞면 첨부 이미지 URL (선택, https://...)"
                  value={item.frontImageUrl || ''}
                  onChangeText={(val) => handleUpdateCard(index, 'frontImageUrl', val)}
                  containerStyle={styles.imageInput}
                />
                {item.frontImageUrl ? (
                  <Image
                    source={{ uri: item.frontImageUrl }}
                    style={styles.imageThumb}
                    resizeMode="contain"
                  />
                ) : null}
              </View>

              {/* 뒷면 입력 */}
              <View style={styles.cardFormGroup}>
                <Input
                  label="뒷면 (정답 / 정의 / 상세 해설)"
                  placeholder="뒷면에 들어갈 내용을 입력하세요"
                  value={item.definitionRichText}
                  onChangeText={(val) => handleUpdateCard(index, 'definitionRichText', val)}
                  multiline
                />
                <Input
                  placeholder="뒷면 첨부 이미지 URL (선택, https://...)"
                  value={item.backImageUrl || ''}
                  onChangeText={(val) => handleUpdateCard(index, 'backImageUrl', val)}
                  containerStyle={styles.imageInput}
                />
                {item.backImageUrl ? (
                  <Image
                    source={{ uri: item.backImageUrl }}
                    style={styles.imageThumb}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
            </View>
          ))}

          {/* 하단 큰 카드 추가 버튼 */}
          <TouchableOpacity
            style={styles.bottomAddCardBtn}
            onPress={handleAddCard}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomAddCardText}>+ 새 카드 추가하기</Text>
          </TouchableOpacity>

          {/* 하단 저장 바 */}
          <View style={styles.bottomSaveRow}>
            <Button
              variant="outline"
              size="lg"
              onPress={handleRequestClose}
              style={styles.bottomBtn}
            >
              취소
            </Button>
            <Button
              variant="default"
              size="lg"
              onPress={handleSave}
              style={styles.bottomBtn}
            >
              {deckId ? '변경사항 저장하기' : '덱 만들기 완료'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 작성/수정 취소 확인 모달 */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmClose}
        title={deckId ? '덱 수정 취소' : '덱 만들기 취소'}
        message={`정말로 취소하시겠습니까?\n저장하지 않은 모든 변경사항은 복구할 수 없습니다.`}
        confirmText="취소하고 나가기"
        cancelText="계속 작성"
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  folderPickerScroll: {
    flexDirection: 'row',
  },
  folderChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  folderChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  folderChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  folderChipTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  cardsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardEditBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  cardNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  actionIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cardFormGroup: {
    marginBottom: 14,
  },
  imageInput: {
    marginTop: 6,
  },
  imageThumb: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: '#F8FAFC',
  },
  bottomAddCardBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bottomAddCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  bottomSaveRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  bottomBtn: {
    flex: 1,
  },
});
