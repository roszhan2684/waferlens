/**
 * Domain types for WaferLens. These mirror the entities in docs/architecture.md
 * so the seeded demo data and a future API share one contract.
 */

export type ISODate = string;
export type Id = string;

export type Role = "owner" | "admin" | "engineer" | "viewer" | "customer_guest";

export interface Organization {
  id: Id;
  name: string;
  plan: "team" | "production" | "enterprise";
  retention: { metricsDays: number; tracesDays: number; artifactsDays: number; payloadSamplesDays: number };
}

export interface SloPolicy {
  ttftP95Ms: number;
  itlP95Ms: number;
  availability: number; // 0..1
  objective: string;
}

export interface Workload {
  id: Id;
  orgId: Id;
  name: string;
  model: string;
  modelRevision: string;
  engine: string;
  environment: "production" | "staging" | "replay-sandbox";
  slo: SloPolicy;
  hardwarePoolId: Id;
  endpointIds: Id[];
}

export interface Endpoint {
  id: Id;
  workloadId: Id;
  region: string;
  provider: string;
  route: string;
  replicas: number;
}

export interface HardwarePool {
  id: Id;
  vendor: "NVIDIA" | "AMD";
  accelerator: string;
  count: number;
  topology: string;
  hourlyCostUsd: number;
}

export interface EnvironmentFingerprint {
  accelerator: string;
  acceleratorCount: number;
  topology: string;
  driver: string | null;
  cuda: string | null;
  engine: string;
  engineVersion: string | null;
  modelRevision: string | null;
  tokenizerRevision: string | null;
  containerDigest: string | null;
  commit: string | null;
}

/** Serving-engine knobs WaferLens can vary in a controlled experiment. */
export interface EngineConfig {
  gpu_memory_utilization: number;
  max_num_batched_tokens: number;
  max_num_seqs: number;
  enable_prefix_caching: boolean;
  kv_cache_dtype: "auto" | "fp8";
  enable_chunked_prefill: boolean;
  tensor_parallel_size: number;
}

export type MetricKey =
  | "ttft_p95_ms"
  | "ttft_p50_ms"
  | "itl_p95_ms"
  | "throughput_tok_s"
  | "rps"
  | "gpu_util"
  | "kv_cache_usage"
  | "preemptions"
  | "queue_waiting"
  | "batch_running"
  | "error_rate"
  | "cost_per_mtok";

export interface MetricMeta {
  key: MetricKey;
  label: string;
  unit: "ms" | "tok/s" | "req/s" | "%" | "count" | "$";
  source: string; // e.g. "vllm:time_to_first_token_seconds"
  lowerIsBetter: boolean;
}

export interface SeriesPoint {
  t: number; // epoch ms
  v: number;
}

export type ChangeKind = "deployment" | "config" | "runtime" | "driver" | "model" | "traffic";

export interface Deployment {
  id: Id;
  workloadId: Id;
  at: ISODate;
  kind: ChangeKind;
  title: string;
  commit: string;
  containerDigest: string;
  engineVersion: string;
  configHash: string;
  author: string;
  diff: ConfigDiffEntry[];
  sourceExperimentId?: Id;
}

export interface ConfigDiffEntry {
  key: string;
  from: string;
  to: string;
}

export interface TokenPercentiles {
  p50: number;
  p90: number;
  p99: number;
}

export interface WorkloadFingerprint {
  hash: string;
  sampleSize: number;
  window: { start: ISODate; end: ISODate };
  inputTokens: TokenPercentiles;
  outputTokens: TokenPercentiles;
  concurrency: { p50: number; p99: number };
  rps: { mean: number; peak: number };
  burstiness: number; // coefficient of variation of inter-arrival times
  greedyShare: number; // share of requests with temperature 0
  longContextShare: number; // share of requests with > 16k input tokens
  prefixReuse: number; // estimated share of prompt tokens served by shared prefixes
  /** Joint input×output histogram, rows = input buckets, cols = output buckets, sums to 1. */
  joint: number[][];
}

