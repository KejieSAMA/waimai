<script setup lang="ts">
import { Button } from "@waimai/ui";
const emit = defineEmits<{ search: []; reset: [] }>();
</script>
<template>
  <div class="xz-filterbar" role="search">
    <slot />
    <div class="xz-filterbar__btns">
      <Button variant="outline" @click="emit('reset')">重置</Button
      ><Button @click="emit('search')">查询</Button>
    </div>
  </div>
</template>
