import type { InvestigationState } from "@waferlens/shared";
import { STATES, stateIndex } from "@waferlens/agent-tools";

/** Where the investigation is in the fixed state machine. */
export function StateMachineBar({ state }: { state: InvestigationState }) {
  const cur = stateIndex(state);
  return (
    <div className="states" role="list" aria-label="Investigation state machine">
      {STATES.filter((s) => s.id !== "closed").map((s, i) => (
        <div key={s.id} className="state" role="listitem" data-done={i < cur || state === "closed"} data-current={i === cur} title={s.description} aria-current={i === cur ? "step" : undefined}>
          {String(i + 1).padStart(2, "0")}
          <br />
          {s.label}
        </div>
      ))}
    </div>
  );
}
