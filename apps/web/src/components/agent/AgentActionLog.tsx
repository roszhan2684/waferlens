"use client";

import { useEffect, useRef, useState } from "react";
import type { ToolCall } from "@waferlens/shared";
import { formatDuration, formatTime } from "@waferlens/shared";
import { TOOL_CONTRACTS } from "@waferlens/agent-tools";
import { Icon } from "../ui/icons";

const APPROVAL: Record<ToolCall["approval"], string> = {
  not_required: "",
  approved: "approved",
  pending: "awaiting approval",
  denied: "denied",
};

/**
 * Tool name, arguments, duration, result and approval status for every agent action.
 * "Replay" re-streams the log the way the investigation event stream delivered it.
 */
export function AgentActionLog({ calls }: { calls: ToolCall[] }) {
  const [shown, setShown] = useState(calls.length);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setShown((n) => {
        if (n >= calls.length) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, 700);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, calls.length]);

  return (
    <div>
      <div className="row-between" style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
        <span className="label">
          {Math.min(shown, calls.length)}/{calls.length} tool calls · SSE /v1/investigations/…/events
        </span>
        <button
          className="btn btn-sm"
          onClick={() => {
            setShown(0);
            setPlaying(true);
          }}
          disabled={playing}
        >
          <Icon name="replay" size={12} /> Replay stream
        </button>
      </div>
      <ol className="log" aria-live="polite">
        {calls.slice(0, shown).map((c, i) => {
          const contract = TOOL_CONTRACTS.find((t) => t.name === c.tool);
          return (
            <li key={c.id} id={c.id} className={playing && i === shown - 1 ? "is-new" : ""}>
              <span className="log-time">{formatTime(c.at, false)}</span>
              <div style={{ minWidth: 0 }}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <span className="log-tool">{c.tool}</span>
                  <span className="badge" style={{ height: 18, fontSize: 10 }}>
                    {c.state.replace(/_/g, " ")}
                  </span>
                  {contract?.requiresApproval && (
                    <span className={`badge ${c.approval === "approved" ? "badge-good" : "badge-warn"}`} style={{ height: 18, fontSize: 10 }}>
                      <Icon name="lock" size={10} /> {APPROVAL[c.approval] || "approval required"}
                    </span>
                  )}
                  <span className="label" style={{ fontSize: 10, marginLeft: "auto" }}>
                    {formatDuration(c.durationMs)} · {c.id}
                  </span>
                </div>
                <div className="log-args">
                  ({Object.entries(c.args)
                    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(",") : v}`)
                    .join(", ")})
                </div>
                <div className="log-result">{c.result}</div>
              </div>
            </li>
          );
        })}
        {playing && (
          <li>
            <span className="log-time">…</span>
            <span className="muted">
              <span className="dot pulse" style={{ display: "inline-block", marginRight: 8, color: "var(--sage)" }} />
              waiting for next event
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}
