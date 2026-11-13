import { inject, nextTick, type InjectionKey, type Ref } from "vue";
export const pageScrollKey: InjectionKey<(target?: HTMLElement) => void> =
  Symbol("page-scroll");
export function useListScroll(target: Ref<HTMLElement | undefined>) {
  const scroll = inject(pageScrollKey, () => {});
  return () => {
    void nextTick(() => scroll(target.value));
  };
}
