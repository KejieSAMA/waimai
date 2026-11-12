<script setup lang="ts">
import { computed, ref } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import { ListCell, ListCellGroup } from "@waimai/ui";
import { type Role } from "@waimai/shared";
import { useAuth } from "./auth";
import { usePageChrome } from "./pageChrome";
import PageSlot from "../components/PageSlot.vue";
import NavBarIcon from "../components/NavBarIcon.vue";
import IdentityCard from "./IdentityCard.vue";
import AccountShortcuts from "./AccountShortcuts.vue";
import RolePicker from "./RolePicker.vue";
import { accountShortcuts, adminAccountTools } from "./accountNavigation";
import { createAccountActions } from "./accountActions";
const props = defineProps<{ role: Role }>();
usePageChrome();
const auth = useAuth(),
  router = useRouter();
const open = ref(false);
const roles = computed(() => auth.account?.roles ?? []);
const { pending, error, switchTo } = createAccountActions(auth, (path) =>
  router.replace(path),
);
onBeforeRouteLeave(() => !pending.value || auth.activeRole !== props.role);
async function select(role: Role) {
  if (await switchTo(role)) open.value = false;
}
</script>
<template>
  <div class="my-page">
    <PageSlot name="right"
      ><NavBarIcon
        name="settings"
        label="设置"
        @click="router.push('/settings')"
    /></PageSlot>
    <IdentityCard
      v-if="auth.account"
      :account="auth.account"
      :role="role"
      @edit="router.push('/account/profile')"
      @switch="
        open = true;
        error = '';
      "
    />
    <AccountShortcuts
      :items="accountShortcuts[role]"
      @navigate="router.push($event)"
    />
    <slot />
    <ListCellGroup v-if="role === 'ADMIN'" title="管理工具">
      <ListCell
        v-for="item in adminAccountTools"
        :key="item.path"
        :title="item.label"
        :icon="item.icon"
        arrow
        @click="router.push(item.path)"
      />
    </ListCellGroup>
    <RolePicker
      v-if="auth.activeRole"
      :open="open"
      :roles="roles"
      :current="auth.activeRole"
      :pending="pending"
      :error="error"
      @close="open = false"
      @select="select"
    />
  </div>
</template>
<style scoped>
.my-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
