import type { Phase } from "./telemetry";

export interface SubSegment {
  label: string;
  share: number; // of the parent stage, sums to 1
  source: string;
}

export interface Stage {
  id: "network" | "gateway" | "queue" | "scheduler" | "prefill" | "decode";
  label: string;
  ms: number;
  layer: string;
  deep: SubSegment[];
  note?: string;
}

const PROFILE_NOTE = "Kernel split from the last Nsight capture (9 days old); profiler not currently attached.";

const network = (ms: number): Stage => ({
  id: "network",
  label: "Network",
  ms,
  layer: "network",
  deep: [
    { label: "Client RTT", share: 0.36, source: "otel span client.rtt" },
    { label: "TLS", share: 0.21, source: "otel span tls" },
    { label: "Load balancer", share: 0.43, source: "otel span alb" },
  ],
});

const gateway = (ms: number): Stage => ({
  id: "gateway",
  label: "Gateway",
  ms,
  layer: "network",
  deep: [
    { label: "Auth", share: 0.22, source: "otel span gw.auth" },
    { label: "Route", share: 0.45, source: "otel span gw.route" },
    { label: "Tokenize", share: 0.33, source: "otel span gw.tokenize" },
  ],
});

const prefill = (ms: number): Stage => ({
  id: "prefill",
  label: "Prefill",
  ms,
  layer: "prefill",
  note: PROFILE_NOTE,
  deep: [
    { label: "Attention", share: 0.46, source: "nsight: flash_fwd_*" },
    { label: "GEMM", share: 0.38, source: "nsight: sm90_xmma_gemm_*" },
    { label: "All-reduce (TP2)", share: 0.09, source: "nsight: ncclAllReduce" },
    { label: "Other", share: 0.07, source: "nsight: rest" },
  ],
});

const decode = (ms: number): Stage => ({
  id: "decode",
  label: "First decode",
  ms,
  layer: "decode",
  note: PROFILE_NOTE,
  deep: [
    { label: "GEMM", share: 0.44, source: "nsight: sm90_xmma_gemm_*" },
    { label: "Attention", share: 0.31, source: "nsight: paged_attention_*" },
    { label: "All-reduce", share: 0.15, source: "nsight: ncclAllReduce" },
    { label: "Sampling", share: 0.04, source: "nsight: sampler" },
    { label: "Other", share: 0.06, source: "nsight: rest" },
  ],
});

/**
 * Mean stage durations for requests in the p95 TTFT bucket, from 5% head-sampled
 * OpenTelemetry spans. Stage p95s would not add up; this decomposition does.
 */
export const TRACE_STAGES: Record<Phase, Stage[]> = {
  baseline: [
    network(14),
    gateway(9),
    {
      id: "queue",
      label: "Queue",
      ms: 468,
      layer: "queue",
      deep: [
        { label: "KV blocks unavailable", share: 0.52, source: "vllm scheduler: waiting reason" },
        { label: "Preempted → recompute", share: 0.31, source: "vllm:num_preemptions_total" },
        { label: "FIFO wait", share: 0.17, source: "vllm scheduler: waiting reason" },
      ],
    },
    {
      id: "scheduler",
      label: "Scheduler",
      ms: 22,
      layer: "scheduler",
      deep: [
        { label: "Recompute bookkeeping", share: 0.64, source: "vllm step profile" },
        { label: "Block alloc", share: 0.23, source: "vllm step profile" },
        { label: "Step overhead", share: 0.13, source: "vllm step profile" },
      ],
    },
    prefill(402),
    decode(66),
  ],
  tuned: [
    network(14),
    gateway(9),
    {
      id: "queue",
      label: "Queue",
      ms: 171,
      layer: "queue",
      deep: [
        { label: "FIFO wait", share: 0.81, source: "vllm scheduler: waiting reason" },
        { label: "KV blocks unavailable", share: 0.14, source: "vllm scheduler: waiting reason" },
        { label: "Preempted → recompute", share: 0.05, source: "vllm:num_preemptions_total" },
      ],
    },
    {
      id: "scheduler",
      label: "Scheduler",
      ms: 8,
      layer: "scheduler",
      deep: [
        { label: "Block alloc", share: 0.55, source: "vllm step profile" },
        { label: "Step overhead", share: 0.45, source: "vllm step profile" },
      ],
    },
    prefill(390),
    decode(56),
  ],
  regressed: [
    network(14),
    gateway(9),
    {
      id: "queue",
      label: "Queue",
      ms: 418,
      layer: "queue",
      deep: [
        { label: "max_num_seqs cap", share: 0.74, source: "vllm scheduler: waiting reason" },
        { label: "FIFO wait", share: 0.26, source: "vllm scheduler: waiting reason" },
      ],
    },
    {
      id: "scheduler",
      label: "Scheduler",
      ms: 6,
      layer: "scheduler",
      deep: [
        { label: "Block alloc", share: 0.5, source: "vllm step profile" },
        { label: "Step overhead", share: 0.5, source: "vllm step profile" },
      ],
    },
    prefill(388),
    decode(54),
  ],
};

export const stageTotal = (stages: Stage[]) => stages.reduce((a, s) => a + s.ms, 0);
