# Polish and voice audit

The product document asks for a `/brag` polish pass and a `/voice` copy audit. No `/voice` command exists in this environment. `/brag` exists, but it renders a launch video rather than auditing the UI. Both audits were therefore done by hand, against screenshots at 1440px, 412px and 375px. Findings and fixes:

## Correctness of numbers (highest priority)

| Finding | Fix |
|---|---|
| "Production within 1.8% of replay" was hand-written; computed 12h production mean is 661 ms vs 648 ms (≈2%) | Copy now says "within about 2%" everywhere; the report computes the value |
| INC-212 timeline said fingerprint distance 0.02; computed value is 0.006 | Text corrected |
| Investigation problem statement (+45%) and incident (+42.5%) disagreed without saying why | Problem statement now names its window (3.5h before vs since deploy) |
| Overview deltas compared the last hour with a 24h mean, so the daily traffic cycle dominated (+30% "throughput") | Deltas now compare against the same hour yesterday |
| EXP-108 failed its own ITL guardrail (+8%) | Target ITL set to 35.3 ms, consistent with 0.11.1's faster decode; regression test added |
| Run noise moved arm means off the documented 981 → 648 ms | Zero-mean noise per arm |

## Visual / interaction

| Finding | Fix |
|---|---|
| Hydration mismatch: glyph arc coordinates differed in the last float digit between server and client | Coordinates rounded to 0.01 |
| X-ray lens revealed a nearly invisible layer | Deep layer gets a sage top rule, a hairline texture and centered labels |
| Sub-50px trace stages were unreadable slivers | Minimum 52px, footnote says they are not to scale |
| Replay-validity table unstyled inside the console | CSS moved from marketing to shared components |
| Config diff collapsed badly in narrow panels | Container query stacks key above value under 380px |
| Mobile top bar overflowed by 6px at 375px | Live toggle and avatar hidden under 720px; select width capped |
| Hero number wrapped onto two lines on mobile | `white-space: nowrap` |
| Deploy-marker labels collided on narrow charts | Labels hidden under 640px chart width (diamonds and tooltips remain) |
| In-progress experiments showed provisional gate FAILs in the list | Gates render as pending until the run set completes |
| Knowledge similarity collapsed to 0% for other workloads | Exponential decay on fingerprint distance |

## Voice

- No "AI-powered", "magic", "seamless" or similar (grep-verified).
- Every metric carries its window and source (hover a metric cell for the Prometheus series).
- Status is never color-only: every status badge has an icon and a label.
- Causal language is explicit: "Correlated, not proven" until a controlled experiment confirms the cause; "Absence is not confirmation" when no disconfirming evidence exists.
- Failed and inconclusive experiments use the same visual weight as the winner and appear in the customer report.
- Empty states give one next action; error states include a request ID and a retry.

## Known limitations

- The console prioritises desktop. It works at 375px but dense tables scroll horizontally inside their panels.
- Chart tooltips are mouse- and keyboard-accessible; touch shows a tooltip on tap but has no drag-scrub on small charts.
- Fonts are fetched by `next/font` at build time, which needs network access during `next build`.
