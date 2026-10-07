import Link from "next/link";
import { NOW, formatAgo, formatTime } from "@waferlens/shared";
import { TOOL_CONTRACTS, getInvestigations } from "@waferlens/agent-tools";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader, Panel } from "@/components/console/parts";
import { StateMachineBar } from "@/components/agent/StateMachineBar";
import { ConfidenceBadge, LiveBadge } from "@/components/ui/badges";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Performance Agent" };

export default function AgentIndex() {
  const invs = getInvestigations();
  return (
    <div className="page">
      <PageHeader
        title="Performance Agent"
        sub="Investigations run through a fixed state machine and a set of typed, read-mostly tools. Every hypothesis carries supporting, disconfirming and missing evidence. Metrics and experiments stay authoritative."
      />
      <PageStates
        empty={{ title: "No investigations yet", body: "Investigations open automatically from Regression Guard incidents and SLO burn alerts, or manually from an optimization objective.", action: { label: "Set an objective on Overview", href: "/console" } }}
        partial="DCGM is partial for replica-1. GPU-layer hypotheses in open investigations are capped at medium confidence."
      >
        <div className="stack">
          {invs.map((inv) => {
            const top = inv.hypotheses[0]!;
            return (
              <Link key={inv.id} href={`/console/agent/${inv.id}`} className="panel" style={{ display: "block" }}>
                <div className="panel-head">
                  <div className="row wrap" style={{ gap: 10 }}>
                    <span className="mono">{inv.id}</span>
                    <h2>{inv.title}</h2>
                    {inv.status === "running" ? <LiveBadge label="RUNNING" /> : <span className="badge badge-good">COMPLETED</span>}
                  </div>
                  <span className="label">
                    opened {formatAgo(inv.openedAt, NOW)} · {inv.agentVersion}
                  </span>
                </div>
                <div className="panel-body stack" style={{ gap: 14 }}>
                  <StateMachineBar state={inv.state} />
                  <div className="row-between wrap" style={{ alignItems: "flex-start" }}>
                    <div style={{ maxWidth: 760 }}>
                      <div className="label" style={{ marginBottom: 4 }}>
                        Top hypothesis · H1 · {top.layer}
                      </div>
                      <p style={{ fontSize: 15 }}>{top.claim}</p>
                    </div>
                    <ConfidenceBadge value={top.confidence} evidence={top.supporting.length + top.disconfirming.length} status={top.status} />
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {inv.toolCalls.length} tool calls · last action {formatTime(inv.toolCalls[inv.toolCalls.length - 1]!.at)} · linked {inv.incidentId}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <h2 className="section-title">
          Tool contracts <span className="label">the agent has no shell</span>
        </h2>
        <Panel title="Registered tools" pad={false}>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Purpose</th>
                  <th>Signature</th>
                  <th>Safety rule</th>
                  <th>Side effect</th>
                </tr>
              </thead>
              <tbody>
                {TOOL_CONTRACTS.map((t) => (
                  <tr key={t.name}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {t.name}
                    </td>
                    <td>{t.purpose}</td>
                    <td className="mono muted" style={{ fontSize: 11 }}>
                      {t.signature}
                    </td>
                    <td className="text-2">{t.safety}</td>
                    <td>
                      {t.requiresApproval ? (
                        <span className="badge badge-warn">
                          <Icon name="lock" size={10} /> {t.sideEffect.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="badge">{t.sideEffect}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </PageStates>
    </div>
  );
}
