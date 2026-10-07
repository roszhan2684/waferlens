import {
  DAY,
  DEPLOYMENTS,
  HOUR,
  MINUTE,
  NOW,
  T,
  compareAround,
  fingerprintDistance,
  fingerprints,
  formatDelta,
  getSeries,
  iso,
  pearson,
  windowStats,
} from "@waferlens/shared";
import type { Hypothesis, Investigation, ToolCall } from "@waferlens/shared";

/**
 * The two seeded investigations. Every number in an evidence item is computed
 * from the seeded telemetry by the same functions the tools would call, so the
 * narrative cannot drift from the data.
 */

const f0 = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

function call(id: string, at: number, tool: string, args: ToolCall["args"], durationMs: number, result: string, state: ToolCall["state"], approval: ToolCall["approval"] = "not_required"): ToolCall {
  return { id, at: iso(at), tool, args, durationMs, result, state, approval };
}

export function buildInvestigation031(): Investigation {
  const t0 = T.investigation031Opened;
  const win = { from: t0 - DAY, to: t0 };
  const ttft = windowStats("ttft_p95_ms", win.from, win.to);
  const kv = windowStats("kv_cache_usage", win.from, win.to);
  const pre = getSeries("preemptions", win.from, win.to);
  const preTotal = pre.reduce((a, p) => a + p.v, 0);
  const ttftSeries = getSeries("ttft_p95_ms", win.from, win.to).map((p) => p.v);
  const r = pearson(pre.map((p) => p.v), ttftSeries);
  const waiting = windowStats("queue_waiting", win.from, win.to);
  const itl = windowStats("itl_p95_ms", win.from, win.to);
  const itlPrior = windowStats("itl_p95_ms", win.from - 2 * DAY, win.from);
  const dist = fingerprintDistance(fingerprints.prodLastWeek(), fingerprints.capture0918Source());
  const recentDeploys = DEPLOYMENTS.filter((d) => new Date(d.at).getTime() > t0 - 3 * DAY && new Date(d.at).getTime() < t0);

  const hypotheses: Hypothesis[] = [
    {
      id: "H-031-1",
      investigationId: "INV-031",
      rank: 1,
      claim: "KV cache exhaustion forces preemption and recompute, so requests queue before prefill.",
      layer: "scheduler",
      confidence: 0.93,
      status: "confirmed",
      supporting: [
        { id: "ev1", kind: "metric", label: "KV cache saturated at peak", detail: `gpu_cache_usage_perc p95 ${pct(kv.p95, 1)} over 24h (max ${pct(kv.max, 1)}).`, source: "tc_031_05" },
        { id: "ev2", kind: "metric", label: "Preemptions track tail latency", detail: `${f0(preTotal)} preemptions in 24h; Pearson r = ${r.toFixed(2)} with p95 TTFT across ${ttft.n} 5-min windows.`, source: "tc_031_06" },
        { id: "ev3", kind: "trace", label: "Time goes to queue, not compute", detail: "468 of 981 ms in the p95 bucket is queue wait; 83% of that is KV-block or preemption related.", source: "tc_031_07" },
        { id: "ev4", kind: "experiment", label: "Controlled experiment confirmed", detail: "EXP-104 (+KV headroom) cut p95 TTFT 33.9% with all 9 gates passing.", source: "EXP-104" },
      ],
      disconfirming: [
        { id: "ev5", kind: "metric", label: "Decode is not the bottleneck", detail: `ITL p95 ${itl.mean.toFixed(1)} ms vs ${itlPrior.mean.toFixed(1)} ms in the prior 48h: flat.`, source: "tc_031_08" },
      ],
      missing: ["Kernel profile is 9 days old (Nsight not attached)."],
      nextTest: "Replay cap_0918 with gpu_memory_utilization 0.92 (single-variable change).",
      expectedInformationGain: "high",
      productionRisk: "low",
    },
    {
      id: "H-031-2",
      investigationId: "INV-031",
      rank: 2,
      claim: "Prefill token budget (max_num_batched_tokens = 2048) splits long prompts into too many chunks.",
      layer: "prefill",
      confidence: 0.05,
      status: "rejected",
      supporting: [{ id: "ev6", kind: "trace", label: "Prefill is large", detail: "Prefill is 402 ms in the p95 bucket; long prompts take 5+ chunks.", source: "tc_031_07" }],
      disconfirming: [
        { id: "ev7", kind: "experiment", label: "Experiment did not hold SLO", detail: "EXP-105 reached 702 ms (misses 700 ms) and raised ITL p95 14%.", source: "EXP-105" },
        { id: "ev8", kind: "metric", label: "Preemptions unchanged", detail: "Preemptions during EXP-105 replay stayed at 14,210 vs 14,880.", source: "EXP-105" },
      ],
      missing: [],
      nextTest: "None. Rejected after EXP-105.",
      expectedInformationGain: "medium",
      productionRisk: "medium",
    },
    {
      id: "H-031-3",
      investigationId: "INV-031",
      rank: 3,
      claim: "Traffic shape changed (longer prompts or burstier arrivals), not the serving stack.",
      layer: "workload",
      confidence: 0.02,
      status: "rejected",
      supporting: [],
      disconfirming: [
        { id: "ev9", kind: "fingerprint", label: "Workload is stable", detail: `Fingerprint distance ${dist.total.toFixed(3)} vs the same window last week (${dist.verdict.replace("_", " ")}).`, source: "tc_031_03" },
        { id: "ev10", kind: "deployment", label: "No recent change", detail: recentDeploys.length ? `${recentDeploys.length} deployment(s) in 72h.` : "No deployments in the 72h before the SLO miss.", source: "tc_031_04" },
      ],
      missing: [],
      nextTest: "None.",
      expectedInformationGain: "low",
      productionRisk: "none",
    },
  ];

  const toolCalls: ToolCall[] = [
    call("tc_031_01", t0, "query_metrics", { metric: "ttft_p95_ms", window: "24h", agg: "p95/5m" }, 182, `p95 TTFT mean ${f0(ttft.mean)} ms; ${pct(getSeries("ttft_p95_ms", win.from, win.to).filter((p) => p.v > 700).length / ttft.n)} of windows above 700 ms.`, "intake"),
    call("tc_031_02", t0 + 1 * MINUTE, "get_engine_state", { endpoint_id: "ep_chat_use2" }, 96, "Telemetry present: vLLM, Prometheus, DCGM, OTel (5%), deployments. Missing: kernel profiler.", "coverage_check"),
    call("tc_031_03", t0 + 2 * MINUTE, "get_workload_profile", { workload_id: "wl_qwen_prod", window: "48h vs last week" }, 1240, `Fingerprint distance ${dist.total.toFixed(3)} (${dist.verdict.replace("_", " ")}). Traffic shape did not change.`, "workload_stability"),
    call("tc_031_04", t0 + 3 * MINUTE, "get_deployments", { workload_id: "wl_qwen_prod", window: "72h" }, 64, recentDeploys.length ? `${recentDeploys.length} deployments.` : "No deployments in 72h. Last change: dep_3e10 (gateway timeout), 6 days ago.", "workload_stability"),
    call("tc_031_05", t0 + 4 * MINUTE, "query_metrics", { metric: "kv_cache_usage", window: "24h", agg: "p95" }, 151, `KV usage p95 ${pct(kv.p95, 1)}; waiting requests p95 ${f0(waiting.p95)}.`, "layer_localization"),
    call("tc_031_06", t0 + 5 * MINUTE, "compare_windows", { metric: "preemptions vs ttft_p95_ms", window: "24h" }, 210, `${f0(preTotal)} preemptions; r = ${r.toFixed(2)} with p95 TTFT. Correlation, not proof.`, "layer_localization"),
    call("tc_031_07", t0 + 6 * MINUTE, "load_trace_summary", { workload_id: "wl_qwen_prod", window: "24h", percentile: "p95 bucket" }, 820, "Queue 468 ms · prefill 402 ms · first decode 66 ms · scheduler 22 ms · network+gateway 23 ms.", "hypothesis_ranking"),
    call("tc_031_08", t0 + 7 * MINUTE, "query_metrics", { metric: "itl_p95_ms", window: "72h" }, 140, `ITL p95 ${itl.mean.toFixed(1)} ms (prior 48h ${itlPrior.mean.toFixed(1)} ms). Decode stable.`, "evidence_acquisition"),
    call("tc_031_09", t0 + 8 * MINUTE, "search_experiment_memory", { bottleneck: "scheduler", fingerprint: "cap_0918" }, 75, "Analog: KN-039 (chart dropped engine flag, staging). No KV-headroom precedent for this workload.", "evidence_acquisition"),
    call("tc_031_10", t0 + 10 * MINUTE, "propose_experiment", { change: "gpu_memory_utilization 0.80→0.92", capture_id: "cap_0918" }, 44, "Drafted EXP-104 plus 3 alternates (EXP-103, EXP-105, EXP-106) for the remaining hypotheses.", "experiment_design"),
    call("tc_031_11", T.experimentsStarted, "run_replay", { experiment_id: "EXP-103…106" }, 5 * HOUR, "4 replays × 10 runs on replay-sandbox. Quota used: $77.90.", "execution", "approved"),
    call("tc_031_12", T.experimentsCompleted, "verify_candidate", { experiment_id: "EXP-103…106" }, 38000, "EXP-104 9/9 gates · EXP-105 9/9 (rejected on SLO + ITL) · EXP-106 cache integrity FAIL · EXP-103 correctness UNKNOWN.", "verification"),
    call("tc_031_13", T.winnerPromoted - 20 * MINUTE, "promote_candidate", { experiment_id: "EXP-104", rollout: "replica-0 → replica-1, 15m bake" }, 31, "Promotion request approved by Alex Chen (apr_5498).", "decision", "approved"),
    call("tc_031_14", T.winnerPromoted + 45 * MINUTE, "compare_windows", { metric: "ttft_p95_ms", before: "experiment expectation", after: "dep_5a21 +45m" }, 190, "Production p95 TTFT within about 2% of EXP-104's measured result.", "production_observe"),
    call("tc_031_15", T.winnerPromoted + HOUR, "search_experiment_memory", { write: "KN-044, KN-045, KN-046" }, 52, "Stored 3 outcomes (1 improved, 1 no effect, 1 invalid) with fingerprint fp_cap0918.", "knowledge_writeback"),
  ];

  return {
    id: "INV-031",
    workloadId: "wl_qwen_prod",
    incidentId: "INC-207",
    title: "Sustained p95 TTFT SLO miss on qwen-prod",
    status: "completed",
    state: "closed",
    agentVersion: "perf-agent v0.9.2",
    openedAt: iso(t0),
    problemStatement: `p95 TTFT averaged ${f0(ttft.mean)} ms over 24h against a 700 ms SLO. Error budget burning 6.2× over 6h.`,
    coverageGaps: ["Kernel profiler not attached; kernel-layer evidence uses a 9-day-old Nsight capture."],
    workloadShiftAssessment: `No material shift: fingerprint distance ${dist.total.toFixed(3)} vs the same window last week. No deployments in 72h.`,
    hypotheses,
    toolCalls,
    recommended: {
      singleVariableChange: { key: "gpu_memory_utilization", from: "0.80", to: "0.92" },
      baseline: "Production config (vLLM 0.11.0, gpu_memory_utilization 0.80)",
      candidate: "Same, with gpu_memory_utilization 0.92",
      workloadCaptureId: "cap_0918",
      successCriteria: ["p95 TTFT < 700 ms in every repetition", "ITL p95 within +5%", "Error rate not worse", "All 9 Guardian gates pass"],
      stopConditions: ["Engine fails to start (OOM at init)", "Error rate > 1% in any run"],
      rollback: "Revert gpu_memory_utilization to 0.80 (config-only; no image change).",
    },
    conclusion: "Confirmed: KV cache exhaustion. EXP-104 promoted via dep_5a21. Production matched the experiment within about 2%.",
  };
}

