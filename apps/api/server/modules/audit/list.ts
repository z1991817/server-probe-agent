import type {
  AuditListData,
  AuditListQueryData,
  AuditLogItemData
} from "@server-probe/shared";
import type { H3Event } from "h3";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { usePrisma } from "../../utils/database";
import { raise } from "../../utils/response";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface ParsedAuditListQuery {
  username: string | null;
  action: string | null;
  result: "success" | "failure" | null;
  targetId: string | null;
  from: Date | null;
  to: Date | null;
  page: number;
  pageSize: number;
}

const querySchema = z.object({
  username: z.string().trim().min(1).nullable(),
  action: z.string().trim().min(1).nullable(),
  result: z.enum(["success", "failure"]).nullable(),
  targetId: z.string().trim().min(1).nullable(),
  from: z.string().trim().min(1).nullable(),
  to: z.string().trim().min(1).nullable(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE)
});

export async function listAuditLogs(
  event: H3Event,
  rawQuery: Record<string, unknown>
): Promise<AuditListData> {
  const query = parseAuditQuery(rawQuery);
  const where = createAuditWhereInput(query);
  const skip = (query.page - 1) * query.pageSize;
  const prisma = usePrisma(event);

  const [total, records] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize
    })
  ]);

  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));

  return {
    query: toAuditQueryData(query),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount,
    items: records.map((record): AuditLogItemData => ({
      id: record.id,
      userId: record.userId,
      username: record.username,
      action: record.action,
      targetType: record.targetType,
      targetId: record.targetId,
      targetName: record.targetName,
      requestPayload: record.requestPayload,
      result: record.result === "success" ? "success" : "failure",
      errorMessage: record.errorMessage,
      ip: record.ip,
      userAgent: record.userAgent,
      traceId: record.traceId,
      createdAt: record.createdAt.toISOString()
    }))
  };
}

function parseAuditQuery(rawQuery: Record<string, unknown>): ParsedAuditListQuery {
  const parsed = querySchema.safeParse({
    username: parseStringQueryValue(rawQuery["username"]),
    action: parseStringQueryValue(rawQuery["action"]),
    result: parseResultQueryValue(rawQuery["result"]),
    targetId: parseStringQueryValue(rawQuery["targetId"]),
    from: parseStringQueryValue(rawQuery["from"]),
    to: parseStringQueryValue(rawQuery["to"]),
    page: parsePositiveIntegerQueryValue(rawQuery["page"]) ?? DEFAULT_PAGE,
    pageSize: parsePositiveIntegerQueryValue(rawQuery["pageSize"]) ?? DEFAULT_PAGE_SIZE
  });

  if (!parsed.success) {
    raise({
      statusCode: 400,
      code: "INVALID_AUDIT_QUERY",
      message: parsed.error.issues.map((issue) => issue.message).join("；")
    });
  }

  const from = parseOptionalDate(parsed.data.from, "from");
  const to = parseOptionalDate(parsed.data.to, "to");

  if (from !== null && to !== null && from.getTime() > to.getTime()) {
    raise({
      statusCode: 400,
      code: "INVALID_AUDIT_QUERY",
      message: "from 不能晚于 to"
    });
  }

  return {
    username: parsed.data.username,
    action: parsed.data.action,
    result: parsed.data.result,
    targetId: parsed.data.targetId,
    from,
    to,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize
  };
}

function createAuditWhereInput(query: ParsedAuditListQuery): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (query.username !== null) {
    where.username = {
      contains: query.username
    };
  }

  if (query.action !== null) {
    where.action = {
      contains: query.action
    };
  }

  if (query.result !== null) {
    where.result = query.result;
  }

  if (query.targetId !== null) {
    where.targetId = {
      contains: query.targetId
    };
  }

  if (query.from !== null || query.to !== null) {
    where.createdAt = {};

    if (query.from !== null) {
      where.createdAt.gte = query.from;
    }

    if (query.to !== null) {
      where.createdAt.lte = query.to;
    }
  }

  return where;
}

function toAuditQueryData(query: ParsedAuditListQuery): AuditListQueryData {
  return {
    username: query.username,
    action: query.action,
    result: query.result,
    targetId: query.targetId,
    from: query.from?.toISOString() ?? null,
    to: query.to?.toISOString() ?? null,
    page: query.page,
    pageSize: query.pageSize
  };
}

function parseStringQueryValue(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parseResultQueryValue(value: unknown): "success" | "failure" | null {
  const candidate = parseStringQueryValue(value);

  if (candidate === null) {
    return null;
  }

  return candidate === "success" || candidate === "failure"
    ? candidate
    : null;
}

function parsePositiveIntegerQueryValue(value: unknown): number | null {
  const candidate = parseStringQueryValue(value);

  if (candidate === null) {
    return null;
  }

  const parsed = Number(candidate);

  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function parseOptionalDate(value: string | null, field: string): Date | null {
  if (value === null) {
    return null;
  }

  const timestampMs = Date.parse(value);

  if (Number.isNaN(timestampMs)) {
    raise({
      statusCode: 400,
      code: "INVALID_AUDIT_QUERY",
      message: `${field} 时间格式不合法`
    });
  }

  return new Date(timestampMs);
}
