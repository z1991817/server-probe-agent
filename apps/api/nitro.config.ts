import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  srcDir: "server",
  compatibilityDate: "2026-05-15",
  errorHandler: "~/error",
  runtimeConfig: {
    projectsConfigPath:
      process.env["PROBE_PROJECTS_CONFIG_PATH"] ?? "../../config/projects.yaml",
    databaseUrl:
      process.env["DATABASE_URL"] ?? "file:../../data/server-probe.sqlite",
    auth: {
      adminUsername: process.env["PROBE_ADMIN_USERNAME"] ?? "admin",
      adminPassword: process.env["PROBE_ADMIN_PASSWORD"] ?? "admin123456",
      sessionSecret:
        process.env["PROBE_SESSION_SECRET"] ?? "dev-only-change-me-session-secret",
      sessionTtlSeconds: Number(process.env["PROBE_SESSION_TTL_SECONDS"] ?? 86400)
    }
  }
});
