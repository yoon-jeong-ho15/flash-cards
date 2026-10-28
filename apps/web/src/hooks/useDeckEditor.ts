import { selectDeckCards, indexCards } from '../store/cardSelectors';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFlashcardStore } from '../store/useFlashcardStore';
import { CardFormItem } from '../components/deck/DeckCardEditorItem';
import { sortCardsByOrder } from '../services/flashcardService';
import { isCardItemEmpty } from '../utils/cardValidation';

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

import { DeckDraftData, loadDeckDraft, saveDeckDraft, removeDeckDraft } from '../services/deckDraftStorage';

const isDraftMeaningful = (
  title: string,
  description: string,
  cardItems: CardFormItem[]
): boolean => {
  if (title.trim()) return true;
  if (description.trim()) return true;
  return cardItems.some((c) => !isCardItemEmpty(c));
};

const isDraftDifferentFromOriginal = (
  draft: DeckDraftData,
  origTitle: string,
  origDesc: string,
  origFolderId: string | null,
  origCards: CardFormItem[]
): boolean => {
  if (draft.title.trim() !== origTitle.trim()) return true;
  if ((draft.description || '').trim() !== (origDesc || '').trim()) return true;
  if ((draft.selectedFolderId || null) !== (origFolderId || null)) return true;
  if (draft.cardItems.length !== origCards.length) return true;

  for (let i = 0; i < draft.cardItems.length; i++) {
    const dc = draft.cardItems[i];
    const oc = origCards[i];
    if (dc.termRichText !== oc.termRichText) return true;
    if (dc.definitionRichText !== oc.definitionRichText) return true;
    if (dc.frontImageUrl !== oc.frontImageUrl) return true;
    if ((dc.backImageUrl || dc.imageUrl) !== (oc.backImageUrl || oc.imageUrl)) return true;
  }
  return false;
};

