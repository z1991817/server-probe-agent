import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  LogEntryData,
  LogFileReadSummary,
  LogsSearchData
} from "@server-probe/shared";
import { computed, shallowRef } from "vue";
import { useRequestFetch } from "#app";

interface StreamLogEntry {
  id: string;
  projectId: string;
  filePath: string;
  timestamp: string | null;
  message: string;
  truncated: boolean;
}

interface StreamErrorEntry {
  id: string;
  projectId: string;
  filePath: string | null;
  code: string;
  message: string;
  emittedAt: string;
}

interface StreamState {
  connected: boolean;
  reconnecting: boolean;
  lastHeartbeatAt: string | null;
}

interface StreamHeartbeatEventData {
  projectId: string;
  projectName: string;
  emittedAt: string;
}

interface StreamLogEventData {
  projectId: string;
  projectName: string;
  filePath: string;
  timestamp: string | null;
  message: string;
  truncated: boolean;
  emittedAt: string;
}

interface StreamErrorEventData {
  projectId: string;
  projectName: string;
  filePath: string | null;
  code: string;
  message: string;
  emittedAt: string;
}

interface LogSearchForm {
  projectId: string;
  keyword: string;
  from: string;
  to: string;
  limit: number;
}

const DEFAULT_LIMIT = 200;
const DEFAULT_STREAM_MAX_ENTRIES = 500;

