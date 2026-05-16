import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  LoginRequestBody,
  LoginResponseData
} from "@server-probe/shared";
import { computed, shallowRef } from "vue";
import { navigateTo, useRuntimeConfig } from "#app";

interface FetchErrorLike {
  data?: unknown;
  status?: number;
  statusCode?: number;
  message?: string;
}

export function useLoginForm() {
  const runtimeConfig = useRuntimeConfig();
  const username = shallowRef("");
  const password = shallowRef("");
  const loading = shallowRef(false);
  const errorMessage = shallowRef<string | null>(null);
  const apiBase = computed(() => runtimeConfig.public.apiBase);
  const canSubmit = computed(
    () => username.value.trim().length > 0 && password.value.length > 0 && !loading.value
  );

  async function submit(): Promise<void> {
    if (!canSubmit.value) {
      errorMessage.value = "请输入用户名和密码";
      return;
    }

    loading.value = true;
    errorMessage.value = null;

    const body: LoginRequestBody = {
      username: username.value.trim(),
      password: password.value
    };

    try {
      await $fetch<ApiSuccessResponse<LoginResponseData>>("/api/auth/login", {
        method: "POST",
        body,
        credentials: "include"
      });
      await navigateTo("/");
    } catch (error) {
      errorMessage.value = getLoginErrorMessage(error);
    } finally {
      loading.value = false;
    }
  }

  return {
    username,
    password,
    loading,
    errorMessage,
    apiBase,
    canSubmit,
    submit
  };
}

function getLoginErrorMessage(error: unknown): string {
  const fetchError = error as FetchErrorLike;

  if (isApiErrorResponse(fetchError.data)) {
    return fetchError.data.error.message;
  }

  if (fetchError.status === 401 || fetchError.statusCode === 401) {
    return "用户名或密码错误";
  }

  if (typeof fetchError.message === "string" && fetchError.message.length > 0) {
    return "登录失败，请检查后端 API 是否可用";
  }

  return "登录失败，请稍后重试";
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
