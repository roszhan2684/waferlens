# Architecture

## Today: demo build

```
apps/web (Next.js 16, App Router, static)
  ├─ server components ──► read @waferlens/* seed data at build time
  └─ client islands ─────► charts, lens, adversarial lab, demo store (approvals, live replay sim)

packages/shared        types · stats · fingerprints · formatting · seeded dataset (fixed clock)
packages/benchmark     gates · decision rule · fault injection        (pure, deterministic)
packages/agent-tools   tool contracts · approval policy · state machine · seeded investigations
```

- **Single source of truth.** Every number on every page derives from one seeded dataset: 7 days of 5-minute telemetry, deployments, captures and experiment runs, all on a fixed demo clock (Oct 7 2026, 14:00 UTC). Evidence text in investigations is *computed* from the series by the same functions a tool would call (`windowStats`, `compareAround`, `pearson`, `fingerprintDistance`), so narrative and data cannot drift apart.
- **Same code in browser and tests.** The landing page's adversarial lab runs `@waferlens/benchmark` in the browser; the unit tests run the same functions.
- **Client simulation.** `apps/web/src/lib/demo-store.tsx` holds approvals, live replay progress (using the same deterministic run generator as the seed) and the page-state switcher. Reloading resets it; **Reset** in the top bar does too.
- **Static output.** All 27 routes prerender. Any static host works.

## Target: production system

The design follows the product document. Phase-by-phase status is in `decisions.md`.

| Service | Responsibility | Technology |
|---|---|---|
| Web console | Marketing + console | Next.js / React / TypeScript (this repo) |
| API gateway | REST + SSE, auth, tenant scope | FastAPI + Pydantic v2 |
| Control plane | Workloads, experiments, policies, approvals | Python + PostgreSQL |
| Telemetry ingest | OTel / Prometheus / vLLM / DCGM normalization | OTel Collector + adapters |
| Metrics store | Time series | TimescaleDB → ClickHouse |
| Artifact store | Traces, bundles, reports | S3-compatible outside Vercel (Cloudflare R2 or AWS S3), per-tenant prefix, KMS, signed URLs. **Not Vercel Blob** (see decisions.md #17) |
| Agent orchestrator | Investigations, experiment planning | Tool-calling LLM + the state machine in `packages/agent-tools` |
| Experiment runner | Replay, benchmark, config variants | Docker workers → Kubernetes Jobs |
| Benchmark Guardian | Gates + decision | `packages/benchmark` (ported to Python, or run as a TS worker) |
| Regression Guard | Post-deploy comparison | Streaming rules + `compareAround` / fingerprint drift |

### Migration path for the packages

1. `packages/shared/src/types.ts` becomes the contract: generate Pydantic models from it (or the reverse via OpenAPI) so web and API share one schema.
2. Replace `packages/shared/src/demo/*` with API clients. Pages already read through accessor functions (`getExperiment`, `getSeries`, `getIncident`), so the swap is per-accessor.
3. `packages/benchmark` stays pure. The API runs it on persisted runs and stores `GateResult[]` in `verification_gates`.
4. `packages/agent-tools` `TOOL_CONTRACTS` and `authorizeToolCall` become the orchestrator's registry and policy check. The seeded investigations become fixtures for agent evals.

### Core entities

organizations, users, workloads, endpoints, hardware_pools, captures, telemetry_sources, deployments, incidents, investigations, hypotheses, experiments, runs, verification_gates, reports, knowledge_items, audit_events. Every row carries `organization_id`. TypeScript shapes are in `packages/shared/src/types.ts`.

### API surface (planned)

`POST /v1/workloads` · `GET /v1/workloads/{id}/overview` · `POST /v1/captures` · `POST /v1/investigations` · `GET /v1/investigations/{id}/events` (SSE) · `POST /v1/experiments` · `POST /v1/experiments/{id}/approve` · `POST /v1/experiments/{id}/run` · `GET /v1/experiments/{id}/comparison` · `POST /v1/experiments/{id}/verify` · `POST /v1/reports` · `GET /v1/incidents` · `POST /v1/webhooks/deployments` · `GET /v1/knowledge/search`
