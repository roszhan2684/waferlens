import { describe, expect, it } from "vitest";
import { getExperiment, getExperiments, SIMULATED_RUNS_107, type Experiment } from "@waferlens/shared";
import { FAULTS, decide, evaluateGates, injectFaults, type FaultId } from "@waferlens/benchmark";

const SLO = 700;
const exp = (id: string): Experiment => {
  const e = getExperiment(id);
  if (!e) throw new Error(`missing ${id}`);
  return e;
};
const gate = (e: Experiment, id: string) => evaluateGates(e).find((g) => g.id === id)!;

describe("Benchmark Guardian decisions on the seeded experiments", () => {
  it("EXP-104 is the only measured winner, with all 9 gates passing", () => {
    const v = decide(exp("EXP-104"), SLO);
    expect(v.decision).toBe("winner");
    expect(v.summary).toEqual({ pass: 9, fail: 0, unknown: 0, total: 9 });
    expect(v.comparison!.ttftP95.relDelta).toBeCloseTo(-0.339, 3);
    expect(v.comparison!.ttftP95.baselineMean).toBeCloseTo(981, 0);
    expect(v.comparison!.ttftP95.candidateMean).toBeCloseTo(648, 0);
    const winners = getExperiments().filter((e) => decide(e, SLO).decision === "winner");
    expect(winners.map((e) => e.id)).toEqual(["EXP-104"]);
  });

  it("EXP-105 passes gates but is rejected on the SLO and the ITL guardrail", () => {
    const v = decide(exp("EXP-105"), SLO);
    expect(v.summary.pass).toBe(9);
    expect(v.decision).toBe("rejected");
    expect(v.reasons.join(" ")).toMatch(/ITL/);
    expect(v.reasons.join(" ")).toMatch(/700 ms/);
  });

  it("EXP-106 (prefix caching on a template replay) is blocked by cache integrity", () => {
    const v = decide(exp("EXP-106"), SLO);
    expect(gate(exp("EXP-106"), "cache_integrity").status).toBe("fail");
    expect(v.decision).toBe("promising_unverified");
    expect(v.comparison!.ttftP95.relDelta).toBeLessThan(-0.4); // looks great, still not a winner
  });

  it("EXP-103 without a correctness check is inconclusive, never a winner", () => {
    expect(gate(exp("EXP-103"), "output_correctness").status).toBe("unknown");
    expect(decide(exp("EXP-103"), SLO).decision).toBe("inconclusive");
  });

  it("experiments without completed repetitions stay pending", () => {
    expect(decide(exp("EXP-107"), SLO).decision).toBe("pending");
    expect(decide(exp("EXP-108"), SLO).decision).toBe("pending");
  });

  it("EXP-107 completes as rejected: real but below the practical-effect threshold", () => {
    const done: Experiment = { ...exp("EXP-107"), status: "complete", runs: SIMULATED_RUNS_107(), artifactBundle: { hash: "sha256:test", files: ["a"] } };
    const v = decide(done, SLO);
    expect(v.summary.pass).toBe(9);
    expect(v.decision).toBe("rejected");
    expect(v.reasons.join(" ")).toMatch(/practical threshold/);
  });
});

describe("Adversarial mode: every injected fault is blocked", () => {
  const base = exp("EXP-104");
  const cases: [FaultId, string][] = [
    ["cold_baseline", "warmup_consistency"],
    ["drop_failures", "error_accounting"],
    ["output_cache", "cache_integrity"],
    ["request_mix", "workload_parity"],
    ["lucky_run", "repeated_trials"],
    ["driver_mismatch", "environment_completeness"],
  ];

  it.each(cases)("%s fails the %s gate and is not a winner", (fault, gateId) => {
    const e = injectFaults(base, [fault]);
    expect(gate(e, gateId).status).toBe("fail");
    expect(decide(e, SLO).decision).not.toBe("winner");
  });

  it("missing driver makes the environment gate UNKNOWN, which still blocks", () => {
    const e = injectFaults(base, ["missing_driver"]);
    expect(gate(e, "environment_completeness").status).toBe("unknown");
    expect(decide(e, SLO).decision).toBe("inconclusive");
  });

  it("faults that flatter the result make the headline number look better", () => {
    const honest = decide(base, SLO).comparison!.ttftP95.relDelta;
    for (const f of ["cold_baseline", "output_cache", "request_mix"] as FaultId[]) {
      expect(decide(injectFaults(base, [f]), SLO).comparison!.ttftP95.relDelta).toBeLessThan(honest);
    }
  });

  it("injection does not mutate the source experiment", () => {
    const before = JSON.stringify(base);
    injectFaults(base, FAULTS.map((f) => f.id));
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe("EXP-108 (INC-212 confirmation)", () => {
  it("completes as a measured winner once all planned runs finish", async () => {
    const { SIMULATED_RUNS_108 } = await import("@waferlens/shared");
    const done: Experiment = { ...exp("EXP-108"), status: "complete", runs: SIMULATED_RUNS_108(), artifactBundle: { hash: "sha256:test", files: ["a"] } };
    const v = decide(done, SLO);
    expect(v.decision).toBe("winner");
  });
});
