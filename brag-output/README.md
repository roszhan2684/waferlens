# Launch film

Made with `/brag` + [HyperFrames](https://hyperframes.heygen.com): an HTML/GSAP composition rendered to MP4.

| File | What |
|---|---|
| `brag.mp4` / `brag.jpg` | Final render (27.5s, 1080p30) and poster; copied to `apps/web/public/video/` |
| `brag-plan.md` | Angle, storyboard, voiceover script, audio direction |
| `composition-brief.md` | Hand-off brief for the composition |
| `composition/` | The HyperFrames project (`index.html`, fonts, Kokoro narration clips, CC0 SFX) |
| `share-copy.txt` | Caption for posting |

## Re-render

The music bed (`happy-beats-business-moves-vol-11` from the /brag skill's library, source: ende.app) is not committed, because its redistribution terms are unverified. Copy it back before rendering:

```bash
cp <brag-skill-dir>/assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3 composition/assets/music/
cd composition && npx hyperframes check && npx hyperframes render --quality delivery --output ../brag.mp4
```
