import type { GateResult } from "@waferlens/shared";
import { GateBadge } from "../ui/badges";

/** Benchmark Guardian gates: pass / fail / unknown, each with its evidence and blocking status. */
export function GateChecklist({ gates, compact = false, changed }: { gates: GateResult[]; compact?: boolean; changed?: Set<string> }) {
  const pass = gates.filter((g) => g.status === "pass").length;
  return (
    <div className="gates">
      <div className="gates-summary">
        <div className="gates-meter" aria-hidden="true">
          {gates.map((g) => (
            <span key={g.id} data-status={g.status} title={`${g.label}: ${g.status}`} />
          ))}
        </div>
        <span className="mono num" style={{ fontSize: 12 }}>
          {pass}/{gates.length} gates pass
        </span>
        <span className="muted" style={{ fontSize: 12 }}>
          {gates.some((g) => g.blocking) ? `· ${gates.filter((g) => g.blocking).length} blocking` : "· nothing blocking"}
        </span>
      </div>
      <ol className="gate-list">
        {gates.map((g, i) => (
          <li key={g.id} className={`gate${changed?.has(g.id) ? " is-changed" : ""}`} data-status={g.status}>
            <span className="gate-idx mono">{String(i + 1).padStart(2, "0")}</span>
            <div className="gate-main">
              <div className="row-between" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="gate-label">{g.label}</div>
                  {!compact && <div className="gate-q">{g.question}</div>}
                </div>
                <GateBadge status={g.status} />
              </div>
              <p className="gate-detail">{g.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="label" style={{ fontSize: 10, marginTop: 10 }}>
        Deterministic checks · no LLM judge · a candidate with any FAIL or UNKNOWN gate cannot be called a winner
      </p>
    </div>
  );
}
