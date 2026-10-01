import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",

  // These specs share one dev server, database, and seed accounts, so
  // running them in parallel causes real contention (DB pool exhaustion,
  // shared login rate limiting) rather than just slower tests.
  fullyParallel: false,
  workers: 1,

  use: {
    baseURL: "http://localhost:3333",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    command: "bun start",
    url: "http://localhost:3333",
    reuseExistingServer: true,
    env: { DISABLE_RATE_LIMIT: "true" },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
