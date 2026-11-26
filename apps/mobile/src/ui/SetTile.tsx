import React from 'react';
import { Pressable } from 'react-native';
import type { CardSet } from '../core/types';
import { useStore } from '../platform/runtime';
import { SetSummary } from './CollectionSurface';
import type { Navigation } from './navigation';

/** Renders a tappable summary card for a set with its card and folder counts. */
export function SetTile({ set: cardSet, nav }: { set: CardSet; nav: Navigation }) {
  const { cards, folders } = useStore();
  const setCards = cards.filter((card) => card.setId === cardSet.id);
  const learnedCount = setCards.filter((card) => card.learned).length;
  const folderTitle =
    folders.find((folder) => folder.id === cardSet.folderId)?.title || '미분류';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cardSet.title} 세트 열기, 카드 ${setCards.length}장, ${learnedCount}장 학습 완료`}
      onPress={() => nav.go({ type: 'set', setId: cardSet.id })}
      style={{ flex: 1 }}
    >
      {({ pressed }) => (
        <SetSummary
          pressed={pressed}
          title={cardSet.title}
          count={setCards.length}
          learned={learnedCount}
          detail={`카드 ${setCards.length}장 · ${folderTitle}`}
          description={cardSet.description}
        />
      )}
    </Pressable>
  );
}
