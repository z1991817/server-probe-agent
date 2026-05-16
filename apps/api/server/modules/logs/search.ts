import type {
  LogEntryData,
  LogFileReadSummary,
  LogSearchQueryData,
  LogsSearchData,
  ManagedProjectConfig
} from "@server-probe/shared";
import type { H3Event } from "h3";
import { open, stat } from "node:fs/promises";
import { z } from "zod";

import { loadProjectsConfig } from "../projects/config";
import { raise } from "../../utils/response";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const MAX_BYTES_PER_FILE = 1024 * 1024;
const MAX_TOTAL_READ_BYTES = 5 * 1024 * 1024;
const MAX_LINES_PER_FILE = 5000;
const MAX_LINE_CHARS = 8000;

interface ParsedLogSearchQuery {
  projectId: string | null;
  keyword: string | null;
  from: Date | null;
  to: Date | null;
  limit: number;
}

interface LogLineCandidate {
  filePath: string;
  lineNumber: number | null;
  timestamp: string | null;
  timestampMs: number | null;
  message: string;
  truncated: boolean;
}

const querySchema = z.object({
  projectId: z.string().trim().min(1).nullable(),
  keyword: z.string().trim().min(1).nullable(),
  from: z.string().trim().min(1).nullable(),
  to: z.string().trim().min(1).nullable(),
  limit: z.number().int().min(1).max(MAX_LIMIT)
});

export async function searchHistoricalLogs(
  event: H3Event,
  rawQuery: Record<string, unknown>
): Promise<LogsSearchData> {
  const query = parseLogSearchQuery(rawQuery);
  const configStatus = await loadProjectsConfig(event);

  if (!configStatus.loaded) {
    raise({
      statusCode: 409,
      code: "PROJECTS_CONFIG_INVALID",
      message: "项目配置加载失败，无法读取历史日志"
    });
  }

  const projects = selectProjects(configStatus.projects, query.projectId);
  const fileSummaries: LogFileReadSummary[] = [];
  const entries: LogEntryData[] = [];
  const warnings: string[] = [];
  let scannedLineCount = 0;
  let matchedLineCount = 0;
  let totalReadBytes = 0;

  for (const project of projects) {
    for (const filePath of project.logFiles) {
      if (totalReadBytes >= MAX_TOTAL_READ_BYTES) {
        warnings.push("已达到单次日志读取总大小上限，剩余日志文件未读取");
        break;
      }

      const remainingBytes = MAX_TOTAL_READ_BYTES - totalReadBytes;
      const result = await readProjectLogFile(project, filePath, query, {
        remainingBytes,
        remainingLimit: query.limit - entries.length
      });

      totalReadBytes += result.summary.readBytes;
      fileSummaries.push(result.summary);
      scannedLineCount += result.summary.scannedLines;
      matchedLineCount += result.summary.matchedLines;
      entries.push(...result.entries);

      if (entries.length >= query.limit) {
        warnings.push("已达到返回行数上限，剩余匹配日志未返回");
        break;
      }
    }

    if (entries.length >= query.limit || totalReadBytes >= MAX_TOTAL_READ_BYTES) {
      break;
    }
  }

  return {
    query: toQueryData(query),
    entries,
    files: fileSummaries,
    scannedLineCount,
    matchedLineCount,
    returnedCount: entries.length,
    truncated:
      entries.length >= query.limit ||
      totalReadBytes >= MAX_TOTAL_READ_BYTES ||
      fileSummaries.some((summary) => summary.truncatedBySize),
    warnings: dedupeWarnings(warnings)
  };
}

