import type {
  LogStreamErrorEventData,
  LogStreamHeartbeatEventData,
  LogStreamLogEventData,
  ManagedProjectConfig
} from "@server-probe/shared";
import type { H3Event } from "h3";
import { open, stat } from "node:fs/promises";

import { loadProjectsConfig } from "../projects/config";
import { raise } from "../../utils/response";

const POLL_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 15000;
const MAX_READ_BYTES_PER_FILE_TICK = 64 * 1024;
const MAX_EMITTED_LINES_PER_FILE_TICK = 500;
const MAX_LINE_CHARS = 8000;

interface PreparedLogStream {
  project: ManagedProjectConfig;
  files: TailFileState[];
}

interface TailFileState {
  filePath: string;
  offset: number | null;
  partialLine: string;
  missingReported: boolean;
}

interface LogStreamWriter {
  log(data: LogStreamLogEventData): void;
  heartbeat(data: LogStreamHeartbeatEventData): void;
  error(data: LogStreamErrorEventData): void;
  close(): void;
  readonly closed: boolean;
}

export async function prepareLogStream(
  event: H3Event,
  rawQuery: Record<string, unknown>
): Promise<PreparedLogStream> {
  const projectId = parseProjectId(rawQuery["projectId"]);
  const configStatus = await loadProjectsConfig(event);

  if (!configStatus.loaded) {
    raise({
      statusCode: 409,
      code: "PROJECTS_CONFIG_INVALID",
      message: "项目配置加载失败，无法订阅实时日志"
    });
  }

  const project = configStatus.projects.find((candidate) => candidate.id === projectId);

  if (project === undefined) {
    raise({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND",
      message: "项目不存在"
    });
  }

  return {
    project,
    files: project.logFiles.map((filePath) => ({
      filePath,
      offset: null,
      partialLine: "",
      missingReported: false
    }))
  };
}

export function streamProjectLogs(
  event: H3Event,
  stream: PreparedLogStream
): Promise<void> {
  const writer = createNodeSseWriter(event);
  let polling = false;

  writer.heartbeat(createHeartbeatData(stream.project));

  if (stream.files.length === 0) {
    writer.error({
      projectId: stream.project.id,
      projectName: stream.project.name,
      filePath: null,
      code: "LOG_FILES_NOT_CONFIGURED",
      message: "项目未配置日志文件",
      emittedAt: new Date().toISOString()
    });
  }

  const poll = async () => {
    if (polling || writer.closed) {
      return;
    }

    polling = true;

    try {
      for (const file of stream.files) {
        if (writer.closed) {
          return;
        }

        await pollLogFile(stream.project, file, writer);
      }
    } finally {
      polling = false;
    }
  };

  const pollTimer = setInterval(() => {
    void poll();
  }, POLL_INTERVAL_MS);
  const heartbeatTimer = setInterval(() => {
    writer.heartbeat(createHeartbeatData(stream.project));
  }, HEARTBEAT_INTERVAL_MS);

  void poll();

  pollTimer.unref();
  heartbeatTimer.unref();

  return new Promise((resolve) => {
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
      writer.close();
      resolve();
    };

    event.node.res.once("close", cleanup);
    event.node.req.once("aborted", cleanup);
  });
}

