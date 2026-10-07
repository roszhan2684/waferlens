import Link from "next/link";
import {
  DAY,
  DEPLOYMENTS,
  HOUR,
  METRICS,
  MINUTE,
  NOW,
  T,
  TELEMETRY_SOURCES,
  TRACE_STAGES,
  WORKLOAD,
  coverageScore,
  fingerprints,
  formatAgo,
  formatDelta,
  formatTime,
  getIncident,
  getSeries,
  sloCompliance,
  windowStats,
  type MetricKey,
} from "@waferlens/shared";
import { downsample } from "@/components/charts/scale";
import { PageStates } from "@/components/console/PageStates";
import { MetricCell, PageHeader, Panel } from "@/components/console/parts";
import { OverviewChart, SmallMultiple } from "@/components/console/OverviewChart";
import { TraceRail } from "@/components/lens/TraceRail";
import { FingerprintGlyph } from "@/components/lens/FingerprintGlyph";
import { Icon } from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/badges";
import type { ChartMarker } from "@/components/charts/TimeSeriesChart";

export const metadata = { title: "Overview" };

function cell(key: MetricKey, fmt: (v: number) => [string, string?]) {
  const now = windowStats(key, NOW - HOUR, NOW);
  // Same hour yesterday: removes the diurnal cycle from the comparison.
  const before = windowStats(key, NOW - DAY - HOUR, NOW - DAY);
  const rel = (now.mean - before.mean) / before.mean;
  const spark = downsample(getSeries(key, NOW - DAY, NOW), 12).map((p) => p.v);
  const meta = METRICS[key];
  const good = meta.lowerIsBetter ? rel < 0 : rel > 0;
  const [value, unit] = fmt(now.mean);
  return { value, unit, delta: formatDelta(rel), deltaGood: Math.abs(rel) < 0.02 ? undefined : good, spark, source: meta.source };
}

