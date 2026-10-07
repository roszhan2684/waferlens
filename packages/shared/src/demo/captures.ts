import { computeFingerprint, synthesizeRequests, type TrafficProfile } from "../fingerprint";
import type { Capture, WorkloadFingerprint } from "../types";
import { DAY, HOUR, NOW, T, ago, iso } from "./clock";

export const PROD_PROFILE: TrafficProfile = {
  inputMedian: 1180,
  inputSigma: 1.05,
  outputMedian: 210,
  outputSigma: 0.8,
  longContextMix: 0.022,
  rpsMean: 38,
  burstiness: 1.6,
  greedyShare: 0.34,
  prefixReuse: 0.09,
};

/** Replay built from synthetic prompt templates: token shapes match, but templates repeat prefixes. */
export const REPLAY_TEMPLATE_PROFILE: TrafficProfile = { ...PROD_PROFILE, longContextMix: 0.008, prefixReuse: 0.71 };

/** Replay rebuilt with unique-prefix synthesis (used by EXP-107). */
export const REPLAY_UNIQUE_PROFILE: TrafficProfile = { ...PROD_PROFILE, longContextMix: 0.018, prefixReuse: 0.1 };

/** Batch-summarization backfill that triggered INC-198 (traffic shift, not a regression). */
export const SHIFTED_PROFILE: TrafficProfile = { ...PROD_PROFILE, inputMedian: 2600, longContextMix: 0.07, outputMedian: 150, burstiness: 2.4, greedyShare: 0.81 };

const memo = new Map<string, WorkloadFingerprint>();
function fp(key: string, profile: TrafficProfile, n: number, seed: number, start: number, end: number): WorkloadFingerprint {
  const hit = memo.get(key);
  if (hit) return hit;
  const f = computeFingerprint(synthesizeRequests(profile, n, seed), { start: iso(start), end: iso(end) });
  memo.set(key, f);
  return f;
}

export const fingerprints = {
  /** Production, last 24 hours. */
  prodNow: () => fp("prodNow", PROD_PROFILE, 20000, 11, NOW - DAY, NOW),
  /** Production, the 24 hours before the runtime deploy (used by INV-034). */
  prodBeforeDeploy: () => fp("prodBefore", PROD_PROFILE, 20000, 12, T.runtimeDeploy - DAY, T.runtimeDeploy),
  /** Production, same window last week. */
  prodLastWeek: () => fp("prodLastWeek", PROD_PROFILE, 20000, 13, NOW - 8 * DAY, NOW - 7 * DAY),
  /** Source window of cap_0918. */
  capture0918Source: () => fp("cap0918src", PROD_PROFILE, 50000, 14, T.incident207Detected - 48 * HOUR, T.incident207Detected),
  replayTemplates: () => fp("replayTemplates", REPLAY_TEMPLATE_PROFILE, 50000, 15, T.experimentsStarted, T.experimentsCompleted),
  replayUnique: () => fp("replayUnique", REPLAY_UNIQUE_PROFILE, 50000, 16, T.experimentsStarted, T.experimentsCompleted),
  shifted: () => fp("shifted", SHIFTED_PROFILE, 20000, 17, NOW - 5 * DAY - 6 * HOUR, NOW - 5 * DAY),
};

export function getCaptures(): Capture[] {
  return [
    {
      id: "cap_0918",
      workloadId: "wl_qwen_prod",
      startAt: iso(T.incident207Detected - 48 * HOUR),
      endAt: iso(T.incident207Detected),
      requests: 50000,
      privacyMode: "synthetic_templates",
      coverage: 0.062,
      productionVersion: "dep_3e10 · vllm 0.11.0",
      fingerprint: fingerprints.replayTemplates(),
    },
    {
      id: "cap_0918u",
      workloadId: "wl_qwen_prod",
      startAt: iso(T.incident207Detected - 48 * HOUR),
      endAt: iso(T.incident207Detected),
      requests: 50000,
      privacyMode: "metadata_only",
      coverage: 0.062,
      productionVersion: "dep_3e10 · vllm 0.11.0",
      fingerprint: fingerprints.replayUnique(),
    },
    {
      id: "cap_0921",
      workloadId: "wl_qwen_prod",
      startAt: ago(DAY),
      endAt: ago(0),
      requests: 20000,
      privacyMode: "metadata_only",
      coverage: 0.024,
      productionVersion: "dep_7f3c · vllm 0.11.1",
      fingerprint: fingerprints.prodNow(),
    },
  ];
}

export interface ReplayJob {
  id: string;
  captureId: string;
  experimentId: string;
  mode: "seeded" | "stress";
  target: string;
  arrivalScale: number;
  status: "complete" | "running" | "queued" | "awaiting_approval";
  requests: number;
  seed: number;
  startedAt?: string;
  durationMin?: number;
  quotaCostUsd: number;
}

export const REPLAY_JOBS: ReplayJob[] = [
  { id: "rj_4418", captureId: "cap_0921", experimentId: "EXP-108", mode: "seeded", target: "replay-sandbox · 4× H100", arrivalScale: 1, status: "running", requests: 20000, seed: 8108, startedAt: iso(T.experiment108Started), quotaCostUsd: 14.9 },
  { id: "rj_4417", captureId: "cap_0918u", experimentId: "EXP-107", mode: "seeded", target: "replay-sandbox · 4× H100", arrivalScale: 1, status: "awaiting_approval", requests: 50000, seed: 8107, quotaCostUsd: 22.4 },
  { id: "rj_4406", captureId: "cap_0918", experimentId: "EXP-106", mode: "seeded", target: "replay-sandbox · 4× H100", arrivalScale: 1, status: "complete", requests: 50000, seed: 8106, startedAt: iso(T.experimentsStarted + 3 * HOUR), durationMin: 61, quotaCostUsd: 20.2 },
  { id: "rj_4405", captureId: "cap_0918", experimentId: "EXP-105", mode: "seeded", target: "replay-sandbox · 4× H100", arrivalScale: 1, status: "complete", requests: 50000, seed: 8105, startedAt: iso(T.experimentsStarted + 2 * HOUR), durationMin: 58, quotaCostUsd: 19.3 },
  { id: "rj_4404", captureId: "cap_0918", experimentId: "EXP-104", mode: "seeded", target: "replay-sandbox · 4× H100", arrivalScale: 1, status: "complete", requests: 50000, seed: 8104, startedAt: iso(T.experimentsStarted + HOUR), durationMin: 57, quotaCostUsd: 18.9 },
  { id: "rj_4403", captureId: "cap_0918", experimentId: "EXP-103", mode: "seeded", target: "replay-sandbox · 4× H100", arrivalScale: 1, status: "complete", requests: 50000, seed: 8103, startedAt: iso(T.experimentsStarted), durationMin: 59, quotaCostUsd: 19.6 },
  { id: "rj_4399", captureId: "cap_0918", experimentId: "—", mode: "stress", target: "replay-sandbox · 4× H100", arrivalScale: 1.5, status: "complete", requests: 50000, seed: 8099, startedAt: iso(T.experimentsStarted - 2 * HOUR), durationMin: 44, quotaCostUsd: 14.1 },
];

export const REPLAY_QUOTA = { monthlyRequests: 2_000_000, usedRequests: 1_184_000, monthlyBudgetUsd: 1500, usedUsd: 612.4 };
