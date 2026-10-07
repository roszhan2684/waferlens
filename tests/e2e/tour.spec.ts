import { expect, test } from "@playwright/test";

test("guided tour auto-starts, spotlights each step across pages, and can be skipped", async ({ page }) => {
  await page.goto("/console");
  const card = page.getByRole("dialog", { name: /qwen-prod is missing its SLO/ });
  await expect(card).toBeVisible();
  await expect(page.locator(".tour-ring")).toBeVisible();
  await expect(card.getByText("1 / 16")).toBeVisible();

  // The spotlight sits on the SLO strip.
  const ring = await page.locator(".tour-ring").boundingBox();
  const target = await page.locator('[data-tour="slo"]').boundingBox();
  expect(ring && target && Math.abs(ring.x - (target.x - 8)) < 4).toBeTruthy();

  // Walk forward until the tour crosses to the agent page.
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page).toHaveURL(/\/console\/agent\/INV-031$/);
  await expect(page.getByRole("dialog", { name: /fixed state machine/ })).toBeVisible();

  // Back returns to the previous step on the previous page.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByRole("dialog", { name: /Coverage caps confidence/ })).toBeVisible();

  // Skip ends the tour and it does not come back on reload.
  await page.getByRole("button", { name: "Skip tour" }).click();
  await expect(page.locator(".tour-card")).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.locator(".tour-card")).toHaveCount(0);

  // The top-bar button restarts it.
  await page.getByRole("button", { name: /Guided tour/ }).click();
  await expect(page.getByRole("dialog", { name: /qwen-prod is missing its SLO/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".tour-card")).toHaveCount(0);
});

test("every tour step finds its target", async ({ page }) => {
  await page.goto("/console");
  for (let step = 1; step <= 16; step++) {
    await expect(page.locator(".tour-card").getByText(`${step} / 16`)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".tour-ring")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: step === 16 ? "Finish" : /^Next/ }).click();
  }
  await expect(page.locator(".tour-card")).toHaveCount(0);
});

test("landing page embeds the launch film", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("#film video");
  await expect(video).toHaveAttribute("src", "/video/waferlens-launch.mp4");
  const res = await page.request.get("/video/waferlens-launch.mp4");
  expect(res.status()).toBe(200);
  expect(Number(res.headers()["content-length"])).toBeGreaterThan(1_000_000);
});