function parseLogSearchQuery(
  rawQuery: Record<string, unknown>
): ParsedLogSearchQuery {
  const parsedLimit = parsePositiveIntegerQueryValue(rawQuery["limit"]);
  const normalizedQuery = querySchema.safeParse({
    projectId: parseStringQueryValue(rawQuery["projectId"]),
    keyword: parseStringQueryValue(rawQuery["keyword"]),
    from: parseStringQueryValue(rawQuery["from"]),
    to: parseStringQueryValue(rawQuery["to"]),
    limit: parsedLimit ?? DEFAULT_LIMIT
  });

  if (!normalizedQuery.success) {
    raise({
      statusCode: 400,
      code: "INVALID_LOG_SEARCH_QUERY",
      message: normalizedQuery.error.issues
        .map((issue) => issue.message)
        .join("；")
    });
  }

  const from = parseOptionalDate(normalizedQuery.data.from, "from");
  const to = parseOptionalDate(normalizedQuery.data.to, "to");

  if (from !== null && to !== null && from.getTime() > to.getTime()) {
    raise({
      statusCode: 400,
      code: "INVALID_LOG_SEARCH_QUERY",
      message: "from 不能晚于 to"
    });
  }

  return {
    projectId: normalizedQuery.data.projectId,
    keyword: normalizedQuery.data.keyword,
    from,
    to,
    limit: normalizedQuery.data.limit
  };
}

function selectProjects(
  projects: ManagedProjectConfig[],
  projectId: string | null
): ManagedProjectConfig[] {
  if (projectId === null) {
    return projects;
  }

  const project = projects.find((candidate) => candidate.id === projectId);

  if (project === undefined) {
    raise({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND",
      message: "项目不存在"
    });
  }

  return [project];
}

async function readProjectLogFile(
  project: ManagedProjectConfig,
  filePath: string,
  query: ParsedLogSearchQuery,
  options: { remainingBytes: number; remainingLimit: number }
): Promise<{ summary: LogFileReadSummary; entries: LogEntryData[] }> {
  const baseSummary: LogFileReadSummary = {
    projectId: project.id,
    projectName: project.name,
    filePath,
    exists: false,
    sizeBytes: null,
    readBytes: 0,
    readFromByte: 0,
    scannedLines: 0,
    matchedLines: 0,
    returnedLines: 0,
    truncatedBySize: false,
    error: null
  };

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return {
        summary: {
          ...baseSummary,
          exists: true,
          sizeBytes: fileStat.size,
          error: "日志路径不是文件"
        },
        entries: []
      };
    }

    const maxBytes = Math.min(MAX_BYTES_PER_FILE, options.remainingBytes);
    const readFromByte = Math.max(0, fileStat.size - maxBytes);
    const readBytes = fileStat.size - readFromByte;
    const content = await readFileChunk(filePath, readFromByte, readBytes);
    const lines = splitLogLines(content, readFromByte > 0);
    const recentLines = lines.slice(Math.max(0, lines.length - MAX_LINES_PER_FILE));
    const candidates = toLineCandidates(
      recentLines,
      filePath,
      readFromByte > 0 ? null : lines.length - recentLines.length + 1
    );
    const matchedCandidates = candidates.filter((candidate) =>
      matchesQuery(candidate, query)
    );
    const returnedCandidates = matchedCandidates.slice(
      0,
      Math.max(options.remainingLimit, 0)
    );
    const entries = returnedCandidates.map((candidate) =>
      toLogEntry(project, candidate)
    );

    return {
      summary: {
        ...baseSummary,
        exists: true,
        sizeBytes: fileStat.size,
        readBytes,
        readFromByte,
        scannedLines: candidates.length,
        matchedLines: matchedCandidates.length,
        returnedLines: entries.length,
        truncatedBySize: readFromByte > 0 || lines.length > MAX_LINES_PER_FILE
      },
      entries
    };
  } catch (error) {
    return {
      summary: {
        ...baseSummary,
        error: getErrorMessage(error)
      },
      entries: []
    };
  }
}

async function readFileChunk(
  filePath: string,
  position: number,
  length: number
): Promise<string> {
  if (length <= 0) {
    return "";
  }

  const fileHandle = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(length);
    const result = await fileHandle.read(buffer, 0, length, position);

    return buffer.subarray(0, result.bytesRead).toString("utf8");
  } finally {
    await fileHandle.close();
  }
}

