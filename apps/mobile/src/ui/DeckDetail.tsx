import { CollectionIcon } from './CollectionSurface';
import { type Palette, useUI } from './theme';
import { Text } from './Typography';
import React, { useMemo, useState } from "react";
import { FlatList, Image, Platform, Pressable, View } from 'react-native';
import { cardMatches, orderedCards, plainText } from "../core/content";
import { parseDocument } from 'htmlparser2';
import { store, useStore } from "../platform/runtime";
import { Attachment, Button, Chips, Empty, Field, Sheet, attempt, confirm, useImage } from "./kit";
import { Icon } from "./Icon";
import { FolderPicker } from "./FolderPicker";
import type { Navigation } from "./navigation";

type DomNode = {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
};

function renderDomNode(
  node: DomNode,
  key: string | number,
  colors: Palette,
  onImage?: (url: string) => void
): React.ReactNode {
  if (node.type === 'text') {
    return node.data ?? '';
  }
  if (node.type === 'tag') {
    const children = node.children?.map((child, i) =>
      renderDomNode(child, `${key}-${i}`, colors, onImage)
    );
    switch (node.name) {
      case 'strong':
      case 'b':
        return <Text key={key} style={{ fontWeight: '700' }}>{children}</Text>;
      case 'em':
      case 'i':
        return <Text key={key} style={{ fontStyle: 'italic' }}>{children}</Text>;
      case 'u':
        return <Text key={key} style={{ textDecorationLine: 'underline' }}>{children}</Text>;
      case 's':
      case 'del':
        return <Text key={key} style={{ textDecorationLine: 'line-through' }}>{children}</Text>;
      case 'mark':
        return (
          <Text key={key} style={{ backgroundColor: '#FEF08A', color: '#18181B', borderRadius: 2, paddingHorizontal: 2 }}>
            {children}
          </Text>
        );
      case 'code':
        return (
          <Text key={key} style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: colors.subtle, color: colors.primary, fontSize: 13 }}>
            {children}
          </Text>
        );
      case 'br':
        return '\n';
      case 'p':
        return (
          <Text key={key} style={{ fontSize: 15, lineHeight: 22, color: colors.ink }}>
            {children}
            {'\n'}
          </Text>
        );
      case 'li':
        return (
          <Text key={key} style={{ fontSize: 15, lineHeight: 22, color: colors.ink }}>
            {'• '}
            {children}
            {'\n'}
          </Text>
        );
      case 'img': {
        const src = node.attribs?.src;
        if (!src) return null;
        return (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel="첨부 이미지 확대" onPress={() => onImage?.(src)} style={{ marginVertical: 4 }}>
            <Image source={{ uri: src }} resizeMode="contain" style={{ width: '100%', height: 160, borderRadius: 8 }} />
          </Pressable>
        );
      }
      default:
        return <React.Fragment key={key}>{children}</React.Fragment>;
    }
  }
  return null;
}

export function CardPreview({
  html,
  onImage,
}: {
  html: string;
  onImage?: (url: string) => void;
}) {
  const { colors } = useUI();
  const content = useMemo(() => {
    if (!html || !html.trim()) return null;
    try {
      const doc = parseDocument(html);
      return (doc.children as DomNode[]).map((child, i) =>
        renderDomNode(child, i, colors, onImage)
      );
    } catch {
      return <Text style={{ fontSize: 15, lineHeight: 22, color: colors.ink }}>{plainText(html)}</Text>;
    }
  }, [html, colors, onImage]);

  if (!content || (Array.isArray(content) && content.length === 0)) {
    return <Text style={{ fontSize: 13, color: colors.muted, fontStyle: 'italic' }}>내용 없음</Text>;
  }

  return <View style={{ minHeight: 22 }}>{content}</View>;
}