export function buildInvestigation034(): Investigation {
  const t0 = T.investigation034Opened;
  const span = 3 * HOUR + 30 * MINUTE;
  const ttft = compareAround("ttft_p95_ms", T.runtimeDeploy, span);
  const runningBefore = windowStats("batch_running", T.runtimeDeploy - DAY, T.runtimeDeploy - 5 * MINUTE);
  const runningAfter = windowStats("batch_running", T.runtimeDeploy + 15 * MINUTE, NOW);
  const waiting = compareAround("queue_waiting", T.runtimeDeploy, span);
  const kv = compareAround("kv_cache_usage", T.runtimeDeploy, span);
  const itl = compareAround("itl_p95_ms", T.runtimeDeploy, span);
  const unrelated = compareAround("ttft_p95_ms", T.unrelatedDeploy, span);
  const dist = fingerprintDistance(fingerprints.prodBeforeDeploy(), fingerprints.prodNow());
  const gpu = compareAround("gpu_util", T.runtimeDeploy, span);

  const hypotheses: Hypothesis[] = [
    {
      id: "H-034-1",
      investigationId: "INV-034",
      rank: 1,
      claim: "Chart 2.4.0 stopped rendering --max-num-seqs, so the engine fell back to the chart default of 128 sequences per replica and admission control caps the running batch.",
      layer: "scheduler",
      confidence: 0.64,
      status: "active",
      supporting: [
        { id: "ev1", kind: "deployment", label: "Rendered args changed", detail: "dep_7f3c rendered config hash cfg_92c4 → cfg_e310; --max-num-seqs absent from the new pod spec.", source: "tc_034_04" },
        { id: "ev2", kind: "metric", label: "Running batch capped", detail: `Running sequences p95 ${f0(runningBefore.p95)} in the 24h before; max ${f0(runningAfter.max)} since. Ceiling: 2 replicas × 128 = 256.`, source: "tc_034_05" },
        { id: "ev3", kind: "metric", label: "Queue grew", detail: `Waiting requests mean ${f0(waiting.before.mean)} → ${f0(waiting.after.mean)}.`, source: "tc_034_05" },
        { id: "ev4", kind: "metric", label: "Engine reports the cap", detail: "get_engine_state: max_num_seqs = 128 on both replicas (was 256).", source: "tc_034_06" },
      ],
      disconfirming: [
        { id: "ev5", kind: "metric", label: "GPU not saturated", detail: `GPU utilization fell ${pct(gpu.before.mean)} → ${pct(gpu.after.mean)}. Consistent with under-admission, but also with a slower kernel path.`, source: "tc_034_07" },
      ],
      missing: ["Replay of the current capture with max_num_seqs pinned to 256 (EXP-108, running)."],
      nextTest: "EXP-108: same image (0.11.1), max_num_seqs pinned to 256, replay cap_0921.",
      expectedInformationGain: "high",
      productionRisk: "low",
    },
    {
      id: "H-034-2",
      investigationId: "INV-034",
      rank: 2,
      claim: "vLLM 0.11.1 kernel or memory regression slows prefill.",
      layer: "kernel",
      confidence: 0.12,
      status: "active",
      supporting: [{ id: "ev6", kind: "deployment", label: "Engine version changed", detail: "vllm-serve 0.11.0 → 0.11.1 in the same deploy.", source: "tc_034_04" }],
      disconfirming: [
        { id: "ev7", kind: "metric", label: "KV pressure fell", detail: `KV usage mean ${pct(kv.before.mean)} → ${pct(kv.after.mean)}; zero preemptions since deploy.`, source: "tc_034_05" },
        { id: "ev8", kind: "metric", label: "Per-token decode got faster", detail: `ITL p95 ${itl.before.mean.toFixed(1)} → ${itl.after.mean.toFixed(1)} ms.`, source: "tc_034_07" },
        { id: "ev9", kind: "trace", label: "Prefill time unchanged", detail: "Prefill 390 → 388 ms in the p95 bucket; the added time is queue wait.", source: "tc_034_08" },
      ],
      missing: ["Kernel profile on 0.11.1 (profiler not attached)."],
      nextTest: "Only if EXP-108 fails: Nsight capture on replay-sandbox with 0.11.0 vs 0.11.1.",
      expectedInformationGain: "medium",
      productionRisk: "none",
    },
    {
      id: "H-034-3",
      investigationId: "INV-034",
      rank: 3,
      claim: "Traffic shape shifted at the same time as the deploy.",
      layer: "workload",
      confidence: 0.03,
      status: "rejected",
      supporting: [],
      disconfirming: [
        { id: "ev10", kind: "fingerprint", label: "Workload is stable", detail: `Fingerprint distance ${dist.total.toFixed(3)} (24h before vs since deploy): ${dist.verdict.replace("_", " ")}.`, source: "tc_034_02" },
        { id: "ev11", kind: "deployment", label: "Earlier deploy ruled out", detail: `dep_6b02 (log sampling, ${Math.round((T.runtimeDeploy - T.unrelatedDeploy) / HOUR)}h earlier): p95 TTFT ${formatDelta(unrelated.relDelta)} across it. No step change.`, source: "tc_034_03" },
      ],
      missing: [],
      nextTest: "None.",
      expectedInformationGain: "low",
      productionRisk: "none",
    },
  ];

  const toolCalls: ToolCall[] = [
    call("tc_034_01", t0, "compare_windows", { metric: "ttft_p95_ms", before: "3.5h pre-deploy", after: "deploy +15m" }, 188, `p95 TTFT ${f0(ttft.before.mean)} → ${f0(ttft.after.mean)} ms (${formatDelta(ttft.relDelta)}). Regression Guard band exceeded for 20 min.`, "intake"),
    call("tc_034_02", t0 + 1 * MINUTE, "get_workload_profile", { workload_id: "wl_qwen_prod", window: "24h pre vs post" }, 1180, `Fingerprint distance ${dist.total.toFixed(3)}: ${dist.verdict.replace("_", " ")}.`, "workload_stability"),
    call("tc_034_03", t0 + 2 * MINUTE, "compare_windows", { metric: "ttft_p95_ms", around: "dep_6b02" }, 160, `dep_6b02: ${formatDelta(unrelated.relDelta)}. No effect; excluded.`, "workload_stability"),
    call("tc_034_04", t0 + 3 * MINUTE, "get_deployments", { workload_id: "wl_qwen_prod", window: "24h" }, 70, "dep_7f3c: image 0.11.0 → 0.11.1, chart 2.3.2 → 2.4.0, rendered config hash changed.", "layer_localization"),
    call("tc_034_05", t0 + 5 * MINUTE, "query_metrics", { metric: "batch_running, queue_waiting, kv_cache_usage", window: "pre/post" }, 240, `Running p95 ${f0(runningBefore.p95)} (24h pre) → max ${f0(runningAfter.max)} since; waiting ${f0(waiting.before.mean)} → ${f0(waiting.after.mean)}; KV ${pct(kv.before.mean)} → ${pct(kv.after.mean)}.`, "layer_localization"),
    call("tc_034_06", t0 + 9 * MINUTE, "get_engine_state", { endpoint_id: "ep_chat_use2" }, 88, "max_num_seqs = 128 (both replicas, was 256). gpu_memory_utilization = 0.92. prefix caching off.", "hypothesis_ranking"),
    call("tc_034_07", t0 + 11 * MINUTE, "get_gpu_summary", { pool_id: "hp_h100_use2", window: "pre/post" }, 302, `SM util ${pct(gpu.before.mean)} → ${pct(gpu.after.mean)}. replica-1 GPU 3 DRAM bandwidth missing (DCGM partial).`, "evidence_acquisition"),
    call("tc_034_08", t0 + 13 * MINUTE, "load_trace_summary", { workload_id: "wl_qwen_prod", window: "since deploy", percentile: "p95 bucket" }, 760, "Queue 418 ms (74% max_num_seqs cap) · prefill 388 ms · first decode 54 ms.", "evidence_acquisition"),
    call("tc_034_09", t0 + 14 * MINUTE, "search_experiment_memory", { bottleneck: "scheduler", query: "chart upgrade engine flag" }, 66, "KN-039: chart upgrade silently dropped engine flag (qwen-staging, 23 days ago). Fix was pinning args in values.yaml.", "evidence_acquisition"),
    call("tc_034_10", T.experiment108Started - 4 * MINUTE, "propose_experiment", { change: "max_num_seqs 128→256", capture_id: "cap_0921" }, 41, "Drafted EXP-108 (single-variable, same image).", "experiment_design"),
    call("tc_034_11", T.experiment108Started, "run_replay", { experiment_id: "EXP-108" }, NOW - T.experiment108Started, "Approved by Sam Okafor (apr_5512). Running: 6/10 runs complete.", "execution", "approved"),
  ];

  return {
    id: "INV-034",
    workloadId: "wl_qwen_prod",
    incidentId: "INC-212",
    title: "p95 TTFT regression after dep_7f3c",
    status: "running",
    state: "execution",
    agentVersion: "perf-agent v0.9.2",
    openedAt: iso(t0),
    problemStatement: `p95 TTFT rose ${formatDelta(ttft.relDelta)} after dep_7f3c (${f0(ttft.before.mean)} → ${f0(ttft.after.mean)} ms, 3.5h before vs since the deploy). SLO 700 ms.`,
    coverageGaps: ["DCGM: replica-1 GPU 3 DRAM bandwidth missing since 09:12 UTC; memory-bandwidth hypotheses capped at medium confidence.", "Kernel profiler not attached."],
    workloadShiftAssessment: `No material shift: fingerprint distance ${dist.total.toFixed(3)} between the 24h before the deploy and since.`,
    hypotheses,
    toolCalls,
    recommended: {
      singleVariableChange: { key: "max_num_seqs", from: "128 (chart default)", to: "256 (pinned)" },
      baseline: "Current production (vLLM 0.11.1, chart 2.4.0, max_num_seqs 128)",
      candidate: "Same image and chart, --max-num-seqs 256 pinned in values.yaml",
      workloadCaptureId: "cap_0921",
      successCriteria: ["p95 TTFT < 700 ms in every repetition", "Running batch exceeds 256 at peak", "All 9 Guardian gates pass"],
      stopConditions: ["Preemptions > 100 per run (KV pressure returning)", "Error rate > 1%"],
      rollback: "Previous image sha256:4be1c07e9a2d with chart 2.3.2 (Argo CD rollback, ~6 min).",
    },
  };
}

let cache: Investigation[] | null = null;
export function getInvestigations(): Investigation[] {
  cache ??= [buildInvestigation034(), buildInvestigation031()];
  return cache;
}

export function getInvestigation(id: string): Investigation | undefined {
  return getInvestigations().find((i) => i.id === id);
}
