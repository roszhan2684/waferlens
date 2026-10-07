import { describe, expect, it } from "vitest";
import {
  MAX_ACTIVE_HYPOTHESES,
  STATES,
  TOOL_NAMES,
  assertTransition,
  authorizeToolCall,
  canTransition,
  getInvestigations,
  stateIndex,
} from "@waferlens/agent-tools";

describe("investigation state machine", () => {
  it("allows forward steps and the documented back edges only", () => {
    expect(canTransition("intake", "coverage_check")).toBe(true);
    expect(canTransition("decision", "experiment_design")).toBe(true);
    expect(canTransition("workload_stability", "closed")).toBe(true);
    expect(canTransition("intake", "execution")).toBe(false);
    expect(() => assertTransition("coverage_check", "decision")).toThrow(/Illegal/);
  });

  it("has 13 ordered states ending in closed", () => {
    expect(STATES).toHaveLength(13);
    expect(STATES.at(-1)!.id).toBe("closed");
  });
});

describe("tool policy", () => {
  it("rejects unknown tools: no shell", () => {
    expect(authorizeToolCall("bash", true).allowed).toBe(false);
  });

  it("requires approval for replay and promotion", () => {
    expect(authorizeToolCall("run_replay", false).allowed).toBe(false);
    expect(authorizeToolCall("promote_candidate", false).allowed).toBe(false);
    expect(authorizeToolCall("run_replay", true).allowed).toBe(true);
    expect(authorizeToolCall("query_metrics", false).allowed).toBe(true);
  });
});

describe("seeded investigations honour the agent output contract", () => {
  for (const inv of getInvestigations()) {
    describe(inv.id, () => {
      it(`keeps at most ${MAX_ACTIVE_HYPOTHESES} hypotheses`, () => {
        expect(inv.hypotheses.length).toBeLessThanOrEqual(MAX_ACTIVE_HYPOTHESES);
      });

      it("only calls registered tools, in non-decreasing state order", () => {
        let last = 0;
        for (const c of inv.toolCalls) {
          expect(TOOL_NAMES).toContain(c.tool);
          expect(stateIndex(c.state)).toBeGreaterThanOrEqual(last);
          last = stateIndex(c.state);
        }
      });

      it("checks workload stability before blaming infrastructure", () => {
        const firstStability = inv.toolCalls.findIndex((c) => c.state === "workload_stability");
        const firstLocalization = inv.toolCalls.findIndex((c) => c.state === "layer_localization");
        expect(firstStability).toBeGreaterThanOrEqual(0);
        expect(firstStability).toBeLessThan(firstLocalization);
      });

      it("every hypothesis has evidence that resolves to a tool call or experiment", () => {
        const ids = new Set(inv.toolCalls.map((c) => c.id));
        for (const h of inv.hypotheses) {
          expect(h.supporting.length + h.disconfirming.length).toBeGreaterThan(0);
          expect(h.confidence).toBeGreaterThanOrEqual(0);
          expect(h.confidence).toBeLessThanOrEqual(1);
          for (const e of [...h.supporting, ...h.disconfirming]) {
            expect(ids.has(e.source) || e.source.startsWith("EXP-")).toBe(true);
          }
        }
      });

      it("production-affecting tools were approved", () => {
        for (const c of inv.toolCalls.filter((c) => c.tool === "run_replay" || c.tool === "promote_candidate")) {
          expect(c.approval).toBe("approved");
        }
      });
    });
  }

  it("high confidence is not claimed while coverage gaps exist for an open investigation", () => {
    const open = getInvestigations().find((i) => i.status !== "completed")!;
    expect(open.coverageGaps.length).toBeGreaterThan(0);
    expect(Math.max(...open.hypotheses.map((h) => h.confidence))).toBeLessThan(0.8);
  });
});
