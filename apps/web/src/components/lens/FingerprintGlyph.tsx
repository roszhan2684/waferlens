import { INPUT_BUCKET_LABELS, OUTPUT_BUCKET_LABELS, type WorkloadFingerprint } from "@waferlens/shared";

interface Props {
  source: WorkloadFingerprint;
  target?: WorkloadFingerprint;
  sourceLabel?: string;
  targetLabel?: string;
  size?: number;
}

/**
 * A workload's signature. Each of the 42 spokes is one input×output token bucket;
 * spoke length is √(share of requests). Seven groups = seven input-length buckets,
 * six spokes per group = output length, short to long. Two workloads overlaid make
 * drift visible at a glance; the table beside it carries the exact values.
 */
export function FingerprintGlyph({ source, target, sourceLabel = "Source", targetLabel = "Replay", size = 260 }: Props) {
  const c = size / 2;
  const r0 = size * 0.17;
  const R = size * 0.36;
  const groups = source.joint.length;
  const per = source.joint[0]?.length ?? 6;
  const gap = 0.12; // radians between input groups
  const span = (Math.PI * 2 - gap * groups) / (groups * per);
  const max = Math.max(...source.joint.flat(), ...(target?.joint.flat() ?? []));

  const angle = (g: number, o: number) => -Math.PI / 2 + g * (per * span + gap) + o * span + span / 2;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const pt = (a: number, r: number) => [r2(c + Math.cos(a) * r), r2(c + Math.sin(a) * r)] as const;
  const poly = (fp: WorkloadFingerprint) =>
    fp.joint
      .flatMap((row, g) => row.map((v, o) => pt(angle(g, o), r0 + (R - r0) * Math.sqrt(v / max))))
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join("") + "Z";

  return (
    <figure className="glyph" style={{ margin: 0 }}>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Workload fingerprint ${source.hash}${target ? ` compared with ${target.hash}` : ""}`} style={{ maxWidth: size, display: "block", margin: "0 auto" }}>
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <circle key={k} cx={c} cy={c} r={r0 + (R - r0) * Math.sqrt(k)} fill="none" stroke="var(--grid)" />
        ))}
        {Array.from({ length: groups }, (_, g) => {
          const a0 = angle(g, 0) - span / 2;
          const a1 = angle(g, per - 1) + span / 2;
          const [x0, y0] = pt(a0, R + 8);
          const [x1, y1] = pt(a1, R + 8);
          const [lx, ly] = pt((a0 + a1) / 2, R + 22);
          return (
            <g key={g}>
              <path d={`M${x0},${y0}A${R + 8},${R + 8} 0 0 1 ${x1},${y1}`} fill="none" stroke="var(--axis)" />
              <text x={lx} y={ly + 3} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fill: "var(--muted)" }}>
                {INPUT_BUCKET_LABELS[g]}
              </text>
            </g>
          );
        })}
        <path d={poly(source)} fill="var(--s-baseline)" fillOpacity={target ? 0.1 : 0.16} stroke="var(--s-baseline)" strokeWidth={1.5} strokeLinejoin="round" />
        {target && <path d={poly(target)} fill="var(--s-candidate)" fillOpacity={0.1} stroke="var(--s-candidate)" strokeWidth={1.5} strokeLinejoin="round" />}
        <circle cx={c} cy={c} r={r0 - 4} fill="var(--surface-1)" stroke="var(--border)" />
        <text x={c} y={c - 4} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "var(--muted)", letterSpacing: "0.06em" }}>
          INPUT TOKENS
        </text>
        <text x={c} y={c + 9} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--text-2)" }}>
          {source.hash.slice(0, 11)}
        </text>
      </svg>
      <figcaption className="legend" style={{ justifyContent: "center", marginTop: 8 }}>
        <span className="legend-item">
          <span className="legend-line" style={{ background: "var(--s-baseline)" }} />
          {sourceLabel}
        </span>
        {target && (
          <span className="legend-item">
            <span className="legend-line" style={{ background: "var(--s-candidate)" }} />
            {targetLabel}
          </span>
        )}
      </figcaption>
      <p className="label" style={{ textAlign: "center", marginTop: 6, fontSize: 10 }}>
        Spoke = output bucket ({OUTPUT_BUCKET_LABELS[0]} → {OUTPUT_BUCKET_LABELS[OUTPUT_BUCKET_LABELS.length - 1]}) · length = √share
      </p>
    </figure>
  );
}
