<script setup lang="ts">
import { computed } from "vue";
import { theme } from "ant-design-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { useTheme } from "@waimai/tokens";
import { message } from "./common/feedback";
import AppShell from "./common/AppShell.vue";
import ThemeBridge from "./theme/ThemeBridge.vue";
import { schemeTheme } from "./theme/schemeA";

dayjs.locale("zh-cn");
const { theme: mode } = useTheme();
const themeConfig = computed(() =>
  schemeTheme(mode.value, {
    default: theme.defaultAlgorithm,
    dark: theme.darkAlgorithm,
  }),
);
</script>
<template>
  <a-config-provider
    :theme="themeConfig"
    :locale="zhCN"
    :auto-insert-space-in-button="false"
  >
    <ThemeBridge />
    <AppShell />
    <a-alert
      v-if="message"
      class="app-feedback"
      type="error"
      show-icon
      closable
      :message="message"
      role="alert"
      @close="message = ''"
    />
  </a-config-provider>
</template>