function splitLogLines(content: string, dropFirstPartialLine: boolean): string[] {
  const lines = content.split(/\r?\n/);

  if (dropFirstPartialLine) {
    lines.shift();
  }

  if (lines.at(-1) === "") {
    lines.pop();
  }

  return lines;
}

function toLineCandidates(
  lines: string[],
  filePath: string,
  firstLineNumber: number | null
): LogLineCandidate[] {
  return lines.map((line, index) => {
    const parsedTimestamp = parseTimestampFromLine(line);
    const truncated = line.length > MAX_LINE_CHARS;

    return {
      filePath,
      lineNumber:
        firstLineNumber === null ? null : firstLineNumber + index,
      timestamp: parsedTimestamp?.timestamp ?? null,
      timestampMs: parsedTimestamp?.timestampMs ?? null,
      message: truncated ? line.slice(0, MAX_LINE_CHARS) : line,
      truncated
    };
  });
}

function matchesQuery(
  candidate: LogLineCandidate,
  query: ParsedLogSearchQuery
): boolean {
  if (
    query.keyword !== null &&
    !candidate.message.toLowerCase().includes(query.keyword.toLowerCase())
  ) {
    return false;
  }

  if (query.from !== null || query.to !== null) {
    if (candidate.timestampMs === null) {
      return false;
    }

    if (query.from !== null && candidate.timestampMs < query.from.getTime()) {
      return false;
    }

    if (query.to !== null && candidate.timestampMs > query.to.getTime()) {
      return false;
    }
  }

  return true;
}

function toLogEntry(
  project: ManagedProjectConfig,
  candidate: LogLineCandidate
): LogEntryData {
  return {
    projectId: project.id,
    projectName: project.name,
    filePath: candidate.filePath,
    lineNumber: candidate.lineNumber,
    timestamp: candidate.timestamp,
    message: candidate.message,
    truncated: candidate.truncated
  };
}

function parseTimestampFromLine(
  line: string
): { timestamp: string; timestampMs: number } | null {
  const isoMatch = line.match(
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})?\b/
  );

  if (isoMatch?.[0]) {
    return normalizeTimestamp(isoMatch[0]);
  }

  const commonMatch = line.match(
    /\b\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?\b/
  );

  if (commonMatch?.[0]) {
    return normalizeTimestamp(commonMatch[0].replaceAll("/", "-"));
  }

  return null;
}

function normalizeTimestamp(value: string): {
  timestamp: string;
  timestampMs: number;
} | null {
  const normalizedValue = value.includes("T")
    ? value
    : value.replace(" ", "T");
  const timestampMs = Date.parse(normalizedValue);

  if (Number.isNaN(timestampMs)) {
    return null;
  }

  return {
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs
  };
}

function parseOptionalDate(value: string | null, field: string): Date | null {
  if (value === null) {
    return null;
  }

  const timestampMs = Date.parse(value);

  if (Number.isNaN(timestampMs)) {
    raise({
      statusCode: 400,
      code: "INVALID_LOG_SEARCH_QUERY",
      message: `${field} 时间格式不合法`
    });
  }

  return new Date(timestampMs);
}

function toQueryData(query: ParsedLogSearchQuery): LogSearchQueryData {
  return {
    projectId: query.projectId,
    keyword: query.keyword,
    from: query.from?.toISOString() ?? null,
    to: query.to?.toISOString() ?? null,
    limit: query.limit
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

function parsePositiveIntegerQueryValue(value: unknown): number | null {
  const candidate = parseStringQueryValue(value);

  if (candidate === null) {
    return null;
  }

  const parsed = Number(candidate);

  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function dedupeWarnings(warnings: string[]): string[] {
  return [...new Set(warnings)];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
