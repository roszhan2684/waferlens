"use client";

import { useState } from "react";
import type { AuditEvent, Integration, Member, Organization } from "@waferlens/shared";
import { formatTime } from "@waferlens/shared";
import { Icon } from "../ui/icons";

const TABS = ["Integrations", "Members & roles", "Approval policy", "Retention", "API keys", "Audit log", "Billing"] as const;
type Tab = (typeof TABS)[number];

const ROLES = ["owner", "admin", "engineer", "viewer", "customer_guest"] as const;
const PERMS: { action: string; allow: (typeof ROLES)[number][] }[] = [
  { action: "View workloads, metrics, investigations", allow: ["owner", "admin", "engineer", "viewer"] },
  { action: "Draft experiments", allow: ["owner", "admin", "engineer"] },
  { action: "Approve sandbox replays", allow: ["owner", "admin", "engineer"] },
  { action: "Approve production promotion / rollback", allow: ["owner", "admin"] },
  { action: "Publish customer reports", allow: ["owner", "admin"] },
  { action: "View shared reports", allow: ["owner", "admin", "engineer", "viewer", "customer_guest"] },
  { action: "Manage integrations & keys", allow: ["owner", "admin"] },
  { action: "Billing, SSO, retention", allow: ["owner"] },
];

export function SettingsTabs({ integrations, members, audit, org }: { integrations: Integration[]; members: Member[]; audit: AuditEvent[]; org: Organization }) {
  const [tab, setTab] = useState<Tab>("Integrations");
  return (
    <div className="panel">
      <div className="tabs" role="tablist" aria-label="Settings sections" style={{ padding: "0 8px" }}>
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="panel-body" role="tabpanel" aria-label={tab}>
        {tab === "Integrations" && (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Integration</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((i) => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 500 }}>{i.name}</td>
                    <td className="text-2">{i.category}</td>
                    <td>
                      <span className={`badge ${i.status === "connected" ? "badge-good" : i.status === "degraded" ? "badge-warn" : ""}`}>
                        <Icon name={i.status === "connected" ? "check" : i.status === "degraded" ? "alert" : "minus"} size={10} />
                        {i.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="text-2" style={{ fontSize: 12 }}>
                      {i.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Members & roles" && (
          <div className="stack" style={{ gap: 20 }}>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th className="r">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.name}
                        <div className="muted mono" style={{ fontSize: 11 }}>
                          {m.email}
                        </div>
                      </td>
                      <td>
                        <span className="badge">{m.role.replace("_", " ")}</span>
                      </td>
                      <td className="r muted">{formatTime(m.lastActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-wrap">
              <table className="t matrix">
                <caption className="label" style={{ textAlign: "left", padding: "0 12px 8px" }}>
                  Permission matrix · enforced server-side, tenant scoped
                </caption>
                <thead>
                  <tr>
                    <th>Action</th>
                    {ROLES.map((r) => (
                      <th key={r}>{r.replace("_", " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMS.map((p) => (
                    <tr key={p.action}>
                      <td>{p.action}</td>
                      {ROLES.map((r) => (
                        <td key={r} aria-label={p.allow.includes(r) ? "allowed" : "not allowed"}>
                          {p.allow.includes(r) ? <Icon name="check" size={13} style={{ color: "var(--good)" }} /> : <Icon name="minus" size={13} style={{ color: "var(--faint)" }} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Approval policy" && (
          <div className="stack">
            <pre className="code">{`policy "production-actions" {
  # MVP: every production-affecting action needs a named human approver.
  match   = tool in ["promote_candidate", "rollback"]
  require = approver.role in ["owner", "admin"] && approver != requester
  notify  = ["slack:#inference-perf"]
}

policy "sandbox-replay" {
  match   = tool == "run_replay"
  require = approver.role in ["owner", "admin", "engineer"]
  limits  = { max_requests = 100000, max_cost_usd = 60, max_concurrent_jobs = 1 }
}

policy "agent-tools" {
  # The agent has no shell. Unknown tools are rejected.
  allow   = registry.tools
  deny    = ["*secret*", "exec", "shell"]
}`}</pre>
            <p className="muted" style={{ fontSize: 12 }}>Policy-as-code is on the Enterprise roadmap; this is the effective MVP policy rendered for review.</p>
          </div>
        )}

        {tab === "Retention" && (
          <dl className="kv">
            <dt>Metrics</dt>
            <dd>{org.retention.metricsDays} days</dd>
            <dt>Traces</dt>
            <dd>{org.retention.tracesDays} days</dd>
            <dt>Artifacts</dt>
            <dd>{org.retention.artifactsDays} days · per-tenant S3 prefix · KMS encrypted · signed URLs expire in 15 min</dd>
            <dt>Payload samples</dt>
            <dd>{org.retention.payloadSamplesDays === 0 ? "Disabled (0 days). Quality evals that need text cannot run on this tenant." : `${org.retention.payloadSamplesDays} days`}</dd>
          </dl>
        )}

        {tab === "API keys" && (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Scope</th>
                  <th>Workload</th>
                  <th className="r">Last used</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["wl_ingest_••••••••3f1a", "ingest:write only", "qwen-prod", "15s ago"],
                  ["wl_ingest_••••••••91cc", "ingest:write only", "qwen-staging", "40s ago"],
                  ["wl_ci_••••••••0b27", "replay:read, experiments:create (draft)", "all", "2d ago"],
                ].map(([k, s, w, u]) => (
                  <tr key={k}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {k}
                    </td>
                    <td className="text-2">{s}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {w}
                    </td>
                    <td className="r muted">{u}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: 12, padding: "10px 12px 0" }}>
              Secret values are shown once at creation, stored in the cloud secret manager, and never placed in agent context or logs.
            </p>
          </div>
        )}

        {tab === "Audit log" && (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {formatTime(a.at)}
                    </td>
                    <td>
                      {a.actor} <span className="badge" style={{ height: 18, fontSize: 10, marginLeft: 4 }}>{a.actorKind}</span>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {a.action}
                    </td>
                    <td className="text-2">{a.resource}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {a.approvalRef ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: 12, padding: "10px 12px 0" }}>Append-only. Agent tool calls, approvals, experiment executions and report publication are always recorded.</p>
          </div>
        )}

        {tab === "Billing" && (
          <div className="grid cols-3">
            <div>
              <div className="label">Plan</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>Production</div>
              <div className="muted">$8,500 / month · illustrative</div>
            </div>
            <div>
              <div className="label">Production workloads</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>2 of 5</div>
              <div className="muted">qwen-prod, coder-batch</div>
            </div>
            <div>
              <div className="label">Replayed requests</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>1.18M of 2M</div>
              <div className="progress" style={{ marginTop: 8 }}>
                <span style={{ width: "59%" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
