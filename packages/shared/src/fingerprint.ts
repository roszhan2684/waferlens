import { fnv1a, lognormal, mulberry32 } from "./prng";
import { jensenShannon, mean, percentile, stddev } from "./stats";
import type { WorkloadFingerprint } from "./types";

/** Request-shape metadata only. WaferLens never needs prompt or response bodies. */
export interface RequestShape {
  arrivalMs: number;
  inputTokens: number;
  outputTokens: number;
  temperature: number;
  prefixTokens: number;
}

export interface TrafficProfile {
  inputMedian: number;
  inputSigma: number;
  outputMedian: number;
  outputSigma: number;
  /** Share of requests drawn from the long-context mode (8k–32k tokens). */
  longContextMix: number;
  rpsMean: number;
  /** Target coefficient of variation for inter-arrival times (1 = Poisson). */
  burstiness: number;
  greedyShare: number;
  prefixReuse: number;
}

export const INPUT_BUCKETS = [512, 1024, 2048, 4096, 8192, 16384] as const; // upper edges; last bucket is open
export const OUTPUT_BUCKETS = [64, 128, 256, 512, 1024] as const;
export const INPUT_BUCKET_LABELS = ["<512", "512–1k", "1k–2k", "2k–4k", "4k–8k", "8k–16k", "≥16k"];
export const OUTPUT_BUCKET_LABELS = ["<64", "64–128", "128–256", "256–512", "512–1k", "≥1k"];

function bucketOf(value: number, edges: readonly number[]): number {
  for (let i = 0; i < edges.length; i++) if (value < edges[i]!) return i;
  return edges.length;
}

/** Generate a deterministic, metadata-only request sample for a traffic profile. */
export function synthesizeRequests(profile: TrafficProfile, n: number, seed: number): RequestShape[] {
  const rand = mulberry32(seed);
  const out: RequestShape[] = [];
  let t = 0;
  // A lognormal inter-arrival with sigma s has CV = sqrt(exp(s^2) - 1).
  const s = Math.sqrt(Math.log(profile.burstiness ** 2 + 1));
  const meanGapMs = 1000 / profile.rpsMean;
  const medianGap = meanGapMs / Math.exp((s * s) / 2);
  for (let i = 0; i < n; i++) {
    t += lognormal(rand, medianGap, s);
    const longCtx = rand() < profile.longContextMix;
    const input = Math.round(
      longCtx ? 8192 + rand() * rand() * 24000 : Math.min(30000, lognormal(rand, profile.inputMedian, profile.inputSigma)),
    );
    const output = Math.max(1, Math.round(Math.min(4096, lognormal(rand, profile.outputMedian, profile.outputSigma))));
    out.push({
      arrivalMs: t,
      inputTokens: Math.max(16, input),
      outputTokens: output,
      temperature: rand() < profile.greedyShare ? 0 : 0.7,
      prefixTokens: Math.round(input * profile.prefixReuse * (0.5 + rand())),
    });
  }
  return out;
}

