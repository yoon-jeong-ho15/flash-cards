import { useUI } from './theme';
import { Text } from './Typography';
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Alert, View } from "react-native";
import type { CardInput } from "../core/types";
import { RichText, type RichTextHandle } from "../editor/RichText";
import { chooseImage } from "../platform/images";
import { Attachment, Button, showError, useImage } from "./kit";

export interface ComposerHandle {
  flush(): Promise<CardInput>;
}

export const CardComposer = forwardRef<
  ComposerHandle,
  { card: CardInput; onChange: (card: CardInput) => void }
>(function CardComposer({ card, onChange }, ref) {
  const { colors, s } = useUI();
  const [busy, setBusy] = useState(false);
  const frontEditor = useRef<RichTextHandle>(null);
  const backEditor = useRef<RichTextHandle>(null);
  const current = useRef(card);
  current.current = card;
  const openImage = useImage();

  const update = (updates: Partial<CardInput>) => {
    const next = { ...current.current, ...updates };
    current.current = next;
    onChange(next);
  };

  const flush = async () => {
    if (busy) throw new Error("이미지 처리가 끝난 뒤 다시 시도해 주세요.");
    const [frontHtml, backHtml] = await Promise.all([
      frontEditor.current?.getHTML() ?? Promise.resolve(current.current.termRichText),
      backEditor.current?.getHTML() ?? Promise.resolve(current.current.definitionRichText),
    ]);
    const next = {
      ...current.current,
      termRichText: frontHtml,
      definitionRichText: backHtml,
    };
    current.current = next;
    onChange(next);
    return next;
  };

  useImperativeHandle(ref, () => ({ flush }), [busy]);

  const attach = (targetSide: "front" | "back", inline: boolean) =>
    Alert.alert("사진 추가", "이미지를 가져올 방법을 선택하세요.", [
      { text: "취소", style: "cancel" },
      ...[false, true].map((camera) => ({
        text: camera ? "카메라" : "사진 보관함",
        onPress: () => {
          setBusy(true);
          const targetEditor = targetSide === "front" ? frontEditor : backEditor;
          const imageField = targetSide === "front" ? "frontImageUrl" : "backImageUrl";
          void chooseImage(camera)
            .then((url) => {
              if (!url) return;
              if (inline) targetEditor.current?.insertImage(url);
              else
                update({
                  [imageField]: url,
                  ...(targetSide === "back" ? { imageUrl: url } : {}),
                });
            })
            .catch(showError)
            .finally(() => setBusy(false));
        },
      })),
    ]);

  return (
    <View style={{ gap: 16 }}>
      {/* Question section */}
      <View style={{ gap: 8 }}>
        <View style={[s.row, { gap: 6 }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
          <Text style={[s.label, { color: colors.ink }]}>질문 (앞면)</Text>
        </View>
        <View
          style={{
            borderRadius: 10,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <RichText
            ref={frontEditor}
            html={card.termRichText}
            side="front"
            editable
            label="카드 앞면"
            onChange={(html) => update({ termRichText: html })}
            onImage={openImage}
            onPickImage={() => attach("front", true)}
          />
        </View>
        <Attachment url={card.frontImageUrl} />
        <View style={s.row}>
          <Button
            title={busy ? "처리 중" : card.frontImageUrl ? "질문 사진 변경" : "질문 사진 첨부"}
            icon="plus"
            tone="secondary"
            disabled={busy}
            onPress={() => attach("front", false)}
          />
          {Boolean(card.frontImageUrl) && (
            <Button
              title="사진 제거"
              tone="danger"
              disabled={busy}
              onPress={() => update({ frontImageUrl: undefined })}
            />
          )}
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

      {/* Answer section */}
      <View style={{ gap: 8 }}>
        <View style={[s.row, { gap: 6 }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
          <Text style={[s.label, { color: colors.ink }]}>답변 (뒷면)</Text>
        </View>
        <View
          style={{
            borderRadius: 10,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <RichText
            ref={backEditor}
            html={card.definitionRichText}
            side="back"
            editable
            label="카드 뒷면"
            onChange={(html) => update({ definitionRichText: html })}
            onImage={openImage}
            onPickImage={() => attach("back", true)}
          />
        </View>
        <Attachment url={card.backImageUrl || card.imageUrl} />
        <View style={s.row}>
          <Button
            title={busy ? "처리 중" : (card.backImageUrl || card.imageUrl) ? "답변 사진 변경" : "답변 사진 첨부"}
            icon="plus"
            tone="secondary"
            disabled={busy}
            onPress={() => attach("back", false)}
          />
          {Boolean(card.backImageUrl || card.imageUrl) && (
            <Button
              title="사진 제거"
              tone="danger"
              disabled={busy}
              onPress={() => update({ backImageUrl: undefined, imageUrl: undefined })}
            />
          )}
        </View>
      </View>
    </View>
  );
});
