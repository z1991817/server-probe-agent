import type {
  AuthUser,
  ManagedProjectConfig,
  ProjectOperationAction,
  ProjectOperationRequestBody,
  ProjectOperationResponseData,
  ProjectOperationResultData
} from "@server-probe/shared";
import type { H3Event } from "h3";
import { getRouterParam, readBody } from "h3";
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { z } from "zod";

import { raise } from "../../utils/response";
import { loadProjectsConfig } from "./config";
import { getProjectsConfigMeta } from "./status";

const COMMAND_TIMEOUT_MS = 30_000;
const OUTPUT_LIMIT_CHARS = 32 * 1024;
const LOCKED_PROJECT_OPERATIONS = new Map<string, ProjectOperationLock>();

interface ProjectOperationLock {
  action: ProjectOperationAction;
  startedAt: string;
}

interface ParsedCommand {
  file: string;
  args: string[];
}

interface OutputBuffer {
  value: string;
  truncated: boolean;
}

const operationBodySchema = z
  .object({
    confirmation: z.object({
      projectId: z.string().trim().min(1, "确认项目 id 不能为空"),
      projectName: z.string().trim().min(1, "确认项目名称不能为空")
    }),
    reason: z.string().trim().max(500, "操作原因最多 500 个字符").optional()
  })
  .strict();

export function readProjectIdParam(event: H3Event): string {
  const projectId = getRouterParam(event, "id");

  if (typeof projectId !== "string" || projectId.length === 0) {
    raise({
      statusCode: 400,
      code: "PROJECT_ID_REQUIRED",
      message: "项目 id 不能为空"
    });
  }

  return projectId;
}

export async function executeProjectOperation(
  event: H3Event,
  projectId: string,
  action: ProjectOperationAction
): Promise<ProjectOperationResponseData> {
  const [{ getCurrentUser, requireRole }, { writeAuditLog }] =
    await Promise.all([
      import("../../utils/auth"),
      import("../../utils/audit")
    ]);
  let auditUser: AuthUser | null = getCurrentUser(event);
  let shouldAudit = auditUser !== null;
  let auditAttempted = false;
  let project: ManagedProjectConfig | null = null;
  let requestPayload: Record<string, unknown> = {
    action,
    routeProjectId: projectId
  };

  try {
    auditUser = requireRole(event, ["admin", "operator"]);
    shouldAudit = true;

    const body = await readProjectOperationBody(event);
    requestPayload = {
      action,
      confirmation: body.confirmation,
      reason: body.reason ?? null
    };

    if (body.confirmation.projectId !== projectId) {
      raise({
        statusCode: 400,
        code: "PROJECT_OPERATION_CONFIRMATION_MISMATCH",
        message: "确认项目 id 与目标项目不一致"
      });
    }

    const configStatus = await loadProjectsConfig(event);

    if (!configStatus.writeEnabled) {
      raise({
        statusCode: 409,
        code: "PROJECTS_CONFIG_NOT_WRITABLE",
        message: "项目配置加载失败，写操作已禁用"
      });
    }

    project =
      configStatus.projects.find((candidate) => candidate.id === projectId) ??
      null;

    if (project === null) {
      raise({
        statusCode: 404,
        code: "PROJECT_NOT_FOUND",
        message: "项目不存在"
      });
    }

    if (body.confirmation.projectName !== project.name) {
      raise({
        statusCode: 400,
        code: "PROJECT_OPERATION_CONFIRMATION_MISMATCH",
        message: "确认项目名称与目标项目不一致"
      });
    }

    const managedProject = project;
    const command = getOperationCommand(managedProject, action);

    if (command === null) {
      raise({
        statusCode: 409,
        code: "PROJECT_OPERATION_NOT_CONFIGURED",
        message: `项目未配置 ${action} 操作命令`
      });
    }

    const operationCommand = command;
    const operation = await withProjectOperationLock(managedProject, action, async () => {
      await ensureDeployPathAvailable(managedProject);

      return runManagedCommand(managedProject, action, operationCommand);
    });

    auditAttempted = true;
    await writeAuditLog({
      event,
      user: auditUser,
      action: `project.${action}`,
      targetType: "project",
      targetId: managedProject.id,
      targetName: managedProject.name,
      requestPayload: {
        ...requestPayload,
        exitCode: operation.exitCode,
        timedOut: operation.timedOut,
        stdoutTruncated: operation.stdoutTruncated,
        stderrTruncated: operation.stderrTruncated
      },
      result: operation.status === "succeeded" ? "success" : "failure",
      errorMessage: getOperationAuditError(operation)
    });

    return {
      config: getProjectsConfigMeta(configStatus),
      project: managedProject,
      operation
    };
  } catch (error) {
    if (shouldAudit && !auditAttempted) {
      auditAttempted = true;
      await writeAuditLog({
        event,
        user: auditUser,
        action: `project.${action}`,
        targetType: "project",
        targetId: project?.id ?? projectId,
        targetName: project?.name ?? null,
        requestPayload,
        result: "failure",
        errorMessage: getErrorMessage(error)
      });
    }

    throw error;
  }
}

async function readProjectOperationBody(
  event: H3Event
): Promise<ProjectOperationRequestBody> {
  const rawBody = await readBody<unknown>(event);
  const parsedBody = operationBodySchema.safeParse(rawBody);

  if (!parsedBody.success) {
    raise({
      statusCode: 400,
      code: "INVALID_PROJECT_OPERATION_PAYLOAD",
      message: parsedBody.error.issues
        .map((issue) => issue.message)
        .join("；")
    });
  }

  const reason = parsedBody.data.reason?.trim();
  const body: ProjectOperationRequestBody = {
    confirmation: {
      projectId: parsedBody.data.confirmation.projectId.trim(),
      projectName: parsedBody.data.confirmation.projectName.trim()
    }
  };

  if (reason) {
    body.reason = reason;
  }

  return body;
}

