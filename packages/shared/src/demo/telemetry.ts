import { gaussian, mulberry32 } from "../prng";
import { mean, percentile } from "../stats";
import type { Deployment, MetricKey, SeriesPoint, TelemetrySource } from "../types";
import { DAY, HOUR, MINUTE, NOW, SERIES_START, STEP, T, ago, iso } from "./clock";
import { HARDWARE_POOLS } from "./org";

export type Phase = "baseline" | "tuned" | "regressed";

export function phaseAt(t: number): Phase {
  if (t >= T.runtimeDeploy) return "regressed";
  if (t >= T.winnerPromoted) return "tuned";
  return "baseline";
}

export const DEPLOYMENTS: Deployment[] = [
  {
    id: "dep_3e10",
    workloadId: "wl_qwen_prod",
    at: ago(6 * DAY + 3 * HOUR),
    kind: "config",
    title: "Gateway request timeout 30s → 60s",
    commit: "5d10e2b",
    containerDigest: "sha256:4be1c07e9a2d",
    engineVersion: "0.11.0",
    configHash: "cfg_7a1e",
    author: "alex@meridian.example",
    diff: [{ key: "gateway.timeout_s", from: "30", to: "60" }],
  },
  {
    id: "dep_5a21",
    workloadId: "wl_qwen_prod",
    at: iso(T.winnerPromoted),
    kind: "config",
    title: "Promote EXP-104: gpu_memory_utilization 0.80 → 0.92",
    commit: "a41c9e2",
    containerDigest: "sha256:4be1c07e9a2d",
    engineVersion: "0.11.0",
    configHash: "cfg_92c4",
    author: "alex@meridian.example",
    diff: [{ key: "vllm.gpu_memory_utilization", from: "0.80", to: "0.92" }],
    sourceExperimentId: "EXP-104",
  },
  {
    id: "dep_6b02",
    workloadId: "wl_qwen_prod",
    at: iso(T.unrelatedDeploy),
    kind: "config",
    title: "Gateway access-log sampling 10% → 1%",
    commit: "b88f0c1",
    containerDigest: "sha256:4be1c07e9a2d",
    engineVersion: "0.11.0",
    configHash: "cfg_92c4",
    author: "riya@meridian.example",
    diff: [{ key: "gateway.access_log.sample_rate", from: "0.10", to: "0.01" }],
  },
  {
    id: "dep_7f3c",
    workloadId: "wl_qwen_prod",
    at: iso(T.runtimeDeploy),
    kind: "runtime",
    title: "Runtime image vllm-serve 0.11.0 → 0.11.1 (chart v2.4.0)",
    commit: "c07b19d",
    containerDigest: "sha256:91d3f5a0b7c4",
    engineVersion: "0.11.1",
    configHash: "cfg_e310",
    author: "argo-cd (auto-sync)",
    diff: [
      { key: "image.tag", from: "vllm-serve:0.11.0", to: "vllm-serve:0.11.1" },
      { key: "chart.version", from: "2.3.2", to: "2.4.0" },
      { key: "args.--max-num-seqs", from: "256", to: "(not rendered → chart default 128)" },
    ],
  },
];

/** Normalised load (1.0 = 38 req/s) with a diurnal cycle and short burst windows. */
function loadAt(t: number, rand: () => number): number {
  const hour = ((t / HOUR) % 24 + 24) % 24;
  const diurnal = 1 + 0.32 * Math.sin((2 * Math.PI * (hour - 9)) / 24);
  const burst = rand() < 0.035 ? 0.25 + rand() * 0.2 : 0;
  return Math.max(0.45, diurnal + burst + 0.04 * gaussian(rand));
}

type Row = Record<MetricKey, number>;

