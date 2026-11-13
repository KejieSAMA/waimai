<script setup lang="ts">
// PC 版账号表单：逻辑与 @waimai/ui AccountForm 一致，控件换成 antd。
import type { Role } from "@waimai/shared";
import Input from "../antd/PcInput.vue";
import PcField from "../antd/PcField.vue";
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
const roleOptions = [
  ["USER", "用户"],
  ["MERCHANT", "商家"],
  ["ADMIN", "管理员"],
] as const;
</script>
<template>
  <fieldset class="pc-account-form" :disabled="disabled">
    <template v-if="kind === 'create' || kind === 'edit'">
      <Input
        v-if="kind === 'create'"
        :model-value="form.username"
        @update:model-value="field('username', $event)"
        name="username"
        label="账号"
        required
        maxlength="32"
        :disabled="disabled"
        :error="fieldError?.('username')"
        @blur="$emit('blur', 'username')"
      />
      <p v-else class="pc-account-form__name">账号 {{ form.username }}</p>
      <Input
        :model-value="form.name"
        @update:model-value="field('name', $event)"
        name="name"
        label="昵称"
        required
        maxlength="30"
        :disabled="disabled"
        :error="fieldError?.('name')"
        @blur="$emit('blur', 'name')"
      />
      <Input
        :model-value="form.phone"
        @update:model-value="field('phone', $event)"
        name="phone"
        label="联系手机"
        maxlength="11"
        inputmode="tel"
        :disabled="disabled"
        :error="fieldError?.('phone')"
        @blur="$emit('blur', 'phone')"
      />
    </template>
    <Input
      v-if="kind === 'create' || kind === 'password'"
      :model-value="form.password"
      @update:model-value="field('password', $event)"
      name="password"
      label="临时密码"
      required
      type="password"
      autocomplete="new-password"
      hint="至少 8 个字符；账号首次登录必须改密"
      :disabled="disabled"
      :error="fieldError?.('password')"
      @blur="$emit('blur', 'password')"
    />
    <PcField v-if="kind === 'create' || kind === 'edit'" label="授权身份">
      <div
        class="pc-account-form__roles"
        role="group"
        aria-label="授权身份"
        data-field="roles"
        tabindex="-1"
      >
        <a-checkbox
          v-for="entry in roleOptions"
          :key="entry[0]"
          :checked="form.roles.includes(entry[0])"
          :disabled="disabled"
          @update:checked="role(entry[0], $event)"
          >{{ entry[1] }}</a-checkbox
        >
      </div>
    </PcField>
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
.pc-account-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.pc-account-form__name {
  margin: 0;
}
.pc-account-form__roles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
