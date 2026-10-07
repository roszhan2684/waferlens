import { gaussian, mulberry32 } from "../prng";
import type { ArmSpec, EngineConfig, EnvironmentFingerprint, Experiment, Run, RunMetrics } from "../types";
import { HOUR, MINUTE, T, iso } from "./clock";
import { fingerprints } from "./captures";
import { CONFIG_BASELINE, CONFIG_REGRESSED, CONFIG_TUNED, ENV_PROD_0110, ENV_PROD_0111, HARDWARE_POOLS } from "./org";

const POOL_COST = HARDWARE_POOLS[0]!.hourlyCostUsd;

interface Target {
  ttftP95Ms: number;
  ttftP50Ms: number;
  itlP95Ms: number;
  throughputTokS: number;
  errorRate: number;
}

/**
 * Interleaved repetitions (B, C, B, C, …) around a target, with ~1.3% run-to-run
 * noise on tail latency. Throughput is measured at saturation (arrival ×1.5).
 */
function makeRuns(experimentId: string, baseline: Target, candidate: Target, reps: number, seed: number, requests: number, warmup = 500): Run[] {
  const rand = mulberry32(seed);
  // Zero-mean noise per arm and metric, so each arm's mean equals its target exactly.
  const noise = (sd: number) => {
    const xs = Array.from({ length: reps }, () => sd * gaussian(rand));
    const m = xs.reduce((a, b) => a + b, 0) / reps;
    return xs.map((x) => 1 + x - m);
  };
  const arms = [["baseline", baseline], ["candidate", candidate]] as const;
  const draws = arms.map(() => ({ p95: noise(0.013), p50: noise(0.01), itl: noise(0.012), tput: noise(0.008), err: noise(0.12) }));
  const runs: Run[] = [];
  let order = 1;
  for (let r = 1; r <= reps; r++) {
    for (const [ai, [arm, t]] of arms.entries()) {
      const d = draws[ai]!;
      const i = r - 1;
      const tput = t.throughputTokS * d.tput[i]!;
      const metrics: RunMetrics = {
        ttftP95Ms: round(t.ttftP95Ms * d.p95[i]!, 1),
        ttftP50Ms: round(t.ttftP50Ms * d.p50[i]!, 1),
        itlP95Ms: round(t.itlP95Ms * d.itl[i]!, 2),
        throughputTokS: Math.round(tput),
        errorRate: Math.max(0, t.errorRate * d.err[i]!),
        costPerMTokUsd: round(POOL_COST / ((tput * 3600) / 1e6), 4),
      };
      const failed = Math.round(metrics.errorRate * requests);
      runs.push({
        id: `${experimentId.toLowerCase()}-${arm[0]}${r}`,
        experimentId,
        arm,
        repetition: r,
        order: order++,
        seed: seed * 10 + r,
        warmupRequests: warmup,
        requests,
        failedRequests: failed,
        metrics,
      });
    }
  }
  return runs;
}

function arm(label: string, config: EngineConfig, environment: EnvironmentFingerprint, captureId: string, distributionHash: string, requestCount: number, extra: Partial<ArmSpec> = {}): ArmSpec {
  return {
    label,
    config,
    environment,
    captureId,
    distributionHash,
    requestCount,
    warmupRequests: 500,
    warmupPolicy: "Discard first 500 requests per run; engine restarted between arms; CUDA graphs captured before timing.",
    timingBoundary: "client send → first token received (load generator clock)",
    errorPolicy: "include_as_timeout",
    prefixHitRate: 0,
    outputCacheEnabled: false,
    ...extra,
  };
}

const BASE_TARGET: Target = { ttftP95Ms: 981, ttftP50Ms: 422, itlP95Ms: 38.1, throughputTokS: 9420, errorRate: 0.0011 };
const TUNED_TARGET: Target = { ttftP95Ms: 648, ttftP50Ms: 309, itlP95Ms: 36.4, throughputTokS: 11180, errorRate: 0.0008 };
const REGRESSED_TARGET: Target = { ttftP95Ms: 889, ttftP50Ms: 412, itlP95Ms: 33.9, throughputTokS: 8650, errorRate: 0.0014 };

const BUNDLE_FILES = [
  "config/baseline.yaml",
  "config/candidate.yaml",
  "environment.json",
  "capture/manifest.json",
  "runs/latencies.parquet",
  "runs/order.csv",
  "seeds.json",
  "correctness/report.json",
  "guardian/gates.json",
];

const replayHash = () => fingerprints.replayTemplates().hash;
const uniqueHash = () => fingerprints.replayUnique().hash;
const prodHash = () => fingerprints.prodNow().hash;

let cache: Experiment[] | null = null;

