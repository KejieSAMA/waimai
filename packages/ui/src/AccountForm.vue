<script setup lang="ts">
import type { Role } from "@waimai/shared";
import Input from "./Input.vue";
import Checkbox from "./Checkbox.vue";
const props = defineProps<{
  form: {
    username: string;
    name: string;
    phone: string;
    password: string;
    roles: Role[];
  };
  kind: string;
  disabled?: boolean;
  fieldError?: (name: string) => string;
}>();
const emit = defineEmits<{
  blur: [name: string];
  "update:form": [value: typeof props.form];
}>();
function field(
  key: "username" | "name" | "phone" | "password",
  value: string | number,
) {
  emit("update:form", { ...props.form, [key]: String(value) });
}
function role(value: Role, selected: boolean) {
  emit("update:form", {
    ...props.form,
    roles: selected
      ? [...new Set([...props.form.roles, value])]
      : props.form.roles.filter((r) => r !== value),
  });
}
</script>
<template>
  <fieldset class="account-form" :disabled="disabled">
    <template v-if="kind === 'create' || kind === 'edit'">
      <Input
        v-if="kind === 'create'"
        name="username"
        :error="fieldError?.('username')"
        @blur="$emit('blur', 'username')"
        :model-value="form.username"
        @update:model-value="field('username', $event)"
        label="账号"
        required
        maxlength="32"
        autocomplete="off"
      />
      <p v-else class="body-md">账号 {{ form.username }}</p>
      <Input
        name="name"
        :error="fieldError?.('name')"
        @blur="$emit('blur', 'name')"
        :model-value="form.name"
        @update:model-value="field('name', $event)"
        label="昵称"
        required
        maxlength="30"
      />
      <Input
        name="phone"
        :error="fieldError?.('phone')"
        @blur="$emit('blur', 'phone')"
        :model-value="form.phone"
        @update:model-value="field('phone', $event)"
        label="联系手机"
        maxlength="11"
        inputmode="tel"
        placeholder="选填"
      />
    </template>
    <Input
      v-if="kind === 'create' || kind === 'password'"
      name="password"
      :error="fieldError?.('password')"
      @blur="$emit('blur', 'password')"
      :model-value="form.password"
      @update:model-value="field('password', $event)"
      label="临时密码"
      required
      type="password"
      minlength="8"
      autocomplete="new-password"
      hint="至少 8 个字符；账号首次登录必须改密"
    />
    <div
      v-if="kind === 'create' || kind === 'edit'"
      class="account-form__roles"
      role="group"
      aria-label="授权身份"
      data-field="roles"
      tabindex="-1"
    >
      <Checkbox
        v-for="entry in [
          ['USER', '用户'],
          ['MERCHANT', '商家'],
          ['ADMIN', '管理员'],
        ] as const"
        :key="entry[0]"
        :model-value="form.roles.includes(entry[0])"
        :label="entry[1]"
        :disabled="disabled"
        @update:model-value="role(entry[0], $event)"
      />
    </div>
    <p
      v-if="fieldError?.('roles')"
      class="body-sm"
      style="color: var(--danger)"
      role="alert"
    >
      {{ fieldError?.("roles") }}
    </p>
  </fieldset>
</template>
<style scoped>
.account-form {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}
.account-form__roles {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
