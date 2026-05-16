import type {
  ManagedProjectConfig,
  ProjectHealthStatusData,
  ProjectPortStatusData,
  ProjectPortState,
  ProjectProcessStatusData,
  ProjectRuntimeState,
  ProjectStatusData,
  ProjectsConfigMeta,
  ProjectsConfigStatusData
} from "@server-probe/shared";
import { execFile } from "node:child_process";
import { Socket } from "node:net";
import { performance } from "node:perf_hooks";

const PORT_HOST = "127.0.0.1";
const TCP_TIMEOUT_MS = 800;
const HEALTH_TIMEOUT_MS = 2000;
const PROCESS_COMMAND_TIMEOUT_MS = 1500;
const PROCESS_COMMAND_MAX_BUFFER = 128 * 1024;

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface ProcessProbeResult {
  process: ProjectProcessStatusData | null;
  message: string | null;
}

interface TcpProbeResult {
  state: ProjectPortState;
  listening: boolean | null;
  latencyMs: number | null;
  error: string | null;
}

export function getProjectsConfigMeta(
  status: ProjectsConfigStatusData
): ProjectsConfigMeta {
  const { projects: _projects, ...meta } = status;

  return meta;
}

export async function inspectProjectStatus(
  project: ManagedProjectConfig,
  options: { configLoaded: boolean }
): Promise<ProjectStatusData> {
  if (!options.configLoaded) {
    return createUnknownProjectStatus(project.id, [
      "项目配置加载失败，已跳过状态探测"
    ]);
  }

  const [portStatus, healthStatus] = await Promise.all([
    inspectPortStatus(project.port),
    inspectHealthStatus(project)
  ]);
  const processProbe =
    portStatus?.state === "listening"
      ? await inspectProcessByPort(portStatus.port)
      : { process: null, message: null };
  const reasons = deriveReasons(portStatus, healthStatus, processProbe);

  return {
    id: project.id,
    state: deriveRuntimeState(portStatus, healthStatus),
    checkedAt: new Date().toISOString(),
    portStatus,
    processStatus: processProbe.process,
    healthStatus,
    reasons
  };
}

function createUnknownProjectStatus(
  projectId: string,
  reasons: string[]
): ProjectStatusData {
  return {
    id: projectId,
    state: "unknown",
    checkedAt: new Date().toISOString(),
    portStatus: null,
    processStatus: null,
    healthStatus: null,
    reasons
  };
}

async function inspectPortStatus(
  port: number | null
): Promise<ProjectPortStatusData | null> {
  if (port === null) {
    return null;
  }

  const checkedAt = new Date().toISOString();
  const probe = await probeTcp(PORT_HOST, port, TCP_TIMEOUT_MS);

  return {
    port,
    host: PORT_HOST,
    state: probe.state,
    listening: probe.listening,
    checkedAt,
    latencyMs: probe.latencyMs,
    error: probe.error
  };
}