/** Peak concurrency estimate from arrivals and a simple service-time model. */
function concurrencyProfile(reqs: readonly RequestShape[]): { p50: number; p99: number } {
  const events: [number, number][] = [];
  for (const r of reqs) {
    const service = 150 + r.inputTokens * 0.03 + r.outputTokens * 31;
    events.push([r.arrivalMs, 1], [r.arrivalMs + service, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const samples: number[] = [];
  let cur = 0;
  for (const [, d] of events) {
    cur += d;
    if (d === 1) samples.push(cur);
  }
  return { p50: Math.round(percentile(samples, 50)), p99: Math.round(percentile(samples, 99)) };
}

export function computeFingerprint(
  reqs: readonly RequestShape[],
  window: { start: string; end: string },
): WorkloadFingerprint {
  const inputs = reqs.map((r) => r.inputTokens);
  const outputs = reqs.map((r) => r.outputTokens);
  const gaps: number[] = [];
  for (let i = 1; i < reqs.length; i++) gaps.push(reqs[i]!.arrivalMs - reqs[i - 1]!.arrivalMs);
  const durationS = (reqs[reqs.length - 1]!.arrivalMs - reqs[0]!.arrivalMs) / 1000;

  const joint = INPUT_BUCKETS.concat([Infinity] as never).map(() => OUTPUT_BUCKETS.concat([Infinity] as never).map(() => 0));
  for (const r of reqs) joint[bucketOf(r.inputTokens, INPUT_BUCKETS)]![bucketOf(r.outputTokens, OUTPUT_BUCKETS)]! += 1;
  for (const row of joint) for (let j = 0; j < row.length; j++) row[j] = row[j]! / reqs.length;

  // Peak RPS over 10s windows.
  const perWindow = new Map<number, number>();
  for (const r of reqs) {
    const k = Math.floor(r.arrivalMs / 10000);
    perWindow.set(k, (perWindow.get(k) ?? 0) + 1);
  }
  const peak = Math.max(...perWindow.values()) / 10;

  const fp: Omit<WorkloadFingerprint, "hash"> = {
    sampleSize: reqs.length,
    window,
    inputTokens: { p50: Math.round(percentile(inputs, 50)), p90: Math.round(percentile(inputs, 90)), p99: Math.round(percentile(inputs, 99)) },
    outputTokens: { p50: Math.round(percentile(outputs, 50)), p90: Math.round(percentile(outputs, 90)), p99: Math.round(percentile(outputs, 99)) },
    concurrency: concurrencyProfile(reqs),
    rps: { mean: round(reqs.length / durationS, 1), peak: round(peak, 1) },
    burstiness: round(stddev(gaps) / mean(gaps), 2),
    greedyShare: round(reqs.filter((r) => r.temperature === 0).length / reqs.length, 3),
    longContextShare: round(reqs.filter((r) => r.inputTokens >= 16384).length / reqs.length, 4),
    prefixReuse: round(reqs.reduce((a, r) => a + r.prefixTokens, 0) / inputs.reduce((a, b) => a + b, 0), 3),
    joint,
  };
  return { hash: fingerprintHash(fp), ...fp };
}

export function fingerprintHash(fp: Omit<WorkloadFingerprint, "hash">): string {
  const q = [
    fp.inputTokens.p50, fp.inputTokens.p90, fp.inputTokens.p99,
    fp.outputTokens.p50, fp.outputTokens.p90, fp.outputTokens.p99,
    Math.round(fp.burstiness * 10), Math.round(fp.greedyShare * 20),
    ...fp.joint.flat().map((x) => Math.round(x * 200)),
  ].join(":");
  return "fp_" + fnv1a(q) + fnv1a(q.split("").reverse().join("")).slice(0, 4);
}

export interface FingerprintDistance {
  total: number;
  verdict: "stable" | "minor_drift" | "material_shift";
  components: { key: string; label: string; value: number; source: string; target: string; flagged: boolean }[];
}

type FpLike = Pick<WorkloadFingerprint, "inputTokens" | "outputTokens" | "burstiness" | "longContextShare" | "greedyShare"> &
  Partial<Pick<WorkloadFingerprint, "joint" | "prefixReuse">>;

const logRatio = (a: number, b: number) => Math.min(1, Math.abs(Math.log((a + 1) / (b + 1))));

/**
 * Distance between two workload fingerprints. Each component is normalised to
 * 0..1 so the report can show which dimension drifted, not just a single score.
 */
export function fingerprintDistance(source: FpLike, target: FpLike): FingerprintDistance {
  const components: FingerprintDistance["components"] = [];
  const push = (key: string, label: string, value: number, s: string, t: string, flagAt: number) =>
    components.push({ key, label, value: round(value, 3), source: s, target: t, flagged: value >= flagAt });

  if (source.joint && target.joint) {
    push("joint", "Joint input×output distribution (JS divergence)", jensenShannon(source.joint.flat(), target.joint.flat()), "—", "—", 0.05);
  }
  push("input_p50", "Input tokens p50", logRatio(source.inputTokens.p50, target.inputTokens.p50), fmt(source.inputTokens.p50), fmt(target.inputTokens.p50), 0.15);
  push("input_p99", "Input tokens p99", logRatio(source.inputTokens.p99, target.inputTokens.p99), fmt(source.inputTokens.p99), fmt(target.inputTokens.p99), 0.15);
  push("output_p50", "Output tokens p50", logRatio(source.outputTokens.p50, target.outputTokens.p50), fmt(source.outputTokens.p50), fmt(target.outputTokens.p50), 0.15);
  push("output_p99", "Output tokens p99", logRatio(source.outputTokens.p99, target.outputTokens.p99), fmt(source.outputTokens.p99), fmt(target.outputTokens.p99), 0.15);
  push("burstiness", "Arrival burstiness (CV)", Math.abs(source.burstiness - target.burstiness) / Math.max(source.burstiness, target.burstiness), source.burstiness.toFixed(2), target.burstiness.toFixed(2), 0.15);
  push(
    "long_context",
    "Long-context share (≥16k)",
    Math.abs(source.longContextShare - target.longContextShare) / Math.max(source.longContextShare, target.longContextShare, 0.001),
    pct(source.longContextShare),
    pct(target.longContextShare),
    0.25,
  );
  push("greedy", "Greedy decoding share", Math.abs(source.greedyShare - target.greedyShare), pct(source.greedyShare), pct(target.greedyShare), 0.1);
  if (source.prefixReuse !== undefined && target.prefixReuse !== undefined) {
    push("prefix", "Prefix reuse", Math.abs(source.prefixReuse - target.prefixReuse), pct(source.prefixReuse), pct(target.prefixReuse), 0.1);
  }

  const joint = components.find((c) => c.key === "joint")?.value;
  const others = components.filter((c) => c.key !== "joint").map((c) => c.value);
  const total = round(joint !== undefined ? 0.5 * joint * 4 + 0.5 * mean(others) : mean(others), 3);
  const anyFlagged = components.some((c) => c.flagged);
  const verdict = total >= 0.14 ? "material_shift" : total >= 0.06 || anyFlagged ? "minor_drift" : "stable";
  return { total, verdict, components };
}

function round(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function pct(x: number): string {
  return (x * 100).toFixed(1) + "%";
}
