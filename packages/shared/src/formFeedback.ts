import { computed, reactive, ref } from "vue";
import type { ApiErrorDetails } from "./index";
export type FieldErrors = Record<string, string>;
export function validationFields(
  error: unknown,
  aliases: Record<string, string> = {},
): FieldErrors {
  const details = (error as { details?: ApiErrorDetails })?.details;
  const result: FieldErrors = {};
  for (const issue of details?.issues ?? []) {
    const path = issue.path.join(".");
    if (path) result[aliases[path] ?? path] ??= issue.message;
  }
  for (const [key, messages] of Object.entries(details?.fieldErrors ?? {}))
    if (messages?.length) result[aliases[key] ?? key] ??= messages[0];
  return result;
}
export function useFormFeedback(validate: () => FieldErrors) {
  const touched = reactive(new Set<string>()),
    submitted = ref(false),
    server = ref<FieldErrors>({}),
    focusVersion = ref(0);
  const errors = computed(() => ({ ...server.value, ...validate() }));
  const first = computed(() => Object.keys(errors.value)[0] ?? "");
  const field = (name: string) =>
    submitted.value || touched.has(name) ? (errors.value[name] ?? "") : "";
  function blur(name: string) {
    touched.add(name);
    delete server.value[name];
  }
  function check() {
    submitted.value = true;
    server.value = {};
    if (first.value) {
      focusVersion.value++;
      return false;
    }
    return true;
  }
  function reject(error: unknown, aliases?: Record<string, string>) {
    server.value = validationFields(error, aliases);
    submitted.value = true;
    if (first.value) focusVersion.value++;
  }
  function reset() {
    touched.clear();
    submitted.value = false;
    server.value = {};
  }
  return { field, blur, check, reject, reset, first, focusVersion };
}
export function clearLoginPassword(error?: unknown) {
  return error === undefined || (error as { code?: number })?.code === 401;
}
