<script setup lang="ts">
import { Button, Icon } from "@waimai/ui";
import type { Account, Role } from "@waimai/shared";
import { identityLabels } from "./accountNavigation";
defineProps<{ account: Account; role: Role }>();
defineEmits<{ edit: []; switch: [] }>();
</script>
<template>
  <section class="app-card identity-card" aria-label="当前账号">
    <div class="identity-card__head">
      <span class="identity-card__avatar title-lg" aria-hidden="true">{{
        Array.from(account.name)[0]
      }}</span>
      <div class="identity-card__main">
        <h1 class="title-lg">{{ account.name }}</h1>
        <p class="body-sm app-muted">账号 {{ account.username }}</p>
      </div>
      <Button variant="text" @click="$emit('edit')">编辑资料</Button>
    </div>
    <div class="identity-card__foot">
      <p class="body-sm app-muted">
        {{
          account.phone
            ? "手机尾号 " + account.phone.slice(-4)
            : "未填写联系手机"
        }}
      </p>
      <button
        v-if="(account.roles?.length ?? 0) > 1"
        type="button"
        class="identity-card__role body-sm"
        aria-haspopup="dialog"
        @click="$emit('switch')"
      >
        {{ identityLabels[role] }}<Icon name="chevron-down" :size="16" />
      </button>
      <span v-else class="identity-card__role body-sm">{{
        identityLabels[role]
      }}</span>
    </div>
  </section>
</template>
<style scoped>
.identity-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.identity-card__head,
.identity-card__foot {
  flex-wrap: wrap;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.identity-card__avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--size-button-lg);
  height: var(--size-button-lg);
  border-radius: var(--radius-pill);
  background: var(--brand-soft);
  color: var(--brand-text);
}
.identity-card__main {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.identity-card__main h1,
.identity-card p {
  margin: 0;
}
.identity-card__main p {
  margin-top: var(--space-1);
}
.identity-card__head > .xz-btn {
  flex: none;
  min-height: var(--size-tap);
  padding-inline: var(--space-1);
}
.identity-card__foot {
  justify-content: space-between;
  border-top: 1px solid var(--line);
  padding-top: var(--space-2);
}
.identity-card__role {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: var(--size-tap);
  padding: var(--space-1) var(--space-3);
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--surface-sunken);
  color: var(--ink);
  flex: none;
}
button.identity-card__role {
  cursor: pointer;
}
button.identity-card__role:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
