# Seven-minute technical demo

All routes are under `/console`. The same script runs as a **guided tour**: a 16-step spotlight that starts on the first console visit and can be restarted from **Guided tour** in the top bar. Steps live in `apps/web/src/components/console/tour-steps.ts`; each one names a route and a `data-tour` target.

| Time | Beat | Where | What to show |
|---|---|---|---|
| 0:00 | Objective | `/console` | qwen-prod's p95 TTFT against the 700 ms SLO over 72h, with deploy markers. Telemetry coverage (87%, DCGM partial, profiler missing) and the workload fingerprint. |
| 0:45 | Hypotheses | `/console/agent/INV-031` | State machine. Workload stability checked first (distance 0.013). Three hypotheses with supporting, disconfirming and missing evidence; each evidence item links to a tool call. |
| 1:45 | Localize | `/console/agent/INV-031#trace` | X-ray lens on the "Before" rail: queue time is 52% KV-block wait, 31% preempt-recompute. |
| 2:30 | Replay | `/console/experiments` | Four single-variable experiments on cap_0918, interleaved 5×5. Open EXP-104 for the diff, the per-run dot plot and the CIs. |
| 3:40 | Guardian | `/console/experiments/EXP-104#adversarial` | 9/9 gates. Toggle "Output cache on" or "One lucky run": the number improves and the decision flips. Then show EXP-106, blocked by cache integrity. |
| 4:30 | Promote | `/console/incidents/INC-207` | dep_5a21 ships EXP-104. Production lands within about 2% of the replay. |
| 5:10 | Regression | `/console/incidents/INC-212` | dep_7f3c dropped `--max-num-seqs`. Running batch is flat-topped at 256 while KV usage *fell*: admission, not memory. "Correlated, not proven" until EXP-108 completes (about 12s live), then "confirmed". Request a rollback: it needs a human. |
| 6:00 | Report | `/console/reports/RPT-014` | Methodology, all gates, what did not work, limitations, artifact hash. Click a headline number to challenge it. Print to PDF. |

Optional extra if time allows: approve EXP-107 and let it run. It ends **rejected**, because the effect is real but below the 3% threshold. That is a good moment to say "customer trust beats demo theatrics".
