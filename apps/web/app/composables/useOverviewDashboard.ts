import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ProjectListItemData,
  ProjectRuntimeState,
  ProjectsListData,
  ServiceStatus,
  SystemSummaryData
} from "@server-probe/shared";
import { computed } from "vue";
import { useRequestFetch } from "#app";

interface OverviewSnapshot {
  systemSummary: SystemSummaryData | null;
  projects: ProjectsListData | null;
  warnings: string[];
}

export interface OverviewProjectSummary {
  total: number;
  running: number;
  stopped: number;
  error: number;
  unknown: number;
  configLoaded: boolean;
  writeEnabled: boolean;
  issuesCount: number;
}

const OVERVIEW_ASYNC_KEY = "overview-dashboard";

export function useOverviewDashboard() {
  const requestFetch = useRequestFetch();

  const { data, pending, status, refresh } = useAsyncData<OverviewSnapshot>(
    OVERVIEW_ASYNC_KEY,
    async () => {
      const snapshot = createEmptySnapshot();
      const [systemResult, projectsResult] = await Promise.allSettled([
        requestFetch<ApiSuccessResponse<SystemSummaryData>>("/api/system/summary", {
          credentials: "include"
        }),
        requestFetch<ApiSuccessResponse<ProjectsListData>>("/api/projects", {
          credentials: "include"
        })
      ]);

      if (systemResult.status === "fulfilled") {
        if (isApiSuccessResponse<SystemSummaryData>(systemResult.value)) {
          snapshot.systemSummary = systemResult.value.data;
        } else {
          snapshot.warnings.push("系统摘要响应格式异常。");
        }
      } else {
        snapshot.warnings.push(`系统摘要加载失败：${getFetchErrorMessage(systemResult.reason)}`);
      }

      if (projectsResult.status === "fulfilled") {
        if (isApiSuccessResponse<ProjectsListData>(projectsResult.value)) {
          snapshot.projects = projectsResult.value.data;
        } else {
          snapshot.warnings.push("项目摘要响应格式异常。");
        }
      } else {
        snapshot.warnings.push(`项目摘要加载失败：${getFetchErrorMessage(projectsResult.reason)}`);
      }

      if (!snapshot.systemSummary && !snapshot.projects) {
        snapshot.warnings.unshift("总览数据暂时不可用，请检查后端 API 状态。");
      }

      return snapshot;
    },
    {
      default: createEmptySnapshot
    }
  );

  const snapshot = computed(() => data.value ?? createEmptySnapshot());
  const systemSummary = computed(() => snapshot.value.systemSummary);
  const projectsData = computed(() => snapshot.value.projects);
  const warnings = computed(() => snapshot.value.warnings);
  const loading = computed(() => pending.value);
  const initialized = computed(() => status.value !== "idle");

  const projectSummary = computed<OverviewProjectSummary>(() => {
    const projects = projectsData.value?.projects ?? [];
    const counts = createRuntimeStateCounter();
    for (const item of projects) {
      counts[item.status.state] += 1;
    }

    return {
      total: projects.length,
      running: counts.running,
      stopped: counts.stopped,
      error: counts.error,
      unknown: counts.unknown,
      configLoaded: projectsData.value?.config.loaded ?? false,
      writeEnabled: projectsData.value?.config.writeEnabled ?? false,
      issuesCount: projectsData.value?.config.issues.length ?? 0
    };
  });

  const projectHighlights = computed<ProjectListItemData[]>(() => {
    return (projectsData.value?.projects ?? []).slice(0, 6);
  });

  const refreshedAt = computed<string | null>(() => {
    const systemTime = systemSummary.value?.collectedAt ?? null;
    const projectsTime = projectsData.value?.config.loadedAt ?? null;

    if (systemTime && projectsTime) {
      const systemMillis = Date.parse(systemTime);
      const projectsMillis = Date.parse(projectsTime);

      if (Number.isNaN(systemMillis) && Number.isNaN(projectsMillis)) {
        return systemTime;
      }
      if (Number.isNaN(systemMillis)) {
        return projectsTime;
      }
      if (Number.isNaN(projectsMillis)) {
        return systemTime;
      }

      return systemMillis >= projectsMillis ? systemTime : projectsTime;
    }

    return systemTime ?? projectsTime;
  });

  const overviewStatus = computed<ServiceStatus>(() => {
    if (systemSummary.value) {
      return systemSummary.value.status;
    }
    if (warnings.value.length > 0) {
      return "down";
    }
    return "ok";
  });

  const hardErrorMessage = computed<string | null>(() => {
    if (systemSummary.value || projectsData.value) {
      return null;
    }
    if (loading.value && !initialized.value) {
      return null;
    }
    if (warnings.value.length > 0) {
      return warnings.value[0] ?? "总览数据加载失败";
    }
    return null;
  });

  async function reload(): Promise<void> {
    await refresh();
  }

  return {
    loading,
    initialized,
    warnings,
    systemSummary,
    projectSummary,
    projectHighlights,
    refreshedAt,
    overviewStatus,
    hardErrorMessage,
    reload
  };
}

function createEmptySnapshot(): OverviewSnapshot {
  return {
    systemSummary: null,
    projects: null,
    warnings: []
  };
}

function createRuntimeStateCounter(): Record<ProjectRuntimeState, number> {
  return {
    running: 0,
    stopped: 0,
    error: 0,
    unknown: 0
  };
}

interface FetchErrorLike {
  data?: unknown;
  status?: number;
  statusCode?: number;
  message?: string;
}

function getFetchErrorMessage(error: unknown): string {
  const fetchError = error as FetchErrorLike;

  if (isApiErrorResponse(fetchError.data)) {
    return fetchError.data.error.message;
  }

  if (fetchError.status === 401 || fetchError.statusCode === 401) {
    return "未授权，请先登录。";
  }

  if (typeof fetchError.message === "string" && fetchError.message.length > 0) {
    return fetchError.message;
  }

  return "请求失败";
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success?: unknown }).success === false &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "object" &&
    (value as { error?: unknown }).error !== null
  );
}

function isApiSuccessResponse<TData>(value: unknown): value is ApiSuccessResponse<TData> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success?: unknown }).success === true &&
    "data" in value
  );
}
