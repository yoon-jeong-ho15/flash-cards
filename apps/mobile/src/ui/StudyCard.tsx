import React, {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import { offsetAfterTouch, type ScrollMetrics } from "../core/studyScroll";
import type { Card } from "../core/types";
import { RichText } from "../editor/RichText";
import { Icon } from "./Icon";
import { Attachment, useImage } from "./kit";
import { radius, useThemedStyles, useUI, type Palette } from "./theme";
import { Text } from "./Typography";
import { useSwipeMotion } from "./useSwipeMotion";

export interface StudyCardHandle {
  navigate: (delta: -1 | 1) => void;
}

interface StudyCardProps {
  ref?: Ref<StudyCardHandle>;
  card: Card;
  flipped: boolean;
  round: number;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onEdit: () => void;
  onFlip: () => void;
  onNavigate: (delta: -1 | 1, sourceId: string) => void;
  onControlsLockedChange: (locked: boolean) => void;
  onTouchActiveChange: (active: boolean) => void;
  // Signed finger movement left after scrolling the visible face.
  onVerticalOverflow: (dy: number, animated: boolean) => void;
}

export function StudyCard({
  ref,
  card,
  flipped,
  round,
  isFirst,
  isLast,
  disabled,
  onEdit,
  onFlip,
  onNavigate,
  onControlsLockedChange,
  onTouchActiveChange,
  onVerticalOverflow,
}: StudyCardProps) {
  const { colors, s } = useUI();
  const study = useThemedStyles(createStyles);
  const openImage = useImage();
  const [reduceMotion, setReduceMotion] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;
  const [turning, setTurning] = useState(false);
  const flipInFlight = useRef(false);
  const animationVersion = useRef(0);
  const flipReady = useRef<() => void>(() => {});
  const frontScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const backScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [touchActive, setTouchActive] = useState(false);
  const facePositions = useRef<Record<"front" | "back", ScrollMetrics>>({
    front: { y: 0, height: 0, content: 0 },
    back: { y: 0, height: 0, content: 0 },
  });

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      listener.remove();
    };
  }, []);

  const scrollFace = (dy: number, animated: boolean) => {
    const inner = facePositions.current[flipped ? "back" : "front"];
    const y = offsetAfterTouch(inner, dy);
    const remaining = dy - (inner.y - y);
    if (y !== inner.y) {
      inner.y = y;
      (flipped ? backScroll : frontScroll).current?.scrollTo({ y, animated });
    }
    if (remaining !== 0) onVerticalOverflow(remaining, animated);
  };
  const syncRotation = () => {
    animationVersion.current++;
    rotation.stopAnimation();
    rotation.setValue(flipped ? 1 : 0);
    flipInFlight.current = false;
    setTurning(false);
  };
  const swipe = useSwipeMotion({
    cardId: card.id,
    round,
    finished: false,
    first: isFirst,
    disabled,
    reduceMotion,
    onNavigate,
    onFlipReady: () => flipReady.current(),
    onTouchActive: (active) => {
      // Keep the responder in control of both axes for this touch.
      frontScroll.current?.setNativeProps({ scrollEnabled: !active });
      backScroll.current?.setNativeProps({ scrollEnabled: !active });
      setTouchActive(active);
      onTouchActiveChange(active);
    },
    onVerticalDrag: (dy) => scrollFace(dy, false),
    onVerticalRelease: (velocityY) => {
      if (Math.abs(velocityY) > 0.1) scrollFace(velocityY * 160, !reduceMotion);
    },
    onSwipeStart: () => {
      if (flipInFlight.current) syncRotation();
    },
  });

  useImperativeHandle(ref, () => ({ navigate: (delta) => swipe.navigate(delta) }));
  useLayoutEffect(() => {
    onControlsLockedChange(turning || swipe.transitioning);
  }, [turning, swipe.transitioning, onControlsLockedChange]);
  useLayoutEffect(() => () => {
    // The card also unmounts when the session completes during a gesture.
    onTouchActiveChange(false);
    onControlsLockedChange(false);
  }, [onTouchActiveChange, onControlsLockedChange]);

  useLayoutEffect(() => {
    frontScroll.current?.scrollTo({ y: 0, animated: false });
    backScroll.current?.scrollTo({ y: 0, animated: false });
    facePositions.current.front.y = 0;
    facePositions.current.back.y = 0;
  }, [card.id]);
  useLayoutEffect(() => {
    // A different card or interrupted animation must not inherit a partial turn.
    syncRotation();
    return () => {
      animationVersion.current++;
      rotation.stopAnimation();
    };
  }, [card.id, round, reduceMotion, rotation]);
  useLayoutEffect(() => {
    if (!flipInFlight.current) rotation.setValue(flipped ? 1 : 0);
  }, [flipped, rotation]);

  const flip = () => {
    if (disabled || flipInFlight.current || !swipe.prepareFlip()) return;
    if (reduceMotion) {
      onFlip();
      return;
    }
    const version = ++animationVersion.current;
    flipInFlight.current = true;
    setTurning(true);
    onFlip();
    Animated.timing(rotation, {
      toValue: flipped ? 0 : 1,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (version !== animationVersion.current) return;
      flipInFlight.current = false;
      setTurning(false);
    });
  };
  flipReady.current = flip;
  const flipOnPress = (event: GestureResponderEvent) => {
    if (swipe.isTap(event)) flip();
  };

  const renderFace = (back: boolean) => {
    const image = back
      ? card.backImageUrl || card.imageUrl
      : card.frontImageUrl;
    const visible = flipped === back;
    const position = facePositions.current[back ? "back" : "front"];
    return (
      <Animated.View
        key={String(back)}
        pointerEvents={visible ? "auto" : "none"}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
        style={[
          study.card,
          study.faceLayer,
          {
            borderColor: card.learned ? colors.successBorder : colors.border,
            transform: [
              { perspective: 1200 },
              {
                rotateY: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: back ? ["180deg", "360deg"] : ["0deg", "180deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="카드 뒤집기"
          accessibilityHint="왼쪽으로 빠르게 밀면 다음 카드, 오른쪽으로 빠르게 밀면 이전 카드"
          accessibilityActions={[
            { name: "increment", label: isLast ? "학습 결과 보기" : "다음 카드" },
            { name: "decrement", label: "이전 카드" },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment") swipe.navigate(1);
            if (event.nativeEvent.actionName === "decrement")
              swipe.navigate(-1);
          }}
          onPress={flipOnPress}
          style={study.cardHeader}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={[
                study.face,
                back && { backgroundColor: colors.successBg, color: colors.success },
              ]}
            >
              {back ? "답변" : "질문"}
            </Text>
            {card.learned && (
              <View style={study.knownBadge}>
                <Icon name="check" size={12} color={colors.success} />
                <Text style={study.knownBadgeText}>알아요</Text>
              </View>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카드 내용 수정"
            disabled={disabled}
            onPress={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            style={study.smallButton}
          >
            <Icon name="pencil" size={17} color={colors.icon} />
          </Pressable>
        </Pressable>
        <Pressable onPress={flipOnPress} style={{ flex: 1 }} accessible={false}>
          <ScrollView
            ref={back ? backScroll : frontScroll}
            scrollEnabled={!touchActive}
            scrollEventThrottle={16}
            onScroll={(event) => {
              position.y = event.nativeEvent.contentOffset.y;
            }}
            onLayout={(event) => {
              position.height = event.nativeEvent.layout.height;
            }}
            onContentSizeChange={(_, height) => {
              position.content = height;
            }}
            nestedScrollEnabled
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카드 뒤집기"
              onPress={flipOnPress}
            >
              <Attachment url={image} />
              <RichText
                html={back ? card.definitionRichText : card.termRichText}
                presentation={back ? "study-back" : "study-front"}
                onImage={openImage}
                onFlip={flip}
                onCardDrag={(event) => swipe.onDrag(event, card.id)}
              />
            </Pressable>
          </ScrollView>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="카드 뒤집기"
          onPress={flipOnPress}
          style={study.cardFooter}
        >
          <Icon name="rotate" size={15} color={colors.icon} />
          <Text style={s.muted}>{back ? "질문 보기" : "답변 보기"}</Text>
        </Pressable>
      </Animated.View>
    );
  };
  return (
    <View style={{ flex: 1, minHeight: 180 }}>
      <View
        {...swipe.panHandlers}
        {...swipe.touchHandlers}
        pointerEvents={disabled ? "none" : "auto"}
        style={{ flex: 1 }}
        accessible={false}
      >
        <Animated.View style={[{ flex: 1 }, swipe.style]} accessible={false}>
          {renderFace(false)}
          {renderFace(true)}
        </Animated.View>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    height: "100%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 18,
    boxShadow: `0px 4px 16px ${colors.shadow}`,
  },
  faceLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  face: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: colors.pale,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 9,
    overflow: "hidden",
  },
  knownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  knownBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
  },
  smallButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 42,
  },
});
