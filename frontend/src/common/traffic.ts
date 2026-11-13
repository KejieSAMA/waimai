import { computed, type Ref } from "vue";
import { createApi, useStoreVisits } from "@waimai/shared";
import { useAuth } from "./auth";
import { orderActivity } from "./orderActivity";
export function useStoreTraffic(storeId: Readonly<Ref<string>>) {
  const auth = useAuth();
  // Dedicated best-effort transport: no auth recovery, role invalidation or global feedback.
  const request = createApi(fetch, () => auth.accessToken ?? null);
  useStoreVisits(
    request,
    storeId,
    computed(
      () =>
        auth.status === "guest" ||
        (auth.status === "authenticated" && auth.activeRole === "USER"),
    ),
    orderActivity,
  );
}
