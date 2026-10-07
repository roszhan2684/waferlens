# Hyperframes Composition Brief: WaferLens

## Objective
A short, polished launch film for WaferLens, embedded on the marketing landing page.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4` → copied to `apps/web/public/video/waferlens-launch.mp4`
- Format: landscape 1920×1080, 30 fps
- Duration: 27.5s (set by six narration clips; slightly over the 25s guideline because the voice sets the pace)

## Source Material
- Project root: `/Users/roszhanraj/WaferLens`
- Files read: `apps/web/src/app/page.tsx`, `globals.css`, `components.css`, `components/guardian/*`, `components/agent/HypothesisCard.tsx`, `packages/shared/src/demo/*`, `packages/benchmark/src/gates.ts`
- Product name: WaferLens
- Tagline / strongest claim: "Inference you can prove is better." / "A faster wrong answer is a failed experiment."
- Key UI to recreate: decision badge ("Promising, unverified" / "Measured winner"), gate checklist, hypothesis card with confidence bar and evidence rows, p95 chart with SLO rule and deploy diamond.
- Copy that must appear verbatim:
  - "Inference you can prove is better."
  - "Measure the workload. Find the bottleneck. Prove the winner."
  - "Correlated, not proven"
  - gate names from `GATE_SPECS`

## Creative Direction
- Tone preset: polished. Direction: quiet, confident infrastructure film for skeptical engineers.
- Angle: open on a 48% "win" and have the product refuse it; then show the real winner earning its number and the regression it catches later.
- Hook: `−47.8%` → red `BLOCKED` slam with the cache-integrity FAIL row.
- Outro: the three-part tagline, then the wordmark; disclaimer footer.
- Avoid: generic SaaS language, abstract filler, purple/cyan AI gradients, Wafer branding.

## Visual Identity
- Background #000 with a sage-tinted radial glow; panels #0a0a0a/#101010; borders #2a2a2a scaled to 2px for video.
- Text #f2f2ef / #b4b8b6 / #7c8280. Accent #95ABA7. Good #4cb782. Bad #e5534b. Warn #e0a526. Series #36a48a / #7d83e0.
- Inter Tight 400/600 (display), IBM Plex Mono 400/500 (labels), shipped locally under `assets/fonts/`.

## Storyboard (voice-locked times)
1. Hook 0–6.41s: VO1 at 0.4s. `−47.8%` counts up, BLOCKED slam at 3.25s (beat-locked strong cue), FAIL gate row.
2. Reveal 6.41–9.05s: VO2 at 6.6s. Lens mark + headline.
3. Agent 9.05–14.31s: VO3 at 9.25s. Hypothesis card, confidence → 0.93, three evidence rows held.
4. Guardian 14.31–17.99s: VO4 at 14.5s. Nine gates tick PASS (fast stagger, held), `981 → 648 ms` lands at 16.41s (strong cue).
5. Regression 17.99–23.78s: VO5 at 18.2s. Chart draws, deploy spike, label flips to confirmed at 23.25s (strong cue).
6. Outro 23.78–27.5s: VO6 at 24.0s. Tagline, wordmark, disclaimer.

## Audio
- Music: `happy-beats-business-moves-vol-11` from 0.45s into the track (puts a strong cue on 3.25s). Volume lane: fade in to 0.32, duck to 0.13 under narration (0.4–25.9s), swell to 0.4, fade out by 27.5s.
- Voiceover: six Kokoro `af_heart` clips on their own track at the times above.
- SFX (low HF risk): impactSoft_medium_001 at the BLOCKED slam; ui/rollover2 very quiet for the first and last gate tick; interface/drop_002 on the deploy marker; impactBell_heavy_000 on the wordmark.
- Audio-reactive: music low-band energy (`assets/audio-energy.js`, 30 fps) breathes the background glow only.
