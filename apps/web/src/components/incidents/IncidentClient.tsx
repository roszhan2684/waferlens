"use client";

import Link from "next/link";
import { decide } from "@waferlens/benchmark";
import type { Experiment } from "@waferlens/shared";
import { formatDelta } from "@waferlens/shared";
import { useDemo, useExperiment } from "@/lib/demo-store";
import { TimeSeriesChart, type ChartMarker } from "../charts/TimeSeriesChart";
import { Icon } from "../ui/icons";
import { FORMATS } from "../console/OverviewChart";

/** Causal status follows the experiment: correlation until EXP-108 completes. */
export function CauseBanner({ base, slo, confidence }: { base: Experiment; slo: number; confidence: number }) {
  const exp = useExperiment(base);
  const v = decide(exp, slo);
  if (exp.status === "complete" && v.decision === "winner") {
    return (
      <div className="banner banner-sage" role="status" data-tour="cause">
        <Icon name="shield" size={16} style={{ marginTop: 2, flex: "none", color: "var(--sage)" }} />
        <div>
          <strong>Cause confirmed by controlled experiment.</strong> {exp.id} restored max_num_seqs = 256 on the same 0.11.1 image: p95 TTFT {formatDelta(v.comparison!.ttftP95.relDelta)} with all 9 gates passing. The runtime version is not the cause; the dropped chart flag is. Fix: pin <code className="inline">--max-num-seqs</code> in values.yaml and add the rendered config hash to the deploy check.
        </div>
      </div>
    );
  }
  return (
    <div className="banner banner-warn" role="status" data-tour="cause">
      <Icon name="alert" size={16} style={{ marginTop: 2, flex: "none", color: "var(--warn)" }} />
      <div>
        <strong>Correlated, not proven.</strong> dep_7f3c is the only change with a step change in p95 TTFT (correlation confidence {confidence.toFixed(2)}). Root cause stays a hypothesis until {exp.id} completes: {exp.runs.length}/{exp.plannedRepetitions * 2} runs.{" "}
        <Link href={`/console/experiments/${exp.id}`} className="sage">
          Watch it run →
        </Link>
      </div>
    </div>
  );
}

export function RollbackPanel({ previous, eta }: { previous: string; eta: string }) {
  const { rollbackRequested, requestRollback } = useDemo();
  return (
    <div className="stack" style={{ gap: 10 }}>
      <dl className="kv">
        <dt>Previous image</dt>
        <dd className="mono" style={{ fontSize: 12 }}>
          {previous}
        </dd>
        <dt>Method</dt>
        <dd>Argo CD rollback to chart 2.3.2</dd>
        <dt>ETA</dt>
        <dd>{eta}</dd>
        <dt>Policy</dt>
        <dd>Production action · named approver required</dd>
      </dl>
      {rollbackRequested ? (
        <div className="banner banner-sage">
          <Icon name="clock" size={14} style={{ marginTop: 2, flex: "none" }} />
          <div>
            Rollback request <span className="mono">apr_5521</span> sent to #inference-perf. Waiting for an Admin to approve. WaferLens does not roll back on its own.
          </div>
        </div>
      ) : (
        <button className="btn" onClick={requestRollback}>
          <Icon name="lock" size={12} /> Request rollback approval
        </button>
      )}
    </div>
  );
}

export function IncidentChart({ points, markers, slo, band, format = "ms", title }: { points: { t: number; v: number }[]; markers: ChartMarker[]; slo?: number; band?: { from: number; to: number; label: string }; format?: keyof typeof FORMATS; title: string }) {
  return (
    <TimeSeriesChart
      title={title}
      series={[{ id: "m", label: title, color: "var(--s-candidate)", points, area: true }]}
      format={FORMATS[format]}
      slo={slo ? { value: slo, label: `SLO ${slo} ms` } : undefined}
      markers={markers}
      band={band}
      height={220}
      yMin={0}
      tableEvery={6}
    />
  );
}
