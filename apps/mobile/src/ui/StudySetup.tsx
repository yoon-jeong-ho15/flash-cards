import { CollectionIcon, CollectionSurface, DeckCardHeader } from './CollectionSurface';
import { StudyOrderModal } from './StudyOrderModal';
import { useCollectionGrid } from './useCollectionGrid';
import { useUI } from './theme';
import { Text } from './Typography';
import React, { useState } from "react";
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { folderCards, sortDecks } from "../core/content";
import { useStore } from "../platform/runtime";
import { Button, Empty, Progress } from "./kit";
import { Icon } from "./Icon";
import type { Navigation } from "./navigation";

export function StudyFolder({
  folderId,
  nav,
}: {
  folderId: string;
  nav: Navigation;
}) {
  const { s } = useUI();
  const state = useStore();
  const grid = useCollectionGrid();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const folder = state.folders.find((item) => item.id === folderId);
  const decks = sortDecks(
    state.decks.filter((deck) => deck.folderId === folderId),
    state.preferences.folderDeckSort || "date-desc",
  );
  const count = folderCards(state.cards, state.decks, folderId).length;
  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);
  if (!folder)
    return (
      <View style={s.page}>
        <Empty title="폴더를 찾을 수 없어요" />
        <Button title="돌아가기" onPress={nav.back} />
      </View>
    );
  return (
    <>
      <FlatList
        key={grid.columns}
        numColumns={grid.columns}
        columnWrapperStyle={grid.columns > 1 ? grid.rowStyle : undefined}
        data={decks}
        keyExtractor={(deck) => deck.id}
        contentContainerStyle={[s.page, { gap: 0 }]}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <View style={[s.row, { flexWrap: "nowrap", alignItems: "flex-start", gap: 12 }]}>
              <CollectionIcon kind="folder" size={40} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.title}>{folder.title}</Text>
                {Boolean(folder.description) && (
                  <Text style={s.muted}>{folder.description}</Text>
                )}
                <Text style={s.label}>
                  학습 세트 {decks.length}개 · 카드 {count}장
                </Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Button
                title="폴더 전체 정방향 학습"
                icon="layers"
                disabled={!count}
                onPress={() =>
                  nav.go({ type: "folder-study", folderId, shuffle: false })
                }
              />
              <Button
                title="폴더 전체 랜덤 학습"
                icon="shuffle"
                tone="secondary"
                disabled={!count}
                onPress={() =>
                  nav.go({ type: "folder-study", folderId, shuffle: true })
                }
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={s.h2}>덱별 학습</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Empty
            title="아직 학습 세트가 없어요"
            detail="라이브러리에서 이 폴더에 학습 세트를 추가해 주세요."
          />
        }
        renderItem={({ item }) => {
          const cards = state.cards.filter((card) => card.deckId === item.id);
          const learned = cards.filter((card) => card.learned).length;
          return (
            <View style={grid.itemStyle}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, 카드 ${cards.length}장, ${cards.length ? "학습 순서 선택" : "학습할 카드 없음"}`}
                accessibilityState={{ disabled: !cards.length }}
                disabled={!cards.length}
                style={{ flex: 1 }}
                onPress={() => setSelectedDeckId(item.id)}
              >
                {({ pressed }) => (
                  <CollectionSurface pressed={pressed} kind="deck" style={{ minHeight: 136, padding: 10, gap: 6 }}>
                    <DeckCardHeader title={item.title} pressed={pressed} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[s.muted, { fontSize: 12, lineHeight: 18 }]}>
                        {cards.length
                          ? `카드 ${cards.length}장\n기억한 카드 ${learned}장`
                          : "학습할 카드가 없어요"}
                      </Text>
                    </View>
                    <Progress learned={learned} total={cards.length} compact />
                  </CollectionSurface>
                )}
              </Pressable>
            </View>
          );
        }}
      />
      {selectedDeck && (
        <StudyOrderModal
          title={selectedDeck.title}
          onClose={() => setSelectedDeckId(null)}
          onChoose={(shuffle) => {
            setSelectedDeckId(null);
            nav.go({ type: "study", deckId: selectedDeck.id, shuffle, onlyDifficult: false });
          }}
        />
      )}
    </>
  );
}

export function DeckStudyOptions({
  deckId,
  nav,
}: {
  deckId: string;
  nav: Navigation;
}) {
  const { colors, s } = useUI();
  const { decks, cards } = useStore();
  const [shuffle, setShuffle] = useState(false);
  const deck = decks.find((item) => item.id === deckId);
  const count = cards.filter((card) => card.deckId === deckId).length;
  if (!deck)
    return (
      <View style={s.page}>
        <Empty title="덱을 찾을 수 없어요" />
        <Button title="돌아가기" onPress={nav.back} />
      </View>
    );
  return (
    <>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.row, { flexWrap: "nowrap", gap: 12 }]}>
          <CollectionIcon kind="deck" size={40} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.title}>{deck.title}</Text>
            <Text style={s.muted}>전체 카드 {count}장</Text>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={s.h2}>학습 순서</Text>
          {(
            [
              [false, "layers", "정방향 학습"],
              [true, "shuffle", "순서 섞어 학습"],
            ] as const
          ).map(([value, icon, title]) => (
            <Pressable
              key={title}
              accessibilityRole="radio"
              accessibilityLabel={title}
              accessibilityState={{ checked: shuffle === value }}
              onPress={() => setShuffle(value)}
              style={[
                s.box,
                {
                  borderColor:
                    shuffle === value ? colors.primary : colors.border,
                  backgroundColor:
                    shuffle === value ? colors.pale : colors.card,
                },
              ]}
            >
              <View style={[s.row, { flexWrap: "nowrap", gap: 12 }]}>
                <Icon name={icon} size={22} />
                <Text style={[s.h2, { flex: 1 }]}>{title}</Text>
                {shuffle === value && <Icon name="check" />}
              </View>
            </Pressable>
          ))}
        </View>
        {!count && (
          <Empty
            title="학습할 카드가 없어요"
            detail="라이브러리에서 이 덱에 카드를 추가해 주세요."
          />
        )}
      </ScrollView>
      <View style={s.dock}>
        <Button
          title="학습 시작하기"
          icon="play"
          disabled={!count}
          onPress={() =>
            nav.go({ type: "study", deckId, shuffle, onlyDifficult: false })
          }
        />
      </View>
    </>
  );
}
