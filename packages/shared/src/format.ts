import type { MetricKey, MetricMeta } from "./types";

export const METRICS: Record<MetricKey, MetricMeta> = {
  ttft_p95_ms: { key: "ttft_p95_ms", label: "p95 TTFT", unit: "ms", source: "vllm:time_to_first_token_seconds (p95, 5m)", lowerIsBetter: true },
  ttft_p50_ms: { key: "ttft_p50_ms", label: "p50 TTFT", unit: "ms", source: "vllm:time_to_first_token_seconds (p50, 5m)", lowerIsBetter: true },
  itl_p95_ms: { key: "itl_p95_ms", label: "p95 ITL", unit: "ms", source: "vllm:time_per_output_token_seconds (p95, 5m)", lowerIsBetter: true },
  throughput_tok_s: { key: "throughput_tok_s", label: "Output throughput", unit: "tok/s", source: "rate(vllm:generation_tokens_total[5m])", lowerIsBetter: false },
  rps: { key: "rps", label: "Request rate", unit: "req/s", source: "rate(vllm:request_success_total[5m])", lowerIsBetter: false },
  gpu_util: { key: "gpu_util", label: "GPU utilization", unit: "%", source: "DCGM_FI_DEV_GPU_UTIL (mean over 4 GPUs)", lowerIsBetter: false },
  kv_cache_usage: { key: "kv_cache_usage", label: "KV cache usage", unit: "%", source: "vllm:gpu_cache_usage_perc (max over replicas)", lowerIsBetter: true },
  preemptions: { key: "preemptions", label: "Preemptions", unit: "count", source: "increase(vllm:num_preemptions_total[5m])", lowerIsBetter: true },
  queue_waiting: { key: "queue_waiting", label: "Waiting requests", unit: "count", source: "vllm:num_requests_waiting (sum)", lowerIsBetter: true },
  batch_running: { key: "batch_running", label: "Running batch", unit: "count", source: "vllm:num_requests_running (sum)", lowerIsBetter: false },
  error_rate: { key: "error_rate", label: "Error rate", unit: "%", source: "5xx + timeouts / requests", lowerIsBetter: true },
  cost_per_mtok: { key: "cost_per_mtok", label: "Cost / 1M output tokens", unit: "$", source: "GPU-hour cost ÷ tokens served", lowerIsBetter: true },
};

export function formatMetric(key: MetricKey, v: number): string {
  const m = METRICS[key];
  switch (m.unit) {
    case "ms":
      return `${Math.round(v).toLocaleString("en-US")} ms`;
    case "tok/s":
      return `${Math.round(v).toLocaleString("en-US")} tok/s`;
    case "req/s":
      return `${v.toFixed(1)} req/s`;
    case "%":
      return `${(v * 100).toFixed(key === "error_rate" ? 2 : 0)}%`;
    case "$":
      return `$${v.toFixed(3)}`;
    default:
      return Math.round(v).toLocaleString("en-US");
  }
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Signed percentage, e.g. -0.339 → "−33.9%". Uses a true minus sign. */
export function formatDelta(rel: number, digits = 1): string {
  const s = (Math.abs(rel) * 100).toFixed(digits) + "%";
  if (Math.abs(rel) < 0.0005) return "±0.0%";
  return (rel < 0 ? "−" : "+") + s;
}

export function formatPct(x: number, digits = 1): string {
  return (x * 100).toFixed(digits) + "%";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic UTC formatting so server and client render the same string. */
export function formatTime(iso: string | number, withDate = true): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return withDate ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${hh}:${mm} UTC` : `${hh}:${mm}`;
}

export function formatDate(iso: string | number): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "3h 40m ago" relative to the fixed demo clock. */
export function formatAgo(iso: string | number, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h}h ${m % 60}m ago` : `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}
