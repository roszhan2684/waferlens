import Link from "next/link";
import { notFound } from "next/navigation";
import { NOW, TRACE_STAGES, WORKLOAD, formatAgo, formatTime, getExperiment } from "@waferlens/shared";
import { getInvestigation, getInvestigations } from "@waferlens/agent-tools";
import { PageStates } from "@/components/console/PageStates";
import { ConfigDiff, PageHeader, Panel } from "@/components/console/parts";
import { StateMachineBar } from "@/components/agent/StateMachineBar";
import { HypothesisCard } from "@/components/agent/HypothesisCard";
import { AgentActionLog } from "@/components/agent/AgentActionLog";
import { TraceRail } from "@/components/lens/TraceRail";
import { LiveStatus } from "@/components/experiments/LiveStatus";
import { LiveBadge } from "@/components/ui/badges";
import { Icon } from "@/components/ui/icons";

export function generateStaticParams() {
  return getInvestigations().map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: id };
}

export default async function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = getInvestigation(id);
  if (!inv) notFound();
  const linked = inv.id === "INV-034" ? ["EXP-108"] : ["EXP-104", "EXP-105", "EXP-106", "EXP-103", "EXP-107"];
  const output = {
    problem_statement: inv.problemStatement,
    coverage_gaps: inv.coverageGaps,
    workload_shift_assessment: inv.workloadShiftAssessment,
    hypotheses: inv.hypotheses.map((h) => ({
      claim: h.claim,
      layer: h.layer,
      confidence_0_to_1: h.confidence,
      supporting_evidence: h.supporting.map((e) => `${e.source}: ${e.detail}`),
      disconfirming_evidence: h.disconfirming.map((e) => `${e.source}: ${e.detail}`),
      missing_evidence: h.missing,
      next_test: h.nextTest,
      expected_information_gain: h.expectedInformationGain,
      production_risk: h.productionRisk,
    })),
    recommended_experiment: {
      single_variable_change: `${inv.recommended.singleVariableChange.key}: ${inv.recommended.singleVariableChange.from} → ${inv.recommended.singleVariableChange.to}`,
      baseline: inv.recommended.baseline,
      candidate: inv.recommended.candidate,
      workload_capture_id: inv.recommended.workloadCaptureId,
      success_criteria: inv.recommended.successCriteria,
      stop_conditions: inv.recommended.stopConditions,
      rollback: inv.recommended.rollback,
    },
  };

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ href: "/console/agent", label: "Performance Agent" }]}
        eyebrow={
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="mono">{inv.id}</span>
            {inv.status === "running" ? <LiveBadge label="RUNNING" /> : <span className="badge badge-good">COMPLETED</span>}
            <span className="label">
              {inv.agentVersion} · opened {formatTime(inv.openedAt)} ({formatAgo(inv.openedAt, NOW)})
            </span>
          </div>
        }
        title={inv.title}
        actions={
          inv.incidentId && (
            <Link href={`/console/incidents/${inv.incidentId}`} className="btn">
              <Icon name="incidents" size={13} /> {inv.incidentId}
            </Link>
          )
        }
      />
      <PageStates
        empty={{ title: "This investigation has no events yet", body: "The agent is waiting for its first tool result. Events stream in over SSE as each tool call completes.", action: { label: "Back to investigations", href: "/console/agent" } }}
        partial="DCGM is partial. The agent capped GPU-memory hypotheses at medium confidence and listed the missing signal under Missing evidence."
      >
        <Panel tour="states" title="Investigation state">
          <StateMachineBar state={inv.state} />
        </Panel>

        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <Panel title="Problem statement">
            <p>{inv.problemStatement}</p>
          </Panel>
          <Panel title="Workload shift assessment">
            <p className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              <Icon name="check" size={14} style={{ color: "var(--good)", marginTop: 3, flex: "none" }} />
              {inv.workloadShiftAssessment}
            </p>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Checked before any infrastructure hypothesis was ranked.
            </p>
          </Panel>
          <Panel title="Coverage gaps">
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6 }}>
              {inv.coverageGaps.map((g) => (
                <li key={g} style={{ color: "var(--warn)" }}>
                  <span className="text-2">{g}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <h2 className="section-title">
          Hypotheses <span className="label">max 3 active · confidence is calibrated and updated by experiments</span>
        </h2>
        {inv.hypotheses.map((h, i) =>
          i === 0 ? (
            <div key={h.id} data-tour="hypotheses">
              <HypothesisCard h={h} />
            </div>
          ) : (
            <HypothesisCard key={h.id} h={h} />
          ),
        )}

        {inv.conclusion && (
          <div className="banner banner-sage" style={{ marginTop: 12 }}>
            <Icon name="shield" size={16} style={{ marginTop: 2, flex: "none", color: "var(--sage)" }} />
            <div>
              <strong>Conclusion.</strong> {inv.conclusion}
            </div>
          </div>
        )}

        <div className="grid cols-2" style={{ marginTop: 12, alignItems: "start" }}>
          <div className="stack">
            <Panel title="Recommended experiment" actions={<span className="label">single-variable change</span>}>
              <ConfigDiff diff={[inv.recommended.singleVariableChange]} />
              <dl className="kv" style={{ marginTop: 14 }}>
                <dt>Baseline</dt>
                <dd>{inv.recommended.baseline}</dd>
                <dt>Candidate</dt>
                <dd>{inv.recommended.candidate}</dd>
                <dt>Capture</dt>
                <dd className="mono">{inv.recommended.workloadCaptureId}</dd>
                <dt>Success</dt>
                <dd>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {inv.recommended.successCriteria.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </dd>
                <dt>Stop if</dt>
                <dd>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {inv.recommended.stopConditions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </dd>
                <dt>Rollback</dt>
                <dd>{inv.recommended.rollback}</dd>
              </dl>
            </Panel>
            <Panel title="Linked experiments">
              <div className="stack" style={{ gap: 18 }}>
                {linked.map((e) => (
                  <LiveStatus key={e} base={getExperiment(e)!} slo={WORKLOAD.slo.ttftP95Ms} approve />
                ))}
              </div>
            </Panel>
          </div>
          <Panel tour="actionlog" title="Agent action log" pad={false}>
            <AgentActionLog calls={inv.toolCalls} />
          </Panel>
        </div>

        <div style={{ marginTop: 12 }} id="trace">
          <Panel title="Serving path · layer localization">
            <TraceRail phases={TRACE_STAGES} initial={inv.id === "INV-031" ? "baseline" : "regressed"} />
          </Panel>
        </div>

        <details className="panel" style={{ marginTop: 12 }}>
          <summary className="panel-head" style={{ cursor: "pointer" }}>
            <h2>Raw investigation output</h2>
            <span className="label">schema investigation.v1 · JSON</span>
          </summary>
          <pre className="code" style={{ margin: 16, maxHeight: 480, overflow: "auto" }}>
            {JSON.stringify(output, null, 2)}
          </pre>
        </details>
      </PageStates>
    </div>
  );
}
