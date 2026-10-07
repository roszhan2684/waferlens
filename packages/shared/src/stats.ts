/** Small, dependency-free statistics used by Benchmark Guardian and Regression Guard. */

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample variance (n - 1). */
export function variance(xs: readonly number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (xs.length - 1);
}

export function stddev(xs: readonly number[]): number {
  return Math.sqrt(variance(xs));
}

/** Coefficient of variation; NaN for fewer than two samples. */
export function cv(xs: readonly number[]): number {
  return stddev(xs) / mean(xs);
}

/** Linear-interpolated percentile, p in [0, 100]. */
export function percentile(xs: readonly number[], p: number): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const a = sorted[lo]!;
  const b = sorted[hi]!;
  return a + (b - a) * (rank - lo);
}

/** Two-sided 97.5% Student t critical values by degrees of freedom. */
const T975: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262,
  10: 2.228, 12: 2.179, 15: 2.131, 20: 2.086, 30: 2.042, 60: 2.0, 120: 1.98,
};

export function tCritical95(df: number): number {
  if (!Number.isFinite(df) || df < 1) return NaN;
  const keys = Object.keys(T975).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (df <= k) return T975[k]!;
  return 1.96;
}

export interface DeltaEstimate {
  baselineMean: number;
  candidateMean: number;
  /** Relative change of candidate vs baseline, e.g. -0.339 = 33.9% lower. */
  relDelta: number;
  /** 95% confidence interval on relDelta (Welch). */
  ci: [number, number];
  df: number;
  n: { baseline: number; candidate: number };
}

/**
 * Welch two-sample estimate of the relative change between arms, computed on
 * per-repetition values. Returns NaN bounds when either arm has < 2 repetitions,
 * which Benchmark Guardian treats as "variance unknown".
 */
export function relativeDelta(baseline: readonly number[], candidate: readonly number[]): DeltaEstimate {
  const mb = mean(baseline);
  const mc = mean(candidate);
  const vb = variance(baseline);
  const vc = variance(candidate);
  const nb = baseline.length;
  const nc = candidate.length;
  const se = Math.sqrt(vb / nb + vc / nc);
  const df = (vb / nb + vc / nc) ** 2 / ((vb / nb) ** 2 / (nb - 1) + (vc / nc) ** 2 / (nc - 1));
  const t = tCritical95(df);
  const diff = mc - mb;
  return {
    baselineMean: mb,
    candidateMean: mc,
    relDelta: diff / mb,
    ci: [(diff - t * se) / mb, (diff + t * se) / mb],
    df,
    n: { baseline: nb, candidate: nc },
  };
}

/** Jensen–Shannon divergence (base 2, bounded 0..1) between two discrete distributions. */
export function jensenShannon(p: readonly number[], q: readonly number[]): number {
  const sp = p.reduce((a, b) => a + b, 0) || 1;
  const sq = q.reduce((a, b) => a + b, 0) || 1;
  let js = 0;
  for (let i = 0; i < Math.max(p.length, q.length); i++) {
    const pi = (p[i] ?? 0) / sp;
    const qi = (q[i] ?? 0) / sq;
    const m = (pi + qi) / 2;
    if (pi > 0) js += 0.5 * pi * Math.log2(pi / m);
    if (qi > 0) js += 0.5 * qi * Math.log2(qi / m);
  }
  return Math.min(1, Math.max(0, js));
}

/** Pearson correlation coefficient. Correlation is evidence, never proof of cause. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}
