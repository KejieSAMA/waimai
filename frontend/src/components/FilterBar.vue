<script setup lang="ts">
import { Button } from "@waimai/ui";
withDefaults(defineProps<{ showReset?: boolean }>(), { showReset: true });
const emit = defineEmits<{ search: []; reset: [] }>();
</script>
<template>
  <div class="xz-filterbar" role="search">
    <slot />
    <div class="xz-filterbar__btns">
      <Button v-if="showReset" variant="outline" @click="emit('reset')"
        >重置</Button
      ><Button @click="emit('search')">查询</Button>
      <slot name="actions" />
    </div>
  </div>
</template>
