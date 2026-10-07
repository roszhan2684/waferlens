"use client";

import { useRef, useState } from "react";
import type { Stage } from "@waferlens/shared";
import { Icon } from "../ui/icons";

type PhaseKey = "baseline" | "tuned" | "regressed";

interface Props {
  phases: Record<PhaseKey, Stage[]>;
  initial?: PhaseKey;
  labels?: Partial<Record<PhaseKey, string>>;
  slo?: number;
}

const LENS_R = 64;
const DEFAULT_LABELS: Record<PhaseKey, string> = {
  baseline: "Before (INC-207)",
  tuned: "After EXP-104",
  regressed: "Now (INC-212)",
};

/**
 * The serving path as one rail. Moving the lens over it X-rays the layer below:
 * queue wait reasons, scheduler work, and kernel splits for prefill and decode.
 */
export function TraceRail({ phases, initial = "regressed", labels, slo = 700 }: Props) {
  const [phase, setPhase] = useState<PhaseKey>(initial);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const stages = phases[phase];
  const total = stages.reduce((a, s) => a + s.ms, 0);
  const bottleneck = stages.reduce((a, s, i) => (s.ms > stages[a]!.ms ? i : a), 0);
  const cols = stages.map((s) => `minmax(52px, ${s.ms}fr)`).join(" ");
  const names = { ...DEFAULT_LABELS, ...labels };

  // Which stage sits under the lens centre (or has keyboard focus).
  const activeIndex = (() => {
    if (focus !== null) return focus;
    if (!lens || !railRef.current) return null;
    const kids = Array.from(railRef.current.querySelectorAll<HTMLElement>("[data-stage]"));
    const idx = kids.findIndex((el) => lens.x >= el.offsetLeft && lens.x <= el.offsetLeft + el.offsetWidth);
    return idx >= 0 ? idx : null;
  })();
  const active = activeIndex !== null ? stages[activeIndex] : null;

  const moveTo = (clientX: number, clientY: number) => {
    const r = railRef.current?.getBoundingClientRect();
    if (!r) return;
    setFocus(null);
    setLens({ x: clientX - r.left, y: Math.min(Math.max(clientY - r.top, 0), r.height) });
  };

  const focusStage = (i: number) => {
    const el = railRef.current?.querySelectorAll<HTMLElement>("[data-stage]")[i];
    if (!el) return;
    setFocus(i);
    setLens({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetHeight / 2 });
  };

  const clip = lens ? `circle(${LENS_R}px at ${lens.x}px ${lens.y}px)` : "circle(0px at -100px -100px)";

  return (
    <div className="trace">
      <div className="row-between wrap" style={{ marginBottom: 12 }}>
        <div className="seg" role="group" aria-label="Serving path snapshot">
          {(Object.keys(phases) as PhaseKey[]).map((p) => (
            <button key={p} aria-pressed={p === phase} onClick={() => setPhase(p)}>
              {names[p]}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className="label">
            Σ <span className="num" style={{ color: total > slo ? "var(--bad)" : "var(--good)" }}>{total} ms</span> · SLO {slo} ms
          </span>
          <span className="label row" style={{ gap: 4 }}>
            <Icon name="lens" size={12} /> Hover or tab to X-ray
          </span>
        </div>
      </div>

      <div
        className="trace-rail"
        ref={railRef}
        onPointerMove={(e) => moveTo(e.clientX, e.clientY)}
        onPointerDown={(e) => moveTo(e.clientX, e.clientY)}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setLens(null);
        }}
      >
        {/* Surface layer: stage durations */}
        <div className="trace-layer" style={{ gridTemplateColumns: cols }}>
          {stages.map((s, i) => (
            <button
              key={s.id}
              data-stage={s.id}
              className={`trace-stage${i === bottleneck ? " is-bottleneck" : ""}`}
              onFocus={() => focusStage(i)}
              onBlur={() => {
                setFocus(null);
                setLens(null);
              }}
              aria-label={`${s.label}: ${s.ms} ms, ${((s.ms / total) * 100).toFixed(0)}% of the p95 bucket${i === bottleneck ? " (largest stage)" : ""}`}
            >
              <span className="trace-name">{s.label}</span>
              <span className="trace-ms num">{s.ms}</span>
            </button>
          ))}
        </div>
        {/* Deep layer: revealed only inside the lens */}
        <div className="trace-layer trace-deep" style={{ gridTemplateColumns: cols, clipPath: clip, WebkitClipPath: clip }} aria-hidden="true">
          {stages.map((s) => (
            <div key={s.id} className="trace-deep-stage">
              {s.deep.map((d) => (
                <div key={d.label} className="trace-sub" style={{ flexGrow: d.share }}>
                  <span>{d.label}</span>
                  <span className="num">{Math.round(d.share * s.ms)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {lens && <div className="trace-lens" style={{ left: lens.x - LENS_R, top: lens.y - LENS_R, width: LENS_R * 2, height: LENS_R * 2 }} aria-hidden="true" />}
      </div>

      <div className="trace-axis">
        <span>request accepted</span>
        <span>first token</span>
      </div>

      <div className="trace-readout" aria-live="polite">
        {active ? (
          <>
            <div className="row-between">
              <span className="row" style={{ gap: 8 }}>
                <strong>{active.label}</strong>
                <span className="badge">{active.layer}</span>
                <span className="muted num">
                  {active.ms} ms · {((active.ms / total) * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="trace-breakdown">
              {active.deep.map((d) => (
                <div key={d.label} className="row-between">
                  <span className="text-2">{d.label}</span>
                  <span className="row" style={{ gap: 10 }}>
                    <span className="mono muted" style={{ fontSize: 11 }}>
                      {d.source}
                    </span>
                    <span className="num" style={{ minWidth: 72, textAlign: "right" }}>
                      {Math.round(d.share * active.ms)} ms · {(d.share * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {active.note && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{active.note}</p>}
          </>
        ) : (
          <p className="muted" style={{ fontSize: 13 }}>
            Largest stage: <strong className="text-2">{stages[bottleneck]!.label}</strong> ({stages[bottleneck]!.ms} ms). Move the lens over a stage to see what it is made of.
          </p>
        )}
      </div>
      <p className="label" style={{ marginTop: 10, fontSize: 10 }}>
        Mean stage time for requests in the p95 TTFT bucket · OpenTelemetry spans, 5% head sampling · stages under 52px are widened and not to scale
      </p>
    </div>
  );
}
