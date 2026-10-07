import Link from "next/link";
import { REPLAY_JOBS, REPLAY_QUOTA, fingerprintDistance, fingerprints, formatTime, getCaptures } from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader, Panel } from "@/components/console/parts";
import { ReplayCompare } from "@/components/replay/ReplayCompare";
import { LiveBadge } from "@/components/ui/badges";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Workload Replay" };

const PRIVACY: Record<string, { label: string; body: string }> = {
  metadata_only: { label: "Metadata only", body: "Token counts, arrival times, sampling params hash, hashed prefix IDs. No text." },
  synthetic_templates: { label: "Synthetic templates", body: "Generated prompts that reproduce token shapes. May over-share prefixes." },
  encrypted_samples: { label: "Encrypted samples", body: "Opt-in, KMS-encrypted payload samples for quality evals. Retention: 0 days on this tenant." },
};

export default function ReplayPage() {
  const captures = getCaptures();
  const source = fingerprints.capture0918Source();
  const options = [
    {
      id: "cap_0918",
      label: "cap_0918 · templates",
      replay: fingerprints.replayTemplates(),
      distance: fingerprintDistance(source, fingerprints.replayTemplates()),
      note: "Used by EXP-103…106. Token shapes match, but synthetic templates share long system prefixes (71% reuse vs 9% in production) and long-context prompts are under-represented. Fine for configs that do not cache; invalid for prefix-cache experiments.",
    },
    {
      id: "cap_0918u",
      label: "cap_0918u · unique prefixes",
      replay: fingerprints.replayUnique(),
      distance: fingerprintDistance(source, fingerprints.replayUnique()),
      note: "Rebuilt with unique-prefix synthesis after EXP-106 was blocked. Prefix reuse 10% vs 9% in production. Used by EXP-107.",
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Workload Replay"
        sub="Replays preserve the shape of real traffic (token distributions, arrival burstiness, concurrency peaks, sampling settings) without copying customer payloads. Every replay reports its distance from the source."
        actions={
          <button className="btn" disabled title="Captures are created by the collector. Disabled in the demo.">
            New capture
          </button>
        }
      />
      <PageStates
        empty={{ title: "No captures yet", body: "A capture records request-shape metadata for a time window. Start with 24h of production traffic in metadata-only mode.", code: "waferlens capture create --workload qwen-prod --window 24h --privacy metadata_only", action: { label: "Back to overview", href: "/console" } }}
        partial="The OpenTelemetry sample rate is 5%. Arrival-process estimates use Prometheus request counters for the remaining 95%."
      >
        <Panel title="Captures" pad={false}>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Capture</th>
                  <th>Source window</th>
                  <th className="r">Requests</th>
                  <th className="r">Coverage</th>
                  <th>Privacy mode</th>
                  <th>Fingerprint</th>
                  <th>Production version</th>
                </tr>
              </thead>
              <tbody>
                {captures.map((c) => (
                  <tr key={c.id}>
                    <td className="id">{c.id}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {formatTime(c.startAt)} → {formatTime(c.endAt, false)}
                    </td>
                    <td className="r">{c.requests.toLocaleString("en-US")}</td>
                    <td className="r">{(c.coverage * 100).toFixed(1)}%</td>
                    <td>
                      <span className="badge" title={PRIVACY[c.privacyMode]!.body}>
                        <Icon name="lock" size={10} /> {PRIVACY[c.privacyMode]!.label}
                      </span>
                    </td>
                    <td className="mono muted" style={{ fontSize: 11 }}>
                      {c.fingerprint.hash}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {c.productionVersion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div style={{ marginTop: 12 }}>
          <ReplayCompare source={source} options={options} />
        </div>

        <div className="grid cols-3" style={{ marginTop: 12, alignItems: "start" }}>
          <div className="span-2">
            <Panel title="Replay jobs" pad={false} foot={`Quota: ${(REPLAY_QUOTA.usedRequests / 1e6).toFixed(2)}M / ${(REPLAY_QUOTA.monthlyRequests / 1e6).toFixed(0)}M requests · $${REPLAY_QUOTA.usedUsd.toFixed(0)} / $${REPLAY_QUOTA.monthlyBudgetUsd} this month. Jobs that would exceed the budget are rejected at queue time.`}>
              <div className="table-wrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Experiment</th>
                      <th>Capture</th>
                      <th>Mode</th>
                      <th className="r">Arrival ×</th>
                      <th className="r">Seed</th>
                      <th>Status</th>
                      <th className="r">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REPLAY_JOBS.map((j) => (
                      <tr key={j.id}>
                        <td className="id">{j.id}</td>
                        <td>{j.experimentId.startsWith("EXP") ? <Link href={`/console/experiments/${j.experimentId}`} className="sage mono">{j.experimentId}</Link> : <span className="muted">capacity probe</span>}</td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {j.captureId}
                        </td>
                        <td>{j.mode === "seeded" ? "Deterministic (seeded)" : "Randomized stress"}</td>
                        <td className="r">{j.arrivalScale.toFixed(1)}</td>
                        <td className="r mono">{j.seed}</td>
                        <td>
                          {j.status === "running" ? (
                            <LiveBadge label="RUNNING" />
                          ) : j.status === "awaiting_approval" ? (
                            <span className="badge badge-warn">
                              <Icon name="lock" size={10} /> APPROVAL
                            </span>
                          ) : (
                            <span className="badge">{j.status.toUpperCase()}</span>
                          )}
                        </td>
                        <td className="r">${j.quotaCostUsd.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
          <Panel title="Privacy modes">
            {Object.entries(PRIVACY).map(([k, p]) => (
              <div key={k} className="coverage-row" style={{ gridTemplateColumns: "18px minmax(0,1fr)" }}>
                <Icon name="lock" size={13} style={{ color: "var(--sage)", marginTop: 2 }} />
                <div>
                  <div>{p.label}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {p.body}
                  </div>
                </div>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Raw prompt and response bodies are never ingested for the performance workflow.
            </p>
          </Panel>
        </div>
      </PageStates>
    </div>
  );
}
