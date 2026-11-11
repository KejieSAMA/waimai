<script setup lang="ts">
import { useTheme } from "@waimai/tokens";
import { message } from "./common/feedback";
import AppShell from "./common/AppShell.vue";
useTheme();
</script>
<template>
  <AppShell />
  <div v-if="message" class="app-error app-feedback body-sm" role="alert">
    {{ message }}
    <button type="button" aria-label="关闭提示" @click="message = ''">
      关闭
    </button>
  </div>
</template>
