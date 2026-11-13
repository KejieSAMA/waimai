<script setup lang="ts">
import { reactive, watch } from "vue";
import type { AddressDraft } from "@waimai/shared";
import PcField from "../antd/PcField.vue";
const props = defineProps<{
  formId: string;
  value?: AddressDraft;
  disabled?: boolean;
  error?: string;
}>();
const emit = defineEmits<{ submit: [value: AddressDraft] }>();
const form = reactive<AddressDraft>({
  contact: "",
  phone: "",
  detail: "",
  isDefault: false,
});
watch(
  () => props.value,
  (value) =>
    Object.assign(form, {
      contact: value?.contact ?? "",
      phone: value?.phone ?? "",
      detail: value?.detail ?? "",
      isDefault: value?.isDefault ?? false,
    }),
  { immediate: true },
);
</script>
<template>
  <form
    :id="formId"
    class="pc-address-form"
    :aria-busy="disabled"
    @submit.prevent="!disabled && emit('submit', { ...form })"
  >
    <PcField label="收货人" required>
      <a-input
        v-model:value="form.contact"
        required
        :maxlength="30"
        autocomplete="name"
        :disabled="disabled"
      />
    </PcField>
    <PcField label="手机号" required hint="请输入 11 位手机号">
      <a-input
        v-model:value="form.phone"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        required
        pattern="1[3-9][0-9]{9}"
        :maxlength="11"
        :disabled="disabled"
      />
    </PcField>
    <PcField label="详细地址" required>
      <a-textarea
        v-model:value="form.detail"
        required
        minlength="2"
        :maxlength="200"
        :auto-size="{ minRows: 2, maxRows: 4 }"
        autocomplete="street-address"
        placeholder="街道、楼栋及门牌号"
        :disabled="disabled"
      />
    </PcField>
    <label class="pc-address-form__switch">
      <a-switch v-model:checked="form.isDefault" :disabled="disabled" />
      设为默认地址
    </label>
    <a-alert v-if="error" type="error" show-icon :message="error" />
  </form>
</template>
<style scoped>
.pc-address-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.pc-address-form__switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}
</style>
