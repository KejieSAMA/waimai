<script setup lang="ts">
import AccountControls from "./AccountControls.vue";
</script>
<template>
  <div class="app-stack">
    <p class="app-error body-md" role="alert">
      当前身份无法访问此页面，请选择已授权的身份。
    </p>
    <AccountControls />
  </div>
</template>
