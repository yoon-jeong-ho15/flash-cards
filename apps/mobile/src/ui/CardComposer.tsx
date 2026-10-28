import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { CardInput } from '../core/types';
import { RichText, type RichTextHandle } from '../editor/RichText';
import { chooseImage } from '../platform/images';
import { Attachment, Button, Chips, s, showError, useImage } from './kit';

export interface ComposerHandle { flush(): Promise<CardInput> }
export const CardComposer = forwardRef<ComposerHandle, { card: CardInput; onChange: (card: CardInput) => void }>(function CardComposer({ card, onChange }, ref) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [busy, setBusy] = useState(false);
  const editor = useRef<RichTextHandle>(null);
  const current = useRef(card); current.current = card;
  const openImage = useImage();
  const field = side === 'front' ? 'termRichText' : 'definitionRichText';
  const imageField = side === 'front' ? 'frontImageUrl' : 'backImageUrl';
  const update = (updates: Partial<CardInput>) => { const next = { ...current.current, ...updates }; current.current = next; onChange(next); };
  const flush = async () => {
    if (busy) throw new Error('이미지 처리가 끝난 뒤 다시 시도해 주세요.');
    if (!editor.current) throw new Error('편집기를 불러오는 중입니다.');
    const html = await editor.current.getHTML(); update({ [field]: html }); return current.current;
  };
  useImperativeHandle(ref, () => ({ flush }), [side, busy]);
  const attach = (inline: boolean) => Alert.alert('사진 추가', '이미지를 가져올 방법을 선택하세요.', [
    { text: '취소', style: 'cancel' }, ...[false, true].map(camera => ({ text: camera ? '카메라' : '사진 보관함', onPress: () => {
      setBusy(true);
      void chooseImage(camera).then(url => { if (!url) return; if (inline) editor.current?.insertImage(url); else update({ [imageField]: url, ...(side === 'back' ? { imageUrl: url } : {}) }); }).catch(showError).finally(() => setBusy(false));
    } })),
  ]);
  return <View style={{ gap: 12 }}>
    <Chips value={side} options={[[ 'front', '앞면 / 질문' ], ['back', '뒷면 / 답']]} onChange={next => { if (next !== side) void flush().then(() => setSide(next)).catch(showError); }} />
    <Text style={s.muted}>서식 버튼으로 강조하거나 본문 안에 이미지를 넣을 수 있어요.</Text>
    <View style={{ borderRadius: 12, overflow: 'hidden' }}><RichText ref={editor} key={side} html={card[field]} editable label={side === 'front' ? '카드 앞면' : '카드 뒷면'} onChange={html => update({ [field]: html })} onImage={openImage} onPickImage={() => attach(true)} /></View>
    <Attachment url={card[imageField] || (side === 'back' ? card.imageUrl : undefined)} />
    <View style={s.row}><Button title={busy ? '이미지 처리 중' : '별도 이미지 첨부'} tone="secondary" busy={busy} onPress={() => attach(false)} />
      {Boolean(card[imageField] || (side === 'back' && card.imageUrl)) && <Button title="첨부 제거" tone="danger" disabled={busy} onPress={() => update({ [imageField]: undefined, ...(side === 'back' ? { imageUrl: undefined } : {}) })} />}</View>
  </View>;
});
