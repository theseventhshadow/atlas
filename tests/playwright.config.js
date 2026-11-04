import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.spec\.js/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "results/playwright-report.json" }],
    ["html", { outputFolder: "results/html", open: "never" }],
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || "http://localhost:3351",
    // Usa el Microsoft Edge instalado en el equipo; evita descargar navegadores.
    channel: "msedge",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1366, height: 768 },
  },
});
