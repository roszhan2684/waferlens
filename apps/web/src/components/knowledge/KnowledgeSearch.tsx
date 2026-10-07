"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { KnowledgeItem } from "@waferlens/shared";
import { formatDate } from "@waferlens/shared";
import { Icon } from "../ui/icons";

type Item = KnowledgeItem & { similarity: number };

const OUTCOME: Record<KnowledgeItem["outcome"], { cls: string; text: string }> = {
  improved: { cls: "badge-good", text: "improved" },
  no_effect: { cls: "", text: "no effect" },
  regressed: { cls: "badge-bad", text: "regressed" },
  invalid: { cls: "badge-warn", text: "invalid result" },
};

/** Experiment memory: structured search ranked by workload-fingerprint similarity. */
export function KnowledgeSearch({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<"all" | KnowledgeItem["outcome"]>("all");
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter((i) => outcome === "all" || i.outcome === outcome)
      .filter((i) => {
        const hay = `${i.title} ${i.intervention} ${i.bottleneck} ${i.workload} ${i.effect} ${i.caveats.join(" ")}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .sort((a, b) => b.similarity - a.similarity);
  }, [items, q, outcome]);

  return (
    <div className="panel">
      <div className="panel-head" style={{ flexWrap: "wrap" }}>
        <div className="search" style={{ flex: "1 1 280px", maxWidth: 420 }}>
          <Icon name="search" size={14} />
          <input className="input" placeholder="Search: scheduler, prefix cache, chart upgrade…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search experiment memory" />
        </div>
        <div className="seg" role="group" aria-label="Outcome">
          {(["all", "improved", "no_effect", "regressed", "invalid"] as const).map((o) => (
            <button key={o} aria-pressed={outcome === o} onClick={() => setOutcome(o)}>
              {o === "all" ? "All" : OUTCOME[o].text}
            </button>
          ))}
        </div>
      </div>
      <div>
        {results.length === 0 && (
          <div className="state-card" style={{ margin: 16 }}>
            <h2>No matching experiments</h2>
            <p>Nothing in memory matches “{q}”. Clear the search or widen the outcome filter.</p>
            <button className="btn" onClick={() => (setQ(""), setOutcome("all"))}>
              Clear filters
            </button>
          </div>
        )}
        {results.map((i) => (
          <div key={i.id} className="list-link" style={{ gridTemplateColumns: "minmax(0,1fr) auto", display: "grid", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="mono muted" style={{ fontSize: 11 }}>
                  {i.id}
                </span>
                <strong style={{ fontWeight: 500 }}>{i.title}</strong>
                <span className={`badge ${OUTCOME[i.outcome].cls}`}>{OUTCOME[i.outcome].text}</span>
                <span className="badge">layer: {i.bottleneck}</span>
              </div>
              <div className="mono" style={{ fontSize: 12, marginTop: 6 }}>
                {i.intervention}
              </div>
              <div className="text-2" style={{ fontSize: 13, marginTop: 2 }}>
                {i.effect}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Caveats: {i.caveats.join(" ")}
              </div>
              <div className="label" style={{ fontSize: 10, marginTop: 6 }}>
                {i.workload} · {i.experimentId} · recorded {formatDate(i.recordedAt)}
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: 110 }}>
              <div className="label" style={{ fontSize: 10 }}>
                Workload similarity
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
                {(i.similarity * 100).toFixed(0)}%
              </div>
              <div className="conf-bar" style={{ marginLeft: "auto", width: 80 }}>
                <span style={{ width: `${i.similarity * 100}%` }} data-level={i.similarity > 0.8 ? "high" : i.similarity > 0.5 ? "medium" : "low"} />
              </div>
              {i.experimentId.startsWith("EXP-10") && (
                <Link href={`/console/experiments/${i.experimentId}`} className="sage" style={{ fontSize: 12, display: "inline-block", marginTop: 8 }}>
                  Open →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
