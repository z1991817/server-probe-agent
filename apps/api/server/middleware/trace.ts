import { defineEventHandler, getRequestHeader, setResponseHeader } from "h3";

export default defineEventHandler((event) => {
  const incomingTraceId = getRequestHeader(event, "x-trace-id");
  const traceId = normalizeTraceId(incomingTraceId) ?? crypto.randomUUID();

  event.context["traceId"] = traceId;
  setResponseHeader(event, "x-trace-id", traceId);
});

function normalizeTraceId(value: string | undefined): string | null {
  const traceId = value?.trim();

  if (!traceId) {
    return null;
  }

  return traceId.slice(0, 128);
}
