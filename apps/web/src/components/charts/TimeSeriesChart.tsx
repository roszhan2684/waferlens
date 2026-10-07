"use client";

import { useId, useMemo, useState } from "react";
import { formatTime } from "@waferlens/shared";
import { linear, niceDomain, niceTicks } from "./scale";
import { useWidth } from "./use-width";

export interface ChartSeries {
  id: string;
  label: string;
  color: string; // CSS color or var()
  points: { t: number; v: number }[];
  area?: boolean;
}

export interface ChartMarker {
  id: string;
  t: number;
  label: string;
  title: string;
  tone?: "neutral" | "sage" | "bad";
}

interface Props {
  series: ChartSeries[];
  format: (v: number) => string;
  height?: number;
  slo?: { value: number; label: string };
  markers?: ChartMarker[];
  yMin?: number;
  yMax?: number;
  /** Optional shaded band, e.g. the incident window. */
  band?: { from: number; to: number; label: string };
  title: string;
  tableEvery?: number;
}

const M = { top: 22, right: 16, bottom: 26, left: 52 };

/**
 * Thin-line time series: hairline grid, explicit SLO marker, change markers,
 * a snapping crosshair with one tooltip for every series, and a table view.
 */
export function TimeSeriesChart({ series, format, height = 220, slo, markers = [], yMin, yMax, band, title, tableEvery = 12 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const uid = useId();
  const base = series[0]?.points ?? [];

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.points.map((p) => p.v));
    let lo = yMin ?? Math.min(...all, slo?.value ?? Infinity);
    let hi = yMax ?? Math.max(...all, slo?.value ?? -Infinity);
    if (yMin === undefined) lo = Math.max(0, lo - (hi - lo) * 0.08);
    [lo, hi] = niceDomain(lo, hi, 4);
    const t0 = base[0]?.t ?? 0;
    const t1 = base[base.length - 1]?.t ?? 1;
    const x = linear(t0, t1, M.left, width - M.right);
    const y = linear(lo, hi, height - M.bottom, M.top);
    const yTicks = niceTicks(lo, hi, 4);
    // x ticks at day boundaries, or every 6h for short ranges
    const spanH = (t1 - t0) / 3_600_000;
    const stepH = spanH > 96 ? 24 : spanH > 30 ? 12 : spanH > 10 ? 3 : 1;
    const xTicks: number[] = [];
    const first = Math.ceil(t0 / (stepH * 3_600_000)) * stepH * 3_600_000;
    for (let t = first; t <= t1; t += stepH * 3_600_000) xTicks.push(t);
    return { x, y, yTicks, xTicks, lo, hi, t0, t1, stepH };
  }, [series, base, width, height, slo, yMin, yMax]);

  const paths = useMemo(
    () =>
      series.map((s) => {
        const d = s.points.map((p, i) => `${i ? "L" : "M"}${geo.x(p.t).toFixed(1)},${geo.y(p.v).toFixed(1)}`).join("");
        const area = s.area && s.points.length ? `${d}L${geo.x(s.points[s.points.length - 1]!.t).toFixed(1)},${geo.y(geo.lo)}L${geo.x(s.points[0]!.t).toFixed(1)},${geo.y(geo.lo)}Z` : null;
        return { id: s.id, d, area, color: s.color };
      }),
    [series, geo],
  );

  const indexAt = (px: number) => {
    if (!base.length) return null;
    const t = geo.t0 + ((px - M.left) / (width - M.left - M.right)) * (geo.t1 - geo.t0);
    let lo = 0;
    let hi = base.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (base[mid]!.t < t) lo = mid;
      else hi = mid;
    }
    return Math.abs(base[lo]!.t - t) < Math.abs(base[hi]!.t - t) ? lo : hi;
  };

  const hx = hover !== null && base[hover] ? geo.x(base[hover]!.t) : null;
  const tipLeft = hx !== null ? Math.min(Math.max(hx + 12, 0), width - 190) : 0;
  const tipFlip = hx !== null && hx > width - 210;

  return (
    <div className="chart" ref={ref}>
      {series.length > 1 && (
        <div className="legend" style={{ marginBottom: 8 }}>
          {series.map((s) => (
            <span className="legend-item" key={s.id}>
              <span className="legend-line" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={title}
        tabIndex={0}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(indexAt(e.clientX - r.left));
        }}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? base.length - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? base.length - 1) - 1));
          if (e.key === "ArrowRight") setHover((h) => Math.min(base.length - 1, (h ?? 0) + 1));
        }}
      >
        <defs>
          {paths.map((p) => (
            <linearGradient key={p.id} id={`${uid}-${p.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={p.color} stopOpacity={0.14} />
              <stop offset="1" stopColor={p.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        {band && (
          <g>
            <rect x={geo.x(band.from)} y={M.top} width={Math.max(0, geo.x(band.to) - geo.x(band.from))} height={height - M.top - M.bottom} fill="var(--bad)" opacity={0.06} />
          </g>
        )}
        {geo.yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={M.left - 8} y={geo.y(t) + 3} textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {geo.xTicks.map((t) => (
          <text key={t} x={geo.x(t)} y={height - 8} textAnchor="middle">
            {geo.stepH >= 24 ? formatTime(t).split(" · ")[0] : formatTime(t, false)}
          </text>
        ))}
        <line x1={M.left} x2={width - M.right} y1={height - M.bottom} y2={height - M.bottom} stroke="var(--axis)" />
        {paths.map((p) => p.area && <path key={p.id + "a"} d={p.area} fill={`url(#${uid}-${p.id})`} />)}
        {paths.map((p) => (
          <path key={p.id} d={p.d} fill="none" stroke={p.color} strokeWidth={series.length > 1 ? 1.5 : 1.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {slo && (
          <g>
            <line x1={M.left} x2={width - M.right} y1={geo.y(slo.value)} y2={geo.y(slo.value)} stroke="var(--text-2)" strokeOpacity={0.6} />
            <rect x={width - M.right - 92} y={geo.y(slo.value) - 17} width={92} height={14} fill="var(--surface-1)" />
            <text x={width - M.right} y={geo.y(slo.value) - 6} textAnchor="end" style={{ fill: "var(--text-2)" }}>
              {slo.label}
            </text>
          </g>
        )}
        {markers.map((m) => {
          const mx = geo.x(m.t);
          if (mx < M.left || mx > width - M.right) return null;
          const color = m.tone === "bad" ? "var(--bad)" : m.tone === "sage" ? "var(--sage)" : "var(--text-2)";
          return (
            <g key={m.id}>
              <title>{m.title}</title>
              <line x1={mx} x2={mx} y1={M.top - 6} y2={height - M.bottom} stroke={color} strokeOpacity={0.55} />
              <rect x={mx - 3.5} y={M.top - 10} width={7} height={7} transform={`rotate(45 ${mx} ${M.top - 6.5})`} fill={color} />
              {width >= 640 && (
                <text x={mx + 7} y={M.top - 3} style={{ fill: color }}>
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
        {hx !== null && hover !== null && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={M.top} y2={height - M.bottom} stroke="var(--text-2)" strokeOpacity={0.5} />
            {series.map((s) => {
              const p = s.points[hover];
              return p ? <circle key={s.id} cx={hx} cy={geo.y(p.v)} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} /> : null;
            })}
          </g>
        )}
      </svg>
      {hx !== null && hover !== null && base[hover] && (
        <div className="chart-tooltip" style={{ left: tipFlip ? Math.max(0, hx - 196) : tipLeft, top: M.top }}>
          <div className="label" style={{ marginBottom: 6 }}>
            {formatTime(base[hover]!.t)}
          </div>
          {series.map((s) => {
            const p = s.points[hover];
            return p ? (
              <div className="tt-row" key={s.id}>
                <span className="row" style={{ gap: 6 }}>
                  <span className="tt-key" style={{ background: s.color }} />
                  <span className="muted">{s.label}</span>
                </span>
                <span className="tt-val">{format(p.v)}</span>
              </div>
            ) : null;
          })}
          {slo && (
            <div className="tt-row muted" style={{ marginTop: 4 }}>
              <span>SLO</span>
              <span className="num">{format(slo.value)}</span>
            </div>
          )}
        </div>
      )}
      <div className="row-between no-print" style={{ marginTop: 6 }}>
        <span className="label" style={{ fontSize: 10 }}>
          {base.length.toLocaleString("en-US")} points · 5-min resolution · UTC
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? "Hide table" : "View as table"}
        </button>
      </div>
      {showTable && (
        <div className="table-wrap" style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 4, marginTop: 6 }}>
          <table className="t">
            <caption className="visually-hidden">{title}</caption>
            <thead>
              <tr>
                <th>Time (UTC)</th>
                {series.map((s) => (
                  <th key={s.id} className="r">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {base
                .map((p, i) => ({ p, i }))
                .filter(({ i }) => i % tableEvery === 0)
                .map(({ p, i }) => (
                  <tr key={p.t}>
                    <td className="mono">{formatTime(p.t)}</td>
                    {series.map((s) => (
                      <td key={s.id} className="r">
                        {s.points[i] ? format(s.points[i]!.v) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
