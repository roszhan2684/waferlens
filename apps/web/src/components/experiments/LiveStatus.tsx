"use client";

import Link from "next/link";
import { decide } from "@waferlens/benchmark";
import type { Experiment } from "@waferlens/shared";
import { formatDelta } from "@waferlens/shared";
import { useDemo, useExperiment } from "@/lib/demo-store";
import { DecisionBadge, LiveBadge } from "../ui/badges";
import { Icon } from "../ui/icons";

const STATUS_TEXT: Record<Experiment["status"], string> = {
  draft: "Draft",
  awaiting_approval: "Awaiting approval",
  queued: "Queued",
  running: "Running",
  verifying: "Verifying",
  complete: "Complete",
};

export function ExperimentStatusBadge({ status }: { status: Experiment["status"] }) {
  if (status === "running" || status === "verifying" || status === "queued") return <LiveBadge label={STATUS_TEXT[status].toUpperCase()} />;
  if (status === "awaiting_approval")
    return (
      <span className="badge badge-warn">
        <Icon name="lock" size={11} /> AWAITING APPROVAL
      </span>
    );
  return <span className="badge">{STATUS_TEXT[status].toUpperCase()}</span>;
}

/** Live progress + Guardian decision for an experiment, following the demo simulation. */
export function LiveStatus({ base, slo, showLink = true, approve = false }: { base: Experiment; slo: number; showLink?: boolean; approve?: boolean }) {
  const exp = useExperiment(base);
  const { approve: doApprove } = useDemo();
  const v = decide(exp, slo);
  const total = exp.plannedRepetitions * 2;
  const done = exp.runs.length;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row-between wrap">
        <div className="row" style={{ gap: 8 }}>
          {showLink ? (
            <Link href={`/console/experiments/${exp.id}`} className="mono sage">
              {exp.id}
            </Link>
          ) : (
            <span className="mono">{exp.id}</span>
          )}
          <ExperimentStatusBadge status={exp.status} />
        </div>
        {exp.status === "complete" && <DecisionBadge decision={v.decision} />}
      </div>
      <div>
        <div className="row-between label" style={{ fontSize: 10, marginBottom: 6 }}>
          <span>
            {done}/{total} runs · interleaved
          </span>
          {v.comparison && <span className="num">p95 TTFT {formatDelta(v.comparison.ttftP95.relDelta)}</span>}
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${exp.id} progress`}>
          <span style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      {exp.status === "complete" && <p className="text-2" style={{ fontSize: 12 }}>{v.reasons[0]}</p>}
      {exp.status === "awaiting_approval" && approve && (
        <button className="btn btn-sage" onClick={() => doApprove(exp.id)}>
          <Icon name="check" size={13} /> Approve replay ({exp.plannedRepetitions * 2} runs)
        </button>
      )}
    </div>
  );
}