export interface Capture {
  id: Id;
  workloadId: Id;
  startAt: ISODate;
  endAt: ISODate;
  requests: number;
  privacyMode: "metadata_only" | "synthetic_templates" | "encrypted_samples";
  coverage: number; // share of production traffic sampled
  productionVersion: string;
  fingerprint: WorkloadFingerprint;
}

export type TelemetryStatus = "healthy" | "partial" | "missing" | "stale";

export interface TelemetrySource {
  id: Id;
  workloadId: Id;
  type: "prometheus" | "vllm" | "dcgm" | "otel" | "deployments" | "cost" | "profiler";
  label: string;
  status: TelemetryStatus;
  coverage: number;
  lastSeen: ISODate;
  signals: string[];
  note?: string;
}

export type Severity = "sev1" | "sev2" | "sev3" | "info";

export interface Incident {
  id: Id;
  workloadId: Id;
  title: string;
  severity: Severity;
  status: "open" | "investigating" | "mitigated" | "resolved" | "dismissed";
  kind: "regression" | "slo_miss" | "traffic_shift" | "recertification" | "cost";
  detectedAt: ISODate;
  resolvedAt?: ISODate;
  metric: MetricKey;
  baseline: { value: number; window: string };
  observed: { value: number; window: string };
  correlatedChangeId?: Id;
  correlationConfidence?: number;
  investigationId?: Id;
  summary: string;
  resolution?: string;
  timeline: { at: ISODate; label: string; kind: "detect" | "agent" | "change" | "experiment" | "human" | "resolve" }[];
}

export type Layer = "queue" | "scheduler" | "prefill" | "decode" | "kernel" | "gpu_memory" | "network" | "workload";

export interface EvidenceRef {
  id: Id;
  kind: "metric" | "deployment" | "fingerprint" | "trace" | "experiment" | "knowledge";
  label: string;
  detail: string;
  source: string; // tool call id or metric source
}

export interface Hypothesis {
  id: Id;
  investigationId: Id;
  rank: number;
  claim: string;
  layer: Layer;
  confidence: number; // calibrated 0..1
  status: "active" | "confirmed" | "rejected" | "superseded";
  supporting: EvidenceRef[];
  disconfirming: EvidenceRef[];
  missing: string[];
  nextTest: string;
  expectedInformationGain: "high" | "medium" | "low";
  productionRisk: "none" | "low" | "medium" | "high";
}

export type InvestigationState =
  | "intake"
  | "coverage_check"
  | "workload_stability"
  | "layer_localization"
  | "hypothesis_ranking"
  | "evidence_acquisition"
  | "experiment_design"
  | "execution"
  | "verification"
  | "decision"
  | "production_observe"
  | "knowledge_writeback"
  | "closed";

export interface ToolCall {
  id: Id;
  at: ISODate;
  tool: string;
  args: Record<string, string | number | boolean | string[]>;
  durationMs: number;
  result: string;
  state: InvestigationState;
  approval: "not_required" | "approved" | "pending" | "denied";
}

export interface RecommendedExperiment {
  singleVariableChange: ConfigDiffEntry;
  baseline: string;
  candidate: string;
  workloadCaptureId: Id;
  successCriteria: string[];
  stopConditions: string[];
  rollback: string;
}

export interface Investigation {
  id: Id;
  workloadId: Id;
  incidentId?: Id;
  title: string;
  status: "running" | "awaiting_approval" | "completed";
  state: InvestigationState;
  agentVersion: string;
  openedAt: ISODate;
  problemStatement: string;
  coverageGaps: string[];
  workloadShiftAssessment: string;
  hypotheses: Hypothesis[];
  toolCalls: ToolCall[];
  recommended: RecommendedExperiment;
  conclusion?: string;
}

