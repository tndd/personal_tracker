import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const envFiles = [".env.test", ".env.local", ".env"];
for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3002";
const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST を設定してください。");
}

process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
  },
  webServer: {
    command: "npm run start:test",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "api",
      use: {
        baseURL,
        browserName: "chromium",
      },
      testMatch: /.*\.spec\.ts/,
    },
  ],
});