export function DeckDetail({
  deckId,
  nav,
}: {
  deckId: string;
  nav: Navigation;
}) {
  const { colors, s } = useUI();
  const { decks, folders, cards } = useStore();
  const deck = decks.find((d) => d.id === deckId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "learned" | "unlearned">("all");
  const [moving, setMoving] = useState(false);
  const [actions, setActions] = useState(false);
  const openImage = useImage();
  const own = orderedCards(cards, deckId);
  const visible = own.filter(
    (c) =>
      (filter === "all" || c.learned === (filter === "learned")) &&
      cardMatches(c, query),
  );
  if (!deck)
    return (
      <View style={s.page}>
        <Empty
          title="덱을 찾을 수 없어요"
          detail="다른 기기에서 삭제되었을 수 있습니다."
        />
        <Button title="돌아가기" onPress={nav.back} />
      </View>
    );
  const folder = folders.find((f) => f.id === deck.folderId);
  return (
    <>
      <FlatList
        data={visible}
        keyExtractor={(c) => c.id}
        contentContainerStyle={s.page}
        windowSize={3}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <View
              style={[
                s.row,
                { justifyContent: "space-between", flexWrap: "nowrap" },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  folder ? `${folder.title} 폴더로 이동` : "미분류 학습 세트"
                }
                onPress={() =>
                  folder && nav.go({ type: "folder", folderId: folder.id })
                }
                style={[s.row, { minHeight: 44, flexShrink: 1 }]}
              >
                <Icon name="folder" size={16} color={colors.icon} />
                <Text numberOfLines={1} style={[s.label, { flexShrink: 1 }]}>
                  {folder?.title || "미분류"}
                </Text>
                <Icon name="chevron" size={14} color={colors.icon} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="학습 세트 관리"
                onPress={() => setActions(true)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="more" color={colors.icon} />
              </Pressable>
            </View>
            <View style={[s.row, { flexWrap: "nowrap", alignItems: "flex-start", gap: 12 }]}>
              <CollectionIcon kind="deck" size={40} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.title}>{deck.title}</Text>
                {Boolean(deck.description) && (
                  <Text style={s.muted}>{deck.description}</Text>
                )}
                <Text style={s.label}>
                  {own.length}장의 카드 ·{" "}
                  {new Date(deck.updatedAt).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  수정
                </Text>
              </View>
            </View>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h2}>카드 관리</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => nav.go({ type: "edit-deck", deckId })}
                style={[s.row, { minHeight: 44 }]}
              >
                <Icon name="pencil" size={16} />
                <Text style={[s.label, { color: colors.primary }]}>
                  세트 편집
                </Text>
              </Pressable>
            </View>
            <Field
              label="카드 내용 검색"
              placeholder="찾고 싶은 카드가 있나요?"
              value={query}
              onChangeText={setQuery}
            />
            <Chips
              value={filter}
              options={[
                ["all", `전체 ${own.length}`],
                ["unlearned", "학습 중"],
                ["learned", "기억했어요"],
              ]}
              onChange={setFilter}
            />
            <Text style={[s.label, { marginBottom: 6 }]}>
              {visible.length}장의 카드
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ gap: 12 }}>
            <Empty
              title={
                own.length
                  ? "조건에 맞는 카드가 없어요"
                  : "첫 카드를 채워보세요"
              }
              detail={
                own.length
                  ? "검색어나 학습 상태를 변경해 보세요."
                  : "질문과 답을 입력하면 학습을 시작할 수 있어요."
              }
            />
            {!own.length && (
              <Button
                title="카드 추가하기"
                icon="plus"
                onPress={() =>
                  nav.go({ type: "edit-deck", deckId, appendCard: true })
                }
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.box, { marginBottom: 0, padding: 14, gap: 10 }]}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.label}>
                {String(own.findIndex((c) => c.id === item.id) + 1).padStart(
                  2,
                  "0",
                )}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카드 수정"
                onPress={() =>
                  nav.go({ type: "edit-deck", deckId, focusCardId: item.id })
                }
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="pencil" size={16} color={colors.icon} />
              </Pressable>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={s.label}>질문</Text>
              <CardPreview html={item.termRichText} onImage={openImage} />
              <Attachment url={item.frontImageUrl} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ gap: 6 }}>
              <Text style={s.label}>답변</Text>
              <CardPreview html={item.definitionRichText} onImage={openImage} />
              <Attachment url={item.backImageUrl || item.imageUrl} />
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.learned }}
              onPress={() => {
                void attempt(() => store.setLearned(item.id, !item.learned));
              }}
              style={[
                s.row,
                { minHeight: 44, alignSelf: "flex-start", gap: 8 },
              ]}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: item.learned ? colors.success : colors.border,
                  backgroundColor: item.learned ? colors.successBg : colors.card,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {item.learned && (
                  <Icon name="check" size={13} color={colors.success} />
                )}
              </View>
              <Text
                style={[
                  s.label,
                  { color: item.learned ? colors.success : colors.muted },
                ]}
              >
                {item.learned ? "기억했어요" : "기억한 카드로 표시"}
              </Text>
            </Pressable>
          </View>
        )}
      />
      <View style={[s.dock, s.row, { flexWrap: "nowrap" }]}>
        <View style={{ flex: 1 }}>
          <Button
            title="카드 추가하기"
            icon="plus"
            onPress={() =>
              nav.go({ type: "edit-deck", deckId, appendCard: true })
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="학습하기"
            icon="play"
            tone="secondary"
            disabled={!own.length}
            onPress={() => nav.go({ type: "study-options", deckId })}
          />
        </View>
      </View>
      {moving && (
        <FolderPicker
          value={deck.folderId || null}
          onClose={() => setMoving(false)}
          onSelect={(folderId) => {
            void attempt(async () => {
              await store.moveDeck(deckId, folderId);
              setMoving(false);
            });
          }}
        />
      )}
      {actions && (
        <Sheet title="학습 세트 관리" onClose={() => setActions(false)}>
          <Text style={s.h2}>{deck.title}</Text>
          <Button
            title="세트 편집"
            tone="secondary"
            onPress={() => {
              setActions(false);
              nav.go({ type: "edit-deck", deckId });
            }}
          />
          <Button
            title="폴더 이동"
            tone="secondary"
            onPress={() => {
              setActions(false);
              setMoving(true);
            }}
          />
          <Button
            title="진행도 초기화"
            tone="secondary"
            onPress={() =>
              confirm(
                "학습 진행도를 초기화할까요?",
                "모든 카드를 미학습 상태로 변경합니다.",
                async () => {
                  await store.resetProgress(deckId);
                  setActions(false);
                },
              )
            }
          />
          <Button
            title="세트 삭제"
            tone="danger"
            onPress={() =>
              confirm(
                "학습 세트를 삭제할까요?",
                "세트와 모든 카드가 삭제됩니다.",
                async () => {
                  await store.deleteDeck(deckId);
                  setActions(false);
                  nav.back();
                },
              )
            }
          />
        </Sheet>
      )}
    </>
  );
}
