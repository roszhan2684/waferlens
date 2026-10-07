# WaferLens

**Inference you can prove is better.** WaferLens is a product concept for *inference performance operations*. Give it a real inference workload and an objective. It profiles the serving path, ranks evidence-backed bottleneck hypotheses, runs controlled replays, blocks invalid benchmark wins, and keeps watching production after the change ships.

> Independent portfolio project. Not affiliated with, endorsed by, or used by Wafer. Every workload, customer, metric and incident in this repo is simulated demo data generated from a fixed seed.

## What is in this repo

This is the **demo build**: a complete marketing site and product console running on deterministic seed data, with no backend. The domain logic is real and tested: statistics, workload fingerprints, the nine Benchmark Guardian gates, the decision rule, fault injection, the agent's tool contracts and its investigation state machine. Only the data source is simulated.

| Path | What |
|---|---|
| `apps/web` | Next.js 16 app: landing page (`/`) and console (`/console/*`) |
| `packages/shared` | Domain types, stats, workload fingerprints, formatting, seeded demo dataset |
| `packages/benchmark` | Benchmark Guardian: 9 deterministic gates, decision rule, adversarial fault injection |
| `packages/agent-tools` | Typed tool contracts, approval policy, investigation state machine, seeded investigations |
| `tests/unit` | Vitest: stats, fingerprints, gates, decisions, adversarial faults, agent contract |
| `tests/e2e` | Playwright: the full demo flow, the guided tour, page states, mobile overflow at 375px and 412px |
| `brag-output/` | Launch film: plan, brief, HyperFrames composition, render, poster, share copy |
| `docs/` | Architecture, design system, demo script, decisions, methodology, threat model, audit |

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # unit tests (vitest)
npm run test:e2e       # end-to-end (playwright, starts the dev server on :3100)
npm run build          # static production build (all 27 routes prerender)
```

Node 22+. If Playwright has no browser yet: `npx playwright install chromium`.

## The demo in one paragraph

`qwen-prod` (Qwen3-32B on vLLM, 4× H100) misses its 700 ms p95 TTFT SLO. The agent rules out a traffic shift first, then ranks three hypotheses. KV-cache exhaustion forcing preemption wins on evidence (preemptions track p95 TTFT with r = 0.95). Four single-variable replays run on the same capture:

- **One winner.** `gpu_memory_utilization 0.80 → 0.92`: p95 TTFT 981 → 648 ms, 9/9 gates pass.
- **One rejected.** It missed the SLO and broke the ITL guardrail.
- **One blocked.** Prefix caching looked 48% faster, but the replay's templates inflated cache hits.
- **One inconclusive.** No correctness check was run.

The winner ships. Hours later, a runtime chart upgrade silently drops `--max-num-seqs`. Regression Guard catches it in 20 minutes and calls it *correlated, not proven* until a controlled replay confirms the cause. A customer-facing report shows the methodology, every gate, the failed candidates and the limitations.

Open `/console` and the **guided tour** starts on its own: a spotlight walks 16 steps across six pages, dims everything else, and explains each element. Use Next, Back (or the arrow keys) and Skip (or Esc); **Guided tour** in the top bar restarts it. Use **View state** to preview loading, empty, partial-telemetry, degraded and error states on any page.

The landing page embeds a 27-second launch film (`apps/web/public/video/`). It was made with `/brag` + HyperFrames from `brag-output/composition/` (HTML, GSAP, Kokoro narration). Re-render it with `cd brag-output/composition && npx hyperframes render --quality delivery --output ../brag.mp4`.

## Things to try

- **Landing → Benchmark Guardian.** Inject "Output cache on" and watch the headline number improve while the decision flips to *promising, unverified*.
- **Console → Overview → Serving path.** Move the lens over the rail to X-ray what each stage is made of.
- **Experiments → EXP-107 → Approve and run.** Ten interleaved runs stream in, then Guardian rejects an effect that is real but below the 3% practical threshold.
- **Incidents → INC-212.** The banner changes from *correlated* to *confirmed* only when EXP-108 completes.
- **Reports → RPT-014.** Click any headline number to see how it was measured.

## Status

The demo build is complete. It covers phases 0 and 6 of the product document in full, and phases 1–5 as simulated flows over real domain logic. Not yet built: FastAPI control plane, telemetry ingestion, a real replay worker against vLLM, auth/RBAC enforcement and multi-tenant storage. The target architecture is in [`docs/architecture.md`](docs/architecture.md); the path from here is in [`docs/decisions.md`](docs/decisions.md).
