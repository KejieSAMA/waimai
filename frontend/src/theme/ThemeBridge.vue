<script setup lang="ts">
// 把 antd 推导出的主题色同步为 xz 变量（写在 <html> 上），并附上方案 A 的扩展色。
// 只存在于 PC 应用；手机端是独立构建，继续使用 packages/tokens 的原值。
import { theme } from "ant-design-vue";
import { useTheme } from "@waimai/tokens";
import { watchEffect, onBeforeUnmount } from "vue";
import { schemeVars } from "./schemeA";

const { token } = theme.useToken();
const { theme: mode } = useTheme();
const applied = new Set<string>();

watchEffect(() => {
  const t = token.value;
  const vars: Record<string, string> = {
    "--brand": t.colorPrimary,
    "--brand-pressed": t.colorPrimaryActive,
    "--brand-text": t.colorPrimaryText,
    "--brand-soft": t.colorPrimaryBg,
    "--on-brand": t.colorTextLightSolid,
    "--accent": t.colorWarning,
    "--surface": t.colorBgLayout,
    "--surface-raised": t.colorBgContainer,
    "--surface-sunken": t.colorFillTertiary,
    "--surface-hover": t.colorFillQuaternary,
    "--ink": t.colorText,
    "--ink-muted": t.colorTextSecondary,
    "--line": t.colorBorderSecondary,
    "--line-strong": t.colorBorder,
    "--success": t.colorSuccess,
    "--success-soft": t.colorSuccessBg,
    "--warning": t.colorWarning,
    "--warning-soft": t.colorWarningBg,
    "--danger": t.colorError,
    "--danger-soft": t.colorErrorBg,
    "--info": t.colorInfo,
    "--info-soft": t.colorInfoBg,
    "--focus-ring": t.colorPrimary,
    "--radius-lg": `${t.borderRadius}px`,
    "--font-sans": t.fontFamily,
    ...schemeVars[mode.value],
  };
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(vars)) {
    style.setProperty(name, value);
    applied.add(name);
  }
  document.documentElement.style.colorScheme = mode.value;
});

onBeforeUnmount(() => {
  const style = document.documentElement.style;
  applied.forEach((name) => style.removeProperty(name));
});
</script>
<template><span hidden></span></template>
