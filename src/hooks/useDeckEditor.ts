import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlashcardStore } from '../store/useFlashcardStore';
import { CardFormItem } from '../components/deck/DeckCardEditorItem';
import {
  extractAllFirebaseImageUrlsFromCard,
  deleteImagesByUrls,
} from '../services/storageService';

interface UseDeckEditorOptions {
  deckId?: string;
  initialFolderId?: string;
  focusCardId?: string;
  onSaved: (savedDeckId: string) => void;
}

export interface DeckEditorErrors {
  title?: string;
  general?: string;
}

const createEmptyCardItem = (): CardFormItem => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  termRichText: '',
  definitionRichText: '',
});

export const useDeckEditor = ({
  deckId,
  initialFolderId,
  focusCardId,
  onSaved,
}: UseDeckEditorOptions) => {
  const { decks, cards, folders, saveDeckWithCards } = useFlashcardStore();

  const [title, setTitle] = useState(() => {
    if (deckId) {
      const existingDeck = decks.find((d) => d.id === deckId);
      if (existingDeck) return existingDeck.title;
    }
    return '';
  });
  const [description, setDescription] = useState(() => {
    if (deckId) {
      const existingDeck = decks.find((d) => d.id === deckId);
      if (existingDeck) return existingDeck.description || '';
    }
    return '';
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    if (deckId) {
      const existingDeck = decks.find((d) => d.id === deckId);
      if (existingDeck) return existingDeck.folderId || null;
    }
    return initialFolderId || null;
  });
  const [cardItems, setCardItems] = useState<CardFormItem[]>(() => {
    if (deckId) {
      const existingCards = cards.filter((c) => c.deckId === deckId);
      if (existingCards.length > 0) {
        return existingCards.map((c) => ({
          id: c.id,
          termRichText: c.termRichText,
          definitionRichText: c.definitionRichText,
          frontImageUrl: c.frontImageUrl,
          backImageUrl: c.backImageUrl || c.imageUrl,
          imageUrl: c.imageUrl || c.backImageUrl,
          learned: c.learned,
        }));
      }
    }
    return [createEmptyCardItem(), createEmptyCardItem()];
  });
  const [newlyAddedCardId, setNewlyAddedCardId] = useState<string | null>(null);
  const [errors, setErrors] = useState<DeckEditorErrors>({});

  // 수정 전 덱/카드에 존재하던 이미지 URL들을 기억하여, 저장 시 삭제된 이미지를 정리
  const initialImageUrlsRef = useRef<Set<string>>(new Set());

  // 초기 렌더링 시 기존 카드들의 이미지 URL 기억
  useEffect(() => {
    if (deckId) {
      const existingCards = cards.filter((c) => c.deckId === deckId);
      const urls = new Set<string>();
      existingCards.forEach((c) => {
        extractAllFirebaseImageUrlsFromCard(c).forEach((u) => urls.add(u));
      });
      initialImageUrlsRef.current = urls;
    }
  }, [deckId]);

  // 기존 덱 수정 시 데이터 로드 (외부 상태 변경 동기화용)
  useEffect(() => {
    if (deckId) {
      const existingDeck = decks.find((d) => d.id === deckId);
      if (existingDeck) {
        setTitle(existingDeck.title);
        setDescription(existingDeck.description || '');
        setSelectedFolderId(existingDeck.folderId || null);

        const existingCards = cards.filter((c) => c.deckId === deckId);
        if (existingCards.length > 0) {
          setCardItems(
            existingCards.map((c) => ({
              id: c.id,
              termRichText: c.termRichText,
              definitionRichText: c.definitionRichText,
              frontImageUrl: c.frontImageUrl,
              backImageUrl: c.backImageUrl || c.imageUrl,
              imageUrl: c.imageUrl || c.backImageUrl,
              learned: c.learned,
            }))
          );
        }
      }
    } else if (initialFolderId) {
      setSelectedFolderId(initialFolderId);
    }
  }, [deckId, initialFolderId, decks, cards]);

  // 카드 추가
  const handleAddCard = useCallback(() => {
    const newCard = createEmptyCardItem();
    setNewlyAddedCardId(newCard.id || null);
    setCardItems((prev) => [
      ...prev,
      newCard,
    ]);
  }, []);

  // 특정 위치에 카드 삽입
  const handleInsertCard = useCallback((index: number) => {
    const newCard = createEmptyCardItem();
    setNewlyAddedCardId(newCard.id || null);
    setCardItems((prev) => {
      const copy = [...prev];
      copy.splice(index, 0, newCard);
      return copy;
    });
  }, []);

  // 카드 삭제
  const handleRemoveCard = useCallback((index: number) => {
    setCardItems((prev) => {
      if (prev.length <= 1) {
        alert('덱에는 최소 1개의 카드가 필요합니다.');
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // 카드 복제
  const handleDuplicateCard = useCallback((index: number) => {
    setCardItems((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const newCard: CardFormItem = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        termRichText: target.termRichText,
        definitionRichText: target.definitionRichText,
        frontImageUrl: target.frontImageUrl,
        backImageUrl: target.backImageUrl,
        imageUrl: target.imageUrl,
      };
      setNewlyAddedCardId(newCard.id || null);
      const updated = [...prev];
      updated.splice(index + 1, 0, newCard);
      return updated;
    });
  }, []);

  // 순서 변경 (위로)
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setCardItems((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }, []);

  // 순서 변경 (아래로)
  const handleMoveDown = useCallback((index: number) => {
    setCardItems((prev) => {
      if (index === prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }, []);

  // 카드 순서 전체 재배치 (드래그 앤 드롭용)
  const handleReorderCards = useCallback((newCards: CardFormItem[]) => {
    setCardItems(newCards);
  }, []);

  // 개별 카드 업데이트
  const handleUpdateCard = useCallback((index: number, field: keyof CardFormItem, value: any) => {
    setCardItems((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }, []);

  // 저장 처리
  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const newErrors: DeckEditorErrors = {};

    if (!trimmedTitle) {
      newErrors.title = '덱 제목을 입력해 주세요.';
    }

    // 최소 1장 이상의 카드에 앞면 혹은 뒷면 내용 또는 이미지가 있어야 함
    const validCards = cardItems.filter(
      (c) =>
        c.termRichText.replace(/<[^>]*>/g, '').trim() ||
        c.definitionRichText.replace(/<[^>]*>/g, '').trim() ||
        c.termRichText.includes('<img') ||
        c.definitionRichText.includes('<img') ||
        c.frontImageUrl ||
        c.backImageUrl ||
        c.imageUrl
    );

    if (validCards.length === 0) {
      newErrors.general = '최소 1개 이상의 카드에 단어(앞면) 또는 설명(뒷면)을 입력해야 합니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // 1) 수정 전 이미지 URL 목록 수집
      const beforeUrls = new Set<string>(initialImageUrlsRef.current);
      if (deckId) {
        cards
          .filter((c) => c.deckId === deckId)
          .forEach((c) => {
            extractAllFirebaseImageUrlsFromCard(c).forEach((u) => beforeUrls.add(u));
          });
      }

      // 2) 현재 카드들(새로 저장될 데이터)의 이미지 URL 목록 수집
      const afterUrls = new Set<string>();
      cardItems.forEach((c) => {
        extractAllFirebaseImageUrlsFromCard(c).forEach((u) => afterUrls.add(u));
      });

      // 3) 차집합 계산 (수정 전에는 있었으나 현재 사라진 이미지들)
      const removedUrls = Array.from(beforeUrls).filter((url) => !afterUrls.has(url));

      const savedDeckId = saveDeckWithCards(
        deckId || null,
        {
          title: trimmedTitle,
          description: description.trim(),
          folderId: selectedFolderId,
        },
        cardItems.map((c) => ({
          id: c.id && c.id.startsWith('temp-') ? undefined : c.id,
          termRichText: c.termRichText || '<p></p>',
          definitionRichText: c.definitionRichText || '<p></p>',
          frontImageUrl: c.frontImageUrl,
          backImageUrl: c.backImageUrl || c.imageUrl,
          imageUrl: c.imageUrl || c.backImageUrl,
          learned: c.learned ?? false,
        }))
      );

      // 4) 저장 성공 시 사라진 기존 이미지들을 Firebase Storage에서 안전하게 삭제
      if (removedUrls.length > 0) {
        console.log('[DeckEditor] 카드 수정으로 제거된 이미지 삭제 중:', removedUrls);
        deleteImagesByUrls(removedUrls).catch((err) => {
          console.warn('[DeckEditor] 이미지 정리 실패:', err);
        });
      }

      onSaved(savedDeckId);
    } catch (err: any) {
      console.error('덱 저장 중 오류:', err);
      setErrors({ general: '덱을 저장하는 중 오류가 발생했습니다. 다시 시도해 주세요.' });
    }
  }, [
    title,
    cardItems,
    description,
    selectedFolderId,
    deckId,
    cards,
    saveDeckWithCards,
    onSaved,
  ]);

  return {
    folders,
    title,
    setTitle,
    description,
    setDescription,
    selectedFolderId,
    setSelectedFolderId,
    cardItems,
    newlyAddedCardId,
    errors,
    setErrors,
    handleAddCard,
    handleInsertCard,
    handleRemoveCard,
    handleDuplicateCard,
    handleMoveUp,
    handleMoveDown,
    handleReorderCards,
    handleUpdateCard,
    handleSave,
  };
};