export function getExperiments(): Experiment[] {
  if (cache) return cache;
  const created = iso(T.experimentsStarted - 20 * MINUTE);
  const done = iso(T.experimentsCompleted);
  const common = {
    workloadId: "wl_qwen_prod",
    investigationId: "INV-031",
    objective: "p95 TTFT < 700 ms on cap_0918 replay; ITL p95 within +5%; error rate not worse.",
    createdAt: created,
    createdBy: "perf-agent v0.9.2 (drafted) · Sam Okafor",
    approvedBy: "Sam Okafor",
    plannedRepetitions: 5,
    runOrder: "Interleaved B/C × 5, randomized start arm",
    productionPrefixReuse: 0.09,
  } as const;

  cache = [
    {
      ...common,
      id: "EXP-104",
      hypothesisId: "H-031-1",
      title: "Increase KV cache headroom",
      status: "complete",
      completedAt: done,
      diff: [{ key: "gpu_memory_utilization", from: "0.80", to: "0.92" }],
      baseline: arm("Baseline (prod config)", CONFIG_BASELINE, ENV_PROD_0110, "cap_0918", replayHash(), 50000),
      candidate: arm("Candidate", CONFIG_TUNED, ENV_PROD_0110, "cap_0918", replayHash(), 50000),
      runs: makeRuns("EXP-104", BASE_TARGET, TUNED_TARGET, 5, 104, 50000),
      correctness: { method: "greedy_exact_match", sampleSize: 2000, matchRate: 0.9985, tolerance: 0.995 },
      artifactBundle: { hash: "sha256:7c2e91d04f5ab3e8c61d9f20a4b7e5c3d18f6a90b2c4e7d1f3a5b8c0e2d4f6a1", files: BUNDLE_FILES },
      notes: [
        "KV blocks per replica: 3,412 → 5,218 (+53%).",
        "Preemptions during replay: 14,880 → 42 across 5 repetitions.",
        "Engine started cleanly at 0.92; 4.1 GiB headroom remains per GPU at peak.",
      ],
      limitations: [
        "Replay under-represents ≥16k-token prompts (0.8% vs 1.2% in the source window).",
        "Measured on 2 replicas; behavior at 3+ replicas untested.",
        "Headroom at 0.92 leaves less room for a future LoRA adapter cache.",
      ],
    },
    {
      ...common,
      id: "EXP-105",
      hypothesisId: "H-031-2",
      title: "Raise prefill token budget",
      status: "complete",
      completedAt: done,
      diff: [{ key: "max_num_batched_tokens", from: "2048", to: "8192" }],
      baseline: arm("Baseline (prod config)", CONFIG_BASELINE, ENV_PROD_0110, "cap_0918", replayHash(), 50000),
      candidate: arm("Candidate", { ...CONFIG_BASELINE, max_num_batched_tokens: 8192 }, ENV_PROD_0110, "cap_0918", replayHash(), 50000),
      runs: makeRuns("EXP-105", BASE_TARGET, { ttftP95Ms: 702, ttftP50Ms: 351, itlP95Ms: 43.6, throughputTokS: 10270, errorRate: 0.0011 }, 5, 105, 50000),
      correctness: { method: "greedy_exact_match", sampleSize: 2000, matchRate: 0.998, tolerance: 0.995 },
      artifactBundle: { hash: "sha256:19b4d07a3e6f2c8159e0a7d4b3c2f1e09d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a", files: BUNDLE_FILES },
      notes: ["Larger prefill chunks delay decode steps for in-flight sequences: ITL p95 rises.", "Preemptions unchanged (14,880 → 14,210): the KV bottleneck remains."],
      limitations: ["Only one budget value tested (8192); 4096 may trade off differently."],
    },
    {
      ...common,
      id: "EXP-106",
      hypothesisId: "H-031-1",
      title: "Enable automatic prefix caching",
      status: "complete",
      completedAt: done,
      diff: [{ key: "enable_prefix_caching", from: "false", to: "true" }],
      baseline: arm("Baseline (prod config)", CONFIG_BASELINE, ENV_PROD_0110, "cap_0918", replayHash(), 50000),
      candidate: arm("Candidate", { ...CONFIG_BASELINE, enable_prefix_caching: true }, ENV_PROD_0110, "cap_0918", replayHash(), 50000, { prefixHitRate: 0.71 }),
      runs: makeRuns("EXP-106", BASE_TARGET, { ttftP95Ms: 512, ttftP50Ms: 201, itlP95Ms: 35.9, throughputTokS: 12960, errorRate: 0.001 }, 5, 106, 50000),
      correctness: { method: "greedy_exact_match", sampleSize: 2000, matchRate: 0.999, tolerance: 0.995 },
      artifactBundle: { hash: "sha256:e4a1c9b7d2f05e3a8c6b1d9f7e2a4c0b5d3f1e8a6c4b2d0f9e7a5c3b1d8f6e4a", files: BUNDLE_FILES },
      notes: [
        "Prefix cache hit rate during replay: 71%. Production estimate: 9%.",
        "cap_0918 uses synthetic prompt templates that share long system prefixes, so cache hits are inflated.",
        "Follow-up EXP-107 re-runs this change on a unique-prefix replay (cap_0918u).",
      ],
      limitations: ["The speedup measures the replay's template reuse, not production traffic."],
    },
    {
      ...common,
      id: "EXP-103",
      hypothesisId: "H-031-1",
      title: "FP8 KV cache",
      status: "complete",
      completedAt: done,
      diff: [{ key: "kv_cache_dtype", from: "auto", to: "fp8" }],
      baseline: arm("Baseline (prod config)", CONFIG_BASELINE, ENV_PROD_0110, "cap_0918", replayHash(), 50000),
      candidate: arm("Candidate", { ...CONFIG_BASELINE, kv_cache_dtype: "fp8" }, ENV_PROD_0110, "cap_0918", replayHash(), 50000),
      runs: makeRuns("EXP-103", BASE_TARGET, { ttftP95Ms: 689, ttftP50Ms: 318, itlP95Ms: 37.2, throughputTokS: 10640, errorRate: 0.001 }, 5, 103, 50000),
      correctness: { method: "not_run", sampleSize: 0, tolerance: 0.01 },
      artifactBundle: { hash: "sha256:5b8d2f0e7a3c1b9d4e6f8a2c0b7d5e3f1a9c8b6d4f2e0a7c5b3d1f9e8a6c4b2d", files: BUNDLE_FILES.filter((f) => !f.startsWith("correctness")) },
      notes: [
        "FP8 KV changes numerics, so greedy exact match is not a valid correctness test.",
        "A quality evaluation needs opt-in payload samples; this tenant's retention for payload samples is 0 days.",
      ],
      limitations: ["Output quality impact unmeasured."],
    },
    {
      ...common,
      id: "EXP-107",
      hypothesisId: "H-031-1",
      investigationId: "INV-031",
      title: "Prefix caching on unique-prefix replay",
      status: "awaiting_approval",
      createdAt: iso(T.experimentsCompleted + 15 * MINUTE),
      createdBy: "perf-agent v0.9.2 (drafted)",
      approvedBy: undefined,
      objective: "Measure prefix caching on top of the promoted config with production-like prefix reuse; require ≥3% p95 TTFT improvement.",
      diff: [{ key: "enable_prefix_caching", from: "false", to: "true" }],
      baseline: arm("Baseline (promoted config)", CONFIG_TUNED, ENV_PROD_0110, "cap_0918u", uniqueHash(), 50000),
      candidate: arm("Candidate", { ...CONFIG_TUNED, enable_prefix_caching: true }, ENV_PROD_0110, "cap_0918u", uniqueHash(), 50000, { prefixHitRate: 0.1 }),
      runs: [],
      correctness: { method: "greedy_exact_match", sampleSize: 2000, matchRate: 0.9992, tolerance: 0.995 },
      artifactBundle: null,
      notes: ["Rebuilt capture synthesizes a unique prefix per conversation; measured prefix reuse 10% vs 9% in production."],
      limitations: ["Prefix reuse estimate comes from hashed prefix IDs, not full prompt comparison."],
    },
    {
      ...common,
      id: "EXP-108",
      hypothesisId: "H-034-1",
      investigationId: "INV-034",
      title: "Pin max_num_seqs on runtime 0.11.1",
      status: "running",
      createdAt: iso(T.experiment108Started - 4 * MINUTE),
      createdBy: "perf-agent v0.9.2 (drafted) · Sam Okafor",
      objective: "Confirm INC-212 cause: restoring max_num_seqs=256 on 0.11.1 returns p95 TTFT below 700 ms.",
      diff: [{ key: "max_num_seqs", from: "128 (chart default)", to: "256 (pinned)" }],
      baseline: arm("Baseline (current prod)", CONFIG_REGRESSED, ENV_PROD_0111, "cap_0921", prodHash(), 20000),
      candidate: arm("Candidate", CONFIG_TUNED, ENV_PROD_0111, "cap_0921", prodHash(), 20000),
      runs: SIMULATED_RUNS_108().slice(0, 6),
      correctness: { method: "greedy_exact_match", sampleSize: 2000, matchRate: 0.9988, tolerance: 0.995 },
      artifactBundle: null,
      notes: ["Same image and driver as production; only the rendered max_num_seqs differs."],
      limitations: ["Uses the last 24h capture; weekend traffic not represented."],
    },
  ];
  return cache;
}

/** Full planned run sets used by the console to simulate live execution. */
export function SIMULATED_RUNS_108(): Run[] {
  return makeRuns("EXP-108", REGRESSED_TARGET, { ...TUNED_TARGET, ttftP95Ms: 652, itlP95Ms: 35.3, throughputTokS: 11090 }, 5, 108, 20000);
}

export function SIMULATED_RUNS_107(): Run[] {
  return makeRuns("EXP-107", TUNED_TARGET, { ttftP95Ms: 636, ttftP50Ms: 301, itlP95Ms: 36.5, throughputTokS: 11310, errorRate: 0.0008 }, 5, 107, 50000);
}

export function getExperiment(id: string): Experiment | undefined {
  return getExperiments().find((e) => e.id === id);
}

export const EXPERIMENT_TIMELINE_NOTE = `Replays ran on replay-sandbox (4× H100) between ${iso(T.experimentsStarted)} and ${iso(T.experimentsCompleted + HOUR)}.`;

function round(x: number, d: number) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}
