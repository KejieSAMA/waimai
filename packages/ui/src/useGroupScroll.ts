import { onScopeDispose, watch, type Ref } from "vue";
import { activeScrollGroup, groupScrollTop } from "@waimai/shared";
export function useGroupScroll(
  viewport: () => HTMLElement | undefined,
  selected: Ref<string>,
) {
  let detach = () => {},
    frame = 0,
    jumping = false;
  function positions(root: HTMLElement) {
    const top = root.getBoundingClientRect().top;
    return [...root.querySelectorAll<HTMLElement>("[data-dish-group]")].map(
      (element) => ({
        id: element.dataset.dishGroup!,
        top: element.getBoundingClientRect().top - top + root.scrollTop,
      }),
    );
  }
  watch(
    viewport,
    (root) => {
      detach();
      if (!root) return;
      const scroll = () => {
        if (!jumping)
          selected.value = activeScrollGroup(
            positions(root),
            root.scrollTop,
            root.scrollHeight - root.clientHeight,
          );
      };
      root.addEventListener("scroll", scroll, { passive: true });
      detach = () => root.removeEventListener("scroll", scroll);
    },
    { immediate: true, flush: "post" },
  );
  function jump(id: string) {
    const root = viewport();
    if (!root) return;
    jumping = true;
    selected.value = id;
    root.scrollTo({
      top: groupScrollTop(
        positions(root),
        id,
        root.scrollHeight - root.clientHeight,
      ),
      behavior: "instant",
    });
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      jumping = false;
    });
  }
  onScopeDispose(() => {
    detach();
    cancelAnimationFrame(frame);
  });
  return { jump };
}
