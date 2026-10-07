"use client";

import Link from "next/link";
import { useDemo } from "@/lib/demo-store";
import { Icon } from "../ui/icons";

interface Props {
  children: React.ReactNode;
  empty: { title: string; body: string; action?: { label: string; href: string }; code?: string };
  partial?: string;
  degraded?: string;
}

/**
 * Every console page renders through this wrapper so the loading, empty,
 * partial-telemetry, degraded and error states are designed, not accidental.
 */
export function PageStates({ children, empty, partial, degraded }: Props) {
  const { view, setView } = useDemo();

  if (view === "loading") {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="visually-hidden">Loading telemetry</span>
        <div className="skeleton" style={{ height: 88, marginBottom: 12 }} />
        <div className="grid cols-3">
          <div className="skeleton" style={{ height: 240 }} />
          <div className="skeleton span-2" style={{ height: 240 }} />
        </div>
        <div className="skeleton" style={{ height: 180, marginTop: 12 }} />
        <p className="label" style={{ marginTop: 14 }}>
          Querying metrics store · qwen-prod · last 7d
        </p>
      </div>
    );
  }

  if (view === "empty") {
    return (
      <div className="state-card">
        <Icon name="lens" size={22} style={{ color: "var(--sage)" }} />
        <h2>{empty.title}</h2>
        <p>{empty.body}</p>
        {empty.code && (
          <pre className="code" style={{ textAlign: "left", maxWidth: 560, width: "100%" }}>
            {empty.code}
          </pre>
        )}
        {empty.action && (
          <Link href={empty.action.href} className="btn btn-sage" onClick={() => setView("live")}>
            {empty.action.label} <Icon name="arrow-right" size={13} />
          </Link>
        )}
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="state-card" role="alert" style={{ borderColor: "color-mix(in srgb, var(--bad) 40%, transparent)" }}>
        <Icon name="alert" size={22} style={{ color: "var(--bad)" }} />
        <h2>Could not load this page</h2>
        <p>The metrics store returned 503 for 3 consecutive queries. Nothing was lost; ingestion is buffered at the collector for up to 6 hours.</p>
        <p className="mono muted" style={{ fontSize: 12 }}>
          request_id req_01J9ZK4WQ8 · GET /v1/workloads/wl_qwen_prod/overview · 503
        </p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => setView("live")}>
            Retry
          </button>
          <Link href="/console/settings" className="btn" onClick={() => setView("live")}>
            Integration status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === "partial" && (
        <div className="banner banner-warn" role="status" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={16} style={{ color: "var(--warn)", marginTop: 2, flex: "none" }} />
          <div>
            <strong>Partial telemetry.</strong> {partial ?? "DCGM is reporting for 2 of 4 GPUs. GPU-layer hypotheses are capped at medium confidence and GPU charts show gaps rather than interpolated values."}
          </div>
        </div>
      )}
      {view === "degraded" && (
        <div className="banner banner-bad" role="status" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={16} style={{ color: "var(--bad)", marginTop: 2, flex: "none" }} />
          <div>
            <strong>Degraded.</strong> {degraded ?? "Metrics ingestion is 6 minutes behind. Values below may be stale; new experiment runs are paused until lag is under 60 s."}
          </div>
        </div>
      )}
      <div style={view === "degraded" ? { opacity: 0.72 } : undefined}>{children}</div>
    </>
  );
}
