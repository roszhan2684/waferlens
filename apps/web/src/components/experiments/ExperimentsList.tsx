"use client";

import Link from "next/link";
import { useState } from "react";
import { decide } from "@waferlens/benchmark";
import type { Experiment } from "@waferlens/shared";
import { formatDelta } from "@waferlens/shared";
import { useExperiment } from "@/lib/demo-store";
import { DecisionBadge } from "../ui/badges";
import { ExperimentStatusBadge } from "./LiveStatus";

type Filter = "all" | "winner" | "not_winner" | "active";

function Row({ base, slo, filter }: { base: Experiment; slo: number; filter: Filter }) {
  const exp = useExperiment(base);
  const v = decide(exp, slo);
  const active = exp.status !== "complete";
  if (filter === "winner" && v.decision !== "winner") return null;
  if (filter === "not_winner" && (v.decision === "winner" || active)) return null;
  if (filter === "active" && !active) return null;
  const d = v.comparison?.ttftP95;
  return (
    <Link href={`/console/experiments/${exp.id}`} className="exp-card">
      <span className="mono" style={{ fontSize: 13 }}>
        {exp.id}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>{exp.title}</div>
        <div className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>
          {exp.diff.map((x) => `${x.key}: ${x.from} → ${x.to}`).join(" · ")}
        </div>
      </div>
      <div className="hide-md">
        <div className="label" style={{ fontSize: 10 }}>
          p95 TTFT · 95% CI
        </div>
        {d ? (
          <div className="num" style={{ fontSize: 13 }}>
            <strong>{formatDelta(d.relDelta)}</strong>{" "}
            <span className="muted">
              [{formatDelta(d.ci[0])}, {formatDelta(d.ci[1])}]
            </span>
          </div>
        ) : (
          <span className="muted">—</span>
        )}
      </div>
      <div className="hide-md">
        <div className="gates-meter" aria-label={`${v.summary.pass} of ${v.summary.total} gates pass`}>
          {v.gates.map((g) => (
            <span key={g.id} data-status={exp.status === "complete" ? g.status : "pending"} />
          ))}
        </div>
        <div className="label" style={{ fontSize: 10, marginTop: 4 }}>
          {exp.baseline.captureId} · {exp.runs.length}/{exp.plannedRepetitions * 2} runs
        </div>
      </div>
      <div style={{ justifySelf: "end" }}>{exp.status === "complete" ? <DecisionBadge decision={v.decision} /> : <ExperimentStatusBadge status={exp.status} />}</div>
    </Link>
  );
}

export function ExperimentsList({ experiments, slo }: { experiments: Experiment[]; slo: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  return (
    <div className="panel" data-tour="exp-list">
      <div className="panel-head">
        <div className="seg" role="group" aria-label="Filter experiments">
          {(
            [
              ["all", "All"],
              ["winner", "Winners"],
              ["not_winner", "Rejected · blocked · inconclusive"],
              ["active", "Active"],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="label">Failed experiments are kept, reported and searchable</span>
      </div>
      <div>
        {experiments.map((e) => (
          <Row key={e.id} base={e} slo={slo} filter={filter} />
        ))}
      </div>
    </div>
  );
}
