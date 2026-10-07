import Link from "next/link";
import { NOW, REPORTS, formatAgo } from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader, Panel } from "@/components/console/parts";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="page">
      <PageHeader
        title="Customer reports"
        sub="Technical evaluations a customer's engineers can challenge: methodology, every gate, failed candidates, limitations and a reproducible artifact bundle. Headline numbers link to how they were measured."
      />
      <PageStates empty={{ title: "No reports yet", body: "Generate a report from any completed experiment. Drafts stay internal until you choose a share scope.", action: { label: "Open experiments", href: "/console/experiments" } }}>
        <Panel title="Reports" pad={false}>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Experiment</th>
                  <th>Audience</th>
                  <th>Share scope</th>
                  <th>Status</th>
                  <th className="r">Created</th>
                </tr>
              </thead>
              <tbody>
                {REPORTS.map((r) => {
                  const linkable = r.id !== "RPT-011";
                  return (
                    <tr key={r.id}>
                      <td>
                        {linkable ? (
                          <Link href={`/console/reports/${r.id}`} style={{ display: "block" }}>
                            <span className="id">{r.id}</span>
                            <div style={{ fontWeight: 500 }}>{r.title}</div>
                          </Link>
                        ) : (
                          <>
                            <span className="id">{r.id}</span>
                            <div style={{ fontWeight: 500 }}>{r.title}</div>
                            <div className="muted" style={{ fontSize: 11 }}>
                              Archived · coder-batch workload not included in this demo
                            </div>
                          </>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {r.experimentId}
                      </td>
                      <td className="text-2">{r.audience}</td>
                      <td>
                        <span className="badge">
                          <Icon name="lock" size={10} /> {r.shareScope.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.status === "published" ? "badge-good" : "badge-warn"}`}>{r.status.toUpperCase()}</span>
                      </td>
                      <td className="r muted">{formatAgo(r.createdAt, NOW)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <Panel title="Every report includes">
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4, fontSize: 13 }}>
              <li>Baseline vs winner with 95% CIs</li>
              <li>All 9 gates with their evidence</li>
              <li>Experiments that did not work</li>
              <li>Limitations, stated plainly</li>
              <li>Artifact hash + reproduce command</li>
            </ul>
          </Panel>
          <Panel title="Share scopes">
            <dl className="kv">
              <dt>Internal</dt>
              <dd>Workspace members</dd>
              <dt>Customer link</dt>
              <dd>Signed URL, 14-day expiry, Customer Guest role</dd>
              <dt>Public link</dt>
              <dd>Enterprise only; requires Owner approval</dd>
            </dl>
          </Panel>
          <Panel title="Roadmap">
            <p className="text-2" style={{ fontSize: 13 }}>
              Signed benchmark attestations: the artifact bundle hash, signed by the tenant key, so a third party can verify the report was not edited after publication.
            </p>
          </Panel>
        </div>
      </PageStates>
    </div>
  );
}
