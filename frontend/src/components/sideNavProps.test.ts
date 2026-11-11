import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import { sideNavProps } from "./sideNavProps";
async function brand(value: { brand?: string | false } = {}) {
  return renderToString(
    createSSRApp(
      {
        props: sideNavProps,
        setup: (props) => () =>
          h("span", props.brand === false ? "hidden" : props.brand),
      },
      { groups: [], ...value },
    ),
  );
}
describe("侧栏品牌 props 默认值", () => {
  it("未传值时不会被 Boolean 转换成 false", async () => {
    expect(await brand()).toContain("盟信");
  });
  it("显式 false 仍隐藏个人中心品牌，自定义后台标题原样保留", async () => {
    expect(await brand({ brand: false })).toContain("hidden");
    expect(await brand({ brand: "盟信商家后台" })).toContain("盟信商家后台");
  });
});
