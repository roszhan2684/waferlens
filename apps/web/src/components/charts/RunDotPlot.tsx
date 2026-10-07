"use client";

import { useState } from "react";
import type { Run } from "@waferlens/shared";
import { linear, niceTicks } from "./scale";
import { useWidth } from "./use-width";

interface Props {
  runs: Run[];
  slo: number;
  planned: number;
  title?: string;
}

/**
 * Every repetition as a dot, per arm, on one p95 TTFT axis. Makes "one lucky run"
 * and run-to-run variance visible next to the SLO.
 */
export function RunDotPlot({ runs, slo, planned, title = "p95 TTFT per repetition" }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(560);
  const [hover, setHover] = useState<string | null>(null);
  const height = 132;
  const M = { top: 16, right: 16, bottom: 26, left: 92 };
  const vals = runs.map((r) => r.metrics.ttftP95Ms);
  const lo = Math.min(...vals, slo) * 0.94;
  const hi = Math.max(...vals, slo) * 1.04;
  const ticks = niceTicks(lo, hi, 5);
  const x = linear(lo, hi, M.left, width - M.right);
  const rows = [
    { arm: "baseline" as const, label: "Baseline", color: "var(--s-baseline)", y: 44 },
    { arm: "candidate" as const, label: "Candidate", color: "var(--s-candidate)", y: 84 },
  ];
  const hovered = runs.find((r) => r.id === hover);

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={M.top} y2={height - M.bottom} stroke="var(--grid)" />
            <text x={x(t)} y={height - 8} textAnchor="middle">
              {Math.round(t)} ms
            </text>
          </g>
        ))}
        <line x1={x(slo)} x2={x(slo)} y1={M.top - 6} y2={height - M.bottom} stroke="var(--text-2)" strokeOpacity={0.7} />
        <text x={x(slo) + 4} y={M.top - 2} style={{ fill: "var(--text-2)" }}>
          SLO {slo} ms
        </text>
        {rows.map((row) => {
          const armRuns = runs.filter((r) => r.arm === row.arm);
          const m = armRuns.length ? armRuns.reduce((a, r) => a + r.metrics.ttftP95Ms, 0) / armRuns.length : null;
          return (
            <g key={row.arm}>
              <text x={8} y={row.y + 3} style={{ fill: "var(--text-2)", fontSize: 11 }}>
                {row.label}
              </text>
              <text x={8} y={row.y + 16} style={{ fontSize: 10 }}>
                {armRuns.length}/{planned} runs
              </text>
              <line x1={M.left} x2={width - M.right} y1={row.y} y2={row.y} stroke="var(--border)" />
              {m !== null && <line x1={x(m)} x2={x(m)} y1={row.y - 12} y2={row.y + 12} stroke={row.color} strokeWidth={2} />}
              {armRuns.map((r) => (
                <g key={r.id} onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(r.id)} onBlur={() => setHover(null)} role="img" aria-label={`${row.label} repetition ${r.repetition}: ${r.metrics.ttftP95Ms} ms`}>
                  <circle cx={x(r.metrics.ttftP95Ms)} cy={row.y} r={12} fill="transparent" />
                  <circle cx={x(r.metrics.ttftP95Ms)} cy={row.y} r={hover === r.id ? 6 : 4.5} fill={row.color} stroke="var(--surface-1)" strokeWidth={2} />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div className="chart-tooltip" style={{ left: Math.min(width - 180, x(hovered.metrics.ttftP95Ms) + 10), top: 4 }}>
          <div className="label" style={{ marginBottom: 4 }}>
            {hovered.arm} · rep {hovered.repetition} · order {hovered.order}
          </div>
          <div className="tt-row">
            <span className="muted">p95 TTFT</span>
            <span className="tt-val">{hovered.metrics.ttftP95Ms.toFixed(1)} ms</span>
          </div>
          <div className="tt-row">
            <span className="muted">p50 TTFT</span>
            <span className="tt-val">{hovered.metrics.ttftP50Ms.toFixed(1)} ms</span>
          </div>
          <div className="tt-row">
            <span className="muted">Failed</span>
            <span className="tt-val">{hovered.failedRequests}</span>
          </div>
          <div className="tt-row">
            <span className="muted">Seed</span>
            <span className="tt-val mono">{hovered.seed}</span>
          </div>
        </div>
      )}
    </div>
  );
}
