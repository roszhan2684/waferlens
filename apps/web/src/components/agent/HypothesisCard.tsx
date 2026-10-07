import Link from "next/link";
import type { EvidenceRef, Hypothesis } from "@waferlens/shared";
import { ConfidenceBadge } from "../ui/badges";
import { Icon } from "../ui/icons";

function sourceHref(source: string): string | null {
  if (source.startsWith("EXP-")) return `/console/experiments/${source}`;
  if (source.startsWith("tc_")) return `#${source}`;
  return null;
}

function Evidence({ e, tone }: { e: EvidenceRef; tone: "for" | "against" }) {
  const href = sourceHref(e.source);
  return (
    <div className="ev">
      <div className="ev-label">
        <Icon name={tone === "for" ? "check" : "minus"} size={12} style={{ color: tone === "for" ? "var(--good)" : "var(--bad)" }} />
        {e.label}
      </div>
      <div className="ev-detail">{e.detail}</div>
      <div className="ev-source">
        {e.kind} · source{" "}
        {href ? (
          <a href={href}>{e.source}</a>
        ) : (
          e.source
        )}
      </div>
    </div>
  );
}

const STATUS: Record<Hypothesis["status"], { cls: string; text: string }> = {
  active: { cls: "badge-sage", text: "active" },
  confirmed: { cls: "badge-good", text: "confirmed by experiment" },
  rejected: { cls: "", text: "rejected" },
  superseded: { cls: "", text: "superseded" },
};

/** EvidenceCard: claim + calibrated confidence + supporting, disconfirming and missing evidence. */
export function HypothesisCard({ h }: { h: Hypothesis }) {
  const s = STATUS[h.status];
  return (
    <article className="hyp" data-status={h.status} aria-labelledby={`${h.id}-claim`}>
      <div className="hyp-head">
        <span className="hyp-rank">H{h.rank}</span>
        <div style={{ minWidth: 0 }}>
          <p className="hyp-claim" id={`${h.id}-claim`}>
            {h.claim}
          </p>
          <div className="hyp-meta">
            <span className="badge">layer: {h.layer}</span>
            <span className={`badge ${s.cls}`}>{s.text}</span>
            <span className="label" style={{ fontSize: 10 }}>
              {h.id}
            </span>
          </div>
        </div>
        <ConfidenceBadge value={h.confidence} evidence={h.supporting.length + h.disconfirming.length} />
      </div>
      <div className="hyp-body">
        <div className="hyp-col">
          <div className="label" style={{ marginBottom: 4 }}>
            Supporting · {h.supporting.length}
          </div>
          {h.supporting.length ? h.supporting.map((e) => <Evidence key={e.id} e={e} tone="for" />) : <p className="muted" style={{ fontSize: 12, paddingTop: 6 }}>None found.</p>}
        </div>
        <div className="hyp-col">
          <div className="label" style={{ marginBottom: 4 }}>
            Disconfirming · {h.disconfirming.length}
          </div>
          {h.disconfirming.length ? h.disconfirming.map((e) => <Evidence key={e.id} e={e} tone="against" />) : <p className="muted" style={{ fontSize: 12, paddingTop: 6 }}>None found yet. Absence is not confirmation.</p>}
        </div>
        <div className="hyp-col">
          <div className="label" style={{ marginBottom: 4 }}>
            Missing evidence
          </div>
          {h.missing.length ? (
            h.missing.map((m) => (
              <div className="ev" key={m}>
                <div className="ev-detail" style={{ color: "var(--warn)" }}>
                  <Icon name="question" size={11} style={{ marginRight: 6, verticalAlign: -1 }} />
                  {m}
                </div>
              </div>
            ))
          ) : (
            <p className="muted" style={{ fontSize: 12, paddingTop: 6 }}>Nothing outstanding.</p>
          )}
        </div>
      </div>
      <div className="hyp-foot">
        <span>
          <span className="label" style={{ fontSize: 10 }}>
            Next test
          </span>{" "}
          {h.nextTest.includes("EXP-") ? (
            <Link href={`/console/experiments/${h.nextTest.match(/EXP-\d+/)![0]}`} className="sage">
              {h.nextTest}
            </Link>
          ) : (
            h.nextTest
          )}
        </span>
        <span>
          <span className="label" style={{ fontSize: 10 }}>
            Info gain
          </span>{" "}
          {h.expectedInformationGain}
        </span>
        <span>
          <span className="label" style={{ fontSize: 10 }}>
            Prod risk
          </span>{" "}
          {h.productionRisk}
        </span>
      </div>
    </article>
  );
}
