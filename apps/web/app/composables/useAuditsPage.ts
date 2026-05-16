import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuditListData,
  AuditLogItemData
} from "@server-probe/shared";
import { computed, shallowRef } from "vue";
import { useRequestFetch } from "#app";

interface AuditFilters {
  username: string;
  action: string;
  result: "all" | "success" | "failure";
  targetId: string;
  from: string;
  to: string;
}

const DEFAULT_PAGE_SIZE = 20;

export function useAuditsPage() {
  const requestFetch = useRequestFetch();

  const filters = shallowRef<AuditFilters>({
    username: "",
    action: "",
    result: "all",
    targetId: "",
    from: "",
    to: ""
  });
  const page = shallowRef(1);
  const pageSize = shallowRef(DEFAULT_PAGE_SIZE);
  const loading = shallowRef(false);
  const errorMessage = shallowRef<string | null>(null);
  const total = shallowRef(0);
  const pageCount = shallowRef(1);
  const items = shallowRef<AuditLogItemData[]>([]);
  const querySnapshot = shallowRef<AuditListData["query"] | null>(null);

  const hasData = computed(() => items.value.length > 0);
  const canPrev = computed(() => page.value > 1 && !loading.value);
  const canNext = computed(() => page.value < pageCount.value && !loading.value);

  async function load(): Promise<void> {
    loading.value = true;
    errorMessage.value = null;

    try {
      const params = new URLSearchParams();
      if (filters.value.username.trim()) {
        params.set("username", filters.value.username.trim());
      }
      if (filters.value.action.trim()) {
        params.set("action", filters.value.action.trim());
      }
      if (filters.value.result !== "all") {
        params.set("result", filters.value.result);
      }
      if (filters.value.targetId.trim()) {
        params.set("targetId", filters.value.targetId.trim());
      }
      if (filters.value.from.trim()) {
        params.set("from", new Date(filters.value.from).toISOString());
      }
      if (filters.value.to.trim()) {
        params.set("to", new Date(filters.value.to).toISOString());
      }
      params.set("page", String(page.value));
      params.set("pageSize", String(pageSize.value));

      const response = await requestFetch<ApiSuccessResponse<AuditListData>>(
        `/api/audits?${params.toString()}`,
        { credentials: "include" }
      );

      if (!isApiSuccessResponse(response)) {
        throw new Error("审计列表响应格式异常");
      }

      items.value = response.data.items;
      total.value = response.data.total;
      pageCount.value = Math.max(1, response.data.pageCount);
      querySnapshot.value = response.data.query;
      if (page.value > pageCount.value) {
        page.value = pageCount.value;
      }
    } catch (error) {
      errorMessage.value = `加载审计失败：${getFetchErrorMessage(error)}`;
      items.value = [];
      total.value = 0;
      pageCount.value = 1;
    } finally {
      loading.value = false;
    }
  }

  async function applyFilters(): Promise<void> {
    page.value = 1;
    await load();
  }

  async function resetFilters(): Promise<void> {
    filters.value = {
      username: "",
      action: "",
      result: "all",
      targetId: "",
      from: "",
      to: ""
    };
    page.value = 1;
    pageSize.value = DEFAULT_PAGE_SIZE;
    await load();
  }

  async function goPrev(): Promise<void> {
    if (!canPrev.value) {
      return;
    }

    page.value -= 1;
    await load();
  }

  async function goNext(): Promise<void> {
    if (!canNext.value) {
      return;
    }

    page.value += 1;
    await load();
  }

  return {
    filters,
    page,
    pageSize,
    loading,
    errorMessage,
    total,
    pageCount,
    items,
    hasData,
    canPrev,
    canNext,
    querySnapshot,
    load,
    applyFilters,
    resetFilters,
    goPrev,
    goNext
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
