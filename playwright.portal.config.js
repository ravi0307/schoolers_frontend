import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "portal-visual.spec.mjs",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: "http://127.0.0.1:4178",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4178 --strictPort",
    url: "http://127.0.0.1:4178/login",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
