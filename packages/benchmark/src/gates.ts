import { cv, relativeDelta, type DeltaEstimate } from "@waferlens/shared";
import type { Decision, EnvironmentFingerprint, Experiment, GateId, GateResult, GateStatus, Run, RunMetrics } from "@waferlens/shared";

/**
 * Benchmark Guardian: deterministic validation. No LLM is involved in any gate.
 * A candidate can only be called a winner when every mandatory gate passes.
 */

export const GATE_SPECS: Record<GateId, { label: string; question: string }> = {
  workload_parity: { label: "Workload parity", question: "Did baseline and candidate receive the same representative workload?" },
  environment_completeness: { label: "Environment fingerprint", question: "Can we reproduce hardware, driver, runtime, engine, model and container?" },
  warmup_consistency: { label: "Warmup", question: "Were JIT, cache and runtime warmup effects handled the same way for both arms?" },
  repeated_trials: { label: "Repetition", question: "Was the result repeated enough to rule out a lucky run?" },
  timing_boundary: { label: "Timing integrity", question: "Is the timing boundary identical across arms?" },
  output_correctness: { label: "Output correctness", question: "Does the candidate preserve acceptable output behavior?" },
  error_accounting: { label: "Failure accounting", question: "Are errors and retries included instead of filtered away?" },
  cache_integrity: { label: "Cache integrity", question: "Did any arm shortcut work through cached or stale outputs?" },
  artifact_bundle: { label: "Reproducible bundle", question: "Is there a hashed artifact bundle another engineer can re-run?" },
};

export const GATE_ORDER: GateId[] = [
  "workload_parity",
  "environment_completeness",
  "warmup_consistency",
  "repeated_trials",
  "timing_boundary",
  "output_correctness",
  "error_accounting",
  "cache_integrity",
  "artifact_bundle",
];

export const POLICY = {
  minRepetitions: 3,
  maxRepCv: 0.05,
  minWarmup: 200,
  maxPrefixHitGap: 0.1,
  maxErrorRateIncrease: 0.0005,
  maxItlRegression: 0.05,
  minPracticalEffect: 0.03,
} as const;

const REQUIRED_ENV_FIELDS: (keyof EnvironmentFingerprint)[] = [
  "accelerator",
  "acceleratorCount",
  "driver",
  "cuda",
  "engineVersion",
  "modelRevision",
  "tokenizerRevision",
  "containerDigest",
  "commit",
];

function gate(id: GateId, status: GateStatus, detail: string): GateResult {
  return { id, ...GATE_SPECS[id], status, detail, blocking: status !== "pass" };
}

const armRuns = (runs: Run[], arm: Run["arm"]) => runs.filter((r) => r.arm === arm);
const pick = (runs: Run[], k: keyof RunMetrics) => runs.map((r) => r.metrics[k]);

