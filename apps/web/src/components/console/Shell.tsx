"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "../ui/icons";
import { Logo } from "../ui/Logo";
import { VIEW_STATES, useDemo, type ViewState } from "@/lib/demo-store";
import { GuidedTour } from "./GuidedTour";

const NAV: { href: string; label: string; icon: IconName; badge?: string }[] = [
  { href: "/console", label: "Overview", icon: "overview" },
  { href: "/console/agent", label: "Performance Agent", icon: "agent" },
  { href: "/console/experiments", label: "Experiments", icon: "experiments" },
  { href: "/console/replay", label: "Workload Replay", icon: "replay" },
  { href: "/console/incidents", label: "Incidents", icon: "incidents", badge: "1" },
  { href: "/console/reports", label: "Reports", icon: "reports" },
  { href: "/console/inventory", label: "Inventory", icon: "inventory" },
  { href: "/console/knowledge", label: "Knowledge", icon: "knowledge" },
  { href: "/console/settings", label: "Settings", icon: "settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { view, setView, reset, setTourOpen, setTourStep, liveUpdates, setLiveUpdates } = useDemo();

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/console" ? pathname === "/console" : pathname.startsWith(href));

  return (
    <div className="shell">
      <aside className={`sidebar${open ? " is-open" : ""}`} aria-label="Console navigation">
        <div className="sidebar-top">
          <Link href="/" aria-label="WaferLens home">
            <Logo size={20} />
          </Link>
        </div>
        <div className="workload-pick">
          <span className="label" style={{ fontSize: 10 }}>
            Workload
          </span>
          <div className="row-between">
            <span className="mono" style={{ fontSize: 13 }}>
              qwen-prod
            </span>
            <span className="badge" style={{ height: 18, fontSize: 10 }}>
              prod
            </span>
          </div>
          <span className="muted" style={{ fontSize: 11 }}>
            Qwen3-32B · vLLM · 4× H100
          </span>
        </div>
        <nav className="side-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isActive(n.href) ? "is-active" : ""} aria-current={isActive(n.href) ? "page" : undefined}>
              <Icon name={n.icon} size={15} />
              <span>{n.label}</span>
              {n.badge && <span className="side-badge">{n.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="label" style={{ fontSize: 10 }}>
            Meridian AI · demo tenant
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            Simulated demo data from a fixed seed.
          </p>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-sm menu-btn" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Icon name="menu" size={16} />
          </button>
          <div className="row topbar-clock" style={{ gap: 8 }}>
            <Icon name="clock" size={13} style={{ color: "var(--muted)" }} />
            <span className="label" title="The demo runs on a fixed clock so every number is reproducible.">
              Oct 7 · 14:00 UTC · demo clock
            </span>
          </div>
          <div className="topbar-right" data-tour="controls">
            <label className="row view-pick" style={{ gap: 6 }}>
              <span className="label" style={{ fontSize: 10 }}>
                View state
              </span>
              <select className="select" value={view} onChange={(e) => setView(e.target.value as ViewState)} aria-label="Preview page state">
                {VIEW_STATES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-sm hide-sm" onClick={() => setLiveUpdates(!liveUpdates)} aria-pressed={liveUpdates} title="Simulated replay progress">
              <span className={`dot${liveUpdates ? " pulse" : ""}`} style={{ color: liveUpdates ? "var(--sage)" : "var(--muted)" }} />
              {liveUpdates ? "Live" : "Paused"}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setTourStep(0);
                setTourOpen(true);
              }}
            >
              <Icon name="play" size={11} /> Guided tour
            </button>
            <button className="btn btn-ghost btn-sm hide-sm" onClick={reset} title="Reset approvals and simulations">
              Reset
            </button>
            <span className="avatar hide-sm" title="Sam Okafor · Engineer">
              SO
            </span>
          </div>
        </header>
        <main id="main">{children}</main>
      </div>
      <GuidedTour />
    </div>
  );
}
