import type { Experiment, Run } from "@waferlens/shared";

/**
 * Adversarial mode: inject a known benchmarking mistake into an experiment and
 * confirm Benchmark Guardian blocks it. Each fault also reshapes the measured
 * numbers the way the real mistake would, so the headline result looks better.
 */
export type FaultId = "cold_baseline" | "drop_failures" | "output_cache" | "request_mix" | "lucky_run" | "missing_driver" | "driver_mismatch";

export interface Fault {
  id: FaultId;
  label: string;
  description: string;
  expectGate: string;
}

export const FAULTS: Fault[] = [
  { id: "cold_baseline", label: "Cold baseline", description: "Baseline runs with no warmup while the candidate is warmed. CUDA graph capture and allocator growth land in the baseline's tail.", expectGate: "Warmup" },
  { id: "drop_failures", label: "Drop failed requests", description: "Timeouts and 5xx are filtered out of the candidate's latency statistics.", expectGate: "Failure accounting" },
  { id: "output_cache", label: "Output cache on", description: "A response cache serves repeated replay prompts without running inference.", expectGate: "Cache integrity" },
  { id: "request_mix", label: "Different request mix", description: "Candidate replays a shorter-prompt capture than the baseline.", expectGate: "Workload parity" },
  { id: "lucky_run", label: "One lucky run", description: "Only the single best candidate repetition is reported.", expectGate: "Repetition" },
  { id: "missing_driver", label: "Driver not recorded", description: "Environment fingerprint is missing the driver and CUDA versions.", expectGate: "Environment fingerprint" },
  { id: "driver_mismatch", label: "Driver mismatch", description: "Candidate ran on a node with a newer driver than the baseline.", expectGate: "Environment fingerprint" },
];

const scaleArm = (runs: Run[], arm: Run["arm"], f: (r: Run) => Run) => runs.map((r) => (r.arm === arm ? f(r) : r));

export function injectFaults(exp: Experiment, faults: readonly FaultId[]): Experiment {
  let e: Experiment = structuredClone(exp);
  for (const fault of faults) {
    switch (fault) {
      case "cold_baseline":
        e.baseline = { ...e.baseline, warmupRequests: 0 };
        e.runs = scaleArm(e.runs, "baseline", (r) => ({ ...r, warmupRequests: 0, metrics: { ...r.metrics, ttftP95Ms: r.metrics.ttftP95Ms * 1.14, ttftP50Ms: r.metrics.ttftP50Ms * 1.05 } }));
        break;
      case "drop_failures":
        e.candidate = { ...e.candidate, errorPolicy: "excluded" };
        e.runs = scaleArm(e.runs, "candidate", (r) => ({ ...r, failedRequests: 0, metrics: { ...r.metrics, errorRate: 0, ttftP95Ms: r.metrics.ttftP95Ms * 0.96 } }));
        break;
      case "output_cache":
        e.candidate = { ...e.candidate, outputCacheEnabled: true };
        e.runs = scaleArm(e.runs, "candidate", (r) => ({ ...r, metrics: { ...r.metrics, ttftP95Ms: r.metrics.ttftP95Ms * 0.62, ttftP50Ms: r.metrics.ttftP50Ms * 0.4 } }));
        break;
      case "request_mix":
        e.candidate = { ...e.candidate, captureId: "cap_0921_short", distributionHash: "fp_3a0c19e2b1f7" };
        e.runs = scaleArm(e.runs, "candidate", (r) => ({ ...r, metrics: { ...r.metrics, ttftP95Ms: r.metrics.ttftP95Ms * 0.81 } }));
        break;
      case "lucky_run": {
        const cand = e.runs.filter((r) => r.arm === "candidate");
        const best = cand.reduce((a, r) => (r.metrics.ttftP95Ms < a.metrics.ttftP95Ms ? r : a), cand[0]!);
        e.runs = e.runs.filter((r) => r.arm === "baseline" || r.id === best.id);
        break;
      }
      case "missing_driver":
        e.candidate = { ...e.candidate, environment: { ...e.candidate.environment, driver: null, cuda: null } };
        break;
      case "driver_mismatch":
        e.candidate = { ...e.candidate, environment: { ...e.candidate.environment, driver: "565.57.01", cuda: "12.7" } };
        break;
    }
  }
  return e;
}