function getOperationCommand(
  project: ManagedProjectConfig,
  action: ProjectOperationAction
): string | null {
  if (action === "start") {
    return project.startCommand;
  }

  if (action === "stop") {
    return project.stopCommand;
  }

  return project.restartCommand;
}

async function withProjectOperationLock(
  project: ManagedProjectConfig,
  action: ProjectOperationAction,
  run: () => Promise<ProjectOperationResultData>
): Promise<ProjectOperationResultData> {
  const existingLock = LOCKED_PROJECT_OPERATIONS.get(project.id);

  if (existingLock) {
    raise({
      statusCode: 409,
      code: "PROJECT_OPERATION_IN_PROGRESS",
      message: `项目 ${project.name} 正在执行 ${existingLock.action} 操作`
    });
  }

  LOCKED_PROJECT_OPERATIONS.set(project.id, {
    action,
    startedAt: new Date().toISOString()
  });

  try {
    return await run();
  } finally {
    LOCKED_PROJECT_OPERATIONS.delete(project.id);
  }
}

async function ensureDeployPathAvailable(
  project: ManagedProjectConfig
): Promise<void> {
  try {
    const deployPathStat = await stat(project.deployPath);

    if (!deployPathStat.isDirectory()) {
      raise({
        statusCode: 409,
        code: "PROJECT_DEPLOY_PATH_NOT_DIRECTORY",
        message: `项目部署路径不是目录：${project.deployPath}`
      });
    }
  } catch (error) {
    if (isH3StyleError(error)) {
      throw error;
    }

    raise({
      statusCode: 409,
      code: "PROJECT_DEPLOY_PATH_UNAVAILABLE",
      message: `项目部署路径不可用：${project.deployPath}`
    });
  }
}

async function runManagedCommand(
  project: ManagedProjectConfig,
  action: ProjectOperationAction,
  command: string
): Promise<ProjectOperationResultData> {
  const startedAt = new Date();
  const startedAtMs = performance.now();
  const parsedCommand = parseCommandLine(command);
  const stdout: OutputBuffer = { value: "", truncated: false };
  const stderr: OutputBuffer = { value: "", truncated: false };
  let timedOut = false;

  return new Promise((resolve) => {
    let settled = false;
    let forceKillTimeout: NodeJS.Timeout | null = null;
    const child = spawn(parsedCommand.file, parsedCommand.args, {
      cwd: project.deployPath,
      shell: false,
      windowsHide: true
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceKillTimeout = setTimeout(() => {
        child.kill("SIGKILL");
      }, 1000);
      forceKillTimeout.unref();
    }, COMMAND_TIMEOUT_MS);

    timeout.unref();

    const finish = (exitCode: number | null, signal: string | null) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      if (forceKillTimeout !== null) {
        clearTimeout(forceKillTimeout);
      }

      const finishedAt = new Date();
      const status = timedOut
        ? "timed_out"
        : exitCode === 0
          ? "succeeded"
          : "failed";

      resolve({
        action,
        status,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: Math.round(performance.now() - startedAtMs),
        exitCode,
        signal,
        timedOut,
        stdout: stdout.value,
        stderr: stderr.value,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated
      });
    };

    child.stdout.on("data", (chunk: Buffer | string) => {
      appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      appendOutput(stderr, chunk);
    });
    child.on("error", (error) => {
      appendOutput(stderr, getErrorMessage(error));
      finish(null, null);
    });
    child.on("close", (exitCode, signal) => {
      finish(exitCode, signal);
    });
  });
}

function parseCommandLine(command: string): ParsedCommand {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (char === undefined) {
      continue;
    }

    if (char === "\r" || char === "\n") {
      raiseInvalidCommand("操作命令不能包含换行");
    }

    if (quote !== null) {
      if (quote === '"' && char === "\\" && index + 1 < command.length) {
        current += command[index + 1] ?? "";
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
        continue;
      }

      current += char;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }

      continue;
    }

    if (isForbiddenShellOperator(char)) {
      raiseInvalidCommand(`操作命令包含不允许的 shell 运算符：${char}`);
    }

    current += char;
  }

  if (quote !== null) {
    raiseInvalidCommand("操作命令引号未闭合");
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  const [file, ...args] = tokens;

  if (!file) {
    raiseInvalidCommand("操作命令不能为空");
  }

  return { file, args };
}

function appendOutput(target: OutputBuffer, chunk: Buffer | string): void {
  if (target.truncated) {
    return;
  }

  const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
  const remainingLength = OUTPUT_LIMIT_CHARS - target.value.length;

  if (text.length <= remainingLength) {
    target.value += text;
    return;
  }

  target.value += text.slice(0, Math.max(remainingLength, 0));
  target.truncated = true;
}

function getOperationAuditError(
  operation: ProjectOperationResultData
): string | null {
  if (operation.status === "succeeded") {
    return null;
  }

  if (operation.status === "timed_out") {
    return `操作执行超时：${COMMAND_TIMEOUT_MS}ms`;
  }

  return (
    operation.stderr.trim() ||
    operation.stdout.trim() ||
    `操作执行失败，退出码：${operation.exitCode ?? "unknown"}`
  );
}

function isForbiddenShellOperator(char: string): boolean {
  return char === "|" || char === "&" || char === ";" || char === "<" || char === ">" || char === "`";
}

function raiseInvalidCommand(message: string): never {
  raise({
    statusCode: 409,
    code: "PROJECT_OPERATION_COMMAND_INVALID",
    message
  });
}

function isH3StyleError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "statusMessage" in error
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
