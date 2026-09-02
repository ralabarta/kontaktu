import { defineConfig, devices } from "@playwright/test";

const TEST_PORT = 3100;
const TEST_URL = `http://127.0.0.1:${TEST_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: TEST_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${TEST_PORT}`,
    url: TEST_URL,
    reuseExistingServer: false,
  },
});
