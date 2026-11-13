import { ref } from "vue";
export const message = ref("");
export const messageTone = ref<"error" | "success">("error");
let timer: ReturnType<typeof setTimeout> | undefined;
export function success(text: string) {
  clearTimeout(timer);
  messageTone.value = "success";
  message.value = text;
  timer = setTimeout(() => {
    message.value = "";
  }, 3000);
}
export const busy = ref(false);
export async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
  clearTimeout(timer);
  messageTone.value = "error";
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