function sampleRow(t: number, load: number, rand: () => number): Row {
  const phase = phaseAt(t);
  const n = () => gaussian(rand);
  const rps = 38 * load;
  const demandConcurrency = 340 * load;
  let ttft95: number;
  let p50Ratio: number;
  let itl: number;
  let kv: number;
  let pre: number;
  let waiting: number;
  let running: number;
  let gpu: number;
  let err: number;

  if (phase === "baseline") {
    ttft95 = 620 + 360 * load ** 1.6 + 30 * n();
    p50Ratio = 0.43;
    itl = 38.1 + 1.4 * n();
    kv = Math.min(0.995, 0.93 + 0.05 * load + 0.01 * n());
    pre = Math.max(0, (load - 0.8) * 260 + 12 * n());
    waiting = Math.max(0, 8 + 44 * Math.max(0, load - 0.75) + 4 * n());
    running = demandConcurrency * 0.94;
    gpu = 0.71 * Math.min(1.15, load) + 0.02 * n();
    err = 0.0011 + 0.0002 * n();
  } else if (phase === "tuned") {
    ttft95 = 480 + 150 * load ** 1.15 + 15 * n();
    p50Ratio = 0.48;
    itl = 36.4 + 1.2 * n();
    kv = Math.min(0.97, 0.7 + 0.12 * load + 0.01 * n());
    pre = Math.max(0, 0.6 + 0.8 * n());
    waiting = Math.max(0, 3 + 8 * Math.max(0, load - 0.8) + 1.5 * n());
    running = demandConcurrency;
    gpu = 0.83 * Math.min(1.12, load) + 0.02 * n();
    err = 0.0008 + 0.00015 * n();
  } else {
    // Admission capped at 128 sequences per replica (256 total).
    running = Math.min(demandConcurrency, 256) * 0.97;
    ttft95 = 600 + 215 * load ** 1.4 + 24 * n();
    p50Ratio = 0.47;
    itl = 33.9 + 1.1 * n();
    kv = Math.min(0.9, 0.52 + 0.08 * load + 0.01 * n());
    pre = 0;
    waiting = Math.max(0, 14 + 0.8 * Math.max(0, demandConcurrency - 256) + 3 * n());
    gpu = 0.64 * Math.min(1.12, load) + 0.02 * n();
    err = 0.0014 + 0.0002 * n();
  }

  const throughput = rps * 246 * (1 - err);
  const pool = HARDWARE_POOLS[0]!;
  return {
    ttft_p95_ms: ttft95,
    ttft_p50_ms: ttft95 * p50Ratio + 6 * n(),
    itl_p95_ms: itl,
    throughput_tok_s: throughput,
    rps,
    gpu_util: Math.min(0.99, Math.max(0.05, gpu)),
    kv_cache_usage: kv,
    preemptions: Math.round(pre),
    queue_waiting: Math.round(waiting),
    batch_running: Math.round(running + 3 * n()),
    error_rate: Math.max(0.0002, err),
    cost_per_mtok: pool.hourlyCostUsd / ((throughput * 3600) / 1e6),
  };
}

function buildSeries(): Record<MetricKey, SeriesPoint[]> {
  const rand = mulberry32(20261007);
  const out = {} as Record<MetricKey, SeriesPoint[]>;
  for (let t = SERIES_START; t <= NOW; t += STEP) {
    const row = sampleRow(t, loadAt(t, rand), rand);
    for (const k of Object.keys(row) as MetricKey[]) (out[k] ??= []).push({ t, v: row[k] });
  }
  return out;
}

let cache: Record<MetricKey, SeriesPoint[]> | null = null;

/** 7 days of 5-minute telemetry for qwen-prod, deterministic. */
export function getSeries(metric: MetricKey, from = SERIES_START, to = NOW): SeriesPoint[] {
  cache ??= buildSeries();
  return cache[metric].filter((p) => p.t >= from && p.t <= to);
}

export interface WindowStats {
  mean: number;
  p50: number;
  p95: number;
  max: number;
  n: number;
  from: number;
  to: number;
}

export function windowStats(metric: MetricKey, from: number, to: number): WindowStats {
  const vals = getSeries(metric, from, to).map((p) => p.v);
  return { mean: mean(vals), p50: percentile(vals, 50), p95: percentile(vals, 95), max: Math.max(...vals), n: vals.length, from, to };
}

