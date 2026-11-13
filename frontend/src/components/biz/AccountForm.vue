<script setup lang="ts">
// PC 版账号表单：逻辑与 @waimai/ui AccountForm 一致，控件换成 antd。
import type { Role } from "@waimai/shared";
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
}>();
const emit = defineEmits<{ "update:form": [value: typeof props.form] }>();
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
      <PcField v-if="kind === 'create'" label="账号" required>
        <a-input
          :value="form.username"
          required
          :maxlength="32"
          autocomplete="off"
          :disabled="disabled"
          @update:value="field('username', $event)"
        />
      </PcField>
      <p v-else class="pc-account-form__name">账号 {{ form.username }}</p>
      <PcField label="昵称" required>
        <a-input
          :value="form.name"
          required
          :maxlength="30"
          :disabled="disabled"
          @update:value="field('name', $event)"
        />
      </PcField>
      <PcField label="联系手机">
        <a-input
          :value="form.phone"
          :maxlength="11"
          inputmode="tel"
          placeholder="选填"
          :disabled="disabled"
          @update:value="field('phone', $event)"
        />
      </PcField>
    </template>
    <PcField
      v-if="kind === 'create' || kind === 'password'"
      label="临时密码"
      required
      hint="至少 8 个字符；账号首次登录必须改密"
    >
      <a-input-password
        :value="form.password"
        required
        minlength="8"
        autocomplete="new-password"
        :disabled="disabled"
        @update:value="field('password', $event)"
      />
    </PcField>
    <PcField v-if="kind === 'create' || kind === 'edit'" label="授权身份">
      <div class="pc-account-form__roles" role="group" aria-label="授权身份">
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