async function inspectHealthStatus(
  project: ManagedProjectConfig
): Promise<ProjectHealthStatusData | null> {
  const healthCheck = project.healthCheck;
  const checkedAt = new Date().toISOString();

  if (healthCheck === null || healthCheck.type === "none") {
    return {
      type: "none",
      state: "disabled",
      checkedAt,
      latencyMs: null,
      httpStatus: null,
      message: "未配置健康检查"
    };
  }

  if (healthCheck.type === "tcp") {
    const probe = await probeTcp(
      healthCheck.host,
      healthCheck.port,
      HEALTH_TIMEOUT_MS
    );

    return {
      type: "tcp",
      state:
        probe.state === "listening"
          ? "healthy"
          : probe.state === "closed"
            ? "unhealthy"
            : "unknown",
      checkedAt,
      latencyMs: probe.latencyMs,
      httpStatus: null,
      message: probe.error
    };
  }

  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(healthCheck.url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const healthy = response.status >= 200 && response.status < 400;

    return {
      type: "http",
      state: healthy ? "healthy" : "unhealthy",
      checkedAt,
      latencyMs,
      httpStatus: response.status,
      message: healthy ? null : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      type: "http",
      state: "unhealthy",
      checkedAt,
      latencyMs: Math.round(performance.now() - startedAt),
      httpStatus: null,
      message: getErrorMessage(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function deriveRuntimeState(
  portStatus: ProjectPortStatusData | null,
  healthStatus: ProjectHealthStatusData | null
): ProjectRuntimeState {
  if (healthStatus?.state === "healthy") {
    return "running";
  }

  if (portStatus?.state === "listening") {
    return healthStatus?.state === "unhealthy" ? "error" : "running";
  }

  if (portStatus?.state === "closed") {
    return "stopped";
  }

  if (healthStatus?.state === "unhealthy") {
    return "error";
  }

  return "unknown";
}

function deriveReasons(
  portStatus: ProjectPortStatusData | null,
  healthStatus: ProjectHealthStatusData | null,
  processProbe: ProcessProbeResult
): string[] {
  const reasons: string[] = [];

  if (portStatus === null) {
    reasons.push("未配置项目端口");
  } else if (portStatus.state === "listening") {
    reasons.push(`端口 ${portStatus.port} 正在监听`);
  } else if (portStatus.state === "closed") {
    reasons.push(`端口 ${portStatus.port} 未监听`);
  } else {
    reasons.push(
      `端口 ${portStatus.port} 状态未知${
        portStatus.error ? `：${portStatus.error}` : ""
      }`
    );
  }

  if (processProbe.message !== null) {
    reasons.push(processProbe.message);
  }

  if (healthStatus === null || healthStatus.state === "disabled") {
    reasons.push("未启用健康检查");
  } else if (healthStatus.state === "healthy") {
    reasons.push("健康检查通过");
  } else if (healthStatus.state === "unhealthy") {
    reasons.push(
      `健康检查失败${healthStatus.message ? `：${healthStatus.message}` : ""}`
    );
  } else {
    reasons.push(
      `健康检查状态未知${
        healthStatus.message ? `：${healthStatus.message}` : ""
      }`
    );
  }

  return reasons;
}

async function probeTcp(
  host: string,
  port: number,
  timeoutMs: number
): Promise<TcpProbeResult> {
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finish = (
      state: ProjectPortState,
      listening: boolean | null,
      error: string | null
    ) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve({
        state,
        listening,
        latencyMs: Math.round(performance.now() - startedAt),
        error
      });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish("listening", true, null));
    socket.once("timeout", () => finish("unknown", null, "连接超时"));
    socket.once("error", (error) => {
      const code = getNodeErrorCode(error);

      if (code === "ECONNREFUSED") {
        finish("closed", false, null);
        return;
      }

      finish("unknown", null, getErrorMessage(error));
    });
    socket.connect(port, host);
  });
}

async function inspectProcessByPort(port: number): Promise<ProcessProbeResult> {
  if (process.platform === "win32") {
    return inspectWindowsProcessByPort(port);
  }

  const ssProbe = await inspectSsProcessByPort(port);

  if (ssProbe.process !== null) {
    return ssProbe;
  }

  const lsofProbe = await inspectLsofProcessByPort(port);

  if (lsofProbe.process !== null) {
    return lsofProbe;
  }

  return {
    process: null,
    message: lsofProbe.message ?? ssProbe.message
  };
}

async function inspectWindowsProcessByPort(
  port: number
): Promise<ProcessProbeResult> {
  const script = `
$connection = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $connection) {
  $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
  [pscustomobject]@{
    pid = [int]$connection.OwningProcess
    name = if ($null -ne $process) { $process.ProcessName } else { $null }
    command = if ($null -ne $process) { $process.Path } else { $null }
    source = "Get-NetTCPConnection"
  } | ConvertTo-Json -Compress
}
`.trim();

  try {
    const result = await runProbeCommand("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ]);
    const record = parseJsonObject(result.stdout);

    if (record === null) {
      return {
        process: null,
        message: `端口 ${port} 正在监听，但未识别到进程`
      };
    }

    const pid = getNumberField(record, "pid");

    if (pid === null) {
      return {
        process: null,
        message: `端口 ${port} 正在监听，但进程 PID 解析失败`
      };
    }

    return {
      process: {
        pid,
        name: getStringField(record, "name"),
        command: getStringField(record, "command"),
        source: getStringField(record, "source") ?? "Get-NetTCPConnection"
      },
      message: null
    };
  } catch (error) {
    return {
      process: null,
      message: `端口 ${port} 正在监听，但进程查询失败：${getErrorMessage(error)}`
    };
  }
}

async function inspectSsProcessByPort(
  port: number
): Promise<ProcessProbeResult> {
  try {
    const result = await runProbeCommand("ss", ["-ltnp"]);
    const processInfo = parseSsOutput(result.stdout, port);

    return {
      process: processInfo,
      message:
        processInfo === null
          ? `端口 ${port} 正在监听，但 ss 未识别到进程`
          : null
    };
  } catch (error) {
    return {
      process: null,
      message: `ss 进程查询失败：${getErrorMessage(error)}`
    };
  }
}

async function inspectLsofProcessByPort(
  port: number
): Promise<ProcessProbeResult> {
  try {
    const result = await runProbeCommand("lsof", [
      "-nP",
      `-iTCP:${port}`,
      "-sTCP:LISTEN"
    ]);
    const processInfo = parseLsofOutput(result.stdout, port);

    return {
      process: processInfo,
      message:
        processInfo === null
          ? `端口 ${port} 正在监听，但 lsof 未识别到进程`
          : null
    };
  } catch (error) {
    return {
      process: null,
      message: `lsof 进程查询失败：${getErrorMessage(error)}`
    };
  }
}

function parseSsOutput(
  stdout: string,
  port: number
): ProjectProcessStatusData | null {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.includes("LISTEN") || !line.includes(`:${port}`)) {
      continue;
    }

    const match = line.match(/users:\(\("([^"]+)",pid=(\d+)/);

    if (match === null) {
      return null;
    }

    const name = match[1] ?? null;
    const pid = Number(match[2]);

    if (!Number.isInteger(pid)) {
      return null;
    }

    return {
      pid,
      name,
      command: null,
      source: "ss"
    };
  }

  return null;
}

function parseLsofOutput(
  stdout: string,
  port: number
): ProjectProcessStatusData | null {
  const lines = stdout.split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.includes(`:${port}`)) {
      continue;
    }

    const columns = line.trim().split(/\s+/);
    const name = columns[0] ?? null;
    const pid = Number(columns[1]);

    if (!Number.isInteger(pid)) {
      return null;
    }

    return {
      pid,
      name,
      command: null,
      source: "lsof"
    };
  }

  return null;
}

function runProbeCommand(file: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        encoding: "utf8",
        maxBuffer: PROCESS_COMMAND_MAX_BUFFER,
        timeout: PROCESS_COMMAND_TIMEOUT_MS,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? "")
        });
      }
    );
  });
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const record = Array.isArray(parsed) ? parsed[0] : parsed;

    return isRecord(record) ? record : null;
  } catch {
    return null;
  }
}

function getStringField(
  record: Record<string, unknown>,
  field: string
): string | null {
  const value = record[field];

  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNumberField(
  record: Record<string, unknown>,
  field: string
): number | null {
  const value = record[field];

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function getNodeErrorCode(error: unknown): string | null {
  return isRecord(error) && typeof error["code"] === "string"
    ? error["code"]
    : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
