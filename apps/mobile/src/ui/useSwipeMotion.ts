import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, useWindowDimensions } from 'react-native';

export interface CardDrag { phase: 'move' | 'end' | 'cancel'; dx: number; dy: number }
type Owner = 'native' | 'web';
type Phase = 'idle' | 'drag' | 'return' | 'exit' | 'enter';
const horizontal = (dx: number, dy: number) => Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.4;

export function useSwipeMotion({ cardId, round, finished, first, disabled, reduceMotion, onNavigate, onFlipReady }: {
  cardId?: string; round: number; finished: boolean; first: boolean; disabled: boolean; reduceMotion: boolean;
  onNavigate: (delta: -1 | 1, sourceId: string) => void;
  onFlipReady?: () => void;
}) {
  const { width } = useWindowDimensions();
  const distance = Math.min(width - 32, 688) + 40;
  const x = useRef(new Animated.Value(0)).current;
  const phase = useRef<Phase>('idle');
  const owner = useRef<Owner | null>(null);
  const version = useRef(0);
  const pending = useRef<{ delta: -1 | 1; sourceId: string } | null>(null);
  const outgoing = useRef<{ delta: -1 | 1; sourceId: string; committed: boolean } | null>(null);
  const queued = useRef<{ move: CardDrag; terminal?: CardDrag; owner: Owner } | null>(null);
  const origin = useRef<number | null>(0);
  const lastDrag = useRef<CardDrag>({ phase: 'move', dx: 0, dy: 0 });
  const flipQueued = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
  const latest = useRef({ cardId, first, disabled, reduceMotion, onNavigate, onFlipReady, distance });
  latest.current = { cardId, first, disabled, reduceMotion, onNavigate, onFlipReady, distance };

  const reset = () => {
    version.current++;
    x.stopAnimation(); x.setValue(0);
    phase.current = 'idle'; owner.current = null; pending.current = null; outgoing.current = null; queued.current = null;
    flipQueued.current = false;
    setTransitioning(false);
  };
  const settle = () => {
    const token = ++version.current;
    phase.current = 'return'; owner.current = null;
    x.stopAnimation();
    if (latest.current.reduceMotion) { x.setValue(0); phase.current = 'idle'; return; }
    Animated.spring(x, { toValue: 0, stiffness: 260, damping: 26, mass: 0.8, useNativeDriver: true }).start(() => {
      if (token === version.current) phase.current = 'idle';
    });
  };
  const commitExit = () => {
    const exit = outgoing.current;
    if (!exit || exit.committed || exit.sourceId !== latest.current.cardId) return;
    exit.committed = true;
    pending.current = { delta: exit.delta, sourceId: exit.sourceId };
    latest.current.onNavigate(exit.delta, exit.sourceId);
  };
  const navigate = (delta: -1 | 1, sourceId = latest.current.cardId) => {
    const state = latest.current;
    if (!sourceId || sourceId !== state.cardId || state.disabled || phase.current === 'exit') return;
    if (delta === -1 && state.first) { settle(); return; }
    const token = ++version.current;
    x.stopAnimation(); owner.current = null;
    if (state.reduceMotion) {
      x.setValue(0); phase.current = 'idle'; pending.current = null;
      state.onNavigate(delta, sourceId); return;
    }
    phase.current = 'exit'; setTransitioning(true);
    outgoing.current = { delta, sourceId, committed: false };
    Animated.timing(x, { toValue: -delta * state.distance, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished: completed }) => {
      if (!completed || token !== version.current || sourceId !== latest.current.cardId) return;
      commitExit();
    });
  };
  const drag = (event: CardDrag, sourceId: string | undefined, input: Owner) => {
    const state = latest.current;
    if (!sourceId || sourceId !== state.cardId || state.disabled) return;
    if (phase.current === 'exit') {
      // A new gesture finishes the outgoing transition immediately. Replay it
      // against the incoming card after React commits, rather than discarding it.
      if (queued.current?.owner === 'native' && input === 'web') return;
      if (event.phase === 'move' && horizontal(event.dx, event.dy)) {
        flipQueued.current = false;
        queued.current = { move: event, owner: input };
        version.current++; x.stopAnimation(); commitExit();
      } else if (queued.current) queued.current.terminal = event;
      return;
    }
    // Native capture cancels the WebView's touch stream; ignore that stale cancel.
    if (owner.current === 'native' && input === 'web') return;
    if (event.phase === 'move') {
      if (phase.current !== 'drag' && !horizontal(event.dx, event.dy)) return;
      lastDrag.current = event;
      if (phase.current !== 'drag') {
        const token = ++version.current;
        phase.current = 'drag'; origin.current = null; setTransitioning(false);
        x.stopAnimation(value => {
          if (token !== version.current || phase.current !== 'drag') return;
          origin.current = value;
          const dx = lastDrag.current.dx;
          x.setValue(value + (latest.current.first && dx > 0 ? dx * 0.22 : dx));
        });
      }
      owner.current = input;
      const offset = state.first && event.dx > 0 ? event.dx * 0.22 : event.dx;
      if (origin.current !== null) x.setValue(Math.max(-state.distance, Math.min(state.distance, origin.current + offset)));
    } else if (phase.current === 'drag') {
      if (event.phase === 'end' && Math.abs(event.dx) >= 30 && horizontal(event.dx, event.dy)) navigate(event.dx < 0 ? 1 : -1, sourceId);
      else settle();
    }
  };
  const prepareFlip = () => {
    if (latest.current.disabled || phase.current === 'drag') return false;
    if (phase.current === 'exit') {
      // Finish navigation first so a quick tap flips the incoming card.
      flipQueued.current = true; queued.current = null;
      version.current++; x.stopAnimation(); commitExit();
      return false;
    }
    if (phase.current === 'enter' || phase.current === 'return') reset();
    return true;
  };

  useLayoutEffect(() => {
    const next = pending.current;
    const replay = queued.current;
    const wantsFlip = flipQueued.current;
    flipQueued.current = false;
    pending.current = null;
    queued.current = null; outgoing.current = null;
    if (next && cardId && cardId !== next.sourceId && !finished && wantsFlip) {
      reset();
      const token = version.current;
      // Run after the study screen has reset the new card's flip transform.
      void Promise.resolve().then(() => {
        if (token === version.current && phase.current === 'idle' && latest.current.cardId === cardId) latest.current.onFlipReady?.();
      });
    } else if (next && cardId && cardId !== next.sourceId && !finished && !reduceMotion) {
      const token = ++version.current;
      x.stopAnimation(); x.setValue(next.delta * distance);
      phase.current = 'enter';
      Animated.spring(x, { toValue: 0, stiffness: 240, damping: 28, mass: 0.8, useNativeDriver: true }).start(() => {
        if (token !== version.current) return;
        phase.current = 'idle'; owner.current = null; setTransitioning(false);
      });
      if (replay) {
        drag(replay.move, cardId, replay.owner);
        if (replay.terminal) drag(replay.terminal, cardId, replay.owner);
      }
    } else reset();
    return () => { version.current++; x.stopAnimation(); };
  }, [cardId, round, finished, reduceMotion, distance]);

  const responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, movement) => !latest.current.disabled && horizontal(movement.dx, movement.dy),
    onPanResponderGrant: (_, movement) => drag({ phase: 'move', dx: movement.dx, dy: movement.dy }, latest.current.cardId, 'native'),
    onPanResponderMove: (_, movement) => drag({ phase: 'move', dx: movement.dx, dy: movement.dy }, latest.current.cardId, 'native'),
    onPanResponderRelease: (_, movement) => drag({ phase: 'end', dx: movement.dx, dy: movement.dy }, latest.current.cardId, 'native'),
    onPanResponderTerminate: () => drag({ phase: 'cancel', dx: 0, dy: 0 }, latest.current.cardId, 'native'),
    onShouldBlockNativeResponder: () => true,
  });
  return {
    panHandlers: responder.panHandlers, transitioning, navigate, prepareFlip,
    isMoving: () => phase.current !== 'idle',
    onDrag: (event: CardDrag, sourceId: string) => drag(event, sourceId, 'web'),
    style: { transform: [{ translateX: x }, { rotateZ: reduceMotion ? '0deg' : x.interpolate({ inputRange: [-distance, 0, distance], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp' }) }] },
  };
}
