import Link from "next/link";
import {
  HOUR,
  MINUTE,
  NOW,
  T,
  TRACE_STAGES,
  fingerprintDistance,
  fingerprints,
  getExperiment,
  getSeries,
} from "@waferlens/shared";
import { TOOL_CONTRACTS } from "@waferlens/agent-tools";
import { decide } from "@waferlens/benchmark";
import { downsample } from "@/components/charts/scale";
import { HeroReplay, type HeroEvent } from "@/components/marketing/HeroReplay";
import { TraceRail } from "@/components/lens/TraceRail";
import { AdversarialLab } from "@/components/guardian/AdversarialLab";
import { FingerprintGlyph } from "@/components/lens/FingerprintGlyph";
import { ReplayValidity } from "@/components/lens/ReplayValidity";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";
import "./marketing.css";

const SLO = 700;

function heroData() {
  const points = downsample(getSeries("ttft_p95_ms", NOW - 72 * HOUR, NOW), 3);
  const events: HeroEvent[] = [
    { t: T.incident207Detected, kind: "detect", title: "SLO burn 6.2× · INC-207 opened", detail: "p95 TTFT above 700 ms for most of the day." },
    { t: T.investigation031Opened + 3 * MINUTE, kind: "agent", title: "Workload stable; 3 hypotheses ranked", detail: "Fingerprint distance 0.013. Top: KV exhaustion → preemption (r = 0.95)." },
    { t: T.experimentsStarted, kind: "experiment", title: "4 single-variable replays approved", detail: "cap_0918 · 50k requests · 5 interleaved reps per arm." },
    { t: T.experimentsCompleted, kind: "guard", title: "1 winner, 1 rejected, 1 blocked, 1 inconclusive", detail: "Prefix caching looked 48% faster; cache-integrity gate blocked it." },
    { t: T.winnerPromoted, kind: "promote", title: "EXP-104 promoted (dep_5a21)", detail: "gpu_memory_utilization 0.80 → 0.92. Production within about 2% of replay." },
    { t: T.unrelatedDeploy, kind: "change", title: "dep_6b02: log sampling change", detail: "No step change in p95 TTFT. Kept as a negative control." },
    { t: T.runtimeDeploy, kind: "change", title: "dep_7f3c: runtime 0.11.0 → 0.11.1", detail: "Chart 2.4.0 stopped rendering --max-num-seqs." },
    { t: T.incident212Detected, kind: "detect", title: "Regression Guard: INC-212", detail: "p95 TTFT +42% vs the 24h before, workload-shape corrected." },
    { t: T.investigation034Opened + 9 * MINUTE, kind: "agent", title: "Admission cap, not memory", detail: "Running batch pinned at 256; KV usage fell. Correlated, not yet proven." },
    { t: T.experiment108Started, kind: "experiment", title: "EXP-108 replay running", detail: "Pin max_num_seqs = 256 on 0.11.1. 6 of 10 runs complete." },
  ];
  return { points, events };
}

