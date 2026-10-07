"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { decide, GATE_ORDER } from "@waferlens/benchmark";
import type { Decision, Experiment, Report } from "@waferlens/shared";
import { formatDate, formatDelta } from "@waferlens/shared";
import { useExperiment } from "@/lib/demo-store";
import { ComparisonTable } from "../guardian/ComparisonTable";
import { RunDotPlot } from "../charts/RunDotPlot";
import { ConfigDiff, EnvironmentPanel } from "../console/parts";
import { DecisionBadge, GateBadge } from "../ui/badges";
import { Icon } from "../ui/icons";
import { Logo } from "../ui/Logo";

export interface Alternative {
  id: string;
  title: string;
  change: string;
  decision: Decision;
  reason: string;
  delta: number | null;
}

/** A number the reader can challenge: click to see how it was measured. */
function Challenge({ children, how }: { children: React.ReactNode; how: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button className="challenge" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {children}
      </button>
      {open && (
        <span className="challenge-pop" role="dialog" style={{ top: "calc(100% + 6px)", left: 0, display: "block" }}>
          <span className="label" style={{ display: "block", marginBottom: 6, fontSize: 10 }}>
            How this was measured
          </span>
          {how}
        </span>
      )}
    </span>
  );
}

export function ReportDocument({ report, base, slo, alternatives, production, limitations }: { report: Report; base: Experiment; slo: number; alternatives: Alternative[]; production?: string; limitations: string[] }) {
  const exp = useExperiment(base);
  const v = decide(exp, slo);
  const [shared, setShared] = useState(false);
  const c = v.comparison;
  const ready = exp.status === "complete" && c;
  const n = exp.runs.filter((r) => r.arm === "candidate").length;
  const sampleNote = `${n} candidate and ${exp.runs.length - n} baseline repetitions, ${exp.baseline.requestCount.toLocaleString("en-US")} replayed requests each, interleaved.`;

  return (
    <div>
      <div className="row-between wrap no-print" style={{ marginBottom: 16 }}>
        <Link href="/console/reports" className="btn btn-ghost btn-sm">
          ← Reports
        </Link>
        <div className="row wrap">
          <span className="badge">
            <Icon name="lock" size={10} /> {report.shareScope.replace("_", " ")}
          </span>
          <button className="btn btn-sm" onClick={() => setShared(true)}>
            <Icon name="copy" size={12} /> {shared ? "Link copied (demo)" : "Copy customer link"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Icon name="print" size={12} /> Print / save PDF
          </button>
        </div>
      </div>

      <article className="paper report">
        <header className="row-between wrap" style={{ alignItems: "flex-start", gap: 16 }}>
          <Logo size={18} />
          <div className="label" style={{ textAlign: "right", lineHeight: 1.7 }}>
            {report.id} · {report.status}
            <br />
            {formatDate(report.createdAt)} · {report.methodologyVersion}
          </div>
        </header>
        <div style={{ marginTop: 40 }}>
          <div className="label" style={{ marginBottom: 10 }}>
            Technical evaluation · prepared for {report.audience}
          </div>
          <h1>{report.title}</h1>
          <p className="text-2" style={{ marginTop: 12, fontSize: 15 }}>
            Workload <span className="mono">qwen-prod</span> (Qwen3-32B on vLLM, 4× H100 SXM5). Objective: p95 time-to-first-token below {slo} ms, then lower cost per token. Author: {report.author}.
          </p>
        </div>

        {!ready && (
          <div className="banner banner-warn" style={{ marginTop: 24 }}>
            <Icon name="clock" size={14} style={{ marginTop: 2, flex: "none" }} />
            <div>
              <strong>Draft.</strong> {exp.id} is {exp.status.replace("_", " ")} ({exp.runs.length}/{exp.plannedRepetitions * 2} runs). Results and the Guardian decision are filled in when every repetition completes. Nothing below is final.
            </div>
          </div>
        )}

        <h2>Result</h2>
        {ready ? (
          <>
            <div className="row wrap" style={{ gap: 10, marginBottom: 6 }}>
              <DecisionBadge decision={v.decision} />
              <span className="muted" style={{ fontSize: 13 }}>
                {v.summary.pass}/{v.summary.total} Benchmark Guardian gates pass
              </span>
            </div>
            <div className="report-result" data-tour="report-result">
              <div>
                <div className="label">p95 TTFT</div>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: "6px 0" }}>
                  <Challenge how={<>Mean of per-repetition p95 TTFT. {sampleNote} Timing boundary: {exp.baseline.timingBoundary}. Failed requests count as timeouts.</>}>
                    {Math.round(c.ttftP95.baselineMean)} → {Math.round(c.ttftP95.candidateMean)} ms
                  </Challenge>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  <Challenge how={<>Welch 95% confidence interval on the relative change, computed from repetition means (df ≈ {c.ttftP95.df.toFixed(1)}). Every candidate repetition was below {slo} ms.</>}>
                    {formatDelta(c.ttftP95.relDelta)} (95% CI {formatDelta(c.ttftP95.ci[0])} to {formatDelta(c.ttftP95.ci[1])})
                  </Challenge>
                </div>
              </div>
              <div>
                <div className="label">Capacity at saturation</div>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: "6px 0" }}>
                  <Challenge how={<>Output tokens per second with the replay arrival rate scaled ×1.5 so the engine stays saturated. Same capture, same 4 GPUs. {sampleNote}</>}>{formatDelta(c.throughput.relDelta)}</Challenge>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {Math.round(c.throughput.baselineMean).toLocaleString("en-US")} → {Math.round(c.throughput.candidateMean).toLocaleString("en-US")} tok/s
                </div>
              </div>
              <div>
                <div className="label">Cost / 1M output tokens</div>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: "6px 0" }}>
                  <Challenge how={<>$9.96/hour for the 4-GPU pool ($2.49 per H100-hour, manual price entry) divided by saturated output throughput. Not a quote; your price changes the absolute value, not the ratio.</>}>{formatDelta(c.cost.relDelta)}</Challenge>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  ${c.cost.baselineMean.toFixed(3)} → ${c.cost.candidateMean.toFixed(3)}
                </div>
              </div>
            </div>
            <p style={{ marginTop: 16 }}>{v.reasons.join(" ")}</p>
          </>
        ) : (
          <p className="muted">Pending.</p>
        )}

        <h2>What changed</h2>
        <ConfigDiff diff={exp.diff} />
        <p style={{ marginTop: 10 }}>One variable. Everything else (image, driver, model revision, replicas, tensor parallelism) was held constant and verified by the environment gate.</p>

        <h2>Methodology</h2>
        <dl className="kv">
          <dt>Workload</dt>
          <dd>
            Replay of <span className="mono">{exp.baseline.captureId}</span>: request-shape metadata from production, {exp.baseline.requestCount.toLocaleString("en-US")} requests per run. No prompt or response text was used.
          </dd>
          <dt>Procedure</dt>
          <dd>{exp.runOrder}. Both arms replay the same seeded request sequence.</dd>
          <dt>Warmup</dt>
          <dd>{exp.baseline.warmupPolicy}</dd>
          <dt>Timing</dt>
          <dd>{exp.baseline.timingBoundary}.</dd>
          <dt>Correctness</dt>
          <dd>
            {exp.correctness.method === "greedy_exact_match"
              ? `Greedy-decoding exact match on ${exp.correctness.sampleSize.toLocaleString("en-US")} sampled requests (${((exp.correctness.matchRate ?? 0) * 100).toFixed(2)}%, threshold ${(exp.correctness.tolerance * 100).toFixed(1)}%).`
              : "Not run."}
          </dd>
        </dl>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Result</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {GATE_ORDER.map((gid) => {
                const g = v.gates.find((x) => x.id === gid)!;
                return (
                  <tr key={g.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{g.label}</td>
                    <td>
                      <GateBadge status={g.status} />
                    </td>
                    <td className="text-2" style={{ fontSize: 12 }}>
                      {g.detail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2>Detailed results</h2>
        {ready ? (
          <>
            <ComparisonTable comparison={c} />
            <div style={{ marginTop: 20 }}>
              <RunDotPlot runs={exp.runs} slo={slo} planned={exp.plannedRepetitions} />
            </div>
          </>
        ) : (
          <p className="muted">Pending.</p>
        )}

        <h2>Environment</h2>
        <EnvironmentPanel env={exp.candidate.environment} />

        {alternatives.length > 0 && (
          <>
            <h2>What did not work</h2>
            <p style={{ marginBottom: 12 }}>We report every candidate we tested, not only the winner.</p>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Experiment</th>
                    <th>Change</th>
                    <th className="r">p95 TTFT</th>
                    <th>Decision</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((a) => (
                    <tr key={a.id}>
                      <td className="id">{a.id}</td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {a.change}
                      </td>
                      <td className="r">{a.delta !== null ? formatDelta(a.delta) : "—"}</td>
                      <td>
                        <DecisionBadge decision={a.decision} />
                      </td>
                      <td className="text-2" style={{ fontSize: 12 }}>
                        {a.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {production && (
          <>
            <h2>Production validation</h2>
            <p>{production}</p>
          </>
        )}

        <h2>Limitations</h2>
        <ul>
          {limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        <h2>Reproduce</h2>
        <p>
          Artifact bundle <span className="mono" style={{ fontSize: 12, overflowWrap: "anywhere" }}>{exp.artifactBundle?.hash ?? "pending"}</span> contains both configs, the capture manifest, raw per-request latencies, run order, seeds, the correctness report and the gate results.
        </p>
        <pre className="code" style={{ marginTop: 10 }}>{`waferlens bundle verify ${exp.artifactBundle?.hash.slice(0, 23) ?? "<pending>"}…
waferlens replay run --bundle ${exp.id} --reps ${exp.plannedRepetitions} --order interleaved`}</pre>

        <footer className="label" style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid var(--border)", fontSize: 10, lineHeight: 1.8 }}>
          Generated by WaferLens from {exp.id} · {report.methodologyVersion} · all data on this page is simulated demo data
          <br />
          WaferLens is an independent project and is not affiliated with Wafer.
        </footer>
      </article>
    </div>
  );
}
