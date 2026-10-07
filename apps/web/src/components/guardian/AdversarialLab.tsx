"use client";

import NumberFlow from "@number-flow/react";
import { useMemo, useState } from "react";
import { FAULTS, decide, injectFaults, type FaultId } from "@waferlens/benchmark";
import type { Experiment } from "@waferlens/shared";
import { DecisionBadge } from "../ui/badges";
import { GateChecklist } from "./GateChecklist";
import { Icon } from "../ui/icons";

interface Props {
  experiment: Experiment;
  slo: number;
  faults?: FaultId[];
  compact?: boolean;
}

/**
 * Adversarial mode: plant a known benchmarking mistake and watch Benchmark Guardian
 * refuse the win. The headline number usually gets better — that is the point.
 */
export function AdversarialLab({ experiment, slo, faults: allowed, compact = false }: Props) {
  const [active, setActive] = useState<FaultId[]>([]);
  const list = allowed ? FAULTS.filter((f) => allowed.includes(f.id)) : FAULTS;

  const honest = useMemo(() => decide(experiment, slo), [experiment, slo]);
  const verdict = useMemo(() => decide(injectFaults(experiment, active), slo), [experiment, slo, active]);
  const changed = useMemo(() => new Set(verdict.gates.filter((g, i) => g.status !== honest.gates[i]!.status).map((g) => g.id)), [verdict, honest]);

  const delta = verdict.comparison?.ttftP95.relDelta ?? 0;
  const honestDelta = honest.comparison?.ttftP95.relDelta ?? 0;

  const toggle = (id: FaultId) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  return (
    <div className={`adv${compact ? " adv-compact" : ""}`}>
      <div className="adv-controls">
        <div className="label" style={{ marginBottom: 10 }}>
          Inject a benchmarking mistake
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {list.map((f) => (
            <label key={f.id} className={`adv-fault${active.includes(f.id) ? " is-on" : ""}`}>
              <span className="check">
                <input type="checkbox" checked={active.includes(f.id)} onChange={() => toggle(f.id)} />
                <span style={{ fontWeight: 500 }}>{f.label}</span>
              </span>
              {!compact && <span className="adv-desc">{f.description}</span>}
              <span className="label" style={{ fontSize: 10 }}>
                Expected to trip: {f.expectGate}
              </span>
            </label>
          ))}
        </div>
        {active.length > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setActive([])}>
            Reset to honest run
          </button>
        )}
      </div>

      <div className="adv-result">
        <div className="adv-headline">
          <div>
            <div className="label">Reported p95 TTFT change</div>
            <div className="adv-number" data-tampered={active.length > 0}>
              <NumberFlow value={delta * 100} format={{ maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: "always" }} suffix="%" />
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {active.length ? (
                <>
                  Honest result: <span className="num">{(honestDelta * 100).toFixed(1)}%</span>. The mistake makes the number look{" "}
                  {delta < honestDelta ? "better" : delta > honestDelta ? "worse" : "the same"}.
                </>
              ) : (
                <>
                  {experiment.id} · {experiment.diff.map((d) => `${d.key} ${d.from} → ${d.to}`).join(", ")}
                </>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label" style={{ marginBottom: 6 }}>
              Guardian decision
            </div>
            <DecisionBadge decision={verdict.decision} />
          </div>
        </div>
        <div className={`banner ${verdict.decision === "winner" ? "banner-sage" : "banner-bad"}`} style={{ margin: "12px 0" }} role="status">
          <Icon name={verdict.decision === "winner" ? "shield" : "alert"} size={16} style={{ marginTop: 2, flex: "none" }} />
          <div>
            {verdict.reasons.map((r) => (
              <div key={r}>{r}</div>
            ))}
          </div>
        </div>
        <GateChecklist gates={verdict.gates} compact changed={changed} />
      </div>
    </div>
  );
}
