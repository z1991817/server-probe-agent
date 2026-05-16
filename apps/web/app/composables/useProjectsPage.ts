import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ProjectListItemData,
  ProjectOperationAction,
  ProjectOperationResponseData,
  ProjectOperationResultData,
  ProjectRuntimeState,
  ProjectsListData
} from "@server-probe/shared";
import { computed, shallowRef } from "vue";
import { useRequestFetch } from "#app";

export type ProjectsStateFilter = "all" | ProjectRuntimeState;

interface ProjectsStateCount {
  total: number;
  running: number;
  stopped: number;
  error: number;
  unknown: number;
}

interface PendingOperation {
  projectId: string;
  projectName: string;
  action: ProjectOperationAction;
}

interface ToastMessage {
  type: "success" | "error";
  text: string;
}

export function useProjectsPage() {
  const requestFetch = useRequestFetch();
  const keyword = shallowRef("");
  const stateFilter = shallowRef<ProjectsStateFilter>("all");
  const pendingOperation = shallowRef<PendingOperation | null>(null);
  const submittingOperation = shallowRef(false);
  const toastMessage = shallowRef<ToastMessage | null>(null);
  const actionLoadingMap = shallowRef<Record<string, ProjectOperationAction | null>>({});
  const operationResultMap = shallowRef<Record<string, ProjectOperationResultData>>({});

  const {
    data,
    pending,
    status,
    error,
    refresh
  } = useAsyncData<ProjectsListData>(
    "projects-page-data",
    async () => {
      const response = await requestFetch<ApiSuccessResponse<ProjectsListData>>("/api/projects", {
        credentials: "include"
      });

      if (!isApiSuccessResponse<ProjectsListData>(response)) {
        throw new Error("项目列表响应格式异常");
      }

      return response.data;
    },
    {
      default: createEmptyProjectsData
    }
  );

  const projectsData = computed(() => data.value ?? createEmptyProjectsData());
  const loading = computed(() => pending.value);
  const initialized = computed(() => status.value !== "idle");
  const requestErrorMessage = computed(() => {
    if (!error.value) {
      return null;
    }
    return getFetchErrorMessage(error.value);
  });

  const stateCount = computed<ProjectsStateCount>(() => {
    const count: ProjectsStateCount = {
      total: 0,
      running: 0,
      stopped: 0,
      error: 0,
      unknown: 0
    };

    for (const item of projectsData.value.projects) {
      count.total += 1;
      count[item.status.state] += 1;
    }

    return count;
  });

  const filteredProjects = computed<ProjectListItemData[]>(() => {
    const normalizedKeyword = keyword.value.trim().toLowerCase();

    return projectsData.value.projects.filter((item) => {
      if (stateFilter.value !== "all" && item.status.state !== stateFilter.value) {
        return false;
      }

      if (normalizedKeyword.length === 0) {
        return true;
      }

      const searchableFields = [
        item.project.id,
        item.project.name,
        item.project.processManager,
        item.project.deployPath,
        item.project.port?.toString() ?? "",
        item.status.state
      ];

      return searchableFields.some((field) => field.toLowerCase().includes(normalizedKeyword));
    });
  });

  const configLoaded = computed(() => projectsData.value.config.loaded);
  const writeEnabled = computed(() => projectsData.value.config.writeEnabled);
  const configIssues = computed(() => projectsData.value.config.issues);
  const currentPendingOperation = computed(() => pendingOperation.value);
  const currentToastMessage = computed(() => toastMessage.value);

  function openOperation(projectId: string, action: ProjectOperationAction): void {
    const project = projectsData.value.projects.find((item) => item.project.id === projectId);
    if (!project) {
      toastMessage.value = {
        type: "error",
        text: "目标项目不存在，无法执行操作。"
      };
      return;
    }

    pendingOperation.value = {
      projectId: project.project.id,
      projectName: project.project.name,
      action
    };
  }

  function cancelOperation(): void {
    if (submittingOperation.value) {
      return;
    }
    pendingOperation.value = null;
  }

  async function confirmOperation(): Promise<void> {
    const operation = pendingOperation.value;
    if (!operation) {
      return;
    }

    submittingOperation.value = true;
    setActionLoading(operation.projectId, operation.action);
    toastMessage.value = null;

    try {
      const response = await requestFetch<ApiSuccessResponse<ProjectOperationResponseData>>(
        `/api/projects/${encodeURIComponent(operation.projectId)}/${operation.action}`,
        {
          method: "POST",
          credentials: "include",
          body: {
            confirmation: {
              projectId: operation.projectId,
              projectName: operation.projectName
            }
          }
        }
      );

      if (!isApiSuccessResponse<ProjectOperationResponseData>(response)) {
        throw new Error("项目操作响应格式异常");
      }

      const result = response.data.operation;
      operationResultMap.value = {
        ...operationResultMap.value,
        [operation.projectId]: result
      };
      toastMessage.value = {
        type: result.status === "succeeded" ? "success" : "error",
        text: buildOperationResultMessage(operation.projectName, result)
      };
      pendingOperation.value = null;
      await refresh();
    } catch (operationError) {
      toastMessage.value = {
        type: "error",
        text: `项目操作失败：${getFetchErrorMessage(operationError)}`
      };
    } finally {
      clearActionLoading(operation.projectId);
      submittingOperation.value = false;
    }
  }

  function dismissToast(): void {
    toastMessage.value = null;
  }

  async function reloadProjects(): Promise<void> {
    await refresh();
  }

  return {
    keyword,
    stateFilter,
    loading,
    initialized,
    requestErrorMessage,
    stateCount,
    filteredProjects,
    configLoaded,
    writeEnabled,
    configIssues,
    submittingOperation,
    actionLoadingMap,
    operationResultMap,
    currentPendingOperation,
    currentToastMessage,
    openOperation,
    cancelOperation,
    confirmOperation,
    dismissToast,
    reloadProjects
  };

  function setActionLoading(projectId: string, action: ProjectOperationAction): void {
    actionLoadingMap.value = {
      ...actionLoadingMap.value,
      [projectId]: action
    };
  }

  function clearActionLoading(projectId: string): void {
    actionLoadingMap.value = {
      ...actionLoadingMap.value,
      [projectId]: null
    };
  }
}

function createEmptyProjectsData(): ProjectsListData {
  return {
    config: {
      loaded: false,
      writeEnabled: false,
      configPath: "",
      loadedAt: "",
      version: null,
      projectCount: 0,
      issues: []
    },
    projects: []
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
    return "未登录或登录已失效，请重新登录。";
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

function buildOperationResultMessage(
  projectName: string,
  result: ProjectOperationResultData
): string {
  if (result.status === "succeeded") {
    return `项目 ${projectName} ${getActionLabel(result.action)}成功（${result.durationMs}ms）`;
  }

  if (result.status === "timed_out") {
    return `项目 ${projectName} ${getActionLabel(result.action)}超时（${result.durationMs}ms）`;
  }

  const fallback = `项目 ${projectName} ${getActionLabel(result.action)}失败`;
  const errorOutput = result.stderr.trim() || result.stdout.trim();

  if (errorOutput.length === 0) {
    return fallback;
  }

  return `${fallback}：${errorOutput.slice(0, 140)}`;
}

function getActionLabel(action: ProjectOperationAction): string {
  switch (action) {
    case "start":
      return "启动";
    case "stop":
      return "停止";
    case "restart":
      return "重启";
    default:
      return action;
  }
}
