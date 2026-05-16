import type { HealthCheckData } from "@server-probe/shared";
import { defineEventHandler } from "h3";

import { ok } from "../utils/response";

export default defineEventHandler((event) => {
  const data: HealthCheckData = {
    service: "server-probe-api",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  };

  return ok(event, data);
});
