import React from 'react';
import { Pressable } from 'react-native';
import type { Deck } from '../core/types';
import { useStore } from '../platform/runtime';
import { DeckSummary } from './CollectionSurface';
import type { Navigation } from './navigation';

/** Renders a tappable summary card for a deck with its card and folder counts. */
export function DeckTile({ deck, nav }: { deck: Deck; nav: Navigation }) {
  const { cards, folders } = useStore();
  const deckCards = cards.filter((card) => card.deckId === deck.id);
  const learnedCount = deckCards.filter((card) => card.learned).length;
  const folderTitle =
    folders.find((folder) => folder.id === deck.folderId)?.title || '미분류';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deck.title} 덱 열기, 카드 ${deckCards.length}장, ${learnedCount}장 학습 완료`}
      onPress={() => nav.go({ type: 'deck', deckId: deck.id })}
      style={{ flex: 1 }}
    >
      {({ pressed }) => (
        <DeckSummary
          pressed={pressed}
          title={deck.title}
          count={deckCards.length}
          learned={learnedCount}
          detail={`카드 ${deckCards.length}장 · ${folderTitle}`}
          description={deck.description}
        />
      )}
    </Pressable>
  );
}