export interface RunMetrics {
  ttftP95Ms: number;
  ttftP50Ms: number;
  itlP95Ms: number;
  throughputTokS: number;
  errorRate: number; // 0..1
  costPerMTokUsd: number;
}

export interface Run {
  id: Id;
  experimentId: Id;
  arm: "baseline" | "candidate";
  repetition: number;
  order: number;
  seed: number;
  warmupRequests: number;
  requests: number;
  failedRequests: number;
  metrics: RunMetrics;
}

export type ExperimentStatus = "draft" | "awaiting_approval" | "queued" | "running" | "verifying" | "complete";

export type Decision = "winner" | "rejected" | "inconclusive" | "promising_unverified" | "pending";

export interface ArmSpec {
  label: string;
  config: EngineConfig;
  environment: EnvironmentFingerprint;
  captureId: Id;
  distributionHash: string;
  requestCount: number;
  warmupRequests: number;
  warmupPolicy: string;
  timingBoundary: string;
  errorPolicy: "include_as_timeout" | "excluded";
  /** Observed share of prompt tokens served from prefix cache during the replay. */
  prefixHitRate: number;
  outputCacheEnabled: boolean;
}

export interface CorrectnessResult {
  method: "greedy_exact_match" | "quality_eval" | "not_run";
  sampleSize: number;
  matchRate?: number; // 0..1 for exact match
  qualityDelta?: number; // eval score delta, negative = worse
  tolerance: number;
}

export interface Experiment {
  id: Id;
  workloadId: Id;
  investigationId?: Id;
  title: string;
  hypothesisId?: Id;
  objective: string;
  status: ExperimentStatus;
  createdAt: ISODate;
  completedAt?: ISODate;
  createdBy: string;
  approvedBy?: string;
  diff: ConfigDiffEntry[];
  baseline: ArmSpec;
  candidate: ArmSpec;
  runs: Run[];
  plannedRepetitions: number;
  runOrder: string;
  correctness: CorrectnessResult;
  productionPrefixReuse: number;
  artifactBundle: { hash: string; files: string[] } | null;
  notes: string[];
  limitations: string[];
}

export type GateStatus = "pass" | "fail" | "unknown";

export type GateId =
  | "workload_parity"
  | "environment_completeness"
  | "warmup_consistency"
  | "repeated_trials"
  | "timing_boundary"
  | "output_correctness"
  | "error_accounting"
  | "cache_integrity"
  | "artifact_bundle";

export interface GateResult {
  id: GateId;
  label: string;
  question: string;
  status: GateStatus;
  detail: string;
  blocking: boolean;
}

export interface Report {
  id: Id;
  experimentId: Id;
  workloadId: Id;
  title: string;
  status: "draft" | "published";
  shareScope: "internal" | "customer_link" | "public_link";
  methodologyVersion: string;
  createdAt: ISODate;
  author: string;
  audience: string;
  artifactHash: string;
}

export interface KnowledgeItem {
  id: Id;
  title: string;
  workload: string;
  fingerprintHash: string;
  bottleneck: Layer;
  intervention: string;
  outcome: "improved" | "no_effect" | "regressed" | "invalid";
  effect: string;
  caveats: string[];
  experimentId: Id;
  recordedAt: ISODate;
  /** Fingerprint of the workload where this was learned, used for similarity. */
  fingerprint: Pick<WorkloadFingerprint, "inputTokens" | "outputTokens" | "burstiness" | "longContextShare" | "greedyShare">;
}

export interface Member {
  id: Id;
  name: string;
  email: string;
  role: Role;
  lastActive: ISODate;
}

export interface AuditEvent {
  id: Id;
  at: ISODate;
  actor: string;
  actorKind: "human" | "agent" | "system";
  action: string;
  resource: string;
  approvalRef?: string;
}

export interface Integration {
  id: Id;
  name: string;
  category: "telemetry" | "deployments" | "alerts" | "ci";
  status: "connected" | "degraded" | "not_connected";
  detail: string;
}
