"use client";

import Link from "next/link";
import { useState } from "react";
import { decide } from "@waferlens/benchmark";
import type { Experiment } from "@waferlens/shared";
import { formatDelta, formatTime } from "@waferlens/shared";
import { useDemo, useExperiment } from "@/lib/demo-store";
import { ConfigDiff, EnvironmentPanel, Panel } from "../console/parts";
import { ComparisonTable } from "../guardian/ComparisonTable";
import { GateChecklist } from "../guardian/GateChecklist";
import { AdversarialLab } from "../guardian/AdversarialLab";
import { RunDotPlot } from "../charts/RunDotPlot";
import { DecisionBadge } from "../ui/badges";
import { Icon } from "../ui/icons";
import { ExperimentStatusBadge } from "./LiveStatus";

const REPORT_FOR: Record<string, string> = { "EXP-104": "RPT-014", "EXP-108": "RPT-015" };

export function ExperimentDetail({ base, slo, quotaUsd }: { base: Experiment; slo: number; quotaUsd: number }) {
  const exp = useExperiment(base);
  const { approve, promote, promoted } = useDemo();
  const [copied, setCopied] = useState(false);
  const v = decide(exp, slo);
  const complete = exp.status === "complete";
  const isPromoted = exp.id === "EXP-104" || promoted.includes(exp.id);
  const reproduce = `waferlens replay run \\\n  --capture ${exp.baseline.captureId} \\\n  --baseline ${exp.id}/config/baseline.yaml \\\n  --candidate ${exp.id}/config/candidate.yaml \\\n  --reps ${exp.plannedRepetitions} --order interleaved --warmup ${exp.baseline.warmupRequests} \\\n  --verify-bundle ${exp.artifactBundle?.hash.slice(0, 23) ?? "<pending>"}`;

  return (
    <>
      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        <ExperimentStatusBadge status={exp.status} />
        {complete && <DecisionBadge decision={v.decision} />}
        <span className="label">
          created {formatTime(exp.createdAt)} by {exp.createdBy}
          {exp.approvedBy && ` · approved by ${exp.approvedBy}`}
        </span>
      </div>

      {exp.status === "awaiting_approval" && (
        <div className="banner banner-warn" data-tour="approve" style={{ marginBottom: 12, alignItems: "center" }}>
          <Icon name="lock" size={16} style={{ color: "var(--warn)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <strong>Approval required.</strong> run_replay uses sandbox compute: {exp.plannedRepetitions * 2} runs × {exp.baseline.requestCount.toLocaleString("en-US")} requests on replay-sandbox (4× H100), estimated ${quotaUsd.toFixed(2)} of quota. No production traffic is touched.
          </div>
          <button className="btn btn-sage" onClick={() => approve(exp.id)}>
            <Icon name="check" size={13} /> Approve and run
          </button>
        </div>
      )}

      {(exp.status === "running" || exp.status === "queued" || exp.status === "verifying") && (
        <div className="banner banner-sage" data-tour="approve" style={{ marginBottom: 12 }} role="status" aria-live="polite">
          <span className="dot pulse" style={{ color: "var(--sage)", marginTop: 6 }} />
          <div style={{ flex: 1 }}>
            <strong>{exp.status === "verifying" ? "Running Benchmark Guardian…" : exp.status === "queued" ? "Queued on replay-sandbox…" : `Replaying ${exp.baseline.captureId}…`}</strong>{" "}
            {exp.runs.length}/{exp.plannedRepetitions * 2} runs complete. The decision stays <em>pending</em> until every repetition finishes and all gates are evaluated.
            <div className="progress" style={{ marginTop: 8 }}>
              <span style={{ width: `${(exp.runs.length / (exp.plannedRepetitions * 2)) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {complete && (
        <div className={`banner ${v.decision === "winner" ? "banner-sage" : v.decision === "inconclusive" ? "" : "banner-bad"}`} data-tour="approve" style={{ marginBottom: 12 }}>
          <Icon name={v.decision === "winner" ? "shield" : "alert"} size={16} style={{ marginTop: 2, flex: "none" }} />
          <div style={{ flex: 1 }}>
            <strong>{v.label}.</strong> {v.reasons.join(" ")}
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            {v.decision === "winner" &&
              (isPromoted ? (
                <span className="badge badge-good">
                  <Icon name="check" size={11} /> {exp.id === "EXP-104" ? "Promoted · dep_5a21" : "Promotion requested"}
                </span>
              ) : (
                <button className="btn btn-sage btn-sm" onClick={() => promote(exp.id)}>
                  Request promotion
                </button>
              ))}
            {REPORT_FOR[exp.id] && (
              <Link href={`/console/reports/${REPORT_FOR[exp.id]}`} className="btn btn-sm">
                <Icon name="reports" size={12} /> Report
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid cols-2">
        <Panel title="Configuration diff" actions={<span className="label">one variable</span>}>
          <ConfigDiff diff={exp.diff} />
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Objective: {exp.objective}
          </p>
        </Panel>
        <Panel title="Method">
          <dl className="kv">
            <dt>Workload</dt>
            <dd>
              <span className="mono">{exp.baseline.captureId}</span> · {exp.baseline.requestCount.toLocaleString("en-US")} requests per run · {exp.baseline.distributionHash}
            </dd>
            <dt>Run order</dt>
            <dd>{exp.runOrder}</dd>
            <dt>Warmup</dt>
            <dd>{exp.baseline.warmupPolicy}</dd>
            <dt>Timing</dt>
            <dd>{exp.baseline.timingBoundary}</dd>
            <dt>Errors</dt>
            <dd>Counted as timeouts in latency statistics</dd>
            <dt>Correctness</dt>
            <dd>
              {exp.correctness.method === "not_run" ? (
                <span style={{ color: "var(--warn)" }}>Not run</span>
              ) : (
                `${exp.correctness.method.replace(/_/g, " ")} · n = ${exp.correctness.sampleSize.toLocaleString("en-US")}`
              )}
            </dd>
          </dl>
        </Panel>
      </div>

      <h2 className="section-title">Results</h2>
      {v.comparison ? (
        <div className="grid cols-2" style={{ alignItems: "start" }}>
          <Panel title="Baseline vs candidate" pad={false}>
            <ComparisonTable comparison={v.comparison} />
          </Panel>
          <Panel title="p95 TTFT per repetition" foot={<>Each dot is one run. Vertical tick = arm mean. {v.comparison && `Mean change ${formatDelta(v.comparison.ttftP95.relDelta)}.`}</>}>
            <RunDotPlot runs={exp.runs} slo={slo} planned={exp.plannedRepetitions} />
          </Panel>
        </div>
      ) : (
        <div className="state-card">
          <Icon name="experiments" size={20} style={{ color: "var(--sage)" }} />
          <h2>No runs yet</h2>
          <p>Results appear here as each interleaved repetition completes. Nothing is reported from a partial run set.</p>
        </div>
      )}

      <h2 className="section-title">Benchmark Guardian</h2>
      <Panel tour="gates" title="Mandatory gates" actions={<span className="label">{complete ? "final" : "provisional · run incomplete"}</span>}>
        <GateChecklist gates={v.gates} />
      </Panel>

      {complete && v.comparison && (
        <div data-tour="adversarial">
          <h2 className="section-title" id="adversarial">
            Adversarial mode <span className="label">try to fool the Guardian with this experiment</span>
          </h2>
          <AdversarialLab experiment={exp} slo={slo} />
        </div>
      )}

      <h2 className="section-title">Environment &amp; artifacts</h2>
      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <Panel title="Environment fingerprint" actions={<span className="label">identical across arms</span>}>
          <EnvironmentPanel env={exp.candidate.environment} compare={exp.baseline.environment} />
        </Panel>
        <div className="stack">
          <Panel title="Artifact bundle">
            {exp.artifactBundle ? (
              <>
                <p className="mono" style={{ fontSize: 11, overflowWrap: "anywhere" }}>
                  {exp.artifactBundle.hash}
                </p>
                <ul className="mono muted" style={{ fontSize: 11, margin: "10px 0 0", paddingLeft: 16, columns: 2 }}>
                  {exp.artifactBundle.files.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted">Written when the experiment completes.</p>
            )}
            <div className="row-between" style={{ marginTop: 14 }}>
              <span className="label">Reproduce</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(reproduce).catch(() => undefined);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Icon name="copy" size={12} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="code" style={{ marginTop: 6 }}>
              {reproduce}
            </pre>
          </Panel>
          <Panel title="Notes &amp; limitations">
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6, fontSize: 13 }}>
              {exp.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <div className="label" style={{ margin: "14px 0 6px" }}>
              Limitations
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6, fontSize: 13, color: "var(--warn)" }}>
              {exp.limitations.map((n) => (
                <li key={n}>
                  <span className="text-2">{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
