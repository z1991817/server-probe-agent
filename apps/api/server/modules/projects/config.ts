import type {
  ManagedProjectConfig,
  ProjectConfigIssue,
  ProjectsConfigStatusData
} from "@server-probe/shared";
import type { H3Event } from "h3";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, posix, resolve, win32 } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

interface ProjectsRuntimeConfig {
  projectsConfigPath?: string;
}

const projectIdSchema = z
  .string()
  .trim()
  .min(1, "项目 id 不能为空")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    "项目 id 只能包含字母、数字、下划线和连字符，并且必须以字母或数字开头"
  );

const commandSchema = z.string().trim().min(1).nullable().optional();

const healthCheckSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("http"),
      url: z.string().url("HTTP 健康检查 URL 不合法")
    }),
    z.object({
      type: z.literal("tcp"),
      host: z.string().trim().min(1, "TCP 健康检查 host 不能为空"),
      port: z.number().int().min(1).max(65535)
    }),
    z.object({
      type: z.literal("none")
    })
  ])
  .nullable()
  .optional();

const processManagerSchema = z
  .enum(["pm2", "systemd", "supervisor", "docker", "docker-compose", "custom"])
  .default("custom");

const projectSchema = z.object({
  id: projectIdSchema,
  name: z.string().trim().min(1, "项目名称不能为空"),
  deploy_path: z.string().trim().min(1, "deploy_path 不能为空"),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  process_manager: processManagerSchema,
  start_cmd: commandSchema,
  stop_cmd: commandSchema,
  restart_cmd: commandSchema,
  status_cmd: commandSchema,
  log_files: z.array(z.string().trim().min(1)).default([]),
  health_check: healthCheckSchema
});

const projectsConfigSchema = z.object({
  version: z.literal(1),
  projects: z.array(projectSchema).default([])
});

type ParsedProjectsConfig = z.infer<typeof projectsConfigSchema>;
type ParsedProjectConfig = ParsedProjectsConfig["projects"][number];

export async function loadProjectsConfig(
  event?: H3Event
): Promise<ProjectsConfigStatusData> {
  const configPath = await resolveProjectsConfigPath(event);
  const loadedAt = new Date().toISOString();

  if (!existsSync(configPath)) {
    return createFailedStatus(configPath, loadedAt, [
      {
        path: "config",
        code: "CONFIG_NOT_FOUND",
        message: `项目配置文件不存在：${configPath}`
      }
    ]);
  }

  try {
    const source = await readFile(configPath, "utf8");
    const rawConfig = parseYaml(source) as unknown;
    const parsedConfig = projectsConfigSchema.safeParse(rawConfig);

    if (!parsedConfig.success) {
      return createFailedStatus(
        configPath,
        loadedAt,
        parsedConfig.error.issues.map((issue) => ({
          path: issue.path.join(".") || "config",
          code: issue.code,
          message: issue.message
        }))
      );
    }

    const semanticIssues = validateProjectsConfig(parsedConfig.data);

    if (semanticIssues.length > 0) {
      return createFailedStatus(configPath, loadedAt, semanticIssues, {
        version: parsedConfig.data.version,
        projects: parsedConfig.data.projects
      });
    }

    const projects = parsedConfig.data.projects.map(normalizeProjectConfig);

    return {
      loaded: true,
      writeEnabled: true,
      configPath,
      loadedAt,
      version: parsedConfig.data.version,
      projectCount: projects.length,
      projects,
      issues: []
    };
  } catch (error) {
    return createFailedStatus(configPath, loadedAt, [
      {
        path: "config",
        code: "CONFIG_READ_FAILED",
        message: getErrorMessage(error)
      }
    ]);
  }
}

export async function ensureProjectsConfigWritable(
  event?: H3Event
): Promise<ProjectsConfigStatusData> {
  const status = await loadProjectsConfig(event);

  if (!status.writeEnabled) {
    throw new Error("项目配置加载失败，写操作已禁用");
  }

  return status;
}

function validateProjectsConfig(
  config: ParsedProjectsConfig
): ProjectConfigIssue[] {
  const issues: ProjectConfigIssue[] = [];
  const ids = new Set<string>();

  config.projects.forEach((project, index) => {
    const basePath = `projects.${index}`;

    if (ids.has(project.id)) {
      issues.push({
        path: `${basePath}.id`,
        code: "DUPLICATE_PROJECT_ID",
        message: `项目 id 重复：${project.id}`
      });
    }

    ids.add(project.id);

    if (!isSupportedAbsolutePath(project.deploy_path)) {
      issues.push({
        path: `${basePath}.deploy_path`,
        code: "DEPLOY_PATH_NOT_ABSOLUTE",
        message: `deploy_path 必须是绝对路径：${project.deploy_path}`
      });
    }

    project.log_files.forEach((logFile, logIndex) => {
      if (!isSupportedAbsolutePath(logFile)) {
        issues.push({
          path: `${basePath}.log_files.${logIndex}`,
          code: "LOG_FILE_NOT_ABSOLUTE",
          message: `log_files 必须使用绝对路径：${logFile}`
        });
      }
    });
  });

  return issues;
}

function normalizeProjectConfig(project: ParsedProjectConfig): ManagedProjectConfig {
  return {
    id: project.id,
    name: project.name,
    deployPath: project.deploy_path,
    port: project.port ?? null,
    processManager: project.process_manager ?? "custom",
    startCommand: project.start_cmd ?? null,
    stopCommand: project.stop_cmd ?? null,
    restartCommand: project.restart_cmd ?? null,
    statusCommand: project.status_cmd ?? null,
    logFiles: project.log_files ?? [],
    healthCheck: project.health_check ?? null
  };
}

function createFailedStatus(
  configPath: string,
  loadedAt: string,
  issues: ProjectConfigIssue[],
  partialConfig?: Pick<ParsedProjectsConfig, "version" | "projects">
): ProjectsConfigStatusData {
  const projects = partialConfig?.projects.map(normalizeProjectConfig) ?? [];

  return {
    loaded: false,
    writeEnabled: false,
    configPath,
    loadedAt,
    version: partialConfig?.version ?? null,
    projectCount: projects.length,
    projects,
    issues
  };
}

async function resolveProjectsConfigPath(event?: H3Event): Promise<string> {
  const runtimeConfig = event ? getRuntimeConfigFromEvent(event) : undefined;
  const configuredPath =
    process.env["PROBE_PROJECTS_CONFIG_PATH"] ??
    runtimeConfig?.projectsConfigPath ??
    "../../config/projects.yaml";

  if (isSupportedAbsolutePath(configuredPath)) {
    return configuredPath;
  }

  return resolve(process.cwd(), configuredPath);
}

function isSupportedAbsolutePath(value: string): boolean {
  return isAbsolute(value) || posix.isAbsolute(value) || win32.isAbsolute(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getRuntimeConfigFromEvent(event: H3Event): ProjectsRuntimeConfig | undefined {
  const runtimeConfigCandidate = event.context["nitro"] as
    | { runtimeConfig?: unknown }
    | undefined;

  if (
    runtimeConfigCandidate &&
    typeof runtimeConfigCandidate.runtimeConfig === "object" &&
    runtimeConfigCandidate.runtimeConfig !== null &&
    "projectsConfigPath" in runtimeConfigCandidate.runtimeConfig
  ) {
    return runtimeConfigCandidate.runtimeConfig as ProjectsRuntimeConfig;
  }

  return undefined;
}
