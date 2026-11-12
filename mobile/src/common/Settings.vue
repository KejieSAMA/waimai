<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import { Button, Dialog, Icon, ListCell, ListCellGroup } from "@waimai/ui";
import { useTheme } from "@waimai/tokens";
import { useAuth } from "./auth";
import { usePageChrome } from "./pageChrome";
import { createAccountActions } from "./accountActions";
usePageChrome();
const auth = useAuth(),
  router = useRouter();
const appearanceOpen = ref(false),
  logoutOpen = ref(false);
const { pending, error, logout } = createAccountActions(auth, (path) =>
  router.replace(path),
);
onBeforeRouteLeave(() => !pending.value || !auth.account);
const { setTheme } = useTheme();
type Appearance = "system" | "light" | "dark";
const appearance = ref<Appearance>(readAppearance());
const appearances = [
  { key: "system", label: "跟随系统" },
  { key: "light", label: "浅色" },
  { key: "dark", label: "深色" },
] as const;
function readAppearance(): Appearance {
  const saved = localStorage.getItem("xz-theme");
  return saved === "light" || saved === "dark" ? saved : "system";
}
function syncAppearance() {
  appearance.value = readAppearance();
}
window.addEventListener("focus", syncAppearance);
window.addEventListener("storage", syncAppearance);
onBeforeUnmount(() => {
  window.removeEventListener("focus", syncAppearance);
  window.removeEventListener("storage", syncAppearance);
});
function choose(value: Appearance) {
  setTheme(value);
  appearance.value = value;
  appearanceOpen.value = false;
}
async function exit() {
  if (await logout()) logoutOpen.value = false;
}
</script>
<template>
  <div class="settings-page app-stack">
    <ListCellGroup title="账号设置">
      <ListCell
        title="个人资料"
        icon="user"
        arrow
        :disabled="pending"
        @click="router.push('/account/profile')"
      />
      <ListCell
        title="修改密码"
        icon="shield"
        arrow
        :disabled="pending"
        @click="router.push('/password')"
      />
    </ListCellGroup>
    <ListCellGroup title="显示设置">
      <ListCell
        title="外观模式"
        icon="sun"
        :value="appearances.find((item) => item.key === appearance)?.label"
        arrow
        :disabled="pending"
        @click="appearanceOpen = true"
      />
    </ListCellGroup>
    <Button
      class="settings-page__logout"
      variant="danger-outline"
      block
      size="lg"
      :disabled="pending"
      @click="
        logoutOpen = true;
        error = '';
      "
      >退出登录</Button
    >
    <Dialog
      :open="appearanceOpen"
      variant="sheet"
      title="外观模式"
      @close="appearanceOpen = false"
    >
      <ListCellGroup
        ><ListCell
          v-for="item in appearances"
          :key="item.key"
          :title="item.label"
          arrow
          @click="choose(item.key)"
          ><template #extra
            ><Icon
              v-if="appearance === item.key"
              name="check"
              :size="18" /></template></ListCell
      ></ListCellGroup>
      <template #actions
        ><Button variant="outline" block @click="appearanceOpen = false"
          >取消</Button
        ></template
      >
    </Dialog>
    <Dialog
      :open="logoutOpen"
      variant="sheet"
      title="退出登录"
      :close-disabled="pending"
      @close="logoutOpen = false"
    >
      <p class="body-sm">退出当前账号，下次使用时需要重新登录。</p>
      <p v-if="error" class="body-sm app-error" role="alert">{{ error }}</p>
      <template #actions
        ><Button
          variant="outline"
          block
          :disabled="pending"
          @click="logoutOpen = false"
          >保留登录</Button
        ><Button variant="danger" block :disabled="pending" @click="exit">{{
          pending ? "正在退出" : "退出登录"
        }}</Button></template
      >
    </Dialog>
  </div>
</template>
<style scoped>
.settings-page__logout {
  margin-top: var(--space-4);
}
</style>
