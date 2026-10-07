# Decisions

Assumptions and choices made while building, newest last. Decision rule from the product document: when ambiguous, choose what improves reproducibility, customer trust and measurable performance.

1. **Name: WaferLens** (the spec called it "TracePilot").
2. **No backend in this build.** Requested scope was a full demo on seeded data. The domain logic still lives in framework-free packages with tests, so a FastAPI control plane can adopt it rather than rewrite it.
3. **Monorepo with npm workspaces.** Shape: `apps/web` + `packages/{shared,benchmark,agent-tools}`. Packages ship TypeScript source, which Turbopack transpiles. `apps/api` and `apps/worker` are not created until there is code for them.
4. **Fixed demo clock** (Oct 7 2026 14:00 UTC) and seeded PRNG (mulberry32). Every render, test and screenshot is identical. Times are always rendered in UTC to avoid hydration mismatches.
5. **Evidence is computed, not written.** Investigation evidence strings interpolate values computed from the seeded telemetry. When calibrating the data changed a number, the text changed with it.
6. **Experiment noise is zero-mean per arm**, so arm means equal their targets exactly (981 → 648 ms). The confidence intervals still reflect real run-to-run variance.
7. **The regression is admission control, not memory.** A chart upgrade stops rendering `--max-num-seqs` and the engine falls back to 128 per replica. Two signals tell this apart from the original KV problem: running batch is flat-topped at 256, and KV usage falls instead of rising. The agent caps its confidence at 0.64 until EXP-108 confirms the cause.
8. **EXP-107 ends rejected.** Prefix caching on a production-like replay gives about 2% (below the 3% practical threshold). An honest small result is better than a staged win.
9. **The ITL guardrail is relative (+5%).** The EXP-108 target ITL was set to 35.3 ms, consistent with 0.11.1's faster decode (also visible in the regression data). With 36.6 ms the confirming experiment would have failed its own guardrail.
10. **Charts are hand-written SVG**, not a chart library. This gives full control over the dataviz rules (hairline grid, SLO rule, markers, crosshair, table view) and keeps the bundle small.
11. **Design toolkit, used and skipped:**
    - **Used:** NumberFlow for the hero value and the adversarial headline.
    - **Skipped Theatre.js:** the hero scrubber is a 60-line component with no heavy dependency.
    - **Skipped Rive:** needs authored `.riv` assets, so gate state changes use CSS.
    - **Skipped Unicorn.studio:** the X-ray lens is a CSS `clip-path` effect, so a shader would add weight without adding information.
12. **Fonts:** Inter Tight + IBM Plex Mono (open license), self-hosted.
13. **Cache Components / Partial Prefetching disabled.** The scaffold enabled them by default, but every page is static here. Disabling them avoids Suspense requirements for client hooks without losing anything.
14. **Page states are previewable** via the top-bar **View state** switcher, rather than hidden behind query params.

15. **Guided tour, not a drawer.** The demo script became a spotlight tour:
    - Four dimming panes surround the target, so it stays clickable for the "try it" steps.
    - Step targets are `data-tour` attributes, so no layout CSS is coupled to the tour.
    - It auto-starts once per browser (localStorage), and Escape or Skip end it.
    - A missing target skips forward after 5s instead of trapping the user.
16. **Launch film via `/brag` + HyperFrames.**
    - **Narration:** six Kokoro `af_heart` clips, one per scene, so each scene's length equals its line. Whisper wasn't installed for word timing, and per-scene clips are more exact anyway.
    - **Timing:** the music starts 0.45s into the track, so a strong beat lands on the BLOCKED slam.
    - **Length:** 27.5s, slightly over brag's 25s guideline, because the voice sets the pace.
    - **Locality:** GSAP and fonts are vendored locally for a deterministic render.

17. **No Vercel Blob, now or later.** Nothing in WaferLens may incur Vercel Blob operations: no `@vercel/blob`, no Blob store on the project, no `BLOB_READ_WRITE_TOKEN`.
    - **Static media:** the launch film, poster and captions live in `apps/web/public/` and are served by the CDN.
    - **Future file storage:** artifact bundles, traces, exported reports and payload samples go to an S3-compatible store outside Vercel (Cloudflare R2 or AWS S3), using per-tenant prefixes and short-lived signed URLs.
    - **Uploads:** browser uploads go straight to that store via presigned PUT URLs, never through Vercel functions.

## Phase status vs the product document

| Phase | Status |
|---|---|
| 0 · Design / harness | Done: design system, console, synthetic workload generator, Guardian harness |
| 1 · Instrument | Simulated: telemetry model, coverage scoring, fingerprints. Not built: real ingestion |
| 2 · Investigate | Simulated: state machine, tool contracts and policy, evidence ledger. Not built: LLM orchestrator |
| 3 · Experiment | Simulated: approval → interleaved runs → comparison. Not built: real replay worker |
| 4 · Verify | Done: 9 gates, decision rule, adversarial suite (logic is real) |
| 5 · Operate | Simulated: Regression Guard, change correlation, incidents |
| 6 · Explain | Done: customer report, challengeable numbers, print/PDF |
| 7 · Harden | Partial: tests, docs. Not built: auth, RBAC enforcement, quotas, deployment |
| 8 · Differentiate | Not started: AMD/ROCm, kernel tracing, multi-silicon planner |

## Next phase

Start Phase 1 for real:

1. One vLLM instance plus Prometheus and DCGM in Docker Compose.
2. A FastAPI `GET /v1/workloads/{id}/overview` that returns the same shape as the seed accessors.
3. Swap `getSeries` to the API behind a flag.