export function useLogViewer() {
  const requestFetch = useRequestFetch();

  const projects = shallowRef<Array<{ id: string; name: string }>>([]);
  const selectedProjectId = shallowRef("");
  const searchForm = shallowRef<LogSearchForm>({
    projectId: "",
    keyword: "",
    from: "",
    to: "",
    limit: DEFAULT_LIMIT
  });
  const loadingProjects = shallowRef(false);
  const searching = shallowRef(false);
  const searchError = shallowRef<string | null>(null);
  const searchEntries = shallowRef<LogEntryData[]>([]);
  const searchFiles = shallowRef<LogFileReadSummary[]>([]);
  const searchWarnings = shallowRef<string[]>([]);
  const streamEntries = shallowRef<StreamLogEntry[]>([]);
  const streamErrors = shallowRef<StreamErrorEntry[]>([]);
  const streamPaused = shallowRef(false);
  const streamState = shallowRef<StreamState>({
    connected: false,
    reconnecting: false,
    lastHeartbeatAt: null
  });
  const streamErrorMessage = shallowRef<string | null>(null);
  const activeEventSource = shallowRef<EventSource | null>(null);

  const hasSelectedProject = computed(() => selectedProjectId.value.trim().length > 0);
  const visibleStreamEntries = computed(() => streamEntries.value);
  const visibleSearchEntries = computed(() => searchEntries.value);

  async function initialize(): Promise<void> {
    await loadProjects();
    if (selectedProjectId.value) {
      await searchHistory();
      connectStream();
    }
  }

  async function loadProjects(): Promise<void> {
    loadingProjects.value = true;
    searchError.value = null;

    try {
      const response = await requestFetch<ApiSuccessResponse<{ projects: Array<{ project: { id: string; name: string } }> }>>(
        "/api/projects",
        { credentials: "include" }
      );

      if (!isApiSuccessResponse(response)) {
        throw new Error("项目列表响应格式异常");
      }

      projects.value = response.data.projects.map((item) => ({
        id: item.project.id,
        name: item.project.name
      }));

      if (!selectedProjectId.value && projects.value.length > 0) {
        selectedProjectId.value = projects.value[0]?.id ?? "";
        searchForm.value = {
          ...searchForm.value,
          projectId: selectedProjectId.value
        };
      }
    } catch (error) {
      searchError.value = `加载项目失败：${getFetchErrorMessage(error)}`;
    } finally {
      loadingProjects.value = false;
    }
  }

  async function searchHistory(): Promise<void> {
    if (!selectedProjectId.value) {
      searchError.value = "请先选择项目";
      return;
    }

    searching.value = true;
    searchError.value = null;

    try {
      const params = new URLSearchParams();
      params.set("projectId", selectedProjectId.value);
      if (searchForm.value.keyword.trim()) {
        params.set("keyword", searchForm.value.keyword.trim());
      }
      if (searchForm.value.from.trim()) {
        params.set("from", new Date(searchForm.value.from).toISOString());
      }
      if (searchForm.value.to.trim()) {
        params.set("to", new Date(searchForm.value.to).toISOString());
      }
      params.set("limit", String(searchForm.value.limit));

      const response = await requestFetch<ApiSuccessResponse<LogsSearchData>>(
        `/api/logs?${params.toString()}`,
        { credentials: "include" }
      );

      if (!isApiSuccessResponse(response)) {
        throw new Error("历史日志响应格式异常");
      }

      searchEntries.value = response.data.entries;
      searchFiles.value = response.data.files;
      searchWarnings.value = response.data.warnings;
    } catch (error) {
      searchError.value = `历史日志查询失败：${getFetchErrorMessage(error)}`;
    } finally {
      searching.value = false;
    }
  }

  function connectStream(): void {
    if (!selectedProjectId.value) {
      return;
    }

    disconnectStream();
    streamErrorMessage.value = null;
    streamState.value = {
      ...streamState.value,
      reconnecting: false
    };

    const eventSource = new EventSource(
      `/api/logs/stream?projectId=${encodeURIComponent(selectedProjectId.value)}`
    );
    activeEventSource.value = eventSource;

    eventSource.onopen = () => {
      streamState.value = {
        ...streamState.value,
        connected: true,
        reconnecting: false
      };
    };

    eventSource.onmessage = () => {};

    eventSource.addEventListener("heartbeat", (event) => {
      const payload = parseSseData<StreamHeartbeatEventData>(event);
      if (!payload) {
        return;
      }

      streamState.value = {
        ...streamState.value,
        connected: true,
        lastHeartbeatAt: payload.emittedAt
      };
    });

    eventSource.addEventListener("log", (event) => {
      const payload = parseSseData<StreamLogEventData>(event);
      if (!payload) {
        return;
      }

      const entry: StreamLogEntry = {
        id: `${payload.projectId}-${payload.filePath}-${payload.emittedAt}-${Math.random().toString(36).slice(2, 8)}`,
        projectId: payload.projectId,
        filePath: payload.filePath,
        timestamp: payload.timestamp,
        message: payload.message,
        truncated: payload.truncated
      };

      streamEntries.value = [entry, ...streamEntries.value].slice(
        0,
        DEFAULT_STREAM_MAX_ENTRIES
      );
    });

    eventSource.addEventListener("error", (event) => {
      const payload = parseSseData<StreamErrorEventData>(event);

      if (payload) {
        streamErrors.value = [
          {
            id: `${payload.projectId}-${payload.code}-${payload.emittedAt}`,
            projectId: payload.projectId,
            filePath: payload.filePath,
            code: payload.code,
            message: payload.message,
            emittedAt: payload.emittedAt
          },
          ...streamErrors.value
        ].slice(0, 100);
      }
    });

    eventSource.onerror = () => {
      streamState.value = {
        ...streamState.value,
        connected: false,
        reconnecting: true
      };
      streamErrorMessage.value = "实时日志连接中断，浏览器正在自动重连。";
    };
  }

  function disconnectStream(): void {
    if (activeEventSource.value) {
      activeEventSource.value.close();
      activeEventSource.value = null;
    }

    streamState.value = {
      ...streamState.value,
      connected: false,
      reconnecting: false
    };
  }

  function togglePauseStream(): void {
    streamPaused.value = !streamPaused.value;
  }

  function clearStreamEntries(): void {
    streamEntries.value = [];
    streamErrors.value = [];
  }

  async function changeProject(projectId: string): Promise<void> {
    selectedProjectId.value = projectId;
    searchForm.value = {
      ...searchForm.value,
      projectId
    };

    clearStreamEntries();
    await searchHistory();
    connectStream();
  }

  function cleanup(): void {
    disconnectStream();
  }

  return {
    projects,
    loadingProjects,
    selectedProjectId,
    searchForm,
    searching,
    searchError,
    searchEntries: visibleSearchEntries,
    searchFiles,
    searchWarnings,
    streamEntries: visibleStreamEntries,
    streamErrors,
    streamPaused,
    streamState,
    streamErrorMessage,
    hasSelectedProject,
    initialize,
    searchHistory,
    changeProject,
    togglePauseStream,
    clearStreamEntries,
    cleanup
  };
}

function parseSseData<TData>(event: Event): TData | null {
  const messageEvent = event as MessageEvent;
  if (typeof messageEvent.data !== "string") {
    return null;
  }

  try {
    return JSON.parse(messageEvent.data) as TData;
  } catch {
    return null;
  }
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
