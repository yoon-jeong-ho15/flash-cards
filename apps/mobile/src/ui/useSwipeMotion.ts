import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";

import { CardPan } from "../core/cardPan";

const MIN_FLICK_SPEED = 0.65; // layout points per millisecond

export interface CardDrag {
  phase: "move" | "end" | "cancel";
  dx: number;
  dy: number;
  velocityX?: number;
  velocityY?: number;
}
type Owner = "native" | "web";
type Phase = "idle" | "drag" | "return" | "exit" | "enter";
const horizontal = (dx: number, dy: number) =>
  Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.4;

export function useSwipeMotion({
  cardId,
  round,
  finished,
  first,
  disabled,
  reduceMotion,
  onNavigate,
  onFlipReady,
  onSwipeStart,
  onTouchActive,
  onVerticalDrag,
  onVerticalRelease,
}: {
  cardId?: string;
  round: number;
  finished: boolean;
  first: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  onNavigate: (delta: -1 | 1, sourceId: string) => void;
  onFlipReady?: () => void;
  onSwipeStart?: () => void;
  onTouchActive?: (active: boolean) => void;
  onVerticalDrag?: (dy: number) => void;
  onVerticalRelease?: (velocityY: number) => void;
}) {
  const { width } = useWindowDimensions();
  const distance = Math.min(width - 32, 688) + 40;
  const x = useRef(new Animated.Value(0)).current;
  const phase = useRef<Phase>("idle");
  const owner = useRef<Owner | null>(null);
  const version = useRef(0);
  const pending = useRef<{ delta: -1 | 1; sourceId: string } | null>(null);
  const outgoing = useRef<{
    delta: -1 | 1;
    sourceId: string;
    committed: boolean;
  } | null>(null);
  const queued = useRef<{
    move: CardDrag;
    terminal?: CardDrag;
    owner: Owner;
  } | null>(null);
  const flipQueued = useRef(false);
  const nativeTap = useRef<{ x: number; y: number; moved: boolean; pan: CardPan } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const latest = useRef({
    cardId,
    first,
    disabled,
    reduceMotion,
    onNavigate,
    onFlipReady,
    onSwipeStart,
    onTouchActive,
    onVerticalDrag,
    onVerticalRelease,
    distance,
  });
  latest.current = {
    cardId,
    first,
    disabled,
    reduceMotion,
    onNavigate,
    onFlipReady,
    onSwipeStart,
    onTouchActive,
    onVerticalDrag,
    onVerticalRelease,
    distance,
  };

  const reset = () => {
    version.current++;
    x.stopAnimation();
    x.setOffset(0);
    x.setValue(0);
    phase.current = "idle";
    owner.current = null;
    pending.current = null;
    outgoing.current = null;
    queued.current = null;
    flipQueued.current = false;
    setTransitioning(false);
  };
  const settle = () => {
    const token = ++version.current;
    if (phase.current === "drag") x.flattenOffset();
    phase.current = "return";
    owner.current = null;
    x.stopAnimation();
    if (latest.current.reduceMotion) {
      x.setValue(0);
      phase.current = "idle";
      return;
    }
    Animated.spring(x, {
      toValue: 0,
      stiffness: 260,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start(() => {
      if (token === version.current) phase.current = "idle";
    });
  };
  const commitExit = () => {
    const exit = outgoing.current;
    if (!exit || exit.committed || exit.sourceId !== latest.current.cardId)
      return;
    exit.committed = true;
    pending.current = { delta: exit.delta, sourceId: exit.sourceId };
    latest.current.onNavigate(exit.delta, exit.sourceId);
  };
  const navigate = (delta: -1 | 1, sourceId = latest.current.cardId) => {
    const state = latest.current;
    if (
      !sourceId ||
      sourceId !== state.cardId ||
      state.disabled ||
      phase.current === "exit"
    )
      return;
    if (delta === -1 && state.first) {
      settle();
      return;
    }
    const token = ++version.current;
    if (phase.current === "drag") x.flattenOffset();
    x.stopAnimation();
    owner.current = null;
    if (state.reduceMotion) {
      x.setValue(0);
      phase.current = "idle";
      pending.current = null;
      state.onNavigate(delta, sourceId);
      return;
    }
    phase.current = "exit";
    setTransitioning(true);
    outgoing.current = { delta, sourceId, committed: false };
    Animated.timing(x, {
      toValue: -delta * state.distance,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished: completed }) => {
      if (
        !completed ||
        token !== version.current ||
        sourceId !== latest.current.cardId
      )
        return;
      commitExit();
    });
  };
  const drag = (
    event: CardDrag,
    sourceId: string | undefined,
    input: Owner,
  ) => {
    const state = latest.current;
    if (!sourceId || sourceId !== state.cardId || state.disabled) return;
    if (phase.current === "exit") {
      // A new gesture finishes the outgoing transition immediately. Replay it
      // against the incoming card after React commits, rather than discarding it.
      if (queued.current?.owner === "native" && input === "web") return;
      if (event.phase === "move" && horizontal(event.dx, event.dy)) {
        if (!queued.current) state.onSwipeStart?.();
        flipQueued.current = false;
        queued.current = { move: event, owner: input };
        version.current++;
        x.stopAnimation();
        commitExit();
      } else if (queued.current) queued.current.terminal = event;
      return;
    }
    // Native capture cancels the WebView's touch stream; ignore that stale cancel.
    if (owner.current === "native" && input === "web") return;
    if (event.phase === "move") {
      if (phase.current !== "drag" && !horizontal(event.dx, event.dy)) return;
      if (phase.current !== "drag") {
        const interruptingSpring = phase.current === "enter" || phase.current === "return";
        version.current++;
        x.stopAnimation();
        // Keep an interrupted spring's displayed position on the animation node.
        // Finger updates can then start without waiting for a native position read.
        if (interruptingSpring) x.extractOffset();
        phase.current = "drag";
        state.onSwipeStart?.();
        setTransitioning(false);
      }
      owner.current = input;
      const dx = state.first && event.dx > 0 ? event.dx * 0.22 : event.dx;
      x.setValue(Math.max(-state.distance, Math.min(state.distance, dx)));
    } else if (phase.current === "drag") {
      if (
        event.phase === "end" &&
        Math.abs(event.dx) >= 30 &&
        Math.sign(event.dx) * (event.velocityX ?? 0) >= MIN_FLICK_SPEED &&
        Math.abs(event.velocityX ?? 0) > Math.abs(event.velocityY ?? 0) * 1.4
      )
        navigate(event.dx < 0 ? 1 : -1, sourceId);
      else settle();
    }
  };
  const prepareFlip = () => {
    if (latest.current.disabled || phase.current === "drag") return false;
    if (phase.current === "exit") {
      // Finish navigation first so a quick tap flips the incoming card.
      flipQueued.current = true;
      queued.current = null;
      version.current++;
      x.stopAnimation();
      commitExit();
      return false;
    }
    if (phase.current === "enter" || phase.current === "return") reset();
    return true;
  };

  useLayoutEffect(() => {
    const next = pending.current;
    const replay = queued.current;
    const wantsFlip = flipQueued.current;
    flipQueued.current = false;
    pending.current = null;
    queued.current = null;
    outgoing.current = null;
    if (next && cardId && cardId !== next.sourceId && !finished && wantsFlip) {
      reset();
      const token = version.current;
      // Run after the new card has reset its flip transform.
      void Promise.resolve().then(() => {
        if (
          token === version.current &&
          phase.current === "idle" &&
          latest.current.cardId === cardId
        )
          latest.current.onFlipReady?.();
      });
    } else if (
      next &&
      cardId &&
      cardId !== next.sourceId &&
      !finished &&
      !reduceMotion
    ) {
      const token = ++version.current;
      x.stopAnimation();
      x.setValue(next.delta * distance);
      phase.current = "enter";
      // The new card is interactive as soon as it is mounted. Its entrance is
      // visual only; neither the spring's duration nor settling blocks input.
      setTransitioning(false);
      Animated.spring(x, {
        toValue: 0,
        stiffness: 240,
        damping: 28,
        mass: 0.8,
        useNativeDriver: true,
        isInteraction: false,
      }).start(() => {
        if (token !== version.current) return;
        phase.current = "idle";
        owner.current = null;
        setTransitioning(false);
      });
      if (replay) {
        drag(replay.move, cardId, replay.owner);
        if (replay.terminal) drag(replay.terminal, cardId, replay.owner);
      }
    } else reset();
    return () => {
      version.current++;
      x.stopAnimation();
    };
  }, [cardId, round, finished, reduceMotion, distance]);

  const nativeDrag = (phase: "move" | "end", event: GestureResponderEvent) => {
    const start = nativeTap.current;
    if (!start) {
      if (phase === "end") {
        drag({ phase: "cancel", dx: 0, dy: 0 }, latest.current.cardId, "native");
        latest.current.onTouchActive?.(false);
      }
      return;
    }
    const { pageX, pageY, timestamp } = event.nativeEvent;
    const motion = start.pan.sample(pageX, pageY, timestamp);
    owner.current = "native";
    if (motion.horizontal) {
      drag({ phase, dx: motion.dx, dy: 0, velocityX: motion.velocityX, velocityY: motion.velocityY }, latest.current.cardId, "native");
    } else if (phase === "move") {
      latest.current.onVerticalDrag?.(motion.scrollY);
    } else if (start.moved) {
      latest.current.onVerticalRelease?.(motion.velocityY);
    }
    if (phase === "end") latest.current.onTouchActive?.(false);
  };

  // Keep the responder's native gesture state across renders during a swipe.
  // Callbacks read current props through latest rather than replacing it.
  const responder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (!responder.current)
    responder.current = PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) => {
        const touches = event.nativeEvent.touches;
        if (touches.length !== 1 || latest.current.disabled) {
          if (nativeTap.current) {
            drag({ phase: "cancel", dx: 0, dy: 0 }, latest.current.cardId, "native");
          }
          nativeTap.current = null;
          latest.current.onTouchActive?.(false);
          return false;
        }
        nativeTap.current = null;
        if (touches.length === 1) {
          const { pageX, pageY } = touches[0];
          const pan = new CardPan(pageX, pageY, event.nativeEvent.timestamp);
          nativeTap.current = { x: pageX, y: pageY, moved: false, pan };
          owner.current = null;
          latest.current.onTouchActive?.(true);
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, movement) => {
        // Handle both axes for a card touch so native scrolling cannot consume
        // the touch stream before the user turns sideways.
        const moved = Math.abs(movement.dx) > 10 || Math.abs(movement.dy) > 10;
        if (nativeTap.current && moved) nativeTap.current.moved = true;
        const capture = !latest.current.disabled && nativeTap.current !== null && moved;
        if (capture) owner.current = "native";
        return capture;
      },
      onPanResponderGrant: (event) => nativeDrag("move", event),
      onPanResponderMove: (event) => nativeDrag("move", event),
      onPanResponderRelease: (event) => nativeDrag("end", event),
      onPanResponderTerminate: () => {
        drag({ phase: "cancel", dx: 0, dy: 0 }, latest.current.cardId, "native");
        nativeTap.current = null;
        latest.current.onTouchActive?.(false);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });
  const style = useMemo(() => ({
    transform: [
      { translateX: x },
      {
        rotateZ: reduceMotion
          ? "0deg"
          : x.interpolate({
              inputRange: [-distance, 0, distance],
              outputRange: ["-7deg", "0deg", "7deg"],
              extrapolate: "clamp",
            }),
      },
    ],
  }), [x, distance, reduceMotion]);
  return {
    panHandlers: responder.current.panHandlers,
    touchHandlers: {
      onTouchEnd: (event: GestureResponderEvent) => {
        if (event.nativeEvent.touches.length === 0) latest.current.onTouchActive?.(false);
      },
      onTouchCancel: () => {
        if (owner.current !== "native") latest.current.onTouchActive?.(false);
      },
    },
    transitioning,
    navigate,
    prepareFlip,
    isTap: (event: GestureResponderEvent) => {
      // Accessibility clicks have no touch stream and must remain available.
      if (!event.nativeEvent.changedTouches) return true;
      const start = nativeTap.current;
      const end = event.nativeEvent.changedTouches[0] ?? event.nativeEvent;
      return Boolean(start && !start.moved &&
        Math.abs(end.pageX - start.x) <= 10 && Math.abs(end.pageY - start.y) <= 10);
    },
    isMoving: () => phase.current !== "idle",
    onDrag: (event: CardDrag, sourceId: string) => drag(event, sourceId, "web"),
    style,
  };
}
