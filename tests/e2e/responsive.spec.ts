import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("waferlens:tour-seen", "1"));
});

const ROUTES = ["/", "/console", "/console/agent/INV-034", "/console/experiments", "/console/experiments/EXP-104", "/console/replay", "/console/incidents/INC-212", "/console/reports/RPT-014", "/console/knowledge", "/console/settings", "/console/inventory"];

for (const route of ROUTES) {
  test(`no horizontal page scroll on mobile: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile navigation opens the sidebar", async ({ page }) => {
  await page.goto("/console");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Experiments" }).click();
  await expect(page).toHaveURL(/\/console\/experiments$/);
});
