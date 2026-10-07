import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DAY,
  DEPLOYMENTS,
  HOUR,
  METRICS,
  MINUTE,
  NOW,
  T,
  WORKLOAD,
  compareAround,
  fingerprintDistance,
  fingerprints,
  formatAgo,
  formatDelta,
  formatTime,
  getExperiment,
  getIncident,
  getIncidents,
  getSeries,
  windowStats,
} from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { ConfigDiff, IncidentTimeline, PageHeader, Panel } from "@/components/console/parts";
import { CauseBanner, IncidentChart, RollbackPanel } from "@/components/incidents/IncidentClient";
import { LiveStatus } from "@/components/experiments/LiveStatus";
import { FingerprintGlyph } from "@/components/lens/FingerprintGlyph";
import { ReplayValidity } from "@/components/lens/ReplayValidity";
import { SeverityBadge } from "@/components/ui/badges";
import { Icon } from "@/components/ui/icons";
import type { ChartMarker } from "@/components/charts/TimeSeriesChart";

export function generateStaticParams() {
  return getIncidents().map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: id };
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inc = getIncident(id);
  if (!inc) notFound();
  const slo = WORKLOAD.slo.ttftP95Ms;
  const detected = new Date(inc.detectedAt).getTime();
  const markers: ChartMarker[] = DEPLOYMENTS.map((d) => ({ id: d.id, t: new Date(d.at).getTime(), label: d.id, title: d.title, tone: d.id === inc.correlatedChangeId ? "bad" : d.id === "dep_5a21" ? "sage" : "neutral" }));
  const change = DEPLOYMENTS.find((d) => d.id === inc.correlatedChangeId);

  // Step-change test for every deployment in the 30h before detection.
  const candidates = DEPLOYMENTS.filter((d) => {
    const t = new Date(d.at).getTime();
    return t < detected && t > detected - 30 * HOUR;
  }).map((d) => {
    const t = new Date(d.at).getTime();
    const span = Math.min(3 * HOUR + 30 * MINUTE, NOW - t - 15 * MINUTE);
    const cmp = compareAround("ttft_p95_ms", t, span);
    return { d, rel: cmp.relDelta, step: Math.abs(cmp.relDelta) > 0.1 };
  });

  const win = inc.kind === "slo_miss" ? { from: T.incident207Detected - DAY, to: T.winnerPromoted + 12 * HOUR } : inc.kind === "regression" ? { from: T.runtimeDeploy - DAY, to: NOW } : { from: detected - DAY, to: Math.min(NOW, detected + DAY) };
  const p95 = getSeries("ttft_p95_ms", win.from, win.to);
  const running = getSeries("batch_running", win.from, win.to);

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ href: "/console/incidents", label: "Incidents" }]}
        eyebrow={
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="mono">{inc.id}</span>
            <SeverityBadge severity={inc.severity} />
            <span className={`badge ${inc.status === "investigating" ? "badge-bad" : inc.status === "resolved" ? "badge-good" : ""}`}>{inc.status.toUpperCase()}</span>
            <span className="label">
              detected {formatTime(inc.detectedAt)} · {formatAgo(inc.detectedAt, NOW)}
            </span>
          </div>
        }
        title={inc.title}
        sub={inc.summary}
        actions={
          inc.investigationId && (
            <Link href={`/console/agent/${inc.investigationId}`} className="btn btn-primary">
              <Icon name="agent" size={13} /> {inc.investigationId}
            </Link>
          )
        }
      />
      <PageStates
        empty={{ title: "Incident has no data yet", body: "Regression Guard opened this incident but the comparison window is still filling. Check back in 15 minutes.", action: { label: "All incidents", href: "/console/incidents" } }}
        partial="DCGM is partial for replica-1. GPU-side evidence in this incident uses 3 of 4 GPUs."
      >
        {inc.kind === "regression" && <CauseBanner base={getExperiment("EXP-108")!} slo={slo} confidence={inc.correlationConfidence ?? 0} />}
        {inc.resolution && (
          <div className="banner banner-sage">
            <Icon name="check" size={16} style={{ marginTop: 2, flex: "none", color: "var(--good)" }} />
            <div>
              <strong>{inc.status === "dismissed" ? "Dismissed." : "Resolved."}</strong> {inc.resolution}
            </div>
          </div>
        )}

        <div className="grid cols-3" style={{ marginTop: 12 }}>
          {inc.baseline.value > 0 && (
            <Panel title="Regression">
              <div className="row" style={{ gap: 12, alignItems: "baseline" }}>
                <span className="big-number num">{formatDelta((inc.observed.value - inc.baseline.value) / inc.baseline.value)}</span>
                <span className="label">{METRICS[inc.metric].label}</span>
              </div>
              <dl className="kv" style={{ marginTop: 14 }}>
                <dt>Baseline</dt>
                <dd className="num">
                  {Math.round(inc.baseline.value)} ms <span className="muted">· {inc.baseline.window}</span>
                </dd>
                <dt>Observed</dt>
                <dd className="num">
                  {Math.round(inc.observed.value)} ms <span className="muted">· {inc.observed.window}</span>
                </dd>
                <dt>Source</dt>
                <dd className="mono" style={{ fontSize: 11 }}>
                  {METRICS[inc.metric].source}
                </dd>
              </dl>
            </Panel>
          )}
          {change && (
            <Panel title="Correlated change" actions={<span className="label">{change.id}</span>}>
              <p style={{ marginBottom: 10 }}>{change.title}</p>
              <ConfigDiff diff={change.diff} />
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                {formatTime(change.at)} · {change.author} · {change.containerDigest}
              </p>
            </Panel>
          )}
          {inc.kind === "regression" && (
            <Panel title="Rollback context">
              <RollbackPanel previous="vllm-serve:0.11.0 · sha256:4be1c07e9a2d" eta="~6 min (2 replicas, rolling)" />
            </Panel>
          )}
          {inc.kind === "traffic_shift" && (
            <Panel title="Fingerprint drift" actions={<span className="label">before → during backfill</span>}>
              <FingerprintGlyph source={fingerprints.prodLastWeek()} target={fingerprints.shifted()} sourceLabel="Normal traffic" targetLabel="Backfill window" size={240} />
            </Panel>
          )}
          {inc.kind === "traffic_shift" && (
            <div className="span-2">
              <Panel title="Workload shift assessment">
                <ReplayValidity distance={fingerprintDistance(fingerprints.prodLastWeek(), fingerprints.shifted())} sourceLabel="Normal" targetLabel="Backfill" />
              </Panel>
            </div>
          )}
          {inc.kind === "slo_miss" && (
            <Panel title="Expected vs observed after fix">
              <dl className="kv">
                <dt>Replay (EXP-104)</dt>
                <dd className="num">648 ms p95 TTFT</dd>
                <dt>Production</dt>
                <dd className="num">{Math.round(windowStats("ttft_p95_ms", T.winnerPromoted + 15 * MINUTE, T.winnerPromoted + 12 * HOUR).mean)} ms (first 12h after dep_5a21)</dd>
                <dt>Verdict</dt>
                <dd>Production within the experiment&apos;s expected band</dd>
              </dl>
            </Panel>
          )}
        </div>

        <div className="grid cols-2" style={{ marginTop: 12 }}>
          <Panel title="p95 TTFT around the incident">
            <IncidentChart title="p95 TTFT" points={p95} markers={markers} slo={slo} band={inc.kind === "regression" ? { from: T.runtimeDeploy, to: NOW, label: inc.id } : undefined} />
          </Panel>
          <Panel title="Running sequences">
            <IncidentChart title="Running sequences" points={running} markers={markers} format="int" />
          </Panel>
        </div>

        {candidates.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Panel tour="correlation" title="Change correlation" actions={<span className="label">every change in the 30h before detection</span>} pad={false}>
              <div className="table-wrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Change</th>
                      <th>What changed</th>
                      <th className="r">p95 TTFT across change</th>
                      <th>Step change?</th>
                      <th>Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(({ d, rel, step }) => (
                      <tr key={d.id}>
                        <td className="id">{d.id}</td>
                        <td>{d.title}</td>
                        <td className="r">{formatDelta(rel)}</td>
                        <td>{step ? <span className="badge badge-bad">YES</span> : <span className="badge">NO</span>}</td>
                        <td className="text-2">{d.id === inc.correlatedChangeId ? "Correlated. Testing in EXP-108." : step ? "Step change, but expected (promotion of a verified winner)." : "Ruled out: no step change."}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        <div className="grid cols-2" style={{ marginTop: 12, alignItems: "start" }}>
          <Panel title="Timeline">
            <IncidentTimeline items={inc.timeline} />
          </Panel>
          {inc.kind === "regression" && (
            <Panel title="Confirming experiment">
              <LiveStatus base={getExperiment("EXP-108")!} slo={slo} />
              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                Same image and driver as production; only the rendered <code className="inline">max_num_seqs</code> differs. If it restores p95 TTFT, the runtime version is exonerated.
              </p>
            </Panel>
          )}
        </div>
      </PageStates>
    </div>
  );
}
