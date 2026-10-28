import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { editorDocument } from './document.generated';
import { plainText } from '../core/content';
import type { CardDrag } from '../ui/useSwipeMotion';

export interface RichTextHandle { getHTML(): Promise<string>; insertImage(url: string): void }
interface Props { html: string; editable?: boolean; label?: string; presentation?: 'default' | 'study-front' | 'study-back'; onChange?: (html: string) => void; onImage?: (url: string) => void; onFlip?: () => void; onCardDrag?: (event: CardDrag) => void; onPickImage?: () => void }
export const RichText = forwardRef<RichTextHandle, Props>(function RichText(props, ref) {
  const web = useRef<WebView>(null);
  const latest = useRef(props); latest.current = props;
  const [height, setHeight] = useState(props.editable ? 320 : 80);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const requests = useRef(new Map<string, (html: string) => void>());
  const lastHTML = useRef(props.html);
  const send = (value: unknown) => web.current?.injectJavaScript(`window.nativeReceive(${JSON.stringify(value)});true;`);
  useEffect(() => {
    if (ready && props.html !== lastHTML.current) { lastHTML.current = props.html; send({ type: 'set', html: props.html }); }
  }, [props.html, ready]);
  useEffect(() => { if (ready) send({ type: 'appearance', presentation: props.presentation }); }, [props.presentation, ready]);
  useImperativeHandle(ref, () => ({
    getHTML: () => new Promise((resolve, reject) => {
      if (!ready || failed) { reject(new Error('편집기를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')); return; }
      const id = Math.random().toString(36);
      const timer = setTimeout(() => { requests.current.delete(id); reject(new Error('편집기 응답이 없습니다. 화면을 다시 열어 주세요.')); }, 3000);
      requests.current.set(id, html => { clearTimeout(timer); resolve(html); }); send({ type: 'get', id });
    }),
    insertImage: url => send({ type: 'image', url }),
  }), [ready, failed]);
  if (failed) return <Text accessibilityRole="alert">{plainText(props.html)}{'\n'}서식 화면을 불러오지 못했습니다. 화면을 다시 열어 주세요.</Text>;
  return <View style={{ minHeight: props.editable ? 320 : 60 }}>
    {!ready && <ActivityIndicator accessibilityLabel="카드 내용 불러오는 중" />}
    <WebView ref={web} source={{ html: editorDocument }} originWhitelist={['*']} style={{ height, backgroundColor: 'transparent' }}
      scrollEnabled={Boolean(props.editable)} javaScriptEnabled domStorageEnabled={false}
      allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
      mixedContentMode="never" setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('about:blank#')}
      onError={() => setFailed(true)} onContentProcessDidTerminate={() => web.current?.reload()}
      onMessage={event => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'ready') { lastHTML.current = latest.current.html; send({ type: 'init', html: latest.current.html, editable: props.editable, label: props.label, presentation: latest.current.presentation }); setReady(true); }
          if (data.type === 'height' && Number.isFinite(data.value) && !props.editable) setHeight(Math.max(60, Math.min(20000, data.value)));
          if (data.type === 'change' && typeof data.html === 'string') { lastHTML.current = data.html; latest.current.onChange?.(data.html); }
          if (data.type === 'value' && typeof data.html === 'string') { requests.current.get(data.id)?.(data.html); requests.current.delete(data.id); }
          if (data.type === 'image' && typeof data.url === 'string') latest.current.onImage?.(data.url);
          if (data.type === 'flip') latest.current.onFlip?.();
          if (data.type === 'card-drag' && ['move', 'end', 'cancel'].includes(data.phase) && Number.isFinite(data.dx) && Number.isFinite(data.dy)) latest.current.onCardDrag?.({ phase: data.phase, dx: data.dx, dy: data.dy });
          if (data.type === 'pick-image') latest.current.onPickImage?.();
        } catch { /* Ignore malformed messages from the isolated document. */ }
      }} />
  </View>;
});