export const formatDraftTime = (timestamp?: number | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDraftFullDateTime = (timestamp?: number | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
};

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
  const decks = useFlashcardStore(state => state.decks);
  const cards = useFlashcardStore(state => selectDeckCards(state, deckId || ''));
  const folders = useFlashcardStore(state => state.folders);
  const saveDeckWithCards = useFlashcardStore(state => state.saveDeckWithCards);
  const user = useFlashcardStore(state => state.user);

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
      const existingCards = sortCardsByOrder(cards.filter((c) => c.deckId === deckId));
      if (existingCards.length > 0) {
        return existingCards.map((c) => ({
          id: c.id,
          order: c.order,
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

  // 임시 저장(Draft) 관련 상태
  const [draftToRestore, setDraftToRestore] = useState<DeckDraftData | null>(null);
  const [showDraftRestoreModal, setShowDraftRestoreModal] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isReadyForAutoSave, setReadyForAutoSave] = useState(false);
  const skipDraftFlushRef = useRef(false);
  const lastSavedJsonRef = useRef<string>('');

  // 마운트 시 로컬 임시 저장본(Draft) 확인
  useEffect(() => {
    const draft = loadDeckDraft(user?.uid, deckId);
    if (draft && isDraftMeaningful(draft.title, draft.description, draft.cardItems)) {
      let origTitle = '';
      let origDesc = '';
      let origFolderId: string | null = initialFolderId || null;
      let origCards: CardFormItem[] = [];

      if (deckId) {
        const existingDeck = decks.find((d) => d.id === deckId);
        if (existingDeck) {
          origTitle = existingDeck.title;
          origDesc = existingDeck.description || '';
          origFolderId = existingDeck.folderId || null;
          origCards = sortCardsByOrder(cards.filter((c) => c.deckId === deckId)).map((c) => ({
            id: c.id,
            order: c.order,
            termRichText: c.termRichText,
            definitionRichText: c.definitionRichText,
            frontImageUrl: c.frontImageUrl,
            backImageUrl: c.backImageUrl || c.imageUrl,
            imageUrl: c.imageUrl || c.backImageUrl,
            learned: c.learned,
          }));
        }
      }

      if (isDraftDifferentFromOriginal(draft, origTitle, origDesc, origFolderId, origCards)) {
        setDraftToRestore(draft);
        setShowDraftRestoreModal(true);
        // 복원 여부 결정을 기다리는 동안 자동 저장 보류
        return;
      } else {
        removeDeckDraft(user?.uid, deckId);
      }
    }

    setReadyForAutoSave(true);
  }, [deckId, user?.uid]);

  // 임시 저장본 복원 실행
  const handleRestoreDraft = useCallback(() => {
    if (draftToRestore) {
      setTitle(draftToRestore.title);
      setDescription(draftToRestore.description);
      setSelectedFolderId(draftToRestore.selectedFolderId);
      setCardItems(draftToRestore.cardItems);
      setLastSavedAt(draftToRestore.savedAt);
      lastSavedJsonRef.current = JSON.stringify({
        title: draftToRestore.title,
        description: draftToRestore.description,
        selectedFolderId: draftToRestore.selectedFolderId,
        cardItems: draftToRestore.cardItems,
      });
    }
    setDraftToRestore(null);
    setShowDraftRestoreModal(false);
    setReadyForAutoSave(true);
  }, [draftToRestore]);

  // 임시 저장본 삭제하고 원본/초기 상태 유지
  const handleDiscardDraft = useCallback(() => {
    removeDeckDraft(user?.uid, deckId);
    setDraftToRestore(null);
    setShowDraftRestoreModal(false);
    setReadyForAutoSave(true);
  }, [deckId, user?.uid]);

  // 임시 저장본 완전 제거 (정식 저장 성공 또는 취소 확인 시)
  const clearDraft = useCallback(() => {
    skipDraftFlushRef.current = true;
    removeDeckDraft(user?.uid, deckId);
    setLastSavedAt(null);
  }, [deckId, user?.uid]);

  // 주기적 로컬 임시 저장 (디바운스 2초 + 내용 변경 감지)
  useEffect(() => {
    if (!isReadyForAutoSave) return;

    if (!isDraftMeaningful(title, description, cardItems)) {
      return;
    }

    const currentData = {
      title,
      description,
      selectedFolderId,
      cardItems,
    };
    const timer = setTimeout(() => {
      const currentJson = JSON.stringify(currentData);
      if (currentJson === lastSavedJsonRef.current) return;
      const now = Date.now();
      const saved = saveDeckDraft(user?.uid, {
        deckId,
        title,
        description,
        selectedFolderId,
        cardItems,
        savedAt: now,
      });
      if (saved) {
        lastSavedJsonRef.current = currentJson;
        setLastSavedAt(now);
      } else {
        setLastSavedAt(null);
        setErrors(previous => ({ ...previous, general: '임시 저장 공간이 부족합니다. 내용을 복사하거나 공간을 확보해 주세요.' }));
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, description, selectedFolderId, cardItems, deckId, user?.uid, isReadyForAutoSave]);

  // Track the original independently of the editable draft. Remote refreshes must not reset inputs.
  const originalDeck = decks.find(d => d.id === deckId);
  const fingerprint = useMemo(() => JSON.stringify({ deck: originalDeck, cards }), [originalDeck, cards]);
  const [baseline, setBaseline] = useState(fingerprint);
  const hasExternalChanges = Boolean(deckId && baseline !== fingerprint);
  const reloadOriginal = useCallback(() => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    setTitle(deck.title);
    setDescription(deck.description || '');
    setSelectedFolderId(deck.folderId || null);
    setCardItems(sortCardsByOrder(cards.filter(c => c.deckId === deckId)));
    setBaseline(fingerprint);
  }, [decks, cards, deckId, fingerprint]);

  // Flush the latest draft on navigation and page close, preserving the account at mount time.
  const latestDraftRef = useRef<DeckDraftData | null>(null);
  latestDraftRef.current = isReadyForAutoSave ? {
    deckId, title, description, selectedFolderId, cardItems, savedAt: Date.now(),
  } : null;
  useEffect(() => {
    const flush = () => {
      const draft = latestDraftRef.current;
      if (!skipDraftFlushRef.current && draft && isDraftMeaningful(draft.title, draft.description, draft.cardItems)) {
        saveDeckDraft(user?.uid, draft);
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => { window.removeEventListener('beforeunload', flush); flush(); };
  }, [user?.uid, deckId]);

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

  // 특정 카드 바로 뒤에 카드 삽입 (메모이제이션 콜백)
  const handleInsertCardAfter = useCallback((index: number) => {
    handleInsertCard(index + 1);
  }, [handleInsertCard]);

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

    // 앞뒤가 모두 비어있는 카드(스페이스, 줄바꿈만 있는 카드 포함)를 자동으로 제외/삭제
    const validCards = cardItems.filter((c) => !isCardItemEmpty(c));

    if (validCards.length === 0) {
      newErrors.general = '최소 1개 이상의 카드에 단어(앞면) 또는 설명(뒷면)을 입력해야 합니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // 빈 카드가 삭제되었으므로 화면 상태도 동기화
      if (validCards.length !== cardItems.length) {
        setCardItems(validCards);
      }

      const savedDeckId = saveDeckWithCards(
        deckId || null,
        {
          title: trimmedTitle,
          description: description.trim(),
          folderId: selectedFolderId,
        },
        validCards.map((c, index) => ({
          id: c.id && c.id.startsWith('temp-') ? undefined : c.id,
          order: index,
          termRichText: c.termRichText || '<p></p>',
          definitionRichText: c.definitionRichText || '<p></p>',
          frontImageUrl: c.frontImageUrl,
          backImageUrl: c.backImageUrl || c.imageUrl,
          imageUrl: c.imageUrl || c.backImageUrl,
          learned: (c.id ? indexCards(cards).byId.get(c.id)?.learned : undefined) ?? c.learned ?? false,
        }))
      );

      // saveDeckWithCards returns only after both data and outbox are durable locally.
      skipDraftFlushRef.current = true;
      removeDeckDraft(user?.uid, deckId);
      setLastSavedAt(null);

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
    user?.uid,
  ]);

  return {
    folders,
    hasExternalChanges,
    reloadOriginal,
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
    handleInsertCardAfter,
    handleRemoveCard,
    handleDuplicateCard,
    handleMoveUp,
    handleMoveDown,
    handleReorderCards,
    handleUpdateCard,
    handleSave,
    lastSavedAt,
    showDraftRestoreModal,
    draftSavedAt: draftToRestore?.savedAt || null,
    handleRestoreDraft,
    handleDiscardDraft,
    clearDraft,
  };
};
