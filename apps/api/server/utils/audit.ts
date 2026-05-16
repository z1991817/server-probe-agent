import type { AuthUser } from "@server-probe/shared";
import type { H3Event } from "h3";
import { getRequestHeader, getRequestIP } from "h3";

import { usePrisma } from "./database";
import { getTraceId } from "./response";

export type AuditResult = "success" | "failure";

export interface WriteAuditLogInput {
  event: H3Event;
  user?: AuthUser | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetName?: string | null;
  requestPayload?: unknown;
  result: AuditResult;
  errorMessage?: string | null;
}

const MAX_PAYLOAD_LENGTH = 4000;
const MAX_ERROR_MESSAGE_LENGTH = 2000;

export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  await usePrisma(input.event).auditLog.create({
    data: {
      userId: input.user?.id ?? null,
      username: input.user?.username ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetName: input.targetName ?? null,
      requestPayload: serializeAuditPayload(input.requestPayload),
      result: input.result,
      errorMessage: truncateNullable(
        input.errorMessage,
        MAX_ERROR_MESSAGE_LENGTH
      ),
      ip: getRequestIP(input.event, { xForwardedFor: true }) ?? null,
      userAgent: getRequestHeader(input.event, "user-agent") ?? null,
      traceId: getTraceId(input.event)
    }
  });
}

function serializeAuditPayload(payload: unknown): string | null {
  if (payload === undefined) {
    return null;
  }

  const serialized = JSON.stringify(payload, (_key, value: unknown) => {
    if (typeof value === "bigint") {
      return value.toString();
    }

    return value;
  });

  return truncateNullable(serialized, MAX_PAYLOAD_LENGTH);
}

function truncateNullable(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (!value) {
    return null;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}
