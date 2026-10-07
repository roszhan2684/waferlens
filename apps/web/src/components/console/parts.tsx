import Link from "next/link";
import type { ConfigDiffEntry, EnvironmentFingerprint, Incident } from "@waferlens/shared";
import { formatTime } from "@waferlens/shared";
import { Sparkline } from "../charts/Sparkline";
import { Icon } from "../ui/icons";

export function PageHeader({ title, sub, crumbs, actions, eyebrow }: { title: string; sub?: React.ReactNode; crumbs?: { href: string; label: string }[]; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        {crumbs && (
          <nav className="crumbs label" aria-label="Breadcrumb">
            {crumbs.map((c) => (
              <span key={c.href} className="row" style={{ gap: 6 }}>
                <Link href={c.href}>{c.label}</Link>
                <Icon name="chevron-right" size={10} />
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <div style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}

/** label + value + delta + window + SLO marker */
export function MetricCell({
  label,
  value,
  unit,
  delta,
  deltaGood,
  window,
  spark,
  slo,
  sloOk,
  source,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaGood?: boolean;
  window: string;
  spark?: number[];
  slo?: number;
  sloOk?: boolean;
  source: string;
}) {
  return (
    <div className="metric" title={`Source: ${source}`}>
      <div className="row-between">
        <span className="label">{label}</span>
        {sloOk !== undefined && (
          <span className={`badge ${sloOk ? "badge-good" : "badge-bad"}`} style={{ height: 18, fontSize: 10, padding: "0 5px" }}>
            <Icon name={sloOk ? "check" : "x"} size={10} />
            SLO
          </span>
        )}
      </div>
      <div className="metric-value num">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="metric-foot">
        <div>
          {delta && <div className={deltaGood === undefined ? "text-2" : deltaGood ? "delta-good" : "delta-bad"}>{delta}</div>}
          <div style={{ fontSize: 11 }}>{window}</div>
        </div>
        {spark && <Sparkline values={spark} width={84} height={26} threshold={slo} accent={sloOk === false ? "var(--bad)" : "var(--sage)"} />}
      </div>
    </div>
  );
}

export function ConfigDiff({ diff }: { diff: ConfigDiffEntry[] }) {
  return (
    <div className="diff" role="table" aria-label="Configuration diff">
      {diff.map((d) => (
        <div className="diff-row" role="row" key={d.key}>
          <span role="cell" style={{ color: "var(--text)" }}>
            {d.key}
          </span>
          <span role="cell" className="diff-val">
            <span className="diff-from">{d.from}</span>
            <Icon name="arrow-right" size={12} style={{ color: "var(--muted)", flex: "none" }} />
            <span className="diff-to">{d.to}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const ENV_FIELDS: [keyof EnvironmentFingerprint, string][] = [
  ["accelerator", "Accelerator"],
  ["acceleratorCount", "Count"],
  ["topology", "Topology"],
  ["driver", "Driver"],
  ["cuda", "CUDA"],
  ["engineVersion", "vLLM"],
  ["modelRevision", "Model"],
  ["tokenizerRevision", "Tokenizer"],
  ["containerDigest", "Container"],
  ["commit", "Commit"],
];

/** GPU, driver, runtime, engine, model commit, container digest. Missing fields are shown, not hidden. */
export function EnvironmentPanel({ env, compare }: { env: EnvironmentFingerprint; compare?: EnvironmentFingerprint }) {
  return (
    <dl className="kv">
      {ENV_FIELDS.map(([k, label]) => {
        const v = env[k];
        const differs = compare && compare[k] !== v;
        return (
          <div key={k} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd className="mono" style={{ fontSize: 12, color: v == null ? "var(--warn)" : differs ? "var(--sage-strong)" : undefined }}>
              {v == null ? "not recorded" : String(v)}
              {differs && compare && <span className="muted"> (was {String(compare[k])})</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function IncidentTimeline({ items }: { items: Incident["timeline"] }) {
  return (
    <ol className="timeline">
      {items.map((it) => (
        <li key={it.at + it.label} data-kind={it.kind}>
          <span className="tl-time">{formatTime(it.at).replace(" UTC", "")}</span>
          <span className="tl-dot" aria-hidden="true" />
          <span>
            <span className="label" style={{ fontSize: 10, marginRight: 8 }}>
              {it.kind}
            </span>
            {it.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Panel({ title, children, actions, foot, id, pad = true, tour }: { title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; foot?: React.ReactNode; id?: string; pad?: boolean; tour?: string }) {
  return (
    <section className="panel" id={id} data-tour={tour}>
      <div className="panel-head">
        <h2>{title}</h2>
        {actions}
      </div>
      <div className={pad ? "panel-body" : undefined}>{children}</div>
      {foot && <div className="panel-foot">{foot}</div>}
    </section>
  );
}
