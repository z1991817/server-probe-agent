import type { ApiErrorResponse } from "@server-probe/shared";
import { send, setResponseHeader, setResponseStatus } from "h3";
import { defineNitroErrorHandler } from "nitropack/runtime/internal/error/utils";

import { getTraceId } from "./utils/response";

export default defineNitroErrorHandler((error, event) => {
  const statusCode = error.statusCode || 500;
  const statusMessage = getStatusMessage(error.statusMessage, statusCode);
  const traceId = getTraceId(event);
  const code = getErrorCode(error, statusCode);
  const message = getErrorMessage(error, statusCode, statusMessage);
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message
    },
    traceId
  };

  setResponseStatus(event, statusCode, statusMessage);
  setResponseHeader(event, "content-type", "application/json; charset=utf-8");
  setResponseHeader(event, "cache-control", "no-cache");
  setResponseHeader(event, "x-trace-id", traceId);

  return send(event, JSON.stringify(body));
});

function getErrorCode(error: { data?: unknown }, statusCode: number): string {
  if (isErrorData(error.data) && typeof error.data.code === "string") {
    return error.data.code;
  }

  if (statusCode === 400) {
    return "BAD_REQUEST";
  }

  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }

  if (statusCode === 403) {
    return "FORBIDDEN";
  }

  if (statusCode === 404) {
    return "ROUTE_NOT_FOUND";
  }

  return "INTERNAL_SERVER_ERROR";
}

function getStatusMessage(
  statusMessage: string | undefined,
  statusCode: number
): string {
  if (statusCode === 404) {
    return "Not Found";
  }

  return statusMessage || "Server Error";
}

function getErrorMessage(
  error: { message?: string },
  statusCode: number,
  statusMessage: string
): string {
  if (statusCode >= 500) {
    return "服务器内部错误";
  }

  return error.message || statusMessage;
}

function isErrorData(value: unknown): value is { code?: unknown } {
  return typeof value === "object" && value !== null;
}
