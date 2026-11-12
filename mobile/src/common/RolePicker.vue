<script setup lang="ts">
import { Button, Dialog, Icon, ListCell, ListCellGroup } from "@waimai/ui";
import type { Role } from "@waimai/shared";
import { identityLabels } from "./accountNavigation";
defineProps<{
  open: boolean;
  roles: Role[];
  current: Role;
  pending: boolean;
  error: string;
}>();
defineEmits<{ close: []; select: [role: Role] }>();
</script>
<template>
  <Dialog
    :open="open"
    title="切换身份"
    variant="sheet"
    :close-disabled="pending"
    @close="$emit('close')"
  >
    <ListCellGroup>
      <ListCell
        v-for="role in roles"
        :key="role"
        :title="identityLabels[role]"
        :value="role === current ? '当前身份' : undefined"
        arrow
        :disabled="pending"
        @click="$emit('select', role)"
      >
        <template #extra
          ><Icon v-if="role === current" name="check" :size="18"
        /></template>
      </ListCell>
    </ListCellGroup>
    <p v-if="pending" class="body-sm app-muted" role="status">正在切换身份</p>
    <p v-if="error" class="body-sm app-error" role="alert">{{ error }}</p>
    <template #actions
      ><Button
        variant="outline"
        block
        :disabled="pending"
        @click="$emit('close')"
        >取消</Button
      ></template
    >
  </Dialog>
</template>