export default function Home() {
  const { points, events } = heroData();
  const exp104 = getExperiment("EXP-104")!;
  const verdict = decide(exp104, SLO);
  const cmp = verdict.comparison!;
  const replayDistance = fingerprintDistance(fingerprints.capture0918Source(), fingerprints.replayTemplates());
  const showTools = TOOL_CONTRACTS.filter((t) => ["get_workload_profile", "query_metrics", "compare_windows", "load_trace_summary", "propose_experiment", "run_replay", "verify_candidate", "promote_candidate"].includes(t.name));

  return (
    <>
      <a href="#main" className="visually-hidden">
        Skip to content
      </a>
      <header className="m-nav">
        <div className="m-wrap m-nav-inner">
          <Link href="/" aria-label="WaferLens home">
            <Logo />
          </Link>
          <nav className="m-nav-links" aria-label="Sections">
            <a href="#film">Film</a>
            <a href="#platform">Platform</a>
            <a href="#guardian">Benchmark Guardian</a>
            <a href="#agent">Agent</a>
            <a href="#security">Security</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <Link href="/console" className="btn btn-primary">
            Open console <Icon name="arrow-right" size={13} />
          </Link>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="hero">
          <div className="m-wrap">
            <div className="hero-grid">
              <div>
                <span className="eyebrow">Inference performance operations</span>
                <h1>
                  Inference you can <em>prove</em> is better.
                </h1>
                <p className="hero-sub">
                  Give WaferLens a real workload and an objective. It profiles the serving path, ranks evidence-backed hypotheses, runs controlled replays, blocks invalid wins, and keeps watching production after the change ships.
                </p>
                <div className="hero-ctas">
                  <Link href="/console" className="btn btn-sage btn-lg">
                    Open the live demo <Icon name="arrow-right" size={14} />
                  </Link>
                  <a href="#film" className="btn btn-lg">
                    <Icon name="play" size={13} /> Watch the 27s film
                  </a>
                </div>
                <p className="label hero-note">Measure the workload · Find the bottleneck · Prove the winner</p>
              </div>
              <HeroReplay points={points} events={events} slo={SLO} />
            </div>

            <div className="stat-strip">
              <div>
                <div className="label">p95 TTFT, replay</div>
                <div className="v num">
                  {Math.round(cmp.ttftP95.baselineMean)} → {Math.round(cmp.ttftP95.candidateMean)} ms
                </div>
                <div className="d">
                  95% CI {(cmp.ttftP95.ci[0] * 100).toFixed(1)}% to {(cmp.ttftP95.ci[1] * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="label">Capacity at saturation</div>
                <div className="v num">+{(cmp.throughput.relDelta * 100).toFixed(1)}%</div>
                <div className="d">Same 4× H100 pool</div>
              </div>
              <div>
                <div className="label">Benchmark Guardian</div>
                <div className="v num">
                  {verdict.summary.pass}/{verdict.summary.total} gates
                </div>
                <div className="d">Deterministic, decomposable</div>
              </div>
              <div>
                <div className="label">Regression detected</div>
                <div className="v num">{Math.round((T.incident212Detected - T.runtimeDeploy) / MINUTE)} min</div>
                <div className="d">After a runtime deploy</div>
              </div>
            </div>
          </div>
        </section>

        {/* Launch film */}
        <section className="m-section film" id="film">
          <div className="m-wrap">
            <div className="m-head film-head">
              <div>
                <span className="eyebrow">Launch film · 27 seconds · sound on</span>
                <h2>Watch it say no to a 48% win.</h2>
              </div>
              <p className="m-lede">A benchmark that looks too good, the gate that catches it, the real winner earning its number, and the regression that shows up four hours later.</p>
            </div>
            <div className="film-frame">
              <video
                className="film-video"
                src="/video/waferlens-launch.mp4"
                poster="/video/waferlens-launch.jpg"
                controls
                playsInline
                preload="metadata"
                aria-label="WaferLens launch film, 27 seconds, with narration"
              >
                <track kind="captions" src="/video/waferlens-launch.vtt" srcLang="en" label="English" />
              </video>
            </div>
            <p className="label" style={{ marginTop: 12 }}>
              Rendered from HTML with HyperFrames · narration by Kokoro TTS · simulated demo data
            </p>
          </div>
        </section>

        {/* Proof strip */}
        <section className="proof" aria-label="Ecosystem">
          <div className="m-wrap proof-inner">
            <span className="label">Built for</span>
            <span className="proof-item">vLLM</span>
            <span className="proof-item">NVIDIA DCGM</span>
            <span className="proof-item">
              AMD ROCm<small>roadmap</small>
            </span>
            <span className="proof-item">OpenTelemetry</span>
            <span className="proof-item">Prometheus</span>
            <span className="proof-item">Kubernetes</span>
            <span className="proof-item">Argo CD</span>
          </div>
        </section>

        {/* Platform */}
        <section className="m-section" id="platform">
          <div className="m-wrap">
            <div className="m-head">
              <span className="eyebrow">Platform</span>
              <h2>Profile the whole path. Not one dashboard at a time.</h2>
              <p className="m-lede">
                Latency comes from how the queue, scheduler, KV cache, kernels and hardware interact. WaferLens puts all of it on one timeline and refuses to guess between them.
              </p>
            </div>
            <div className="pillars">
              <div className="pillar">
                <span className="label">01 · Observe</span>
                <h3>One flight recorder</h3>
                <p>Engine, GPU, trace, deployment and cost signals aligned on one clock, with a workload fingerprint so you know when traffic, not infrastructure, changed.</p>
                <ul>
                  <li>vllm:num_preemptions_total</li>
                  <li>DCGM_FI_DEV_GPU_UTIL</li>
                  <li>rendered config hash per deploy</li>
                </ul>
              </div>
              <div className="pillar">
                <span className="label">02 · Investigate</span>
                <h3>An agent with an evidence contract</h3>
                <p>At most three hypotheses, each with supporting, disconfirming and missing evidence. Every claim resolves to a tool call, a metric or an experiment.</p>
                <ul>
                  <li>12 typed tools · no shell</li>
                  <li>workload check before infra blame</li>
                  <li>correlation is labeled as correlation</li>
                </ul>
              </div>
              <div className="pillar">
                <span className="label">03 · Verify</span>
                <h3>Measured wins only</h3>
                <p>Controlled replays of real traffic shape, interleaved repetitions, and nine deterministic gates before anything is called a winner.</p>
                <ul>
                  <li>workload parity · warmup · repetition</li>
                  <li>correctness · cache integrity</li>
                  <li>hashed artifact bundle</li>
                </ul>
              </div>
            </div>

            <div className="showcase">
              <div className="row-between wrap" style={{ marginBottom: 14 }}>
                <div>
                  <span className="label">Serving path · qwen-prod</span>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>Hover the rail. The lens shows the layer underneath.</h3>
                </div>
              </div>
              <TraceRail phases={TRACE_STAGES} initial="baseline" />
            </div>
          </div>
        </section>

        {/* Loop */}
        <section className="m-section" id="loop">
          <div className="m-wrap">
            <div className="m-head">
              <span className="eyebrow">Continual loop</span>
              <h2>Optimization does not end when the benchmark does.</h2>
            </div>
            <div className="loop">
              {[
                { n: "01", h: "Capture", p: "Record request shape, never prompt text: token distributions, arrivals, sampling settings, concurrency.", t: "captures · fingerprints · privacy modes" },
                { n: "02", h: "Diagnose", p: "Localize by layer, from queue to network. Rule out traffic shifts first.", t: "investigation state machine · ≤3 hypotheses" },
                { n: "03", h: "Experiment", p: "One variable at a time, replayed against the same workload, with rollback and stop conditions.", t: "seeded replay · interleaved reps · quotas" },
                { n: "04", h: "Verify", p: "Correctness, parity, warmup, repetition, environment, caches, failures. All of them, every time.", t: "Benchmark Guardian · 9 gates" },
                { n: "05", h: "Operate", p: "Compare production to the experiment's expectation and catch the next regression.", t: "Regression Guard · change correlation" },
              ].map((s) => (
                <div className="loop-step" key={s.n}>
                  <span className="label">{s.n}</span>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                  <div className="tools">{s.t}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guardian */}
        <section className="m-section" id="guardian">
          <div className="m-wrap">
            <div className="m-head">
              <span className="eyebrow">Benchmark Guardian</span>
              <h2>A faster wrong answer is a failed experiment.</h2>
              <p className="m-lede">
                This is EXP-104, the real winner from the demo. Inject a classic benchmarking mistake and watch the headline number improve while the decision flips. The gates run in your browser, using the same code as the console.
              </p>
            </div>
            <AdversarialLab experiment={exp104} slo={SLO} faults={["cold_baseline", "drop_failures", "output_cache", "request_mix", "lucky_run"]} compact />
          </div>
        </section>

        {/* Replay */}
        <section className="m-section" id="replay">
          <div className="m-wrap two-col">
            <div>
              <span className="eyebrow">Workload replay</span>
              <h2>Real traffic shape. No customer payloads.</h2>
              <p className="m-lede">
                Every replay reports its distance from the traffic it claims to represent. When it under-represents long prompts or over-represents shared prefixes, WaferLens says so and carries the gap into the report.
              </p>
              <div style={{ marginTop: 28 }}>
                <ReplayValidity distance={replayDistance} sourceLabel="Prod" targetLabel="cap_0918" />
              </div>
            </div>
            <div className="showcase" style={{ marginTop: 0 }}>
              <FingerprintGlyph source={fingerprints.capture0918Source()} target={fingerprints.replayTemplates()} sourceLabel="Production (48h)" targetLabel="Replay cap_0918" size={320} />
            </div>
          </div>
        </section>

        {/* Agent */}
        <section className="m-section" id="agent">
          <div className="m-wrap two-col">
            <div>
              <span className="eyebrow">Performance agent</span>
              <h2>The AI is never the source of truth.</h2>
              <p className="m-lede">
                The agent plans and investigates. Metrics, traces, experiment results and deployment history stay authoritative. It works through typed tools with explicit safety rules, and anything that touches production waits for a human.
              </p>
              <pre className="code" style={{ marginTop: 28 }}>{`hypothesis {
  claim:               "KV cache exhaustion forces preemption"
  layer:               scheduler
  confidence:          0.93   # calibrated, updated by EXP-104
  supporting:          [kv p95 99.5%, r=0.95 preemptions↔ttft]
  disconfirming:       [ITL p95 flat at 38.1 ms]
  missing:             [kernel profile is 9 days old]
  next_test:           replay gpu_memory_utilization 0.92
  production_risk:     low
}`}</pre>
            </div>
            <div className="contract" role="table" aria-label="Agent tool contracts">
              <div className="contract-row label" role="row" style={{ fontSize: 10 }}>
                <span role="columnheader">Tool</span>
                <span role="columnheader" className="purpose">
                  Safety rule
                </span>
                <span role="columnheader">Access</span>
              </div>
              {showTools.map((t) => (
                <div className="contract-row" role="row" key={t.name}>
                  <span className="name" role="cell">
                    {t.name}
                  </span>
                  <span className="purpose muted" role="cell">
                    {t.safety}
                  </span>
                  <span role="cell">
                    {t.requiresApproval ? (
                      <span className="badge badge-warn">
                        <Icon name="lock" size={11} /> approval
                      </span>
                    ) : t.readOnly ? (
                      <span className="badge">read-only</span>
                    ) : (
                      <span className="badge">draft</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="m-section" id="security">
          <div className="m-wrap">
            <div className="m-head">
              <span className="eyebrow">B2B readiness</span>
              <h2>Built for teams that cannot send prompts to a vendor.</h2>
            </div>
            <div className="ready">
              {[
                { i: "lock" as const, h: "Metadata-only by default", p: "Request shape, timings and hashes. Payload samples are opt-in, encrypted, and have their own retention policy." },
                { i: "shield" as const, h: "Tenant isolation", p: "organization_id on every row, enforced in the service layer, with cross-tenant tests in CI." },
                { i: "inventory" as const, h: "Bring your own cloud", p: "Collector and replay workers run in your VPC. Only control metadata reaches the SaaS plane." },
                { i: "git" as const, h: "Immutable audit log", p: "Agent tool calls, approvals, experiment runs and report publication, each with an approval reference." },
                { i: "agent" as const, h: "Roles and approvals", p: "Owner, Admin, Engineer, Viewer, Customer Guest. Production-affecting actions require a named approver." },
                { i: "settings" as const, h: "SSO and SCIM", p: "OIDC on every plan. SAML and SCIM on Enterprise. Scoped, ingestion-only collector keys." },
              ].map((c) => (
                <div key={c.h}>
                  <Icon name={c.i} size={18} style={{ color: "var(--sage)" }} />
                  <h3>{c.h}</h3>
                  <p>{c.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="m-section" id="pricing">
          <div className="m-wrap">
            <div className="m-head">
              <span className="eyebrow">Pricing</span>
              <h2>Priced on workloads, not seats.</h2>
              <p className="m-lede">The value is engineering time and GPU spend, so plans scale with production workloads, replay volume and deployment model. Prices are illustrative.</p>
            </div>
            <div className="pricing">
              {[
                { n: "Team", p: "$2,500", u: "/mo", b: "Small AI infra team", f: ["1 production workload, 3 environments", "Performance agent + experiments", "Benchmark Guardian reports", "500k replayed requests / mo"], featured: false, cta: "Start a pilot" },
                { n: "Production", p: "$8,500", u: "/mo", b: "AI-native company", f: ["Multiple production workloads", "Regression Guard + deploy correlation", "Performance CI, Slack, PagerDuty", "2M replayed requests / mo"], featured: true, cta: "Open the demo" },
                { n: "Enterprise", p: "Custom", u: "annual", b: "Inference provider / large enterprise", f: ["BYOC collector and replay workers", "SAML, SCIM, custom retention", "Private networking", "Dedicated performance engineer"], featured: false, cta: "Talk to us" },
              ].map((p) => (
                <div className={`plan${p.featured ? " is-featured" : ""}`} key={p.n}>
                  <div className="row-between">
                    <span className="label">{p.n}</span>
                    {p.featured && <span className="badge badge-sage">Most teams</span>}
                  </div>
                  <div className="price">
                    {p.p} <small>{p.u}</small>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {p.b}
                  </div>
                  <ul>
                    {p.f.map((f) => (
                      <li key={f}>
                        <Icon name="check" size={12} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/console" className={`btn ${p.featured ? "btn-sage" : ""}`}>
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta">
          <div className="m-wrap">
            <span className="eyebrow">Performance proof · 2 weeks</span>
            <h2 style={{ margin: "18px 0 28px" }}>Bring one workload. Leave with a result you can defend.</h2>
            <div className="hero-ctas">
              <Link href="/console" className="btn btn-sage btn-lg">
                Open the live demo <Icon name="arrow-right" size={14} />
              </Link>
              <Link href="/console/reports/RPT-014" className="btn btn-lg">
                Read a sample evaluation report
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="m-footer">
        <div className="m-wrap m-footer-grid">
          <div className="stack" style={{ gap: 10 }}>
            <Logo size={18} />
            <p className="disclaimer">
              WaferLens is an independent portfolio project. It is not affiliated with, endorsed by, or used by Wafer. Every workload, customer, metric and incident on this site is simulated demo data generated from a fixed seed.
            </p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="label">Product</span>
            <Link href="/console">Console</Link>
            <Link href="/console/experiments">Experiments</Link>
            <Link href="/console/reports/RPT-014">Sample report</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
