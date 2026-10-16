import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout contre un build de production (`npm run build` d'abord),
// avec une base et un stockage dédiés, recréés à chaque exécution.
const PORT = 3100;
export const E2E_ADMIN = { email: "admin-e2e@mks.test", password: "e2e-admin-password-123" };

const env = {
  DATABASE_URL: "file:./e2e.db",
  STORAGE_DIR: "./storage-e2e",
  ADMIN_EMAIL: E2E_ADMIN.email,
  ADMIN_PASSWORD: E2E_ADMIN.password,
  ADMIN_NAME: "Admin E2E",
  TEAM_TIMEZONE: "Europe/Paris",
  FACEIT_API_KEY: "",
  FACEIT_GAME_ID: "",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx prisma migrate deploy && npx tsx prisma/seed.ts && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env,
  },
});
