import { computed, nextTick, onScopeDispose, ref, watch, type Ref } from "vue";
import {
  orderPresentation,
  type OrderUiAction,
  type useUserOrderDetail,
} from "@waimai/shared";

export function useOrderInteractions(
  detail: ReturnType<typeof useUserOrderDetail>,
  hash: Readonly<Ref<string>>,
) {
  const {
    order,
    pending,
    processing: busy,
    error,
    reason,
    rating,
    content,
    reviewed,
    act,
    review,
  } = detail;
  const moreOpen = ref(false),
    refundOpen = ref(false),
    reviewOpen = ref(false);
  const confirmation = ref<"cancel" | "complete">(),
    formError = ref("");
  const disabled = computed(() => busy.value || pending.value);
  const refundDirty = computed(() => refundOpen.value && !!reason.value);
  const reviewDirty = computed(
    () => reviewOpen.value && (!!content.value || rating.value !== "5"),
  );
  let active = true;
  onScopeDispose(() => {
    active = false;
  });
  watch(
    () => order.value?.id,
    () => {
      moreOpen.value = refundOpen.value = reviewOpen.value = false;
      confirmation.value = undefined;
      formError.value = "";
    },
    { flush: "sync" },
  );
  watch(
    [() => order.value?.id, hash],
    () => {
      if (
        hash.value === "#review" &&
        order.value?.status === "DONE" &&
        !reviewed.value
      ) {
        reviewOpen.value = true;
        formError.value = "";
      }
    },
    { immediate: true, flush: "post" },
  );
  watch(reviewed, (value) => {
    if (value) reviewOpen.value = false;
  });
  watch(
    () => order.value?.status,
    (value) => {
      if (
        value &&
        !["PENDING", "PREPARING", "DELIVERING", "PICKUP"].includes(value)
      )
        refundOpen.value = false;
      moreOpen.value = false;
    },
  );
  async function onAction(key: OrderUiAction) {
    if (
      disabled.value ||
      !order.value ||
      !orderPresentation(order.value).detailActions.some((a) => a.key === key)
    )
      return;
    const fromMore = moreOpen.value,
      target = order.value.id;
    moreOpen.value = false;
    // Let the menu return focus to its connected trigger before opening a new sheet.
    if (fromMore) {
      await nextTick();
      if (!active || disabled.value || order.value?.id !== target) return;
    }
    formError.value = "";
    if (key === "evaluate") reviewOpen.value = true;
    else if (key === "refund") refundOpen.value = true;
    else if (key === "cancel" || key === "complete") confirmation.value = key;
    else if (key === "pay" || key === "dispute") await act(key);
  }
  async function submit(kind: "refund" | "review" | "confirm") {
    if (disabled.value || !order.value) return;
    if (
      (kind === "refund" && !reason.value.trim()) ||
      (kind === "review" && !content.value.trim())
    )
      return;
    const target = order.value.id;
    const result =
      kind === "review"
        ? await review()
        : kind === "refund"
          ? await act("refund")
          : confirmation.value
            ? await act(confirmation.value)
            : false;
    if (!active || order.value?.id !== target) return;
    if (!result) {
      formError.value = error.value;
      return;
    }
    formError.value = "";
    if (kind === "confirm") confirmation.value = undefined;
    else if (kind === "refund") {
      refundOpen.value = false;
      reason.value = "";
    } else {
      reviewOpen.value = false;
      content.value = "";
      rating.value = "5";
    }
  }
  function closeRefund() {
    if (!busy.value) {
      refundOpen.value = false;
      reason.value = "";
      formError.value = "";
    }
  }
  function closeReview() {
    if (!busy.value) {
      reviewOpen.value = false;
      content.value = "";
      rating.value = "5";
      formError.value = "";
    }
  }
  return {
    moreOpen,
    refundOpen,
    reviewOpen,
    confirmation,
    formError,
    disabled,
    refundDirty,
    reviewDirty,
    onAction,
    confirm: () => submit("confirm"),
    sendRefund: () => submit("refund"),
    sendReview: () => submit("review"),
    closeRefund,
    closeReview,
  };
}
