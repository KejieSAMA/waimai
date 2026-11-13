import { defineStore } from "pinia";
import { createAuthState, ApiError, type AuthRequest } from "@waimai/shared";
export const useAuth = defineStore("auth", () => {
  const key = "xz-auth-change";
  const state = createAuthState(request, () =>
    localStorage.setItem(key, String(Date.now()) + Math.random()),
  );
  const transport: AuthRequest = async <T>(
    path: string,
    body?: unknown,
    method = "POST",
  ) => {
    const response = await fetch("/api/v1" + path, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(state.accessToken.value
          ? { Authorization: "Bearer " + state.accessToken.value }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        response.status,
        result.message || "请求失败",
        result.details,
      );
    return result.data as T;
  };
  function request<T>(
    path: string,
    body?: unknown,
    method?: string,
  ): Promise<T> {
    return transport<T>(path, body, method);
  }
  const storage = (event: StorageEvent) => {
    if (event.key === key) state.externalChange();
  };
  const focus = () => {
    void state.refresh();
  };
  window.addEventListener("storage", storage);
  window.addEventListener("focus", focus);
  function stop() {
    window.removeEventListener("storage", storage);
    window.removeEventListener("focus", focus);
  }
  if (import.meta.hot) import.meta.hot.dispose(stop);
  return { ...state, stop };
});
