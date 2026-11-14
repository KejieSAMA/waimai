import type { PublicStoresSnapshot } from "@waimai/shared";
import type { ReviewsSnapshot } from "./storeReviews";
export interface StoreBrowseState {
  view: string;
  keyword: string;
  category: string;
  dishesTop: number;
  categoriesTop: number;
  sectionTop: number;
  reviews?: ReviewsSnapshot;
}
// Document lifetime only: never write browsing positions to browser storage.
export function createBrowsingMemory() {
  let owner: number | undefined;
  const entries = new Map<string, unknown>();
  return {
    forOwner(revision: number) {
      if (owner !== revision) {
        entries.clear();
        owner = revision;
      }
      return {
        read<T>(key: string): T | undefined {
          return entries.get(key) as T | undefined;
        },
        write<T>(key: string, value: T) {
          if (owner === revision) entries.set(key, value);
        },
      };
    },
  };
}
export const browsingMemory = createBrowsingMemory();
export interface HomeBrowseState {
  snapshot: PublicStoresSnapshot;
  top: number;
}
