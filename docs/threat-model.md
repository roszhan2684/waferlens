# Threat model

Scope: the target SaaS described in `architecture.md`. The current demo build is static, holds no secrets, and has no user data.

## Assets

- Customer telemetry: request-shape metadata, latencies, GPU metrics.
- Optional encrypted payload samples.
- Deployment metadata.
- Artifact bundles.
- Reports.
- Collector API keys.
- Approval authority over production actions.

## Threats and controls

| Threat | Control |
|---|---|
| Cross-tenant data access via resource IDs | `organization_id` on every row; tenant scope enforced in the repository layer, not in handlers; two-org fixture tests in CI |
| Prompt/response leakage | Metadata-only by default; payload samples are opt-in, KMS-encrypted, with their own retention (0 days on the demo tenant) |
| Agent performs a destructive action | No shell; registry-only tools (`authorizeToolCall` rejects unknown tools); `run_replay` and `promote_candidate` require approval; production actions need Owner/Admin and approver ≠ requester |
| Secrets reach model context or logs | Secrets in a cloud secret manager; the engine-state tool returns rendered args only; log redaction |
| Collector key abuse | Keys scoped to one workload and ingestion-only; rotation; shown once |
| Runaway replay cost | Per-job request and $ limits, monthly budget, one concurrent job per sandbox; rejected at queue time |
| Misleading benchmark claims | Deterministic Guardian gates; WINNER impossible with any FAIL/UNKNOWN; reports include failed experiments and limitations |
| Correlation presented as cause | Incidents label correlation explicitly; cause is confirmed only by a controlled experiment |
| Report tampering after sharing | Artifact hash in every report; signed attestations on the roadmap |
| Artifact exposure | Per-tenant S3 prefixes, short-lived signed URLs (15 min) |

## Adversarial review checklist

Product document §36. ✓ means a unit or e2e test covers it.

| Scenario | Coverage |
|---|---|
| Workload shifted but agent blames infra | ✓ INC-198 path; state-machine test asserts workload check precedes localization |
| Candidate receives a different request mix | ✓ `request_mix` fault |
| Cold baseline vs warm candidate | ✓ `cold_baseline` fault |
| Failures dropped from latency stats | ✓ `drop_failures` fault |
| Cached outputs fake a speedup | ✓ `output_cache` fault; EXP-106 cache-integrity fail |
| Environment fingerprint misses a driver difference | ✓ `missing_driver`, `driver_mismatch` |
| One lucky run | ✓ `lucky_run` |
| Correctness degrades | ✓ correctness gate; EXP-103 inconclusive |
| High confidence despite missing telemetry | ✓ test caps open-investigation confidence when coverage gaps exist |
| Cross-tenant ID leak | ✗ Not applicable until the API exists |
| Replay exceeds quota | Partial: policy shown in UI; enforcement is API work |
| Report hides a caveat | ✓ e2e asserts limitations and failed experiments on RPT-014 |
| p50 vs p95 confusion | Charts label the series; the overview chart legend separates p95 and p50 |
| Correlation as causal proof | ✓ e2e asserts INC-212 says "Correlated, not proven" until EXP-108 completes |