export function evaluateGates(exp: Experiment): GateResult[] {
  const { baseline: b, candidate: c, runs } = exp;
  const bRuns = armRuns(runs, "baseline");
  const cRuns = armRuns(runs, "candidate");
  const results: GateResult[] = [];

  // 1. Workload parity
  {
    const sameCapture = b.captureId === c.captureId;
    const sameHash = b.distributionHash === c.distributionHash;
    const sameCount = b.requestCount === c.requestCount;
    results.push(
      sameCapture && sameHash && sameCount
        ? gate("workload_parity", "pass", `Both arms replayed ${b.captureId} (${b.distributionHash}), ${b.requestCount.toLocaleString("en-US")} requests each.`)
        : gate(
            "workload_parity",
            "fail",
            [
              !sameCapture && `Captures differ: ${b.captureId} vs ${c.captureId}.`,
              !sameHash && `Distribution hash differs: ${b.distributionHash} vs ${c.distributionHash}.`,
              !sameCount && `Request counts differ: ${b.requestCount} vs ${c.requestCount}.`,
            ]
              .filter(Boolean)
              .join(" "),
          ),
    );
  }

  // 2. Environment completeness: everything recorded, and only the config under test differs.
  {
    const missing = REQUIRED_ENV_FIELDS.filter((f) => b.environment[f] == null || c.environment[f] == null);
    const differing = REQUIRED_ENV_FIELDS.filter((f) => !missing.includes(f) && b.environment[f] !== c.environment[f]);
    if (missing.length) results.push(gate("environment_completeness", "unknown", `Not recorded: ${missing.join(", ")}. The result cannot be reproduced.`));
    else if (differing.length)
      results.push(gate("environment_completeness", "fail", `Arms ran on different environments (${differing.map((f) => `${f}: ${b.environment[f]} vs ${c.environment[f]}`).join("; ")}). Only the configuration under test may differ.`));
    else results.push(gate("environment_completeness", "pass", `${b.environment.accelerator} ×${b.environment.acceleratorCount}, driver ${b.environment.driver}, CUDA ${b.environment.cuda}, vLLM ${b.environment.engineVersion}, ${b.environment.containerDigest}. Identical across arms.`));
  }

  // 3. Warmup consistency
  {
    const bw = b.warmupRequests;
    const cw = c.warmupRequests;
    if (bw !== cw) results.push(gate("warmup_consistency", "fail", `Warmup differs: baseline discarded ${bw} requests, candidate ${cw}. A cold arm inflates the comparison.`));
    else if (bw < POLICY.minWarmup) results.push(gate("warmup_consistency", "fail", `Warmup of ${bw} requests is below the ${POLICY.minWarmup}-request policy.`));
    else results.push(gate("warmup_consistency", "pass", `${bw} requests discarded per run in both arms. ${b.warmupPolicy}`));
  }

  // 4. Repeated trials
  {
    const n = Math.min(bRuns.length, cRuns.length);
    if (n < POLICY.minRepetitions) {
      results.push(gate("repeated_trials", "fail", `${n} repetition${n === 1 ? "" : "s"} per arm; policy requires ${POLICY.minRepetitions}+. Variance is unknown.`));
    } else {
      const bcv = cv(pick(bRuns, "ttftP95Ms"));
      const ccv = cv(pick(cRuns, "ttftP95Ms"));
      const worst = Math.max(bcv, ccv);
      results.push(
        worst > POLICY.maxRepCv
          ? gate("repeated_trials", "fail", `Run-to-run CV of p95 TTFT is ${(worst * 100).toFixed(1)}% (limit ${POLICY.maxRepCv * 100}%). Results are too noisy to rank.`)
          : gate("repeated_trials", "pass", `${n} repetitions per arm, ${exp.runOrder.toLowerCase()}. CV of p95 TTFT: ${(bcv * 100).toFixed(1)}% baseline, ${(ccv * 100).toFixed(1)}% candidate.`),
      );
    }
  }

  // 5. Timing boundary
  results.push(
    b.timingBoundary === c.timingBoundary
      ? gate("timing_boundary", "pass", `Both arms timed ${b.timingBoundary}.`)
      : gate("timing_boundary", "fail", `Timing boundaries differ: "${b.timingBoundary}" vs "${c.timingBoundary}".`),
  );

  // 6. Output correctness
  {
    const k = exp.correctness;
    if (k.method === "not_run") results.push(gate("output_correctness", "unknown", "No correctness check ran for this candidate. Speed without correctness is not a result."));
    else if (k.method === "greedy_exact_match") {
      const rate = k.matchRate ?? 0;
      results.push(
        rate >= k.tolerance
          ? gate("output_correctness", "pass", `Greedy exact match on ${k.sampleSize.toLocaleString("en-US")} sampled requests: ${(rate * 100).toFixed(2)}% (threshold ${(k.tolerance * 100).toFixed(1)}%).`)
          : gate("output_correctness", "fail", `Greedy exact match ${(rate * 100).toFixed(2)}% is below the ${(k.tolerance * 100).toFixed(1)}% threshold.`),
      );
    } else {
      const d = k.qualityDelta ?? 0;
      results.push(
        Math.abs(d) <= k.tolerance
          ? gate("output_correctness", "pass", `Quality eval delta ${d.toFixed(3)} within ±${k.tolerance}.`)
          : gate("output_correctness", "fail", `Quality eval delta ${d.toFixed(3)} exceeds ±${k.tolerance}.`),
      );
    }
  }

  // 7. Error accounting
  {
    if (b.errorPolicy !== "include_as_timeout" || c.errorPolicy !== "include_as_timeout") {
      results.push(gate("error_accounting", "fail", "Failed requests were excluded from latency statistics in at least one arm. Dropping errors hides tail latency."));
    } else {
      const be = pick(bRuns, "errorRate");
      const ce = pick(cRuns, "errorRate");
      const bm = be.reduce((a, x) => a + x, 0) / Math.max(1, be.length);
      const cm = ce.reduce((a, x) => a + x, 0) / Math.max(1, ce.length);
      results.push(
        cm - bm > POLICY.maxErrorRateIncrease
          ? gate("error_accounting", "fail", `Candidate error rate ${(cm * 100).toFixed(2)}% vs ${(bm * 100).toFixed(2)}%: exceeds the +${(POLICY.maxErrorRateIncrease * 100).toFixed(2)}pp limit.`)
          : gate("error_accounting", "pass", `Errors counted as timeouts in both arms. Error rate ${(bm * 100).toFixed(2)}% → ${(cm * 100).toFixed(2)}%.`),
      );
    }
  }

  // 8. Cache integrity
  {
    if (b.outputCacheEnabled || c.outputCacheEnabled) {
      results.push(gate("cache_integrity", "fail", "A response/output cache was enabled during the replay. Cached outputs are not inference."));
    } else {
      const gap = Math.max(b.prefixHitRate, c.prefixHitRate) - exp.productionPrefixReuse;
      const anyCaching = b.config.enable_prefix_caching || c.config.enable_prefix_caching;
      if (anyCaching && gap > POLICY.maxPrefixHitGap) {
        results.push(gate("cache_integrity", "fail", `Prefix cache hit rate in replay ${(Math.max(b.prefixHitRate, c.prefixHitRate) * 100).toFixed(0)}% vs ${(exp.productionPrefixReuse * 100).toFixed(0)}% estimated in production. The replay rewards caching more than real traffic would.`));
      } else {
        results.push(gate("cache_integrity", "pass", anyCaching ? `Prefix hit rate ${(c.prefixHitRate * 100).toFixed(0)}% in replay vs ${(exp.productionPrefixReuse * 100).toFixed(0)}% in production (within ${POLICY.maxPrefixHitGap * 100}pp). No output cache.` : "Prefix caching off in both arms; no output cache; seeds unique per request."));
      }
    }
  }

  // 9. Artifact bundle
  results.push(
    exp.artifactBundle
      ? gate("artifact_bundle", "pass", `${exp.artifactBundle.files.length} files, ${exp.artifactBundle.hash.slice(0, 19)}…`)
      : gate("artifact_bundle", "unknown", exp.status === "complete" ? "No artifact bundle recorded." : "Bundle is written when the experiment completes."),
  );

  return results;
}