async function pollLogFile(
  project: ManagedProjectConfig,
  file: TailFileState,
  writer: LogStreamWriter
): Promise<void> {
  try {
    const fileStat = await stat(file.filePath);

    if (!fileStat.isFile()) {
      emitFileError(project, file, writer, {
        code: "LOG_PATH_NOT_FILE",
        message: "日志路径不是文件"
      });
      return;
    }

    if (file.offset === null) {
      file.offset = fileStat.size;
      file.missingReported = false;
      return;
    }

    if (fileStat.size < file.offset) {
      file.offset = 0;
      file.partialLine = "";
      writer.error({
        projectId: project.id,
        projectName: project.name,
        filePath: file.filePath,
        code: "LOG_FILE_ROTATED",
        message: "日志文件已截断或轮转，已从新文件继续监听",
        emittedAt: new Date().toISOString()
      });
    }

    if (fileStat.size === file.offset) {
      return;
    }

    let readFromByte = file.offset;
    let readBytes = fileStat.size - file.offset;

    if (readBytes > MAX_READ_BYTES_PER_FILE_TICK) {
      readFromByte = fileStat.size - MAX_READ_BYTES_PER_FILE_TICK;
      readBytes = MAX_READ_BYTES_PER_FILE_TICK;
      file.partialLine = "";
      writer.error({
        projectId: project.id,
        projectName: project.name,
        filePath: file.filePath,
        code: "LOG_STREAM_CHUNK_TRUNCATED",
        message: "单次日志增量超过读取上限，已跳过部分内容",
        emittedAt: new Date().toISOString()
      });
    }

    const chunk = await readFileChunk(file.filePath, readFromByte, readBytes);
    file.offset = fileStat.size;
    emitLogLines(project, file, chunk, writer);
  } catch (error) {
    if (!file.missingReported) {
      emitFileError(project, file, writer, {
        code: "LOG_FILE_UNAVAILABLE",
        message: getErrorMessage(error)
      });
      file.missingReported = true;
    }
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

function emitLogLines(
  project: ManagedProjectConfig,
  file: TailFileState,
  chunk: string,
  writer: LogStreamWriter
): void {
  const text = file.partialLine + chunk;
  const lines = text.split(/\r?\n/);
  const endedWithNewline = text.endsWith("\n") || text.endsWith("\r");

  file.partialLine = endedWithNewline ? "" : lines.pop() ?? "";

  if (endedWithNewline && lines.at(-1) === "") {
    lines.pop();
  }

  const emittedLines = lines.slice(0, MAX_EMITTED_LINES_PER_FILE_TICK);

  for (const line of emittedLines) {
    const truncated = line.length > MAX_LINE_CHARS;
    const parsedTimestamp = parseTimestampFromLine(line);

    writer.log({
      projectId: project.id,
      projectName: project.name,
      filePath: file.filePath,
      timestamp: parsedTimestamp,
      message: truncated ? line.slice(0, MAX_LINE_CHARS) : line,
      truncated,
      emittedAt: new Date().toISOString()
    });
  }

  if (lines.length > MAX_EMITTED_LINES_PER_FILE_TICK) {
    writer.error({
      projectId: project.id,
      projectName: project.name,
      filePath: file.filePath,
      code: "LOG_STREAM_LINES_TRUNCATED",
      message: "单次日志增量行数超过发送上限，已跳过部分内容",
      emittedAt: new Date().toISOString()
    });
  }
}

function createNodeSseWriter(event: H3Event): LogStreamWriter {
  const response = event.node.res;
  let closed = false;

  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no"
  });
  response.write("retry: 3000\n\n");

  const writeEvent = (
    eventType: "log" | "heartbeat" | "error",
    data:
      | LogStreamLogEventData
      | LogStreamHeartbeatEventData
      | LogStreamErrorEventData
  ) => {
    if (closed || response.destroyed) {
      closed = true;
      return;
    }

    response.write(`event: ${eventType}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  return {
    log(data) {
      writeEvent("log", data);
    },
    heartbeat(data) {
      writeEvent("heartbeat", data);
    },
    error(data) {
      writeEvent("error", data);
    },
    close() {
      if (closed) {
        return;
      }

      closed = true;
      if (!response.destroyed && !response.writableEnded) {
        response.end();
      }
    },
    get closed() {
      return closed || response.destroyed || response.writableEnded;
    }
  };
}

function createHeartbeatData(
  project: ManagedProjectConfig
): LogStreamHeartbeatEventData {
  return {
    projectId: project.id,
    projectName: project.name,
    emittedAt: new Date().toISOString()
  };
}

function emitFileError(
  project: ManagedProjectConfig,
  file: TailFileState,
  writer: LogStreamWriter,
  error: { code: string; message: string }
): void {
  writer.error({
    projectId: project.id,
    projectName: project.name,
    filePath: file.filePath,
    code: error.code,
    message: error.message,
    emittedAt: new Date().toISOString()
  });
}

function parseProjectId(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    raise({
      statusCode: 400,
      code: "PROJECT_ID_REQUIRED",
      message: "projectId 不能为空"
    });
  }

  return candidate.trim();
}

function parseTimestampFromLine(line: string): string | null {
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

function normalizeTimestamp(value: string): string | null {
  const normalizedValue = value.includes("T")
    ? value
    : value.replace(" ", "T");
  const timestampMs = Date.parse(normalizedValue);

  if (Number.isNaN(timestampMs)) {
    return null;
  }

  return new Date(timestampMs).toISOString();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
