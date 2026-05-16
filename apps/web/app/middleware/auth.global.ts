import type {
  ApiSuccessResponse,
  CurrentUserResponseData
} from "@server-probe/shared";

export default defineNuxtRouteMiddleware(async (to) => {
  const isLoginRoute = to.path === "/login";
  const requestFetch = useRequestFetch();

  try {
    const response = await requestFetch<
      ApiSuccessResponse<CurrentUserResponseData>
    >("/api/auth/me", {
      credentials: "include"
    });
    const authenticated = response.data.user !== null;

    if (!authenticated && !isLoginRoute) {
      return navigateTo("/login");
    }

    if (authenticated && isLoginRoute) {
      return navigateTo("/");
    }
  } catch {
    if (!isLoginRoute) {
      return navigateTo("/login");
    }
  }
});
