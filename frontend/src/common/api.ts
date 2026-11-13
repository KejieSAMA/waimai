import {
  createApi,
  ApiError,
  invalidateRoleData,
  type Role,
} from "@waimai/shared";
import { useAuth } from "./auth";
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
  role: Role = "USER",
): Promise<T> {
  const auth = useAuth();
  const version = auth.revision;
  const request = createApi(fetch, () => auth.tokens[role] ?? null);
  async function execute() {
    try {
      return await request<T>(path, options);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 401 &&
        !path.startsWith("/auth/") &&
        (await auth.refresh(role))
      )
        return request<T>(path, options);
      throw error;
    }
  }
  const result = await execute();
  if (
    !path.startsWith("/public/") &&
    !path.startsWith("/auth/") &&
    auth.revision !== version
  )
    throw new Error("身份已变化，请重新操作");
  if (
    options.method &&
    options.method !== "GET" &&
    options.method !== "HEAD" &&
    !path.startsWith("/user/cart") &&
    !path.endsWith("/preview")
  )
    invalidateRoleData(role);
  return result;
}
export async function upload(
  file: File,
  role: Role,
  purpose: "image" | "certificate" = "image",
): Promise<string> {
  const auth = useAuth();
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  const response = await fetch("/api/v1/uploads", {
    method: "POST",
    credentials: "include",
    headers: { Authorization: "Bearer " + auth.tokens[role] },
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result.data.url;
}
