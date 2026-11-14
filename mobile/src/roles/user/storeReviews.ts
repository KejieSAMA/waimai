import { onScopeDispose, ref } from "vue";
import type { CheckoutRequest } from "@waimai/shared";
export interface StoreReview {
  id: string;
  rating: number;
  content: string;
  reply: string | null;
}
export interface ReviewsSnapshot {
  list: StoreReview[];
  page: number;
  total: number;
}
export function useStoreReviews(
  request: CheckoutRequest,
  storeId: string,
  saved?: ReviewsSnapshot,
) {
  const reviews = ref(saved?.list ?? []),
    page = ref(saved?.page ?? 1),
    total = ref(saved?.total ?? 0),
    pending = ref(false),
    error = ref("");
  let active = true,
    retryPage = saved?.page ?? 1;
  async function load(target = retryPage) {
    if (!active || pending.value) return false;
    retryPage = target;
    pending.value = true;
    error.value = "";
    try {
      const result = await request<{ list: StoreReview[]; total: number }>(
        `/public/stores/${encodeURIComponent(storeId)}/reviews?page=${target}`,
      );
      if (!active) return false;
      reviews.value =
        target === 1
          ? result.list
          : [
              ...reviews.value,
              ...result.list.filter(
                (item) => !reviews.value.some((old) => old.id === item.id),
              ),
            ];
      total.value = result.total;
      page.value = target;
      return true;
    } catch (cause) {
      if (active)
        error.value = cause instanceof Error ? cause.message : "评价加载失败";
      return false;
    } finally {
      if (active) pending.value = false;
    }
  }
  onScopeDispose(() => {
    active = false;
  });
  return {
    reviews,
    page,
    total,
    pending,
    error,
    load,
    more: () => load(error.value ? retryPage : page.value + 1),
    snapshot: (): ReviewsSnapshot => ({
      list: reviews.value,
      page: page.value,
      total: total.value,
    }),
  };
}
