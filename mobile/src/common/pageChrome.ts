import { onScopeDispose, reactive } from "vue";

export const pageChrome = reactive({ title: "", subtitle: "", actions: false });
let active = 0;
export function usePageChrome() {
  const key = ++active;
  pageChrome.title = "";
  pageChrome.subtitle = "";
  pageChrome.actions = false;
  onScopeDispose(() => {
    if (active === key) {
      pageChrome.title = "";
      pageChrome.subtitle = "";
      pageChrome.actions = false;
    }
  });
  return pageChrome;
}
