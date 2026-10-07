import { WORKLOAD, getExperiments } from "@waferlens/shared";
import { POLICY } from "@waferlens/benchmark";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader, Panel } from "@/components/console/parts";
import { ExperimentsList } from "@/components/experiments/ExperimentsList";

export const metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  const order = ["EXP-108", "EXP-107", "EXP-104", "EXP-105", "EXP-106", "EXP-103"];
  const exps = order.map((id) => getExperiments().find((e) => e.id === id)!);
  return (
    <div className="page">
      <PageHeader
        title="Experiments"
        sub="Single-variable changes replayed against the same captured workload, with interleaved repetitions. Nothing is a winner until all nine Benchmark Guardian gates pass."
      />
      <PageStates
        empty={{ title: "No experiments yet", body: "Experiments are drafted by the Performance Agent or by hand, and only run after approval. Start from a hypothesis.", action: { label: "Open Performance Agent", href: "/console/agent" } }}
        degraded="Experiment workers are paused: metrics ingestion is 6 minutes behind, and timing comparisons need a live metrics store. Queued runs will resume automatically."
      >
        <ExperimentsList experiments={exps} slo={WORKLOAD.slo.ttftP95Ms} />
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <Panel title="Decision rule">
            <ol style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6, fontSize: 13 }}>
              <li>Any gate FAIL with an apparent speedup → <strong>promising, unverified</strong>.</li>
              <li>Any gate UNKNOWN → <strong>inconclusive</strong>.</li>
              <li>All gates pass but SLO, guardrail or effect size misses → <strong>rejected</strong>.</li>
              <li>Otherwise → <strong>measured winner</strong>.</li>
            </ol>
          </Panel>
          <Panel title="Policy thresholds">
            <dl className="kv">
              <dt>Repetitions</dt>
              <dd>≥ {POLICY.minRepetitions} per arm, CV ≤ {POLICY.maxRepCv * 100}%</dd>
              <dt>Warmup</dt>
              <dd>≥ {POLICY.minWarmup} requests, equal across arms</dd>
              <dt>Effect size</dt>
              <dd>CI upper bound ≤ −{POLICY.minPracticalEffect * 100}%</dd>
              <dt>ITL guardrail</dt>
              <dd>≤ +{POLICY.maxItlRegression * 100}%</dd>
              <dt>Prefix gap</dt>
              <dd>≤ {POLICY.maxPrefixHitGap * 100}pp vs production</dd>
            </dl>
          </Panel>
          <Panel title="Quota">
            <dl className="kv">
              <dt>Replay sandbox</dt>
              <dd>4× H100 · 1 job at a time</dd>
              <dt>This month</dt>
              <dd>1.18M / 2M replayed requests</dd>
              <dt>Spend</dt>
              <dd>$612 / $1,500 budget</dd>
              <dt>Hard stop</dt>
              <dd>Jobs past budget are rejected at queue time</dd>
            </dl>
          </Panel>
        </div>
      </PageStates>
    </div>
  );
}
