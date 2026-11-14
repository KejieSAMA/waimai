import { computed, ref, watch, type Ref } from "vue";
import { orderPresentation, type Order } from "@waimai/shared";

export function mobileOrderActions(order: Order) {
  const items = orderPresentation(order).listActions;
  return order.status === "DONE" && !order.review
    ? items.filter((item) => item.key !== "details")
    : items.slice(0, 2);
}
export function useNoteDraft(
  read: () => string,
  write: (value: string) => void,
  locked: () => boolean,
) {
  const open = ref(false),
    draft = ref("");
  return {
    open,
    draft,
    dirty: computed(() => open.value && draft.value !== read()),
    begin() {
      if (!locked()) {
        draft.value = read();
        open.value = true;
      }
    },
    cancel() {
      if (!locked()) {
        open.value = false;
        draft.value = read();
      }
    },
    save() {
      if (!locked()) {
        write(draft.value.slice(0, 300));
        open.value = false;
      }
    },
  };
}
export function useGoodsDisclosure<T>(
  key: Readonly<Ref<string>>,
  items: Readonly<Ref<T[]>>,
  hasIssue: () => boolean = () => false,
) {
  const expanded = ref(false);
  watch(key, () => {
    expanded.value = false;
  });
  watch(
    hasIssue,
    (issue) => {
      if (issue) expanded.value = true;
    },
    { immediate: true },
  );
  const showAll = computed(() => expanded.value || hasIssue());
  return {
    expanded,
    visible: computed(() =>
      showAll.value ? items.value : items.value.slice(0, 3),
    ),
    canToggle: computed(() => items.value.length > 3),
    label: computed(() => (showAll.value ? "收起清单" : "展开全部")),
    showAll,
    toggle: () => {
      expanded.value = !showAll.value;
    },
  };
}
