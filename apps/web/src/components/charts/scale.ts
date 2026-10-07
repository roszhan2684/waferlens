/** Minimal scale helpers. No chart library; every chart is plain SVG. */

export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** "Nice" tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const norm = step0 / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

export function niceDomain(min: number, max: number, count = 4): [number, number] {
  const ticks = niceTicks(min, max, count);
  if (ticks.length < 2) return [min, max];
  const step = ticks[1]! - ticks[0]!;
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

export function downsample<T extends { t: number; v: number }>(pts: T[], every: number): { t: number; v: number }[] {
  if (every <= 1) return pts;
  const out: { t: number; v: number }[] = [];
  for (let i = 0; i < pts.length; i += every) {
    const chunk = pts.slice(i, i + every);
    out.push({ t: chunk[0]!.t, v: chunk.reduce((a, p) => a + p.v, 0) / chunk.length });
  }
  return out;
}
