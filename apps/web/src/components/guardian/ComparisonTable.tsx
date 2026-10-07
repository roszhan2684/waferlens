import type { Comparison } from "@waferlens/benchmark";
import { formatDelta } from "@waferlens/shared";

const ROWS: { key: keyof Comparison; label: string; fmt: (v: number) => string; lowerIsBetter: boolean; guard?: string }[] = [
  { key: "ttftP95", label: "p95 TTFT", fmt: (v) => `${v.toFixed(0)} ms`, lowerIsBetter: true, guard: "Primary · SLO 700 ms" },
  { key: "ttftP50", label: "p50 TTFT", fmt: (v) => `${v.toFixed(0)} ms`, lowerIsBetter: true },
  { key: "itlP95", label: "p95 ITL", fmt: (v) => `${v.toFixed(1)} ms`, lowerIsBetter: true, guard: "Guardrail ≤ +5%" },
  { key: "throughput", label: "Throughput (saturation)", fmt: (v) => `${Math.round(v).toLocaleString("en-US")} tok/s`, lowerIsBetter: false },
  { key: "errorRate", label: "Error rate", fmt: (v) => `${(v * 100).toFixed(2)}%`, lowerIsBetter: true, guard: "Guardrail ≤ +0.05pp" },
  { key: "cost", label: "Cost / 1M output tokens", fmt: (v) => `$${v.toFixed(3)}`, lowerIsBetter: true },
];

/** Baseline vs candidate with relative change and 95% confidence interval (Welch, per-repetition). */
export function ComparisonTable({ comparison }: { comparison: Comparison }) {
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th>Metric</th>
            <th className="r">Baseline</th>
            <th className="r">Candidate</th>
            <th className="r">Change</th>
            <th className="r">95% CI</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const d = comparison[row.key];
            const better = row.lowerIsBetter ? d.relDelta < 0 : d.relDelta > 0;
            const ciOk = Number.isFinite(d.ci[0]);
            const significant = ciOk && (d.ci[0] > 0 || d.ci[1] < 0);
            return (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="r">{row.fmt(d.baselineMean)}</td>
                <td className="r">{row.fmt(d.candidateMean)}</td>
                <td className="r" style={{ color: !significant ? "var(--text-2)" : better ? "var(--good)" : "var(--bad)", fontWeight: 600 }}>
                  {formatDelta(d.relDelta)}
                </td>
                <td className="r muted">{ciOk ? `${formatDelta(d.ci[0])} … ${formatDelta(d.ci[1])}` : "undefined (n<2)"}</td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {row.guard ?? "Reported"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="label" style={{ fontSize: 10, padding: "8px 12px 0" }}>
        n = {comparison.ttftP95.n.baseline} baseline, {comparison.ttftP95.n.candidate} candidate repetitions · grey change = CI crosses zero
      </p>
    </div>
  );
}
