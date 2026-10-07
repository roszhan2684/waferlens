import { linear } from "./scale";

/** Static sparkline: de-emphasised history, accent on the latest segment. */
export function Sparkline({ values, width = 120, height = 28, threshold, accent = "var(--sage)" }: { values: number[]; width?: number; height?: number; threshold?: number; accent?: string }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values, threshold ?? Infinity);
  const hi = Math.max(...values, threshold ?? -Infinity);
  const x = linear(0, values.length - 1, 1, width - 3);
  const y = linear(lo, hi, height - 3, 3);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const tailStart = Math.floor(values.length * 0.85);
  const tail = values
    .slice(tailStart)
    .map((v, i) => `${i ? "L" : "M"}${x(i + tailStart).toFixed(1)},${y(v).toFixed(1)}`)
    .join("");
  const last = values[values.length - 1]!;
  return (
    <svg width={width} height={height} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {threshold !== undefined && <line x1={0} x2={width} y1={y(threshold)} y2={y(threshold)} stroke="var(--text-2)" strokeOpacity={0.35} />}
      <path d={d} fill="none" stroke="var(--faint)" strokeWidth={1.25} />
      <path d={tail} fill="none" stroke={accent} strokeWidth={1.5} />
      <circle cx={x(values.length - 1)} cy={y(last)} r={2.5} fill={accent} />
    </svg>
  );
}
