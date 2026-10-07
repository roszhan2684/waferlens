import type {
  AuditEvent,
  Endpoint,
  EngineConfig,
  EnvironmentFingerprint,
  HardwarePool,
  Integration,
  Member,
  Organization,
  Workload,
} from "../types";
import { ago, HOUR, MINUTE, DAY, T, iso } from "./clock";

export const ORG: Organization = {
  id: "org_meridian",
  name: "Meridian AI (demo tenant)",
  plan: "production",
  retention: { metricsDays: 30, tracesDays: 14, artifactsDays: 365, payloadSamplesDays: 0 },
};

export const WORKLOAD: Workload = {
  id: "wl_qwen_prod",
  orgId: ORG.id,
  name: "qwen-prod",
  model: "Qwen3-32B",
  modelRevision: "9f2c1ad",
  engine: "vLLM",
  environment: "production",
  slo: {
    ttftP95Ms: 700,
    itlP95Ms: 45,
    availability: 0.999,
    objective: "Hold p95 TTFT below 700 ms, then minimize cost per 1M output tokens.",
  },
  hardwarePoolId: "hp_h100_use2",
  endpointIds: ["ep_chat_use2"],
};

export const OTHER_WORKLOADS: Workload[] = [
  {
    id: "wl_qwen_staging",
    orgId: ORG.id,
    name: "qwen-staging",
    model: "Qwen3-32B",
    modelRevision: "9f2c1ad",
    engine: "vLLM",
    environment: "staging",
    slo: { ttftP95Ms: 900, itlP95Ms: 60, availability: 0.99, objective: "Mirror production config; gate releases." },
    hardwarePoolId: "hp_h100_stg",
    endpointIds: ["ep_chat_stg"],
  },
  {
    id: "wl_coder_batch",
    orgId: ORG.id,
    name: "coder-batch",
    model: "Llama-3.1-8B-Instruct",
    modelRevision: "0e9e39f",
    engine: "vLLM",
    environment: "production",
    slo: { ttftP95Ms: 4000, itlP95Ms: 80, availability: 0.995, objective: "Maximize throughput per GPU-hour." },
    hardwarePoolId: "hp_l40s",
    endpointIds: ["ep_batch"],
  },
];

export const ENDPOINTS: Endpoint[] = [
  { id: "ep_chat_use2", workloadId: "wl_qwen_prod", region: "us-east-2", provider: "Self-managed (EKS)", route: "/v1/chat/completions", replicas: 2 },
  { id: "ep_chat_stg", workloadId: "wl_qwen_staging", region: "us-east-2", provider: "Self-managed (EKS)", route: "/v1/chat/completions", replicas: 1 },
  { id: "ep_batch", workloadId: "wl_coder_batch", region: "us-west-2", provider: "GPU cloud (reserved)", route: "/v1/completions", replicas: 4 },
];

export const HARDWARE_POOLS: HardwarePool[] = [
  { id: "hp_h100_use2", vendor: "NVIDIA", accelerator: "H100 SXM5 80GB", count: 4, topology: "2 replicas × TP2 · NVLink 4", hourlyCostUsd: 9.96 },
  { id: "hp_h100_stg", vendor: "NVIDIA", accelerator: "H100 SXM5 80GB", count: 2, topology: "1 replica × TP2 · NVLink 4", hourlyCostUsd: 4.98 },
  { id: "hp_l40s", vendor: "NVIDIA", accelerator: "L40S 48GB", count: 4, topology: "4 replicas × TP1 · PCIe", hourlyCostUsd: 5.4 },
  { id: "hp_mi300x_eval", vendor: "AMD", accelerator: "MI300X 192GB", count: 8, topology: "Evaluation pool · not connected", hourlyCostUsd: 0 },
];

export const ENV_PROD_0110: EnvironmentFingerprint = {
  accelerator: "NVIDIA H100 SXM5 80GB",
  acceleratorCount: 4,
  topology: "2× TP2 · NVLink 4",
  driver: "560.35.03",
  cuda: "12.6",
  engine: "vLLM",
  engineVersion: "0.11.0",
  modelRevision: "Qwen3-32B@9f2c1ad",
  tokenizerRevision: "tokenizer@9f2c1ad",
  containerDigest: "sha256:4be1c07e9a2d",
  commit: "a41c9e2",
};

export const ENV_PROD_0111: EnvironmentFingerprint = {
  ...ENV_PROD_0110,
  engineVersion: "0.11.1",
  containerDigest: "sha256:91d3f5a0b7c4",
  commit: "c07b19d",
};

export const CONFIG_BASELINE: EngineConfig = {
  gpu_memory_utilization: 0.8,
  max_num_batched_tokens: 2048,
  max_num_seqs: 256,
  enable_prefix_caching: false,
  kv_cache_dtype: "auto",
  enable_chunked_prefill: true,
  tensor_parallel_size: 2,
};

export const CONFIG_TUNED: EngineConfig = { ...CONFIG_BASELINE, gpu_memory_utilization: 0.92 };

