# Brag Plan: WaferLens

## What is this app?
An inference performance operations console: it profiles an LLM serving workload, ranks evidence-backed bottleneck hypotheses, replays controlled experiments, and refuses to call a benchmark a win until nine deterministic checks pass.

## The angle
The product's most surprising behavior is saying **no** to a great-looking number. Open on a benchmark that looks like a 48% win (EXP-106, prefix caching) and watch WaferLens block it. Then show the real winner earning its result, and the regression it catches later. "A faster wrong answer is a failed experiment" is the thesis, and the video should prove it, not say it.

## Hook (first 2-3 seconds)
A giant sage `−47.8%` "p95 TTFT" headline, the kind of number people screenshot. A beat later a red `BLOCKED` badge slams in with the cache-integrity gate: "71% cache hits in replay · 9% in production".

## Key moments (the middle)
- The Performance Agent's hypothesis card: claim, confidence bar filling to 0.93, evidence rows arriving one by one, including a *disconfirming* row.
- Benchmark Guardian: nine gates ticking PASS one by one, then `981 → 648 ms` lands.
- Regression Guard: a p95 line jumps at the `dep_7f3c` deploy marker. The label reads "Correlated, not proven", then flips to "Confirmed by EXP-108".

## Outro / punchline
"Measure the workload. Find the bottleneck. Prove the winner." → WaferLens wordmark + lens mark. Small footer: "waferlens.vercel.app · all data simulated".

## User flow worth showing
Detect (SLO miss) → investigate (ranked hypotheses with evidence) → verify (gates) → operate (regression caught). The centerpiece scenes recreate the console's real components: HypothesisCard, GateChecklist, deploy-marker chart, decision badges.

## Tone
- Preset: polished
- Creative direction: quiet, confident infrastructure film for skeptical engineers
- Interpretation: fewer scenes, longer holds, mono labels and hairlines, one sage accent; drama comes from a single red BLOCKED moment, not from motion noise.

## Format: landscape — 1920x1080
## Duration: ~25s (voiceover sets the pace)

## Visual identity (from the project)
- Background: #000000 / panels #0a0a0a, #101010
- Accent: #95ABA7 (sage); series candidate #36a48a; baseline #7d83e0
- Text: #f2f2ef, secondary #b4b8b6, muted #7c8280
- Status: good #4cb782, bad #e5534b, warn #e0a526
- Display font: Inter Tight (600, tight tracking)
- Body / labels: IBM Plex Mono
- Strongest visual element: the decision badge + gate checklist, and the lens mark

## Share copy (draft)
WaferLens blocks benchmark wins it can't prove: nine deterministic checks, an agent that cites its evidence, and a regression guard that says "correlated, not proven" until a replay confirms it.

## Voiceover script
This benchmark says forty-eight percent faster.
WaferLens blocks it. The cache hits weren't real.

This is inference performance you can prove.

The agent ranks every hypothesis on evidence, including the evidence against it.

Nine deterministic checks guard every win.

And when a deploy breaks production, it's correlated, not proven, until a replay confirms it.

WaferLens. Prove the winner.

## Audio direction
- Role: warm bed under narration, sparse professional accents
- Music: happy-beats-business-moves-vol-11 (114.8 BPM)
- Music treatment: fade in over 0.6s, duck to ~0.13 under the voiceover, swell back for the logo, fade out over the last 1.2s
- Music cue guidance: preset `cues/…vol-11…music-cues.json`; strong cues near 1.60s and 3.70s (use 3.70s for the BLOCKED slam if within ±0.15s of the VO beat); gate ticks on the beat grid but hold the full list on screen (text, so no per-beat reading)
- Audio-reactive treatment: subtle; music RMS breathes the sage background glow only
- SFX posture: sparse, motion-matched
- Audio-coupled moments: BLOCKED slam (one soft impact), gate ticks (very quiet clicks, first/last accented), deploy marker (a dry drop), logo (single bell)
- Restraint rule: never louder than the voice; no SFX under a spoken word's onset if avoidable

## Storyboard

### Scene 1 — The too-good number — ~4.5s
Giant `−47.8%` in sage, mono label "EXP-106 · enable_prefix_caching false → true · p95 TTFT". Then a red `BLOCKED · promising, unverified` badge slams in; a gate row slides under it: "08 Cache integrity · FAIL · 71% prefix hits in replay vs 9% in production".
Sequential/interaction: number counts down from 0 to −47.8, then the badge, then the gate row.
Audio intent: tension, then a decisive stop.
Audio-coupled idea: one soft impact on the BLOCKED slam.
Transition mood: soft → Scene 2

### Scene 2 — Reveal — ~3s
Lens mark + "WaferLens" wordmark, headline "Inference you can prove is better." with "prove" in sage.
Sequential/interaction: none
Audio intent: lift.
Transition mood: slide → Scene 3

### Scene 3 — Agent evidence — ~5s
Recreated hypothesis card: "H1 · KV cache exhaustion forces preemption" + layer chip "scheduler", confidence bar to 0.93; three evidence rows arrive one by one: ✓ KV cache p95 99.5% · ✓ preemptions ↔ p95 TTFT r = 0.95 · − ITL p95 flat at 38.1 ms (disconfirming, decode is fine).
Sequential/interaction: yes — rows one by one, each held.
Audio intent: thoughtful.
Transition mood: clean → Scene 4

### Scene 4 — Benchmark Guardian — ~4.5s
Nine gate rows (Workload parity … Reproducible bundle) tick PASS one by one; the headline `981 → 648 ms` and `9/9 gates` + "Measured winner" badge land.
Sequential/interaction: yes — gates fast-in, full list held.
Audio intent: confidence.
Transition mood: clean → Scene 5

### Scene 5 — Regression Guard — ~5s
A p95 TTFT line under the 700 ms SLO rule; at the `dep_7f3c` diamond it jumps up (shaded incident band). Label "Correlated, not proven" (warn), then flips to "Confirmed by EXP-108" (sage).
Sequential/interaction: yes — line draws, marker drops, label flips.
Audio intent: alert then resolve.
Transition mood: soft → Scene 6

### Scene 6 — Outro — ~3s
"Measure the workload. Find the bottleneck. Prove the winner." then wordmark; URL footer.
Audio intent: settle; bell on the logo.

**Music mood for this video:** upbeat-but-restrained
**Audio summary:** a soft bed ducked under a calm narrator, a single slam at the hook, quiet ticks for the gates, a bell on the logo.
