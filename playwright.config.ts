import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /responsive/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive/ },
    { name: "mobile-375", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 740 } }, testMatch: /responsive/ },
  ],
  webServer: {
    command: `npm run dev -w @waferlens/web -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
