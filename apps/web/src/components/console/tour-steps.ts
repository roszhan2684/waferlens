/**
 * The guided demo: the seven-minute script as a spotlight walkthrough.
 * Each step names a route and a [data-tour] target on that page.
 */
export interface TourStep {
  id: string;
  route: string;
  target: string;
  beat: string;
  title: string;
  body: string;
  /** Optional instruction for a step the viewer can try inside the spotlight. */
  tryIt?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "slo",
    route: "/console",
    target: "slo",
    beat: "0:00 · Objective",
    title: "qwen-prod is missing its SLO",
    body: "Qwen3-32B on vLLM, 4× H100. The objective: p95 time-to-first-token under 700 ms, then lower cost. Right now it's at about 900 ms, and Regression Guard has opened INC-212.",
  },
  {
    id: "metrics",
    route: "/console",
    target: "metrics",
    beat: "0:10 · Signals",
    title: "Every number carries its window and source",
    body: "Each cell compares the last hour with the same hour yesterday, so the daily traffic cycle doesn't pass for a regression. Hover any cell to see the Prometheus series behind it.",
  },
  {
    id: "chart",
    route: "/console",
    target: "chart",
    beat: "0:20 · Timeline",
    title: "One timeline, with every deploy pinned to it",
    body: "Diamonds are deployments. dep_5a21 shipped the verified fix; dep_7f3c, four hours ago, is where p95 jumped. The shaded band is the open incident. Switch between 24h, 72h and 7d.",
  },
  {
    id: "trace",
    route: "/console",
    target: "trace",
    beat: "0:30 · Serving path",
    title: "X-ray the serving path",
    body: "Requests in the p95 bucket spend most of their time in the queue. Move the lens over a stage to see what it's made of: right now 74% of queue time is the max_num_seqs admission cap.",
    tryIt: "Hover the rail, or switch to “Before (INC-207)”.",
  },
  {
    id: "coverage",
    route: "/console",
    target: "coverage",
    beat: "0:40 · Coverage",
    title: "Coverage caps confidence",
    body: "DCGM is partial and the kernel profiler is missing. The agent can't be more certain than its evidence, so GPU-memory hypotheses are capped at medium confidence.",
  },
  {
    id: "states",
    route: "/console/agent/INV-031",
    target: "states",
    beat: "0:45 · Investigation",
    title: "A fixed state machine, not a wandering agent",
    body: "INV-031 investigated the original SLO miss. It checked workload stability before blaming infrastructure, localized by layer, then designed experiments. Every step is a typed tool call.",
  },
  {
    id: "hypotheses",
    route: "/console/agent/INV-031",
    target: "hypotheses",
    beat: "1:00 · Hypotheses",
    title: "Evidence for, evidence against, evidence missing",
    body: "At most three hypotheses, each with calibrated confidence. H1 (KV cache exhaustion) was confirmed by experiment; the prefill-budget and traffic-shift hypotheses were rejected on evidence.",
  },
  {
    id: "actionlog",
    route: "/console/agent/INV-031",
    target: "actionlog",
    beat: "1:30 · Audit trail",
    title: "Every claim resolves to a tool call",
    body: "The action log is the evidence ledger: tool, arguments, duration, result. Replays and promotions show who approved them. The agent has no shell.",
    tryIt: "Press “Replay stream” to watch the events arrive.",
  },
  {
    id: "exp-list",
    route: "/console/experiments",
    target: "exp-list",
    beat: "2:30 · Experiments",
    title: "Four single-variable replays on the same capture",
    body: "One measured winner, one rejected, one blocked, one inconclusive. Failed experiments stay visible, searchable and in the customer report.",
  },
  {
    id: "gates",
    route: "/console/experiments/EXP-104",
    target: "gates",
    beat: "3:40 · Benchmark Guardian",
    title: "Nine deterministic gates, no LLM judge",
    body: "Workload parity, environment, warmup, repetition, timing, correctness, failure accounting, cache integrity and a reproducible bundle. A candidate with any FAIL or UNKNOWN can't be called a winner.",
  },
  {
    id: "adversarial",
    route: "/console/experiments/EXP-104",
    target: "adversarial",
    beat: "4:00 · Adversarial mode",
    title: "Try to fool the benchmark",
    body: "Inject a classic mistake. The headline number improves, the gate that catches it turns red, and the decision flips. It's the same code the tests run.",
    tryIt: "Tick “Output cache on” or “One lucky run”.",
  },
  {
    id: "approve",
    route: "/console/experiments/EXP-107",
    target: "approve",
    beat: "4:30 · Approval",
    title: "Replays need a human approval",
    body: "EXP-107 re-tests prefix caching on a production-like replay. Approve it and ten interleaved runs stream in. It ends rejected: the gain is real but below the 3% practical threshold.",
    tryIt: "Click “Approve and run”, then press Next.",
  },
  {
    id: "cause",
    route: "/console/incidents/INC-212",
    target: "cause",
    beat: "5:10 · Regression Guard",
    title: "Correlated, not proven",
    body: "dep_7f3c dropped --max-num-seqs from the rendered pod spec. WaferLens calls it correlated until EXP-108 replays the fix; when the replay finishes, this banner turns into a confirmed cause.",
  },
  {
    id: "correlation",
    route: "/console/incidents/INC-212",
    target: "correlation",
    beat: "5:40 · Change correlation",
    title: "Every change gets a step-change test",
    body: "The log-sampling deploy shows no step change, so it's ruled out. The promotion of the verified winner was an expected step. Only dep_7f3c is left.",
  },
  {
    id: "report",
    route: "/console/reports/RPT-014",
    target: "report-result",
    beat: "6:00 · Customer report",
    title: "A result a customer can challenge",
    body: "Methodology, every gate, the experiments that didn't work, limitations and an artifact hash. Click any headline number to see exactly how it was measured.",
    tryIt: "Click “981 → 648 ms”.",
  },
  {
    id: "controls",
    route: "/console",
    target: "controls",
    beat: "End",
    title: "That's the loop",
    body: "Measure the workload, find the bottleneck, prove the winner, and keep watching production. Replay this tour from here at any time, or use View state to preview loading, empty, degraded and error states.",
  },
];
