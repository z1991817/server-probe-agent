import {
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  setResponseHeader
} from "h3";
import type { H3Event } from "h3";

import { requireAuth } from "../utils/auth";

const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me"
]);

export default defineEventHandler((event) => {
  ensureTraceId(event);
  const path = normalizePathname(getRequestURL(event).pathname);

  if (!path.startsWith("/api/")) {
    return;
  }

  if (PUBLIC_API_PATHS.has(path)) {
    return;
  }

  requireAuth(event);
});

function ensureTraceId(event: H3Event): void {
  const currentTraceId = event.context["traceId"];

  if (typeof currentTraceId === "string" && currentTraceId.length > 0) {
    return;
  }

  const incomingTraceId = getRequestHeader(event, "x-trace-id");
  const traceId = normalizeTraceId(incomingTraceId) ?? crypto.randomUUID();

  event.context["traceId"] = traceId;
  setResponseHeader(event, "x-trace-id", traceId);
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function normalizeTraceId(value: string | undefined): string | null {
  const traceId = value?.trim();

  if (!traceId) {
    return null;
  }

  return traceId.slice(0, 128);
}