export default function OverviewPage() {
  const slo = WORKLOAD.slo.ttftP95Ms;
  const p95 = getSeries("ttft_p95_ms");
  const p50 = getSeries("ttft_p50_ms");
  const markers: ChartMarker[] = DEPLOYMENTS.map((d) => ({
    id: d.id,
    t: new Date(d.at).getTime(),
    label: d.id,
    title: `${d.id} · ${d.title}`,
    tone: d.id === "dep_7f3c" ? "bad" : d.id === "dep_5a21" ? "sage" : "neutral",
  }));
  const ttftNow = windowStats("ttft_p95_ms", NOW - HOUR, NOW);
  const comp24 = sloCompliance(NOW - DAY, NOW, slo);
  const compTuned = sloCompliance(T.winnerPromoted + 15 * MINUTE, T.runtimeDeploy, slo);
  const inc = getIncident("INC-212")!;
  const cov = coverageScore();
  const fp = fingerprints.prodNow();
  const m72 = (k: MetricKey) => getSeries(k, NOW - 72 * HOUR, NOW);

  const c = {
    ttft: cell("ttft_p95_ms", (v) => [Math.round(v).toLocaleString("en-US"), "ms"]),
    itl: cell("itl_p95_ms", (v) => [v.toFixed(1), "ms"]),
    tput: cell("throughput_tok_s", (v) => [(v / 1000).toFixed(1) + "k", "tok/s"]),
    gpu: cell("gpu_util", (v) => [(v * 100).toFixed(0), "%"]),
    err: cell("error_rate", (v) => [(v * 100).toFixed(2), "%"]),
    cost: cell("cost_per_mtok", (v) => ["$" + v.toFixed(3), "/1M"]),
  };

  return (
    <div className="page">
      <PageHeader
        title="Overview"
        sub={
          <>
            <span className="mono">qwen-prod</span> · {WORKLOAD.model} on vLLM 0.11.1 · 2 replicas × TP2 on 4× H100 · us-east-2. Objective: {WORKLOAD.slo.objective}
          </>
        }
        actions={
          <>
            <Link href="/console/incidents/INC-212" className="btn">
              <Icon name="incidents" size={13} /> INC-212
            </Link>
            <Link href="/console/agent/INV-034" className="btn btn-primary">
              Open investigation <Icon name="arrow-right" size={13} />
            </Link>
          </>
        }
      />
      <PageStates
        empty={{
          title: "No telemetry yet for qwen-prod",
          body: "Point the collector at your vLLM /metrics endpoint and DCGM exporter. The first workload fingerprint appears after about 10 minutes of traffic.",
          code: "helm install waferlens-collector oci://registry.waferlens.dev/collector \\\n  --set workload=qwen-prod \\\n  --set vllm.metricsUrl=http://qwen:8000/metrics \\\n  --set apiKey=$WL_INGEST_KEY   # ingestion-only key",
          action: { label: "View integrations", href: "/console/settings" },
        }}
      >
        <div className="slo-strip" data-tour="slo" data-state={ttftNow.mean > slo ? "miss" : "ok"}>
          <div>
            <div className="label">p95 TTFT · last hour</div>
            <div className="row" style={{ gap: 10, marginTop: 6 }}>
              <span className="big-number num" style={{ color: ttftNow.mean > slo ? "var(--bad)" : "var(--text)" }}>
                {Math.round(ttftNow.mean)} ms
              </span>
              <StatusDot status={ttftNow.mean > slo ? "bad" : "good"} label={ttftNow.mean > slo ? `SLO miss · target ${slo} ms` : "Within SLO"} />
            </div>
          </div>
          <div className="text-2" style={{ fontSize: 13, lineHeight: 1.55 }}>
            Regressed {formatDelta((inc.observed.value - inc.baseline.value) / inc.baseline.value)} after <span className="mono">dep_7f3c</span> ({formatAgo(T.runtimeDeploy, NOW)}). Running batch is pinned at the 256-sequence ceiling while KV usage fell: admission control, not memory. Correlation confidence 0.64; <Link href="/console/experiments/EXP-108" className="sage">EXP-108</Link> is testing the cause.
            <div className="label" style={{ marginTop: 6 }}>
              SLO compliance: {(comp24 * 100).toFixed(1)}% of 5-min windows (24h) · {(compTuned * 100).toFixed(1)}% while EXP-104 config ran unmodified
            </div>
          </div>
          <div className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
            <span className="badge badge-bad">
              <Icon name="alert" size={12} /> SEV2 · investigating
            </span>
            <span className="label">detected {formatAgo(inc.detectedAt, NOW)}</span>
          </div>
        </div>

        <div className="metric-strip" data-tour="metrics">
          <MetricCell label="p95 TTFT" {...c.ttft} window="1h vs same hour yesterday" slo={slo} sloOk={ttftNow.mean <= slo} />
          <MetricCell label="p95 ITL" {...c.itl} window="1h vs same hour yesterday" slo={WORKLOAD.slo.itlP95Ms} sloOk />
          <MetricCell label="Output throughput" {...c.tput} window="1h · demand-bound" />
          <MetricCell label="GPU utilization" {...c.gpu} window="1h · mean of 4 GPUs" />
          <MetricCell label="Error rate" {...c.err} window="1h · 5xx + timeouts" />
          <MetricCell label="Cost / 1M out tok" {...c.cost} window="1h · $2.49/GPU-h" />
        </div>

        <div style={{ marginTop: 12 }}>
          <Panel tour="chart" title="p95 TTFT against SLO" actions={<span className="label">source: {METRICS.ttft_p95_ms.source}</span>}>
            <OverviewChart p95={p95} p50={p50} markers={markers} slo={slo} now={NOW} band={{ from: T.runtimeDeploy, to: NOW, label: "INC-212" }} />
          </Panel>
        </div>

        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <Panel title="KV cache usage · 72h" foot="Fell after dep_7f3c: memory pressure is not the cause this time.">
            <SmallMultiple title="KV cache usage" points={m72("kv_cache_usage")} format="pct" markers={markers} yMin={0} yMax={1} />
          </Panel>
          <Panel title="Running sequences · 72h" foot="Flat-topped at 256 = 2 replicas × max_num_seqs 128.">
            <SmallMultiple title="Running sequences" points={m72("batch_running")} format="int" markers={markers} yMin={0} />
          </Panel>
          <Panel title="Waiting requests · 72h" foot="Queue builds whenever demand exceeds the admission cap.">
            <SmallMultiple title="Waiting requests" points={m72("queue_waiting")} format="int" markers={markers} yMin={0} />
          </Panel>
        </div>

        <div style={{ marginTop: 12 }}>
          <Panel tour="trace" title="Serving path · p95 TTFT bucket" actions={<span className="label">X-ray lens</span>}>
            <TraceRail phases={TRACE_STAGES} initial="regressed" />
          </Panel>
        </div>

        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <Panel
            tour="coverage"
            title="Telemetry coverage"
            actions={<span className="mono num">{Math.round(cov * 100)}%</span>}
            foot="Coverage caps agent confidence: a hypothesis cannot be more certain than its evidence."
          >
            {TELEMETRY_SOURCES.map((s) => (
              <div className="coverage-row" key={s.id}>
                <Icon
                  className="cov-icon"
                  name={s.status === "healthy" ? "check" : s.status === "missing" ? "x" : "alert"}
                  size={13}
                  style={{ color: s.status === "healthy" ? "var(--good)" : s.status === "missing" ? "var(--bad)" : "var(--warn)" }}
                />
                <div>
                  <div>{s.label}</div>
                  {s.note && <div className="muted" style={{ fontSize: 12 }}>{s.note}</div>}
                </div>
                <span className="label">{s.status}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Workload fingerprint · 24h" actions={<span className="label">{fp.hash}</span>} foot={<>Stable vs the 24h before dep_7f3c (distance 0.006). <Link href="/console/replay" className="sage">Replay →</Link></>}>
            <FingerprintGlyph source={fp} sourceLabel="Production, last 24h" size={220} />
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Input p50/p99</dt>
              <dd className="num">
                {fp.inputTokens.p50.toLocaleString()} / {fp.inputTokens.p99.toLocaleString()} tok
              </dd>
              <dt>Output p50/p99</dt>
              <dd className="num">
                {fp.outputTokens.p50.toLocaleString()} / {fp.outputTokens.p99.toLocaleString()} tok
              </dd>
              <dt>Burstiness</dt>
              <dd className="num">CV {fp.burstiness}</dd>
              <dt>Concurrency</dt>
              <dd className="num">
                p50 {fp.concurrency.p50} · p99 {fp.concurrency.p99}
              </dd>
            </dl>
          </Panel>

          <div className="stack">
            <Panel title="Current winner in production" pad>
              <div className="row-between">
                <Link href="/console/experiments/EXP-104" className="mono sage">
                  EXP-104
                </Link>
                <span className="badge badge-good">
                  <Icon name="check" size={11} /> 9/9 gates
                </span>
              </div>
              <p style={{ margin: "8px 0 4px", fontSize: 13 }}>gpu_memory_utilization 0.80 → 0.92</p>
              <p className="muted" style={{ fontSize: 12 }}>
                Expected p95 648 ms on replay; production held {Math.round(windowStats("ttft_p95_ms", T.winnerPromoted + 15 * MINUTE, T.runtimeDeploy).mean)} ms until dep_7f3c.
              </p>
            </Panel>
            <Panel title="Recent changes" pad={false}>
              {[...DEPLOYMENTS].reverse().map((d) => (
                <div className="list-link" key={d.id}>
                  <div className="row-between">
                    <span className="mono" style={{ fontSize: 12 }}>
                      {d.id}
                    </span>
                    <span className="label">{formatAgo(d.at, NOW)}</span>
                  </div>
                  <span style={{ fontSize: 13 }}>{d.title}</span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {formatTime(d.at)} · {d.author}
                  </span>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      </PageStates>
    </div>
  );
}
