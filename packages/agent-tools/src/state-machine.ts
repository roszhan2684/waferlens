import type { InvestigationState } from "@waferlens/shared";

/** The investigation state machine that keeps the agent from wandering. */
export const STATES: { id: InvestigationState; label: string; description: string }[] = [
  { id: "intake", label: "Intake", description: "Receive the SLO miss, regression, or optimization objective." },
  { id: "coverage_check", label: "Coverage check", description: "Verify required telemetry exists, or request the exact missing signal." },
  { id: "workload_stability", label: "Workload stability", description: "Determine whether traffic shape shifted before blaming infrastructure." },
  { id: "layer_localization", label: "Layer localization", description: "Queue → scheduler → prefill → decode → kernel → GPU → network." },
  { id: "hypothesis_ranking", label: "Hypothesis ranking", description: "At most 3 active hypotheses." },
  { id: "evidence_acquisition", label: "Evidence acquisition", description: "Call only the tools needed to separate hypotheses." },
  { id: "experiment_design", label: "Experiment design", description: "Minimal controlled change with rollback and success criteria." },
  { id: "execution", label: "Execution", description: "Run in an isolated replay environment after approval." },
  { id: "verification", label: "Verification", description: "Correctness and benchmark integrity gates." },
  { id: "decision", label: "Decision", description: "Keep, reject, or inconclusive." },
  { id: "production_observe", label: "Production observe", description: "Compare post-deploy behavior to the experiment's expectation." },
  { id: "knowledge_writeback", label: "Knowledge writeback", description: "Store fingerprint, change, result, caveats, artifacts." },
  { id: "closed", label: "Closed", description: "Investigation complete." },
];

const ORDER = STATES.map((s) => s.id);

/** Allowed transitions: forward one step, or back to evidence/design when an experiment is inconclusive. */
const BACK_EDGES: Partial<Record<InvestigationState, InvestigationState[]>> = {
  coverage_check: ["intake"],
  decision: ["evidence_acquisition", "experiment_design"],
  production_observe: ["intake"],
  workload_stability: ["closed"], // a pure workload shift closes without an infra hypothesis
};

export function canTransition(from: InvestigationState, to: InvestigationState): boolean {
  const i = ORDER.indexOf(from);
  const j = ORDER.indexOf(to);
  if (j === i + 1) return true;
  return BACK_EDGES[from]?.includes(to) ?? false;
}

export function assertTransition(from: InvestigationState, to: InvestigationState): void {
  if (!canTransition(from, to)) throw new Error(`Illegal investigation transition: ${from} → ${to}`);
}

export function stateIndex(s: InvestigationState): number {
  return ORDER.indexOf(s);
}

export const MAX_ACTIVE_HYPOTHESES = 3;
