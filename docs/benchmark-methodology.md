# Benchmark methodology (guardian-methodology v1.3)

Benchmark Guardian is deterministic. No LLM is involved in any gate or decision. Code: `packages/benchmark/src/gates.ts`. Tests: `tests/unit/benchmark.test.ts`.

## Procedure

- **Workload.** Both arms replay the same capture, with the same distribution hash and request count. Captures hold request-shape metadata only.
- **Order.** Interleaved repetitions (baseline, candidate, baseline, …) with a randomized start arm. 5 repetitions per arm by default.
- **Warmup.** The first 500 requests per run are discarded, the engine restarts between arms, and CUDA graphs are captured before timing.
- **Timing boundary.** Client send → first token received, on the load generator's clock.
- **Errors.** Failed requests count as timeouts in latency statistics. They are never dropped.
- **Throughput.** Measured at saturation (replay arrival rate ×1.5), so it reflects capacity rather than demand.

## Mandatory gates

| # | Gate | PASS when | Otherwise |
|---|---|---|---|
| 1 | Workload parity | same capture, distribution hash, request count | FAIL |
| 2 | Environment fingerprint | accelerator, count, driver, CUDA, engine, model, tokenizer, container, commit recorded and identical | UNKNOWN if missing, FAIL if different |
| 3 | Warmup | equal warmup in both arms, ≥ 200 requests | FAIL |
| 4 | Repetition | ≥ 3 repetitions per arm and run-to-run CV of p95 TTFT ≤ 5% | FAIL |
| 5 | Timing integrity | identical timing boundary | FAIL |
| 6 | Output correctness | greedy exact match ≥ 99.5% (or quality eval within tolerance) | UNKNOWN if not run, FAIL if below |
| 7 | Failure accounting | errors included, error rate up ≤ 0.05pp | FAIL |
| 8 | Cache integrity | no output cache; when prefix caching is on, replay hit rate within 10pp of production | FAIL |
| 9 | Reproducible bundle | hashed artifact bundle exists | UNKNOWN |

## Decision rule

1. Runs incomplete → **pending**.
2. Any gate FAIL with an apparent speedup → **promising, unverified**. Any gate FAIL without one → **rejected**.
3. Any gate UNKNOWN → **inconclusive**.
4. All gates pass, but any of the following → **rejected**:
   - p95 ITL regresses more than 5%
   - the SLO does not hold at the upper confidence bound, or any single run misses it
   - the CI upper bound on the p95 TTFT change is above −3%
5. Otherwise → **measured winner**.

## Statistics

The relative change uses a Welch two-sample estimate on per-repetition values, with a 95% CI from Student's t (`packages/shared/src/stats.ts`). With fewer than two repetitions the CI is undefined and shown as such. Confidence summaries are always decomposable into the gates above; there is no single opaque score.

## Adversarial checks

`packages/benchmark/src/adversarial.ts` injects these mistakes:

- cold baseline
- dropped failures
- output cache
- different request mix
- one lucky run
- missing driver
- driver mismatch

Each fault also distorts the measured numbers the way the real mistake would. The unit tests assert two things: every fault is blocked, and the flattering faults make the headline number look *better*.