/** Same-length windows immediately before and after a change. */
export function compareAround(metric: MetricKey, at: number, span: number, guard = 15 * MINUTE) {
  const before = windowStats(metric, at - span, at - STEP);
  const after = windowStats(metric, at + guard, Math.min(NOW, at + guard + span));
  return { before, after, relDelta: (after.mean - before.mean) / before.mean };
}

/** Share of 5-minute windows within the p95 TTFT SLO. */
export function sloCompliance(from: number, to: number, threshold: number): number {
  const pts = getSeries("ttft_p95_ms", from, to);
  return pts.filter((p) => p.v <= threshold).length / pts.length;
}

export const TELEMETRY_SOURCES: TelemetrySource[] = [
  {
    id: "ts_vllm",
    workloadId: "wl_qwen_prod",
    type: "vllm",
    label: "vLLM engine metrics",
    status: "healthy",
    coverage: 1,
    lastSeen: ago(15_000),
    signals: ["TTFT / ITL histograms", "num_requests_waiting / running", "gpu_cache_usage_perc", "num_preemptions_total"],
  },
  {
    id: "ts_prom",
    workloadId: "wl_qwen_prod",
    type: "prometheus",
    label: "Prometheus (remote-write)",
    status: "healthy",
    coverage: 1,
    lastSeen: ago(15_000),
    signals: ["request rate", "status codes", "gateway latency"],
  },
  {
    id: "ts_dcgm",
    workloadId: "wl_qwen_prod",
    type: "dcgm",
    label: "NVIDIA DCGM",
    status: "partial",
    coverage: 0.94,
    lastSeen: ago(30_000),
    signals: ["SM utilization", "HBM used", "power", "temperature", "XID errors"],
    note: "replica-1 / GPU 3 stopped reporting DRAM bandwidth at 09:12 UTC. Memory-bandwidth hypotheses are capped at medium confidence.",
  },
  {
    id: "ts_otel",
    workloadId: "wl_qwen_prod",
    type: "otel",
    label: "OpenTelemetry traces",
    status: "healthy",
    coverage: 0.05,
    lastSeen: ago(40_000),
    signals: ["gateway → queue → prefill → decode spans", "5% head sampling"],
  },
  {
    id: "ts_deploy",
    workloadId: "wl_qwen_prod",
    type: "deployments",
    label: "Deployment events",
    status: "healthy",
    coverage: 1,
    lastSeen: iso(T.runtimeDeploy),
    signals: ["Argo CD sync", "GitHub deployments", "image digests", "rendered config hash"],
  },
  {
    id: "ts_cost",
    workloadId: "wl_qwen_prod",
    type: "cost",
    label: "Cost metadata",
    status: "healthy",
    coverage: 1,
    lastSeen: ago(DAY),
    signals: ["$2.49 / H100-hour (manual entry)"],
    note: "Manual price entry. Live price feeds are on the roadmap.",
  },
  {
    id: "ts_prof",
    workloadId: "wl_qwen_prod",
    type: "profiler",
    label: "Kernel profiler (Nsight)",
    status: "missing",
    coverage: 0,
    lastSeen: ago(9 * DAY),
    signals: ["kernel timings (on demand)"],
    note: "Not attached. Kernel-layer claims rely on the last captured profile (9 days old).",
  },
];

/** Weighted telemetry coverage score used on the Overview page. */
export function coverageScore(sources = TELEMETRY_SOURCES): number {
  const weights: Record<TelemetrySource["type"], number> = { vllm: 3, prometheus: 2, dcgm: 2, otel: 1, deployments: 2, cost: 1, profiler: 1 };
  let num = 0;
  let den = 0;
  for (const s of sources) {
    const w = weights[s.type];
    den += w;
    num += w * (s.status === "missing" ? 0 : s.status === "partial" ? s.coverage * 0.8 : s.type === "otel" ? 0.9 : 1);
  }
  return num / den;
}
