import type { FingerprintDistance } from "@waferlens/shared";
import { Icon } from "../ui/icons";

const VERDICT: Record<FingerprintDistance["verdict"], { cls: string; text: string }> = {
  stable: { cls: "badge-good", text: "Representative" },
  minor_drift: { cls: "badge-warn", text: "Representative with gaps" },
  material_shift: { cls: "badge-bad", text: "Not representative" },
};

/** Per-dimension distance between a source workload and its replay. Gaps are stated, not hidden. */
export function ReplayValidity({ distance, sourceLabel = "Source", targetLabel = "Replay" }: { distance: FingerprintDistance; sourceLabel?: string; targetLabel?: string }) {
  const v = VERDICT[distance.verdict];
  const flagged = distance.components.filter((c) => c.flagged);
  return (
    <div>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <span className={`badge ${v.cls}`}>
          <Icon name={distance.verdict === "stable" ? "check" : "alert"} size={12} />
          {v.text}
        </span>
        <span className="label num">distance {distance.total.toFixed(3)}</span>
      </div>
      <div className="replay-validity" role="table" aria-label="Replay validity by dimension">
        <div className="rv-row label" role="row" style={{ fontSize: 10 }}>
          <span role="columnheader">Dimension</span>
          <span role="columnheader" style={{ textAlign: "right" }}>
            {sourceLabel}
          </span>
          <span role="columnheader" style={{ textAlign: "right" }}>
            {targetLabel}
          </span>
          <span role="columnheader" style={{ textAlign: "right" }}>
            Δ
          </span>
        </div>
        {distance.components
          .filter((c) => c.key !== "joint")
          .map((c) => (
            <div className="rv-row" role="row" key={c.key}>
              <span role="cell" className={c.flagged ? "" : "text-2"} style={c.flagged ? { color: "var(--warn)" } : undefined}>
                {c.flagged && <Icon name="alert" size={11} style={{ marginRight: 6, verticalAlign: -1 }} />}
                {c.label}
              </span>
              <span role="cell" className="num mono" style={{ textAlign: "right" }}>
                {c.source}
              </span>
              <span role="cell" className="num mono" style={{ textAlign: "right" }}>
                {c.target}
              </span>
              <span role="cell" className="num mono muted" style={{ textAlign: "right" }}>
                {c.value.toFixed(3)}
              </span>
            </div>
          ))}
      </div>
      {flagged.length > 0 && (
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Flagged dimensions are carried into every experiment report built on this replay as stated limitations.
        </p>
      )}
    </div>
  );
}
