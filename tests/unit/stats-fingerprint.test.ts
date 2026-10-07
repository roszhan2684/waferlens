import { describe, expect, it } from "vitest";
import {
  computeFingerprint,
  fingerprintDistance,
  fingerprints,
  jensenShannon,
  mean,
  pearson,
  percentile,
  relativeDelta,
  synthesizeRequests,
  PROD_PROFILE,
  formatDelta,
  formatMetric,
} from "@waferlens/shared";

describe("stats", () => {
  it("percentile interpolates linearly", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([10, 20], 95)).toBeCloseTo(19.5);
  });

  it("relativeDelta reports a CI that contains the true effect", () => {
    const b = [1000, 1010, 990, 1005, 995];
    const c = [700, 707, 693, 703, 697];
    const d = relativeDelta(b, c);
    expect(d.relDelta).toBeCloseTo(-0.3, 3);
    expect(d.ci[0]).toBeLessThan(-0.3);
    expect(d.ci[1]).toBeGreaterThan(-0.3);
  });

  it("relativeDelta has an undefined CI with one repetition", () => {
    const d = relativeDelta([1000], [700]);
    expect(Number.isNaN(d.ci[0])).toBe(true);
  });

  it("jensenShannon is 0 for identical and 1 for disjoint distributions", () => {
    expect(jensenShannon([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0);
    expect(jensenShannon([1, 0], [0, 1])).toBeCloseTo(1);
  });

  it("pearson detects perfect correlation", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(mean([2, 4])).toBe(3);
  });
});

describe("workload fingerprint", () => {
  it("is deterministic for a seed", () => {
    const a = computeFingerprint(synthesizeRequests(PROD_PROFILE, 3000, 7), { start: "a", end: "b" });
    const b = computeFingerprint(synthesizeRequests(PROD_PROFILE, 3000, 7), { start: "a", end: "b" });
    expect(a.hash).toBe(b.hash);
    expect(a.joint.flat().reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
  });

  it("production week over week is stable", () => {
    expect(fingerprintDistance(fingerprints.prodLastWeek(), fingerprints.capture0918Source()).verdict).toBe("stable");
  });

  it("the batch backfill is a material shift (INC-198)", () => {
    expect(fingerprintDistance(fingerprints.prodLastWeek(), fingerprints.shifted()).verdict).toBe("material_shift");
  });

  it("the template replay is flagged for prefix reuse and long-context under-representation", () => {
    const d = fingerprintDistance(fingerprints.capture0918Source(), fingerprints.replayTemplates());
    const flagged = d.components.filter((c) => c.flagged).map((c) => c.key);
    expect(flagged).toContain("prefix");
    expect(flagged).toContain("long_context");
    expect(d.verdict).not.toBe("stable");
  });

  it("the unique-prefix replay matches production", () => {
    expect(fingerprintDistance(fingerprints.capture0918Source(), fingerprints.replayUnique()).verdict).toBe("stable");
  });
});

describe("formatting", () => {
  it("uses a true minus sign and units", () => {
    expect(formatDelta(-0.339)).toBe("−33.9%");
    expect(formatMetric("ttft_p95_ms", 648.2)).toBe("648 ms");
    expect(formatMetric("error_rate", 0.0011)).toBe("0.11%");
  });
});
