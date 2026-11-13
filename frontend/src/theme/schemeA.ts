// 方案 A（清爽橙）：PC 端唯一的主题值来源，取自 design-demos/fresh.html。
// antd 组件经 App.vue 的 a-config-provider 使用这些 token；ThemeBridge 再把 antd 推导出的
// 颜色同步为 xz 变量，让仍沿用 xz 样式的部分（滚动条、Price 等）保持一致。
import type { ThemeConfig } from "ant-design-vue/es/config-provider/context";

type Mode = "light" | "dark";

const fontFamily =
  '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif';

const tokens: Record<Mode, NonNullable<ThemeConfig["token"]>> = {
  light: {
    colorPrimary: "#fa541c",
    colorLink: "#e8490f",
    colorBgLayout: "#fbf6f2",
    borderRadius: 8,
    fontSize: 14,
    fontFamily,
  },
  dark: {
    colorPrimary: "#ff6a33",
    colorLink: "#ff8a5c",
    colorBgLayout: "#14100e",
    colorBgContainer: "#1e1916",
    colorBgElevated: "#27201c",
    borderRadius: 8,
    fontSize: 14,
    fontFamily,
  },
};

/** 方案 A 在 antd token 之外的扩展色：价格、评分、促销标签、卡片阴影、色块封面。 */
export const schemeVars: Record<Mode, Record<string, string>> = {
  light: {
    "--price": "#e8490f",
    "--rating": "#f76707",
    "--promo-bg": "#fff0e8",
    "--promo-text": "#d4380d",
    "--shadow-card": "0 1px 2px rgba(31, 26, 23, 0.06)",
    "--cover-s": "70%",
    "--cover-l": "90%",
    "--cover-ts": "60%",
    "--cover-tl": "36%",
  },
  dark: {
    "--price": "#ff8a5c",
    "--rating": "#ffa94d",
    "--promo-bg": "#3b2016",
    "--promo-text": "#ffab85",
    "--shadow-card": "none",
    "--cover-s": "30%",
    "--cover-l": "20%",
    "--cover-ts": "70%",
    "--cover-tl": "72%",
  },
};

export function schemeTheme(
  mode: Mode,
  algorithms: {
    default: NonNullable<ThemeConfig["algorithm"]>;
    dark: NonNullable<ThemeConfig["algorithm"]>;
  },
): ThemeConfig {
  return {
    algorithm: mode === "dark" ? algorithms.dark : algorithms.default,
    token: tokens[mode],
  };
}
