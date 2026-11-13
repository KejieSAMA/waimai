import { onScopeDispose, ref, shallowRef } from "vue";
import { DEFAULT_PAGE_SIZE } from "./rules";

/** A page becomes current only after it was read successfully. Writes never use this retry path. */
export function usePagedList<
  T,
  R extends { list: T[]; total: number } = { list: T[]; total: number },
>(
  read: (page: number) => Promise<R>,
  options: {
    pageSize?: number;
    accepted?: (result: R) => void;
    scroll?: () => void;
  } = {},
) {
  const list = shallowRef<T[]>([]),
    total = ref(0),
    page = ref(1),
    loading = ref(false),
    loaded = ref(false),
    error = ref("");
  let version = 0,
    alive = true,
    target = 1,
    targetScroll = false,
    inFlight: Promise<boolean> | undefined;
  async function perform(
    next: number,
    scroll: boolean,
    current: number,
  ): Promise<boolean> {
    try {
      const result = await read(next);
      if (!alive || current !== version) return false;
      const last = Math.max(
        1,
        Math.ceil(result.total / (options.pageSize ?? DEFAULT_PAGE_SIZE)),
      );
      if (next > last) {
        target = last;
        return await perform(last, scroll, current);
      }
      list.value = result.list;
      total.value = result.total;
      page.value = next;
      loaded.value = true;
      options.accepted?.(result);
      if (scroll) options.scroll?.();
      return true;
    } catch (cause) {
      if (alive && current === version)
        error.value = cause instanceof Error ? cause.message : "列表读取失败";
      return false;
    } finally {
      if (alive && current === version) {
        loading.value = false;
        inFlight = undefined;
      }
    }
  }
  function load(
    next = page.value,
    scroll = false,
    force = false,
  ): Promise<boolean> {
    next = Math.max(1, Math.floor(next));
    if (!force && loading.value && target === next && inFlight) return inFlight;
    target = next;
    targetScroll = scroll;
    loading.value = true;
    error.value = "";
    inFlight = perform(next, scroll, ++version);
    return inFlight;
  }
  onScopeDispose(() => {
    alive = false;
    version++;
  });
  return {
    list,
    total,
    page,
    loading,
    loaded,
    error,
    load: () => load(),
    refresh: () => load(page.value, false, true),
    changePage: (next: number) => load(next, true),
    query: () => load(1, true, true),
    retry: () => load(target, targetScroll),
  };
}
