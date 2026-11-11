<script setup lang="ts">
import { Thumb } from "@waimai/ui";
defineProps<{
  name: string;
  sub?: string;
  src?: string;
  kind?: "dish" | "logo";
}>();
</script>
<template>
  <span class="xz-cell-media"
    ><Thumb :src="src" :name="name" :kind="kind" /><span
      class="xz-cell-media__text"
      ><span class="xz-cell-media__name body-md">{{ name }}</span
      ><span v-if="sub" class="xz-cell-media__sub caption">{{
        sub
      }}</span></span
    ></span
  >
</template>
