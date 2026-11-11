import { ref } from "vue";
export const message = ref("");
export const busy = ref(false);
export async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
  message.value = "";
  busy.value = true;
  try {
    return await fn();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "请求失败，请重试";
    return undefined;
  } finally {
    busy.value = false;
  }
}