/** What the 0.11.1 chart actually rendered: the max_num_seqs flag was dropped. */
export const CONFIG_REGRESSED: EngineConfig = { ...CONFIG_TUNED, max_num_seqs: 128 };

export const MEMBERS: Member[] = [
  { id: "u_1", name: "Priya Raman", email: "priya@meridian.example", role: "owner", lastActive: ago(2 * DAY) },
  { id: "u_2", name: "Alex Chen", email: "alex@meridian.example", role: "admin", lastActive: ago(5 * HOUR) },
  { id: "u_3", name: "Sam Okafor", email: "sam@meridian.example", role: "engineer", lastActive: ago(12 * MINUTE) },
  { id: "u_4", name: "Riya Shah", email: "riya@meridian.example", role: "engineer", lastActive: ago(3 * HOUR) },
  { id: "u_5", name: "Jordan Lee", email: "jordan@meridian.example", role: "viewer", lastActive: ago(4 * DAY) },
  { id: "u_6", name: "Eval team (guest)", email: "perf-eval@customer.example", role: "customer_guest", lastActive: ago(26 * HOUR) },
];

export const CURRENT_USER = MEMBERS[2]!;

export const INTEGRATIONS: Integration[] = [
  { id: "int_prom", name: "Prometheus", category: "telemetry", status: "connected", detail: "Remote-write from 2 vLLM replicas · 15s scrape" },
  { id: "int_vllm", name: "vLLM metrics", category: "telemetry", status: "connected", detail: "/metrics on :8000 · 41 series allowlisted" },
  { id: "int_dcgm", name: "NVIDIA DCGM exporter", category: "telemetry", status: "degraded", detail: "replica-1 GPU 3 missing memory-bandwidth field since 09:12 UTC" },
  { id: "int_otel", name: "OpenTelemetry Collector", category: "telemetry", status: "connected", detail: "Gateway spans · queue/prefill/decode stage timing" },
  { id: "int_github", name: "GitHub", category: "deployments", status: "connected", detail: "meridian/inference-deploy · deployment webhooks" },
  { id: "int_argo", name: "Argo CD", category: "deployments", status: "connected", detail: "Sync events for qwen-prod, qwen-staging" },
  { id: "int_slack", name: "Slack", category: "alerts", status: "connected", detail: "#inference-perf · incidents and approvals" },
  { id: "int_pd", name: "PagerDuty", category: "alerts", status: "connected", detail: "Service: inference-qwen · SEV1/SEV2 only" },
  { id: "int_ci", name: "Performance CI", category: "ci", status: "not_connected", detail: "Block PRs that regress the replay suite" },
];

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: "ae_1209", at: iso(T.experiment108Started), actor: "Sam Okafor", actorKind: "human", action: "experiment.approve", resource: "EXP-108", approvalRef: "apr_5512" },
  { id: "ae_1208", at: iso(T.experiment108Started - 4 * MINUTE), actor: "perf-agent v0.9.2", actorKind: "agent", action: "experiment.propose", resource: "EXP-108" },
  { id: "ae_1207", at: iso(T.investigation034Opened), actor: "Regression Guard", actorKind: "system", action: "investigation.open", resource: "INV-034" },
  { id: "ae_1206", at: iso(T.incident212Detected), actor: "Regression Guard", actorKind: "system", action: "incident.open", resource: "INC-212" },
  { id: "ae_1205", at: iso(T.runtimeDeploy), actor: "argo-cd", actorKind: "system", action: "deployment.ingest", resource: "dep_7f3c" },
  { id: "ae_1204", at: iso(T.unrelatedDeploy), actor: "argo-cd", actorKind: "system", action: "deployment.ingest", resource: "dep_6b02" },
  { id: "ae_1203", at: iso(T.winnerPromoted + 22 * MINUTE), actor: "Alex Chen", actorKind: "human", action: "report.publish", resource: "RPT-014 (customer link)" },
  { id: "ae_1202", at: iso(T.winnerPromoted), actor: "Alex Chen", actorKind: "human", action: "candidate.promote", resource: "EXP-104 → dep_5a21", approvalRef: "apr_5498" },
  { id: "ae_1201", at: iso(T.experimentsCompleted), actor: "Benchmark Guardian", actorKind: "system", action: "verification.complete", resource: "EXP-103…106" },
  { id: "ae_1200", at: iso(T.experimentsStarted), actor: "Sam Okafor", actorKind: "human", action: "experiment.approve", resource: "EXP-103, EXP-104, EXP-105, EXP-106", approvalRef: "apr_5490" },
  { id: "ae_1199", at: iso(T.investigation031Opened), actor: "perf-agent v0.9.2", actorKind: "agent", action: "investigation.open", resource: "INV-031" },
  { id: "ae_1198", at: iso(T.incident207Detected), actor: "Regression Guard", actorKind: "system", action: "incident.open", resource: "INC-207" },
];
