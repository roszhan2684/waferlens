"use client";

import { useState } from "react";
import { TimeSeriesChart, type ChartMarker } from "../charts/TimeSeriesChart";

const WINDOWS = [
  { id: "24h", label: "24h", ms: 24 * 3_600_000 },
  { id: "72h", label: "72h", ms: 72 * 3_600_000 },
  { id: "7d", label: "7d", ms: 7 * 24 * 3_600_000 },
];

export function OverviewChart({ p95, p50, markers, slo, now, band }: { p95: { t: number; v: number }[]; p50: { t: number; v: number }[]; markers: ChartMarker[]; slo: number; now: number; band?: { from: number; to: number; label: string } }) {
  const [win, setWin] = useState("72h");
  const ms = WINDOWS.find((w) => w.id === win)!.ms;
  const from = now - ms;
  const step = win === "7d" ? 3 : 1;
  const cut = (pts: { t: number; v: number }[]) => pts.filter((p, i) => p.t >= from && i % step === 0);
  return (
    <div>
      <div className="row-between wrap" style={{ marginBottom: 10 }}>
        <div className="seg" role="group" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button key={w.id} aria-pressed={w.id === win} onClick={() => setWin(w.id)}>
              {w.label}
            </button>
          ))}
        </div>
        <span className="label">◆ deployment · shaded = open incident</span>
      </div>
      <TimeSeriesChart
        title={`p95 and p50 TTFT, last ${win}`}
        series={[
          { id: "p95", label: "p95 TTFT", color: "var(--s-candidate)", points: cut(p95), area: true },
          { id: "p50", label: "p50 TTFT", color: "var(--s-baseline)", points: cut(p50) },
        ]}
        format={(v) => `${Math.round(v)} ms`}
        slo={{ value: slo, label: `SLO p95 ${slo} ms` }}
        markers={markers.filter((m) => m.t >= from)}
        band={band && band.from >= from - ms ? band : undefined}
        height={260}
        yMin={0}
        tableEvery={win === "24h" ? 6 : 12}
      />
    </div>
  );
}

export const FORMATS = {
  ms: (v: number) => `${Math.round(v)} ms`,
  pct: (v: number) => `${Math.round(v * 100)}%`,
  int: (v: number) => Math.round(v).toLocaleString("en-US"),
} as const;

export function SmallMultiple({ title, points, format, markers, yMin, yMax }: { title: string; points: { t: number; v: number }[]; format: keyof typeof FORMATS; markers: ChartMarker[]; yMin?: number; yMax?: number }) {
  return <TimeSeriesChart title={title} series={[{ id: "m", label: title, color: "var(--s-candidate)", points }]} format={FORMATS[format]} markers={markers.map((m) => ({ ...m, label: "" }))} height={150} yMin={yMin} yMax={yMax} tableEvery={12} />;
}
