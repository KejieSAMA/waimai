<script setup lang="ts">
import { Button, Dialog } from "@waimai/ui";
defineProps<{ open: boolean }>();
const emit = defineEmits<{ choose: [value: boolean] }>();
</script>
<template>
  <Dialog :open="open" title="放弃修改" @close="emit('choose', false)">
    <p class="body">尚有未保存的修改，是否离开？</p>
    <template #actions
      ><Button variant="outline" @click="emit('choose', false)">继续编辑</Button
      ><Button variant="danger" @click="emit('choose', true)"
        >放弃修改</Button
      ></template
    >
  </Dialog>
</template>
