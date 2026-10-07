# Design system

Black/white contrast, a muted sage accent, monospace technical labels, large editorial headlines.

## Tokens (`apps/web/src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--bg` / `--surface-1/2/3` | `#000` / `#0a0a0a` / `#101010` / `#161616` | page, panels, raised, hover |
| `--border` / `--border-2` / `--border-strong` | `#1f1f1f` / `#2a2a2a` / `#3a3a3a` | 1px hairlines only |
| `--text` / `--text-2` / `--muted` | `#f2f2ef` / `#b4b8b6` / `#7c8280` | ink |
| `--sage` | `#95aba7` | selection, healthy, the lens |
| `--good` `--warn` `--bad` `--unknown` | status | always with an icon and a label |
| `--r-1` / `--r-2` | 2px / 4px | radii; no shadows |

`.paper` re-themes any subtree to a light surface (customer reports, print).

## Type

- **Inter Tight** for headlines and UI. Large editorial headlines use −0.035em tracking.
- **IBM Plex Mono** for labels, IDs, metrics and traces (uppercase labels at 11px, +0.06em).
- Both are open-licensed and self-hosted via `next/font`.

## Chart palette (validated)

Chosen with the dataviz validator, against the dark chart surface `#0c0c0c`:

| Role | Dark | Light (paper) |
|---|---|---|
| Candidate / primary series | `#36a48a` | `#1f8a72` |
| Baseline | `#7d83e0` | `#5a60c8` |
| Third series | `#cf7a3a` | `#c0632a` |

All-pairs results:

- **Dark:** CVD ΔE ≥ 10.8, normal-vision ΔE ≥ 19.5, all ≥ 3:1 contrast.
- **Light:** CVD ΔE ≥ 9.4.

Status colors are never used for series.

## Chart rules

- 1.5–2px lines; hairline grid, solid (never dashed); SLO drawn as a labeled solid rule.
- Deploy markers are diamonds with IDs; shaded band = open incident.
- Crosshair snaps to the nearest sample; one tooltip lists every series; arrow keys work on focus.
- Every time series has **View as table**. Bars are ≤ 24px with a 4px rounded data end and per-bar hover.
- No dual axes. Text never wears series color.

## Components

| Spec name | Implementation |
|---|---|
| MetricCell, SLOMarker | `components/console/parts.tsx` → `MetricCell` (SLO badge + sparkline threshold) |
| EvidenceCard, HypothesisList | `components/agent/HypothesisCard.tsx` |
| AgentActionLog | `components/agent/AgentActionLog.tsx` (with stream replay) |
| TraceRail (+ X-ray lens) | `components/lens/TraceRail.tsx` |
| WorkloadFingerprint | `components/lens/FingerprintGlyph.tsx` + `ReplayValidity.tsx` |
| EnvironmentFingerprint | `components/console/parts.tsx` → `EnvironmentPanel` |
| ExperimentComparisonTable | `components/guardian/ComparisonTable.tsx` |
| BenchmarkGateChecklist | `components/guardian/GateChecklist.tsx` |
| IncidentTimeline, ChangeMarker | `parts.tsx` → `IncidentTimeline`; markers in `charts/TimeSeriesChart.tsx` |
| ConfidenceBadge | `components/ui/badges.tsx` |
| MethodologyPanel, CustomerReportPreview | `components/reports/ReportDocument.tsx` |
| Empty / loading / partial / degraded / error | `components/console/PageStates.tsx` |

## Motion

Functional only:

- live pulses on running jobs
- NumberFlow on headline numbers
- the lens
- the hero replay

`prefers-reduced-motion` disables animation; the hero then jumps to the end of its timeline.
