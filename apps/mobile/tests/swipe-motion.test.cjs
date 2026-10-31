const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const source = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/ui/useSwipeMotion.ts')], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react', 'react-native'] }).outputFiles[0].text;

// Complete animation callbacks explicitly to exercise gesture/transition races.
function harness(overrides = {}) {
  const slots = [], effects = [], jobs = [], calls = [];
  let cursor = 0, result;
  const props = { cardId: 'a', round: 1, finished: false, first: false, disabled: false, reduceMotion: false, onNavigate: (...args) => calls.push(args), ...overrides };
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useLayoutEffect(fn, deps) {
      const i = cursor++, old = slots[i];
      if (!old || deps.some((d, j) => !Object.is(d, old.deps[j]))) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    },
  };
  class Value {
    constructor(value) { this.value = value; }
    setValue(value) { this.value = value; }
    interpolate(options) { return options; }
    stopAnimation(cb) { if (this.job && !this.job.done) { this.job.done = true; this.job.cb({ finished: false }); } cb?.(this.value); }
  }
  const animate = (value, config) => ({ start(cb) { const job = { done: false, cb, complete() { if (this.done) return; this.done = true; value.setValue(config.toValue); cb({ finished: true }); } }; value.job = job; jobs.push(job); } });
  const native = { Animated: { Value, timing: animate, spring: animate }, Easing: { out: x => x, cubic: 'cubic' }, PanResponder: { create: handlers => ({ panHandlers: handlers }) }, useWindowDimensions: () => ({ width: 390 }) };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => name === 'react' ? react : native, module, module.exports);
  const render = (next = {}) => { Object.assign(props, next); cursor = 0; result = module.exports.useSwipeMotion(props); while (effects.length) effects.shift()(); return result; };
  render();
  return { render, calls, jobs, get motion() { return result; }, get x() { return result.style.transform[0].translateX.value; }, complete() { const job = jobs.find(j => !j.done); assert.ok(job, 'an animation must be pending'); job.complete(); } };
}
test('drag follows the finger, exits before navigation, then enters from the opposite side once', () => {
  const h = harness();
  h.motion.onDrag({ phase: 'move', dx: -95, dy: 2 }, 'a'); assert.equal(h.x, -95);
  h.motion.onDrag({ phase: 'end', dx: -95, dy: 2 }, 'a'); assert.deepEqual(h.calls, []);
  h.motion.onDrag({ phase: 'end', dx: -95, dy: 2 }, 'a');
  h.complete(); assert.deepEqual(h.calls, [[1, 'a']]);
  h.render({ cardId: 'b' }); assert.equal(h.x, 398);
  h.complete(); assert.equal(h.x, 0); assert.equal(h.motion.isMoving(), false);
});
test('native takeover ignores WebView cancellation and a short reversed drag springs back', () => {
  const h = harness();
  h.motion.onDrag({ phase: 'move', dx: -40, dy: 0 }, 'a');
  h.motion.panHandlers.onPanResponderGrant(null, { dx: -45, dy: 0 });
  h.motion.onDrag({ phase: 'cancel', dx: 0, dy: 0 }, 'a'); assert.equal(h.x, -45);
  h.motion.panHandlers.onPanResponderMove(null, { dx: -5, dy: 0 }); assert.equal(h.x, -5);
  h.motion.panHandlers.onPanResponderRelease(null, { dx: -5, dy: 0 });
  h.complete(); assert.equal(h.x, 0); assert.deepEqual(h.calls, []);
});
test('the first-card edge resists and cancels without navigating; deleted cards cancel stale exits', () => {
  const h = harness({ first: true });
  h.motion.onDrag({ phase: 'move', dx: 100, dy: 0 }, 'a'); assert.equal(h.x, 22);
  h.motion.onDrag({ phase: 'end', dx: 100, dy: 0 }, 'a'); h.complete(); assert.deepEqual(h.calls, []);
  h.motion.onDrag({ phase: 'move', dx: -100, dy: 0 }, 'a');
  h.motion.onDrag({ phase: 'end', dx: -100, dy: 0 }, 'a');
  h.render({ cardId: 'c' }); assert.equal(h.x, 0); assert.deepEqual(h.calls, []);
});
test('reduced motion navigates immediately; vertical scrolling never drags the card', () => {
  const h = harness({ reduceMotion: true });
  h.motion.onDrag({ phase: 'move', dx: 20, dy: 90 }, 'a'); assert.equal(h.x, 0);
  h.motion.onDrag({ phase: 'move', dx: -90, dy: 0 }, 'a');
  h.motion.onDrag({ phase: 'end', dx: -90, dy: 0 }, 'a');
  assert.deepEqual(h.calls, [[1, 'a']]); assert.equal(h.jobs.length, 0);
});
test('a new swipe interrupts the incoming animation at its current position without waiting', () => {
  const h = harness();
  h.motion.onDrag({ phase: 'move', dx: -90, dy: 0 }, 'a');
  h.motion.onDrag({ phase: 'end', dx: -90, dy: 0 }, 'a'); h.complete();
  h.render({ cardId: 'b' });
  h.motion.style.transform[0].translateX.setValue(120); // midway through entrance
  assert.equal(h.motion.panHandlers.onMoveShouldSetPanResponderCapture(null, { dx: -70, dy: 0 }), true);
  h.motion.onDrag({ phase: 'move', dx: -70, dy: 0 }, 'b');
  assert.equal(h.x, 50, 'take over at the displayed position, without snapping');
  h.motion.onDrag({ phase: 'end', dx: -70, dy: 0 }, 'b'); h.complete();
  assert.deepEqual(h.calls, [[1, 'a'], [1, 'b']]);
  h.render({ cardId: 'c' }); h.complete(); assert.equal(h.x, 0);
});
test('the incoming spring does not lock input and rapid swipes interrupt each transition', () => {
  let starts = 0;
  const h = harness({ onSwipeStart: () => starts++ });
  h.motion.onDrag({ phase: 'move', dx: -90, dy: 0 }, 'a');
  h.motion.onDrag({ phase: 'end', dx: -90, dy: 0 }, 'a');
  assert.equal(h.render().transitioning, true);
  h.complete();
  h.render({ cardId: 'b' });
  assert.equal(h.render().transitioning, false, 'input unlocks before the entrance spring completes');
  assert.equal(h.motion.isMoving(), true, 'the entrance animation is still running');
  h.motion.panHandlers.onPanResponderGrant(null, { dx: -70, dy: 0 });
  h.motion.panHandlers.onPanResponderRelease(null, { dx: -70, dy: 0 });
  // Start a third swipe before the second exit finishes, without waiting.
  h.motion.panHandlers.onPanResponderGrant(null, { dx: -80, dy: 0 });
  h.motion.panHandlers.onPanResponderRelease(null, { dx: -80, dy: 0 });
  h.render({ cardId: 'c' });
  h.complete();
  assert.deepEqual(h.calls, [[1, 'a'], [1, 'b'], [1, 'c']]);
  assert.ok(starts >= 3);
  assert.equal(h.motion.panHandlers.onPanResponderTerminationRequest(), false, 'a parent scroll view cannot steal an active horizontal swipe');
});
test('renders preserve the native responder and it still reads the current card and disabled state', () => {
  const h = harness();
  const handlers = h.motion.panHandlers;
  h.render({ disabled: true });
  assert.equal(h.motion.panHandlers, handlers);
  assert.equal(handlers.onMoveShouldSetPanResponderCapture(null, { dx: -80, dy: 0 }), false);
  h.render({ disabled: false, cardId: 'b' });
  assert.equal(h.motion.panHandlers, handlers);
  assert.equal(handlers.onMoveShouldSetPanResponderCapture(null, { dx: -80, dy: 0 }), true);
  handlers.onPanResponderGrant(null, { dx: -80, dy: 0 });
  h.render();
  handlers.onPanResponderRelease(null, { dx: -80, dy: 0 });
  h.complete();
  assert.deepEqual(h.calls, [[1, 'b']]);
});
test('a second swipe during exit is replayed once on the next card, even if released before render', () => {
  const h = harness();
  h.motion.onDrag({ phase: 'move', dx: -90, dy: 0 }, 'a');
  h.motion.onDrag({ phase: 'end', dx: -90, dy: 0 }, 'a');
  h.motion.onDrag({ phase: 'end', dx: -90, dy: 0 }, 'a'); // duplicate release is ignored
  assert.deepEqual(h.calls, []);
  h.motion.onDrag({ phase: 'move', dx: -80, dy: 0 }, 'a'); // next gesture, before exit completes
  assert.deepEqual(h.calls, [[1, 'a']]);
  h.motion.onDrag({ phase: 'end', dx: -80, dy: 0 }, 'a');
  h.render({ cardId: 'b' }); h.complete();
  assert.deepEqual(h.calls, [[1, 'a'], [1, 'b']]);
  h.render({ cardId: 'c' }); h.complete(); assert.equal(h.x, 0);
});
test('an incoming card can be swiped backwards or cancelled without stale callbacks completing it', () => {
  const h = harness();
  h.motion.navigate(1, 'a'); h.complete(); h.render({ cardId: 'b' });
  h.motion.onDrag({ phase: 'move', dx: 80, dy: 0 }, 'b');
  h.motion.onDrag({ phase: 'end', dx: 80, dy: 0 }, 'b'); h.complete();
  assert.deepEqual(h.calls, [[1, 'a'], [-1, 'b']]);
  h.render({ cardId: 'a' });
  h.motion.onDrag({ phase: 'move', dx: -30, dy: 0 }, 'a');
  h.motion.onDrag({ phase: 'cancel', dx: 0, dy: 0 }, 'a'); h.complete();
  assert.equal(h.x, 0); assert.equal(h.motion.isMoving(), false);
  assert.equal(h.calls.length, 2);
});
test('a tap immediately interrupts entrance or spring-back and leaves the card centered for flipping', () => {
  const h = harness();
  h.motion.navigate(1, 'a'); h.complete(); h.render({ cardId: 'b' });
  h.motion.style.transform[0].translateX.setValue(100);
  assert.equal(h.motion.prepareFlip(), true);
  assert.equal(h.x, 0); assert.equal(h.motion.isMoving(), false);
  h.motion.onDrag({ phase: 'move', dx: -25, dy: 0 }, 'b');
  assert.equal(h.motion.prepareFlip(), false, 'an active swipe is not a tap');
  h.motion.onDrag({ phase: 'end', dx: -25, dy: 0 }, 'b');
  assert.equal(h.motion.prepareFlip(), true);
  assert.equal(h.x, 0); assert.deepEqual(h.calls, [[1, 'a']]);
});
test('a tap during exit advances once and flips only the incoming card after layout', async () => {
  const flips = [];
  const h = harness({ onFlipReady: () => flips.push('flip') });
  h.motion.navigate(1, 'a');
  assert.equal(h.motion.prepareFlip(), false);
  assert.equal(h.motion.prepareFlip(), false);
  assert.deepEqual(h.calls, [[1, 'a']]); assert.deepEqual(flips, []);
  h.render({ cardId: 'b' });
  assert.equal(h.x, 0); assert.deepEqual(flips, []);
  await Promise.resolve();
  assert.deepEqual(flips, ['flip']); assert.equal(h.motion.isMoving(), false);
});
test('finishing study or replacing the card cancels a queued flip', async () => {
  let flips = 0;
  const h = harness({ onFlipReady: () => flips++ });
  h.motion.navigate(1, 'a'); h.motion.prepareFlip();
  h.render({ finished: true }); await Promise.resolve(); assert.equal(flips, 0);
  h.render({ cardId: 'b', finished: false });
  h.motion.navigate(1, 'b'); h.motion.prepareFlip(); h.render({ cardId: 'c' });
  h.render({ cardId: 'd' }); await Promise.resolve(); assert.equal(flips, 0);
});
