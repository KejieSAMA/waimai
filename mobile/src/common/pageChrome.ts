import { onScopeDispose, reactive } from "vue";

export const pageChrome = reactive({ title: "", subtitle: "" });
let active = 0;
export function usePageChrome() {
  const key = ++active;
  pageChrome.title = "";
  pageChrome.subtitle = "";
  onScopeDispose(() => {
    if (active === key) {
      pageChrome.title = "";
      pageChrome.subtitle = "";
    }
  });
  return pageChrome;
}