export interface Comparison {
  ttftP95: DeltaEstimate;
  ttftP50: DeltaEstimate;
  itlP95: DeltaEstimate;
  throughput: DeltaEstimate;
  errorRate: DeltaEstimate;
  cost: DeltaEstimate;
}

export function compare(exp: Experiment): Comparison | null {
  const b = armRuns(exp.runs, "baseline");
  const c = armRuns(exp.runs, "candidate");
  if (b.length === 0 || c.length === 0) return null;
  const d = (k: keyof RunMetrics) => relativeDelta(pick(b, k), pick(c, k));
  return { ttftP95: d("ttftP95Ms"), ttftP50: d("ttftP50Ms"), itlP95: d("itlP95Ms"), throughput: d("throughputTokS"), errorRate: d("errorRate"), cost: d("costPerMTokUsd") };
}

export interface Verdict {
  decision: Decision;
  label: string;
  reasons: string[];
  gates: GateResult[];
  comparison: Comparison | null;
  summary: { pass: number; fail: number; unknown: number; total: number };
}

export const DECISION_LABEL: Record<Decision, string> = {
  winner: "Measured winner",
  rejected: "Rejected",
  inconclusive: "Inconclusive",
  promising_unverified: "Promising, unverified",
  pending: "Pending",
};

/**
 * Decision rule: a WINNER needs every gate to pass, the SLO to hold at the upper
 * confidence bound, guardrails to hold, and an effect larger than the practical threshold.
 */
