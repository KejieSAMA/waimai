<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import type { Role } from "@waimai/shared";
import { useAuth } from "./auth";
const props = defineProps<{ src: string; role: Role; alt: string }>();
const url = ref(""),
  error = ref("");
let controller: AbortController | undefined;
watch(
  () => props.src,
  async (src) => {
    controller?.abort();
    controller = new AbortController();
    if (url.value) URL.revokeObjectURL(url.value);
    url.value = "";
    error.value = "";
    try {
      const response = await fetch(src, {
        headers: { Authorization: "Bearer " + useAuth().tokens[props.role] },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("证照加载失败");
      url.value = URL.createObjectURL(await response.blob());
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError")
        error.value = e.message;
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  controller?.abort();
  if (url.value) URL.revokeObjectURL(url.value);
});
</script>
<template>
  <img v-if="url" :src="url" :alt="alt" /><span
    v-else
    class="body-sm app-muted"
    >{{ error || "加载证照" }}</span
  >
</template>
