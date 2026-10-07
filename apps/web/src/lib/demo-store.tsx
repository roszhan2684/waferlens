"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SIMULATED_RUNS_107, SIMULATED_RUNS_108, type Experiment, type ExperimentStatus, type Run } from "@waferlens/shared";

/**
 * Client-side demo state. There is no backend: approvals, live replay progress and
 * the page-state switcher all live here. Simulated runs use the same deterministic
 * generator as the seed data, so results are identical on every play-through.
 */

export type ViewState = "live" | "loading" | "empty" | "partial" | "degraded" | "error";

export const VIEW_STATES: { id: ViewState; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "partial", label: "Partial telemetry" },
  { id: "degraded", label: "Degraded" },
  { id: "error", label: "Error" },
];

interface SimState {
  status: ExperimentStatus;
  runs: Run[];
  approvedBy?: string;
  completedAt?: string;
  bundle?: { hash: string; files: string[] } | null;
}

interface Store {
  view: ViewState;
  setView: (v: ViewState) => void;
  sims: Record<string, SimState>;
  approve: (id: string) => void;
  promoted: string[];
  promote: (id: string) => void;
  rollbackRequested: boolean;
  requestRollback: () => void;
  liveUpdates: boolean;
  setLiveUpdates: (v: boolean) => void;
  reset: () => void;
  tourOpen: boolean;
  setTourOpen: (v: boolean) => void;
  tourStep: number;
  setTourStep: (i: number) => void;
}

const Ctx = createContext<Store | null>(null);

const BUNDLE_FILES = ["config/baseline.yaml", "config/candidate.yaml", "environment.json", "capture/manifest.json", "runs/latencies.parquet", "runs/order.csv", "seeds.json", "correctness/report.json", "guardian/gates.json"];

const PLANNED: Record<string, () => Run[]> = { "EXP-107": SIMULATED_RUNS_107, "EXP-108": SIMULATED_RUNS_108 };
const BUNDLE_HASH: Record<string, string> = {
  "EXP-107": "sha256:3f90a1c7e5b2d8f4a6c0e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1",
  "EXP-108": "sha256:b2d4f6a8c0e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3",
};

function initialSims(): Record<string, SimState> {
  return {
    "EXP-107": { status: "awaiting_approval", runs: [] },
    "EXP-108": { status: "running", runs: SIMULATED_RUNS_108().slice(0, 6), approvedBy: "Sam Okafor" },
  };
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ViewState>("live");
  const [sims, setSims] = useState<Record<string, SimState>>(initialSims);
  const [promoted, setPromoted] = useState<string[]>([]);
  const [rollbackRequested, setRollback] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const timers = useRef<number[]>([]);

  // Advance every running simulation by one run per tick.
  useEffect(() => {
    if (!liveUpdates) return;
    const id = window.setInterval(() => {
      setSims((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [expId, s] of Object.entries(prev)) {
          if (s.status !== "running") continue;
          const planned = PLANNED[expId]?.() ?? [];
          if (s.runs.length < planned.length) {
            next[expId] = { ...s, runs: planned.slice(0, s.runs.length + 1) };
            changed = true;
          } else {
            next[expId] = { ...s, status: "verifying" };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, [liveUpdates]);

  // Verification finishes a moment after the last run; kept out of state updaters.
  const verifying = Object.entries(sims)
    .filter(([, s]) => s.status === "verifying")
    .map(([id]) => id)
    .join(",");
  useEffect(() => {
    if (!verifying) return;
    const t = window.setTimeout(() => {
      setSims((p) => {
        const next = { ...p };
        for (const id of verifying.split(",")) {
          if (next[id]?.status === "verifying") next[id] = { ...next[id]!, status: "complete", completedAt: new Date().toISOString(), bundle: { hash: BUNDLE_HASH[id] ?? "sha256:pending", files: BUNDLE_FILES } };
        }
        return next;
      });
    }, 1800);
    return () => window.clearTimeout(t);
  }, [verifying]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const approve = useCallback((id: string) => {
    setSims((p) => ({ ...p, [id]: { ...(p[id] ?? { runs: [] }), status: "queued", approvedBy: "Sam Okafor" } }));
    const t = window.setTimeout(() => setSims((p) => ({ ...p, [id]: { ...p[id]!, status: "running" } })), 1200);
    timers.current.push(t);
  }, []);

  const value = useMemo<Store>(
    () => ({
      view,
      setView,
      sims,
      approve,
      promoted,
      promote: (id) => setPromoted((p) => (p.includes(id) ? p : [...p, id])),
      rollbackRequested,
      requestRollback: () => setRollback(true),
      liveUpdates,
      setLiveUpdates,
      reset: () => {
        setSims(initialSims());
        setPromoted([]);
        setRollback(false);
        setView("live");
      },
      tourOpen,
      setTourOpen,
      tourStep,
      setTourStep,
    }),
    [view, sims, approve, promoted, rollbackRequested, liveUpdates, tourOpen, tourStep],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useDemo must be used inside <DemoProvider>");
  return s;
}

/** Merge the seeded experiment with any live simulation state. */
export function useExperiment(base: Experiment): Experiment {
  const { sims } = useDemo();
  const sim = sims[base.id];
  return useMemo(() => {
    if (!sim) return base;
    return {
      ...base,
      status: sim.status,
      runs: sim.runs,
      approvedBy: sim.approvedBy ?? base.approvedBy,
      completedAt: sim.completedAt ?? base.completedAt,
      artifactBundle: sim.bundle !== undefined ? sim.bundle : base.artifactBundle,
    };
  }, [base, sim]);
}
