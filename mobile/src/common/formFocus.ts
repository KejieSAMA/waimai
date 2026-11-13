import { nextTick, watch, type Ref } from "vue";
import type { useFormFeedback } from "@waimai/shared";
export function useFormFocus(
  root: Ref<HTMLElement | undefined>,
  feedback: ReturnType<typeof useFormFeedback>,
) {
  watch(feedback.focusVersion, async () => {
    await nextTick();
    const controls = root.value?.querySelectorAll<HTMLElement>(
      "[name],[data-field]",
    );
    const field = [
      ...Array.from(controls ?? []),
      ...Array.from(
        document.querySelectorAll<HTMLElement>(
          "[role=dialog] [name], [role=dialog] [data-field]",
        ),
      ),
    ].find(
      (el) =>
        (el.getAttribute("name") || el.dataset.field) === feedback.first.value,
    );
    const target = field?.matches("input,textarea,select,button")
      ? field
      : field?.querySelector<HTMLElement>(
          "input,textarea,select,button,[tabindex='0']",
        );
    target?.scrollIntoView({ block: "nearest" });
    target?.focus({ preventScroll: true });
  });
}
