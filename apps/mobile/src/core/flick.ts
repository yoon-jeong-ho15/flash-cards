// Use touch-event times so bridge or rendering delays do not change a flick.
export class HorizontalVelocity {
  private samples: { x: number; time: number }[] = [];

  sample(x: number, time: number): number {
    if (!Number.isFinite(time) || !Number.isFinite(x)) return 0;
    const points = this.samples;
    const last = points[points.length - 1];
    if (last && time === last.time) last.x = x;
    else points.push({ x, time });

    const cutoff = time - 64;
    while (points.length > 1 && points[1].time <= cutoff) points.shift();
    const first = points[0];
    if (time <= first.time) return 0;
    if (first.time >= cutoff) return (x - first.x) / (time - first.time);

    // Interpolate at the window edge for sparse or coalesced move events.
    const next = points[1];
    const startX = first.x + (next.x - first.x) * (cutoff - first.time) / (next.time - first.time);
    return (x - startX) / (time - cutoff);
  }
}
