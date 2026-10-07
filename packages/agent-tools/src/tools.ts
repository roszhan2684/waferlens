/**
 * Typed tool contracts for the Performance Agent. The agent never gets a shell:
 * every capability is one of these tools, each with an explicit safety rule.
 */
export interface ToolContract {
  name: string;
  purpose: string;
  signature: string;
  safety: string;
  readOnly: boolean;
  requiresApproval: boolean;
  sideEffect: "none" | "draft" | "sandbox_compute" | "production";
}

export const TOOL_CONTRACTS: ToolContract[] = [
  { name: "get_workload_profile", purpose: "Read token, concurrency and arrival distributions", signature: "(workload_id, window) → WorkloadFingerprint", safety: "Read-only, tenant scoped", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "query_metrics", purpose: "Read selected time-series ranges", signature: "(metric, window, agg) → Series", safety: "Allowlisted metric names only", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "get_deployments", purpose: "Correlate config and runtime changes", signature: "(workload_id, window) → Deployment[]", safety: "Read-only", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "get_gpu_summary", purpose: "Read utilization, memory, bandwidth, thermal", signature: "(pool_id, window) → GpuSummary", safety: "Read-only", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "get_engine_state", purpose: "Read vLLM scheduler, KV and cache state", signature: "(endpoint_id) → EngineState", safety: "Read-only; rendered args, never secrets", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "load_trace_summary", purpose: "Inspect stage and kernel timing summaries", signature: "(workload_id, window, percentile) → StageTimings", safety: "No raw prompt bodies by default", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "compare_windows", purpose: "Statistical baseline vs incident comparison", signature: "(metric, before, after) → WindowComparison", safety: "Deterministic service", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "propose_experiment", purpose: "Create a draft experiment spec", signature: "(single_variable_change, capture_id, criteria) → ExperimentDraft", safety: "Draft only; no execution", readOnly: false, requiresApproval: false, sideEffect: "draft" },
  { name: "run_replay", purpose: "Execute an approved replay", signature: "(experiment_id) → ReplayJob", safety: "Sandboxed worker + quota; requires approval", readOnly: false, requiresApproval: true, sideEffect: "sandbox_compute" },
  { name: "verify_candidate", purpose: "Run correctness and repeatability gates", signature: "(experiment_id) → GateResult[]", safety: "Deterministic validation", readOnly: true, requiresApproval: false, sideEffect: "none" },
  { name: "promote_candidate", purpose: "Request promotion to production", signature: "(experiment_id, rollout_plan) → PromotionRequest", safety: "Human approval required (MVP policy)", readOnly: false, requiresApproval: true, sideEffect: "production" },
  { name: "search_experiment_memory", purpose: "Retrieve analogous past experiments", signature: "(fingerprint, bottleneck?) → KnowledgeItem[]", safety: "Read-only", readOnly: true, requiresApproval: false, sideEffect: "none" },
];

export const TOOL_NAMES = TOOL_CONTRACTS.map((t) => t.name);

export function getTool(name: string): ToolContract | undefined {
  return TOOL_CONTRACTS.find((t) => t.name === name);
}

/** Policy check the orchestrator runs before every tool call. */
export function authorizeToolCall(name: string, approvalGranted: boolean): { allowed: boolean; reason: string } {
  const tool = getTool(name);
  if (!tool) return { allowed: false, reason: `Unknown tool "${name}". The agent may only call registered tools.` };
  if (tool.requiresApproval && !approvalGranted) return { allowed: false, reason: `${name} requires human approval (${tool.safety}).` };
  return { allowed: true, reason: tool.safety };
}
