"use client";

import { useState } from "react";
import { linear, niceTicks } from "./scale";
import { useWidth } from "./use-width";

interface Props {
  title: string;
  categories: string[];
  series: { id: string; label: string; color: string; values: number[] }[];
  format: (v: number) => string;
  height?: number;
  xLabel?: string;
}

/** Grouped columns (≤ 24px, 4px rounded data-end, 2px surface gap) with per-bar hover. */
export function PairedBars({ title, categories, series, format, height = 200, xLabel }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(480);
  const [hover, setHover] = useState<{ c: number; s: number } | null>(null);
  const M = { top: 12, right: 8, bottom: xLabel ? 40 : 26, left: 44 };
  const max = Math.max(...series.flatMap((s) => s.values));
  const ticks = niceTicks(0, max, 3);
  const top = ticks[ticks.length - 1] ?? max;
  const y = linear(0, top, height - M.bottom, M.top);
  const band = (width - M.left - M.right) / categories.length;
  const barW = Math.min(24, (band - 10) / series.length - 2);
  const groupW = series.length * barW + (series.length - 1) * 2;

  const bar = (x: number, w: number, y0: number, y1: number) => {
    const h = Math.max(0, y0 - y1);
    const r = Math.min(4, h, w / 2);
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  };

  return (
    <div className="chart" ref={ref}>
      <div className="legend" style={{ marginBottom: 8 }}>
        {series.map((s) => (
          <span className="legend-item" key={s.id}>
            <span className="legend-rect" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg width={width} height={height} role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={M.left - 8} y={y(t) + 3} textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {categories.map((c, ci) => {
          const gx = M.left + ci * band + (band - groupW) / 2;
          return (
            <g key={c}>
              {series.map((s, si) => {
                const x = gx + si * (barW + 2);
                const v = s.values[ci] ?? 0;
                const active = hover?.c === ci && hover?.s === si;
                return (
                  <g
                    key={s.id}
                    tabIndex={0}
                    role="img"
                    aria-label={`${s.label}, ${c}: ${format(v)}`}
                    onPointerEnter={() => setHover({ c: ci, s: si })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ c: ci, s: si })}
                    onBlur={() => setHover(null)}
                  >
                    <rect x={x - 2} y={M.top} width={barW + 4} height={height - M.top - M.bottom} fill="transparent" />
                    <path d={bar(x, barW, y(0), y(v))} fill={s.color} opacity={hover && !active ? 0.55 : 1} />
                  </g>
                );
              })}
              <text x={M.left + ci * band + band / 2} y={height - M.bottom + 14} textAnchor="middle">
                {c}
              </text>
            </g>
          );
        })}
        <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="var(--axis)" />
        {xLabel && (
          <text x={M.left + (width - M.left - M.right) / 2} y={height - 4} textAnchor="middle">
            {xLabel}
          </text>
        )}
      </svg>
      {hover && (
        <div className="chart-tooltip" style={{ left: Math.min(width - 180, M.left + hover.c * band + band / 2), top: 8 }}>
          <div className="label" style={{ marginBottom: 4 }}>
            {categories[hover.c]}
          </div>
          {series.map((s, si) => (
            <div className="tt-row" key={s.id} style={{ opacity: si === hover.s ? 1 : 0.7 }}>
              <span className="row" style={{ gap: 6 }}>
                <span className="tt-key" style={{ background: s.color }} />
                <span className="muted">{s.label}</span>
              </span>
              <span className="tt-val">{format(s.values[hover.c] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
