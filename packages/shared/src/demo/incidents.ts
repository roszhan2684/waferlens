import type { Incident } from "../types";
import { DAY, HOUR, MINUTE, NOW, T, iso } from "./clock";
import { windowStats } from "./telemetry";

let cache: Incident[] | null = null;

export function getIncidents(): Incident[] {
  if (cache) return cache;
  const before212 = windowStats("ttft_p95_ms", T.runtimeDeploy - DAY, T.runtimeDeploy - 5 * MINUTE);
  const after212 = windowStats("ttft_p95_ms", T.runtimeDeploy + 15 * MINUTE, NOW);
  const miss207 = windowStats("ttft_p95_ms", T.incident207Detected - DAY, T.incident207Detected);

  cache = [
    {
      id: "INC-212",
      workloadId: "wl_qwen_prod",
      title: "p95 TTFT regression after runtime image update",
      severity: "sev2",
      status: "investigating",
      kind: "regression",
      detectedAt: iso(T.incident212Detected),
      metric: "ttft_p95_ms",
      baseline: { value: before212.mean, window: "24h before dep_7f3c" },
      observed: { value: after212.mean, window: "dep_7f3c +15m → now" },
      correlatedChangeId: "dep_7f3c",
      correlationConfidence: 0.64,
      investigationId: "INV-034",
      summary:
        "p95 TTFT rose after dep_7f3c. Running batch is pinned at the 256-sequence ceiling (2 replicas × 128) and the waiting queue grew, while KV cache usage fell. That pattern points at admission control, not memory pressure. Correlated with the runtime change; not yet proven causal.",
      timeline: [
        { at: iso(T.runtimeDeploy), label: "dep_7f3c synced by Argo CD (vllm-serve 0.11.0 → 0.11.1, chart 2.3.2 → 2.4.0)", kind: "change" },
        { at: iso(T.incident212Detected), label: "Regression Guard: p95 TTFT above expected band for 20 min (workload-shape corrected)", kind: "detect" },
        { at: iso(T.investigation034Opened), label: "INV-034 opened; workload fingerprint distance 0.006 (stable)", kind: "agent" },
        { at: iso(T.investigation034Opened + 9 * MINUTE), label: "Engine state: effective max_num_seqs = 128 per replica (was 256)", kind: "agent" },
        { at: iso(T.experiment108Started - 4 * MINUTE), label: "EXP-108 drafted: pin max_num_seqs=256 on 0.11.1", kind: "experiment" },
        { at: iso(T.experiment108Started), label: "Sam Okafor approved EXP-108 (replay-sandbox, 20k requests)", kind: "human" },
      ],
    },
    {
      id: "INC-207",
      workloadId: "wl_qwen_prod",
      title: "Sustained p95 TTFT SLO miss",
      severity: "sev2",
      status: "resolved",
      kind: "slo_miss",
      detectedAt: iso(T.incident207Detected),
      resolvedAt: iso(T.winnerPromoted + 45 * MINUTE),
      metric: "ttft_p95_ms",
      baseline: { value: 700, window: "SLO target" },
      observed: { value: miss207.mean, window: "24h before detection" },
      investigationId: "INV-031",
      summary: "p95 TTFT above the 700 ms SLO through the day; error budget burn 6.2× over 6h.",
      resolution: "Resolved by promoting EXP-104 (gpu_memory_utilization 0.80 → 0.92) via dep_5a21 after all 9 Benchmark Guardian gates passed.",
      timeline: [
        { at: iso(T.incident207Detected), label: "SLO burn-rate alert: 6.2× over 6h", kind: "detect" },
        { at: iso(T.investigation031Opened), label: "INV-031 opened", kind: "agent" },
        { at: iso(T.experimentsStarted), label: "EXP-103…106 approved and replayed on cap_0918", kind: "experiment" },
        { at: iso(T.experimentsCompleted), label: "Guardian: EXP-104 winner · EXP-105 rejected · EXP-106 blocked · EXP-103 inconclusive", kind: "experiment" },
        { at: iso(T.winnerPromoted), label: "Alex Chen promoted EXP-104 (dep_5a21)", kind: "human" },
        { at: iso(T.winnerPromoted + 45 * MINUTE), label: "Production matched the experiment within about 2%; incident resolved", kind: "resolve" },
      ],
    },
    {
      id: "INC-198",
      workloadId: "wl_qwen_prod",
      title: "Workload fingerprint drift (batch backfill)",
      severity: "info",
      status: "dismissed",
      kind: "traffic_shift",
      detectedAt: iso(NOW - 5 * DAY - 6 * HOUR),
      resolvedAt: iso(NOW - 5 * DAY - 2 * HOUR),
      metric: "ttft_p95_ms",
      baseline: { value: 0, window: "fingerprint distance, prior week" },
      observed: { value: 0, window: "6h backfill window" },
      summary:
        "Input-token p50 more than doubled and long-context share rose to 7% during a summarization backfill. Latency rose with it. The traffic changed; the infrastructure did not.",
      resolution: "Not an infrastructure regression. Backfill traffic tagged and excluded from the regression baseline.",
      timeline: [
        { at: iso(NOW - 5 * DAY - 6 * HOUR), label: "Fingerprint drift: material shift (distance above 0.14)", kind: "detect" },
        { at: iso(NOW - 5 * DAY - 5 * HOUR), label: "Agent: workload shift explains latency change; no infra hypothesis opened", kind: "agent" },
        { at: iso(NOW - 5 * DAY - 2 * HOUR), label: "Riya Shah dismissed: backfill job, tagged for exclusion", kind: "human" },
      ],
    },
    {
      id: "INC-190",
      workloadId: "wl_qwen_prod",
      title: "Driver update requires re-certification",
      severity: "sev3",
      status: "resolved",
      kind: "recertification",
      detectedAt: iso(NOW - 6 * DAY - 20 * HOUR),
      resolvedAt: iso(NOW - 6 * DAY - 14 * HOUR),
      metric: "ttft_p95_ms",
      baseline: { value: 0, window: "driver 555.42.06" },
      observed: { value: 0, window: "driver 560.35.03" },
      summary: "Environment fingerprint changed (driver 555.42.06 → 560.35.03). Replay suite re-run before rollout to the second replica.",
      resolution: "Replay suite within ±1.2% on p95 TTFT and throughput. Environment re-certified.",
      timeline: [
        { at: iso(NOW - 6 * DAY - 20 * HOUR), label: "Environment fingerprint change detected on replica-0", kind: "detect" },
        { at: iso(NOW - 6 * DAY - 16 * HOUR), label: "Replay suite re-run (3 reps)", kind: "experiment" },
        { at: iso(NOW - 6 * DAY - 14 * HOUR), label: "Re-certified; rollout to replica-1 approved", kind: "resolve" },
      ],
    },
  ];
  return cache;
}

export function getIncident(id: string): Incident | undefined {
  return getIncidents().find((i) => i.id === id);
}
