import type {
  ApiErrorResponse,
  ApiSuccessResponse
} from "@server-probe/shared";
import type { H3Event } from "h3";
import { createError, setResponseStatus } from "h3";

export interface ApiErrorOptions {
  code: string;
  message: string;
  statusCode?: number;
  statusMessage?: string;
}

export function getTraceId(event: H3Event): string {
  const traceId = event.context["traceId"];

  if (typeof traceId === "string" && traceId.length > 0) {
    return traceId;
  }

  return "trace-id-missing";
}

export function ok<TData>(
  event: H3Event,
  data: TData
): ApiSuccessResponse<TData> {
  return {
    success: true,
    data,
    traceId: getTraceId(event)
  };
}

export function fail(event: H3Event, options: ApiErrorOptions): ApiErrorResponse {
  setResponseStatus(
    event,
    options.statusCode ?? 500,
    options.statusMessage ?? options.message
  );

  return {
    success: false,
    error: {
      code: options.code,
      message: options.message
    },
    traceId: getTraceId(event)
  };
}

export function raise(options: ApiErrorOptions): never {
  throw createError({
    statusCode: options.statusCode ?? 500,
    statusMessage: options.statusMessage ?? options.message,
    message: options.message,
    data: {
      code: options.code
    }
  });
}
