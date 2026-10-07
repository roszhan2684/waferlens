import { expect, test, type Page } from "@playwright/test";

// The guided tour auto-starts on first visit; these specs test the pages underneath it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("waferlens:tour-seen", "1"));
});

/** The seven-minute demo, end to end, on seeded data. */

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test("landing: thesis is visible and adversarial mode blocks a cached-output win", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Inference you can");
  await expect(page.getByText("not affiliated with, endorsed by, or used by Wafer")).toBeVisible();

  const lab = page.locator("#guardian");
  await expect(lab.getByText("Measured winner").first()).toBeVisible();
  await lab.getByText("Output cache on").click();
  await expect(lab.getByText("Promising, unverified").first()).toBeVisible();
  await expect(lab.getByText(/Cache integrity/).first()).toBeVisible();
  await lab.getByText("Output cache on").click();
  await expect(lab.getByText("Measured winner").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("overview: SLO miss, regression context and telemetry coverage", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/console");
  await expect(page.getByText(/SLO miss · target 700 ms/)).toBeVisible();
  await expect(page.getByText("Telemetry coverage")).toBeVisible();
  await expect(page.getByText("Kernel profiler (Nsight)")).toBeVisible();
  expect(errors).toEqual([]);
});

test("agent: at most three hypotheses, workload checked first, evidence everywhere", async ({ page }) => {
  await page.goto("/console/agent/INV-031");
  await expect(page.locator("article.hyp")).toHaveCount(3);
  await expect(page.getByText(/Fingerprint distance 0\.0\d+/).first()).toBeVisible();
  await expect(page.getByText("confirmed by experiment")).toBeVisible();
  // Every hypothesis lists disconfirming evidence or says none was found.
  for (const card of await page.locator("article.hyp").all()) {
    await expect(card.getByText(/Disconfirming · \d/)).toBeVisible();
  }
});

test("experiments: the failed and inconclusive ones are first-class", async ({ page }) => {
  await page.goto("/console/experiments");
  // Pause the live simulation so EXP-108 does not finish mid-assertion.
  await page.getByRole("button", { name: "Live" }).click();
  await expect(page.getByText("Measured winner", { exact: true })).toHaveCount(1);
  await expect(page.locator("a.exp-card", { hasText: "EXP-104" }).getByText("Measured winner")).toBeVisible();
  await expect(page.getByText("Rejected").first()).toBeVisible();
  await expect(page.getByText("Promising, unverified", { exact: true })).toBeVisible();
  await expect(page.getByText("Inconclusive", { exact: true })).toBeVisible();
});

test("approve EXP-107: replay runs live and Guardian rejects a below-threshold effect", async ({ page }) => {
  await page.goto("/console/experiments/EXP-107");
  await expect(page.getByText("Approval required.")).toBeVisible();
  await page.getByRole("button", { name: /Approve and run/ }).click();
  await expect(page.getByText(/Queued on replay-sandbox|Replaying cap_0918u/)).toBeVisible();
  // 10 runs at ~2.6 s each, then verification.
  await expect(page.getByText(/Effect is below the 3% practical threshold/).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("9/9 gates pass").first()).toBeVisible();
});

test("INC-212: correlation becomes a confirmed cause only after EXP-108 completes", async ({ page }) => {
  await page.goto("/console/incidents/INC-212");
  await expect(page.getByText("Correlated, not proven.")).toBeVisible();
  await expect(page.getByText("Cause confirmed by controlled experiment.")).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: /Request rollback approval/ }).click();
  await expect(page.getByText(/Waiting for an Admin to approve/)).toBeVisible();
});

test("report: numbers can be challenged; limitations and failed experiments are present", async ({ page }) => {
  await page.goto("/console/reports/RPT-014");
  await page.getByRole("button", { name: /981 → 648 ms/ }).click();
  await expect(page.getByText("How this was measured")).toBeVisible();
  await expect(page.getByText("What did not work")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Limitations" })).toBeVisible();
  await expect(page.getByText(/sha256:7c2e91d0/).first()).toBeVisible();
});

test("view states: loading, empty, partial, degraded and error are designed", async ({ page }) => {
  await page.goto("/console");
  const select = page.getByLabel("Preview page state");
  await select.selectOption("error");
  await expect(page.getByText("Could not load this page")).toBeVisible();
  await select.selectOption("empty");
  await expect(page.getByText("No telemetry yet for qwen-prod")).toBeVisible();
  await select.selectOption("partial");
  await expect(page.getByText("Partial telemetry.")).toBeVisible();
  await select.selectOption("degraded");
  await expect(page.getByText("Degraded.")).toBeVisible();
  await select.selectOption("loading");
  await expect(page.locator("[aria-busy=true]")).toBeVisible();
  await select.selectOption("live");
  await expect(page.getByText(/SLO miss · target 700 ms/)).toBeVisible();
});
