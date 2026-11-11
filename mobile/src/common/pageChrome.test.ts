import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "vue";
import { pageChrome, usePageChrome } from "./pageChrome";
const scopes: ReturnType<typeof effectScope>[] = [];
function page() {
  const scope = effectScope();
  scopes.push(scope);
  const chrome = scope.run(usePageChrome)!;
  return { scope, chrome };
}
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
describe("手机页面导航状态", () => {
  it("离开页面清理店铺标题，避免带入下一角色页面", () => {
    const current = page();
    current.chrome.title = "商家店名";
    current.chrome.subtitle = "今日经营";
    current.chrome.actions = true;
    current.scope.stop();
    expect(pageChrome.title).toBe("");
    expect(pageChrome.subtitle).toBe("");
    expect(pageChrome.actions).toBe(false);
  });
  it("旧页面延后卸载不会清空新页面的导航", () => {
    const old = page();
    old.chrome.title = "旧页面";
    const current = page();
    current.chrome.title = "新页面";
    old.scope.stop();
    expect(pageChrome.title).toBe("新页面");
    current.scope.stop();
    expect(pageChrome.title).toBe("");
  });
});
