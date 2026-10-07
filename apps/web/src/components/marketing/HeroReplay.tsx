"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "@waferlens/shared";
import { linear } from "../charts/scale";
import { useWidth } from "../charts/use-width";
import { Icon } from "../ui/icons";

export interface HeroEvent {
  t: number;
  kind: "detect" | "agent" | "experiment" | "change" | "guard" | "promote";
  title: string;
  detail: string;
}

interface Props {
  points: { t: number; v: number }[];
  events: HeroEvent[];
  slo: number;
}

const KIND_LABEL: Record<HeroEvent["kind"], string> = {
  detect: "DETECT",
  agent: "AGENT",
  experiment: "REPLAY",
  change: "DEPLOY",
  guard: "GUARDIAN",
  promote: "PROMOTE",
};

/** The 72-hour flight recorder: scrub through one complete optimization lifecycle. */
export function HeroReplay({ points, events, slo }: Props) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ref, width] = useWidth<HTMLDivElement>(520);
  const raf = useRef<number | null>(null);
  const last = points.length - 1;

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      setIdx(last);
    }
  }, [last]);

  useEffect(() => {
    if (!playing) return;
    let prev = performance.now();
    const tick = (now: number) => {
      if (now - prev > 55) {
        prev = now;
        setIdx((i) => {
          if (i >= last) {
            setPlaying(false);
            return last;
          }
          return i + 1;
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, last]);

  const h = 132;
  const M = { l: 4, r: 4, t: 10, b: 6 };
  const geo = useMemo(() => {
    const vs = points.map((p) => p.v);
    const lo = Math.min(...vs, slo) * 0.85;
    const hi = Math.max(...vs) * 1.04;
    const x = linear(points[0]!.t, points[last]!.t, M.l, width - M.r);
    const y = linear(lo, hi, h - M.b, M.t);
    const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
    return { x, y, d };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, width, slo, last]);

  const cur = points[idx]!;
  const visible = events.filter((e) => e.t <= cur.t);
  const within = cur.v <= slo;
  const playX = geo.x(cur.t);

  const seek = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setPlaying(false);
    setIdx(Math.round(frac * last));
  };

  return (
    <div className="recorder">
      <div className="recorder-head">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge badge-sage">
            <span className="dot" /> qwen-prod
          </span>
          <span className="label">Qwen3-32B · vLLM · 4× H100 · demo data</span>
        </div>
        <span className="label num">{formatTime(cur.t)}</span>
      </div>

      <div className="recorder-metric">
        <div>
          <div className="label">p95 time to first token</div>
          <div className="recorder-value">
            <NumberFlow value={Math.round(cur.v)} suffix=" ms" />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${within ? "badge-good" : "badge-bad"}`}>
            <Icon name={within ? "check" : "alert"} size={12} />
            {within ? "Within SLO" : "SLO miss"}
          </span>
          <div className="label" style={{ marginTop: 6 }}>
            SLO {slo} ms
          </div>
        </div>
      </div>

      <div
        className="recorder-chart"
        ref={ref}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          seek(e.clientX, e.currentTarget);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) seek(e.clientX, e.currentTarget);
        }}
      >
        <svg width={width} height={h} aria-hidden="true">
          <line x1={0} x2={width} y1={geo.y(slo)} y2={geo.y(slo)} stroke="var(--text-2)" strokeOpacity={0.4} />
          <path d={geo.d} fill="none" stroke="var(--faint)" strokeWidth={1.5} />
          <clipPath id="hero-played">
            <rect x={0} y={0} width={playX} height={h} />
          </clipPath>
          <path d={geo.d} fill="none" stroke="var(--sage)" strokeWidth={1.75} clipPath="url(#hero-played)" />
          {events.map((e) => (
            <line key={e.t + e.title} x1={geo.x(e.t)} x2={geo.x(e.t)} y1={h - 10} y2={h} stroke={e.t <= cur.t ? "var(--sage)" : "var(--faint)"} />
          ))}
          <line x1={playX} x2={playX} y1={0} y2={h} stroke="var(--text)" strokeOpacity={0.7} />
          <circle cx={playX} cy={geo.y(cur.v)} r={4} fill="var(--text)" stroke="var(--surface-1)" strokeWidth={2} />
        </svg>
      </div>

      <div className="recorder-controls">
        <button className="btn btn-sm" onClick={() => (idx >= last ? (setIdx(0), setPlaying(true)) : setPlaying((p) => !p))} aria-label={playing ? "Pause replay" : "Play replay"}>
          <Icon name={playing ? "pause" : "play"} size={12} />
          {playing ? "Pause" : idx >= last ? "Replay" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={last}
          value={idx}
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
          aria-label="Scrub the 72-hour timeline"
          aria-valuetext={`${formatTime(cur.t)}, p95 TTFT ${Math.round(cur.v)} ms`}
          className="scrubber"
        />
        <span className="label">72h</span>
      </div>

      <ol className="ledger" aria-label="Evidence ledger">
        {visible.length === 0 && <li className="ledger-empty">Waiting for the first signal…</li>}
        {visible
          .slice(-4)
          .reverse()
          .map((e, i) => (
            <li key={e.t + e.title} className={i === 0 ? "is-latest" : ""}>
              <span className="ledger-kind">{KIND_LABEL[e.kind]}</span>
              <div>
                <div className="ledger-title">{e.title}</div>
                <div className="ledger-detail">{e.detail}</div>
              </div>
              <span className="ledger-time num">{formatTime(e.t, false)}</span>
            </li>
          ))}
      </ol>
    </div>
  );
}