export function decide(exp: Experiment, sloP95Ms: number): Verdict {
  const gates = evaluateGates(exp);
  const comparison = compare(exp);
  const summary = {
    pass: gates.filter((g) => g.status === "pass").length,
    fail: gates.filter((g) => g.status === "fail").length,
    unknown: gates.filter((g) => g.status === "unknown").length,
    total: gates.length,
  };
  const reasons: string[] = [];
  const done = exp.runs.filter((r) => r.arm === "candidate").length;

  if (!comparison || (exp.status !== "complete" && done < exp.plannedRepetitions)) {
    return { decision: "pending", label: DECISION_LABEL.pending, reasons: [`${done}/${exp.plannedRepetitions} candidate repetitions complete.`], gates, comparison, summary };
  }

  // With a single repetition the CI is undefined; fall back to the point estimate.
  const improves = Number.isFinite(comparison.ttftP95.ci[1]) ? comparison.ttftP95.ci[1] < 0 : comparison.ttftP95.relDelta < 0;
  const failed = gates.filter((g) => g.status === "fail");
  const unknown = gates.filter((g) => g.status === "unknown");

  if (failed.length) {
    reasons.push(`${failed.length} mandatory gate${failed.length > 1 ? "s" : ""} failed: ${failed.map((g) => g.label).join(", ")}.`);
    if (improves) reasons.push("The measured speedup cannot be trusted until the failed gates pass.");
    return { decision: improves ? "promising_unverified" : "rejected", label: DECISION_LABEL[improves ? "promising_unverified" : "rejected"], reasons, gates, comparison, summary };
  }
  if (unknown.length) {
    reasons.push(`${unknown.map((g) => g.label).join(", ")}: not established.`);
    return { decision: "inconclusive", label: DECISION_LABEL.inconclusive, reasons, gates, comparison, summary };
  }

  const cRuns = armRuns(exp.runs, "candidate").map((r) => r.metrics.ttftP95Ms);
  const upper = comparison.ttftP95.candidateMean * (1 + (comparison.ttftP95.ci[1] - comparison.ttftP95.relDelta));
  if (comparison.itlP95.relDelta > POLICY.maxItlRegression) {
    reasons.push(`Guardrail: p95 ITL regressed ${(comparison.itlP95.relDelta * 100).toFixed(1)}% (limit +${POLICY.maxItlRegression * 100}%).`);
  }
  if (upper >= sloP95Ms || Math.max(...cRuns) >= sloP95Ms) {
    reasons.push(`Does not hold the ${sloP95Ms} ms p95 TTFT SLO with 95% confidence (candidate mean ${comparison.ttftP95.candidateMean.toFixed(0)} ms, worst run ${Math.max(...cRuns).toFixed(0)} ms).`);
  }
  if (comparison.ttftP95.ci[1] > -POLICY.minPracticalEffect) {
    reasons.push(`Effect is below the ${POLICY.minPracticalEffect * 100}% practical threshold (95% CI ${(comparison.ttftP95.ci[0] * 100).toFixed(1)}% to ${(comparison.ttftP95.ci[1] * 100).toFixed(1)}%).`);
  }
  if (reasons.length) return { decision: "rejected", label: DECISION_LABEL.rejected, reasons, gates, comparison, summary };

  reasons.push(
    `All ${gates.length} gates pass. p95 TTFT ${(comparison.ttftP95.relDelta * 100).toFixed(1)}% (95% CI ${(comparison.ttftP95.ci[0] * 100).toFixed(1)}% to ${(comparison.ttftP95.ci[1] * 100).toFixed(1)}%), below the ${sloP95Ms} ms SLO in every run.`,
  );
  return { decision: "winner", label: DECISION_LABEL.winner, reasons, gates, comparison, summary };
}
