import { onScopeDispose, reactive } from "vue";
import type { Page } from "./index";
export interface PagedColumn<T> {
  list: T[];
  page: number;
  total: number;
  pending: boolean;
  error: string;
}
export function usePagedColumns<T>(
  keys: string[],
  request: (key: string, page: number) => Promise<Page<T>>,
) {
  const boards = reactive(
    Object.fromEntries(
      keys.map((key) => [
        key,
        { list: [], page: 1, total: 0, pending: false, error: "" },
      ]),
    ),
  ) as Record<string, PagedColumn<T>>;
  const versions = new Map<string, number>();
  let active = true;
  async function load(key: string) {
    const board = boards[key];
    if (!board) return;
    const version = (versions.get(key) ?? 0) + 1;
    versions.set(key, version);
    board.pending = true;
    board.error = "";
    try {
      const result = await request(key, board.page);
      if (!active || versions.get(key) !== version) return;
      const last = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (board.page > last) {
        board.page = last;
        await load(key);
        return;
      }
      board.list = result.list;
      board.total = result.total;
    } catch (cause) {
      if (active && versions.get(key) === version)
        board.error = cause instanceof Error ? cause.message : "订单加载失败";
    } finally {
      if (active && versions.get(key) === version) board.pending = false;
    }
  }
  const refresh = () => Promise.all(keys.map(load));
  const changePage = (key: string, page: number) => {
    boards[key].page = page;
    return load(key);
  };
  onScopeDispose(() => {
    active = false;
  });
  return { boards, load, refresh, changePage };
}
