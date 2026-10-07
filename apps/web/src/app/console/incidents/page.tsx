import Link from "next/link";
import { METRICS, NOW, formatAgo, formatDelta, getIncidents } from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader, Panel } from "@/components/console/parts";
import { SeverityBadge } from "@/components/ui/badges";

export const metadata = { title: "Incidents" };

const STATUS_CLS: Record<string, string> = { investigating: "badge-bad", open: "badge-bad", resolved: "badge-good", dismissed: "", mitigated: "badge-warn" };

export default function IncidentsPage() {
  const incidents = getIncidents();
  return (
    <div className="page">
      <PageHeader
        title="Incidents"
        sub="Regression Guard compares post-change windows against the expected band after correcting for workload shape. Traffic shifts are separated from regressions, and correlation is never presented as a root cause."
      />
      <PageStates
        empty={{ title: "No incidents in the last 30 days", body: "Regression Guard is watching qwen-prod. You will see SLO misses, post-deploy regressions, traffic shifts and environment re-certifications here.", action: { label: "Back to overview", href: "/console" } }}
      >
        <Panel title="All incidents · qwen-prod" pad={false}>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Severity</th>
                  <th>Kind</th>
                  <th>Regression</th>
                  <th>Correlated change</th>
                  <th>Status</th>
                  <th className="r">Detected</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/console/incidents/${i.id}`} style={{ display: "block" }}>
                        <span className="id">{i.id}</span>
                        <div style={{ fontWeight: 500 }}>{i.title}</div>
                      </Link>
                    </td>
                    <td>
                      <SeverityBadge severity={i.severity} />
                    </td>
                    <td className="text-2">{i.kind.replace("_", " ")}</td>
                    <td className="num">
                      {i.baseline.value > 0 ? (
                        <>
                          {METRICS[i.metric].label} {formatDelta((i.observed.value - i.baseline.value) / i.baseline.value)}
                          <div className="muted" style={{ fontSize: 11 }}>
                            {Math.round(i.baseline.value)} → {Math.round(i.observed.value)} ms
                          </div>
                        </>
                      ) : (
                        <span className="muted">n/a</span>
                      )}
                    </td>
                    <td>
                      {i.correlatedChangeId ? (
                        <>
                          <span className="mono" style={{ fontSize: 12 }}>
                            {i.correlatedChangeId}
                          </span>
                          <div className="muted" style={{ fontSize: 11 }}>
                            confidence {i.correlationConfidence?.toFixed(2)} · not proven
                          </div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CLS[i.status] ?? ""}`}>{i.status.toUpperCase()}</span>
                    </td>
                    <td className="r muted">{formatAgo(i.detectedAt, NOW)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid cols-3" style={{ marginTop: 12 }}>
          {[
            ["Deployment", "Pre/post windows, workload-shape corrected", "Open a regression incident"],
            ["Traffic shift", "Fingerprint drift above 0.14", "Re-baseline, or start a new optimization cycle"],
            ["Driver / runtime update", "Environment fingerprint change", "Require benchmark re-certification"],
          ].map(([t, d, a]) => (
            <Panel key={t} title={`Trigger · ${t}`}>
              <dl className="kv">
                <dt>Detection</dt>
                <dd>{d}</dd>
                <dt>Action</dt>
                <dd>{a}</dd>
              </dl>
            </Panel>
          ))}
        </div>
      </PageStates>
    </div>
  );
}
