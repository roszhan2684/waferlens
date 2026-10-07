import type { Decision, GateStatus, Severity } from "@waferlens/shared";
import { Icon } from "./icons";

export function GateBadge({ status }: { status: GateStatus }) {
  if (status === "pass")
    return (
      <span className="badge badge-good">
        <Icon name="check" size={12} /> PASS
      </span>
    );
  if (status === "fail")
    return (
      <span className="badge badge-bad">
        <Icon name="x" size={12} /> FAIL
      </span>
    );
  return (
    <span className="badge badge-unknown">
      <Icon name="question" size={12} /> UNKNOWN
    </span>
  );
}

const DECISION: Record<Decision, { cls: string; icon: "check" | "x" | "question" | "alert" | "clock"; text: string }> = {
  winner: { cls: "badge-good", icon: "check", text: "Measured winner" },
  rejected: { cls: "badge-bad", icon: "x", text: "Rejected" },
  inconclusive: { cls: "badge-unknown", icon: "question", text: "Inconclusive" },
  promising_unverified: { cls: "badge-warn", icon: "alert", text: "Promising, unverified" },
  pending: { cls: "", icon: "clock", text: "Pending" },
};

export function DecisionBadge({ decision }: { decision: Decision }) {
  const d = DECISION[decision];
  return (
    <span className={`badge ${d.cls}`}>
      <Icon name={d.icon} size={12} /> {d.text}
    </span>
  );
}

const SEV: Record<Severity, string> = { sev1: "badge-bad", sev2: "badge-bad", sev3: "badge-warn", info: "" };

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge ${SEV[severity]}`}>{severity === "info" ? "INFO" : severity.toUpperCase()}</span>;
}

/** Calibrated probability plus evidence count. Never decorative. */
export function ConfidenceBadge({ value, evidence, status }: { value: number; evidence?: number; status?: string }) {
  const level = value >= 0.8 ? "high" : value >= 0.4 ? "medium" : "low";
  return (
    <span className="conf" title={`Calibrated confidence ${(value * 100).toFixed(0)}% (${level})${evidence !== undefined ? ` from ${evidence} evidence items` : ""}`}>
      <span className="conf-bar" aria-hidden="true">
        <span style={{ width: `${Math.max(2, value * 100)}%` }} data-level={level} />
      </span>
      <span className="mono num">{value.toFixed(2)}</span>
      {evidence !== undefined && <span className="muted mono">· {evidence} ev</span>}
      {status && <span className="muted mono">· {status}</span>}
    </span>
  );
}

export function StatusDot({ status, label }: { status: "good" | "warn" | "bad" | "unknown" | "sage"; label: string }) {
  const icon = status === "good" ? "check" : status === "bad" ? "x" : status === "warn" ? "alert" : status === "unknown" ? "question" : "dot";
  return (
    <span className={`badge badge-${status === "sage" ? "sage" : status}`}>
      <Icon name={icon} size={12} />
      {label}
    </span>
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="badge badge-sage">
      <span className="dot pulse" />
      {label}
    </span>
  );
}
