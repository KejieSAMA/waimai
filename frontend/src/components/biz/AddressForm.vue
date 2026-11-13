<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import {
  addressErrors,
  useFormFeedback,
  type AddressDraft,
} from "@waimai/shared";
import Input from "../antd/PcInput.vue";
import Switch from "../antd/PcSwitch.vue";
const props = defineProps<{
  formId: string;
  value?: AddressDraft;
  disabled?: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  dirty: [value: boolean];
  submit: [value: AddressDraft];
}>();
const form = reactive<AddressDraft>({
  contact: "",
  phone: "",
  detail: "",
  isDefault: false,
});
const root = ref<HTMLFormElement>();
const feedback = useFormFeedback(() => addressErrors(form));
watch(feedback.focusVersion, async () => {
  await nextTick();
  root.value
    ?.querySelector<HTMLElement>(`[name="${feedback.first.value}"]`)
    ?.focus();
});
const dirty = computed(
  () =>
    JSON.stringify(form) !==
    JSON.stringify({
      contact: props.value?.contact ?? "",
      phone: props.value?.phone ?? "",
      detail: props.value?.detail ?? "",
      isDefault: props.value?.isDefault ?? false,
    }),
);
watch(dirty, (value) => emit("dirty", value), { immediate: true });
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
    ref="root"
    novalidate
    :id="formId"
    class="pc-address-form"
    :aria-busy="disabled"
    @submit.prevent="
      !disabled && feedback.check() && emit('submit', { ...form })
    "
  >
    <Input
      v-model="form.contact"
      name="contact"
      label="收货人"
      required
      maxlength="30"
      autocomplete="name"
      :disabled="disabled"
      :error="feedback.field('contact')"
      @blur="feedback.blur('contact')"
    />
    <Input
      v-model="form.phone"
      name="phone"
      label="手机号"
      required
      maxlength="11"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      :disabled="disabled"
      :error="feedback.field('phone')"
      @blur="feedback.blur('phone')"
    />
    <Input
      v-model="form.detail"
      name="detail"
      label="详细地址"
      required
      maxlength="200"
      multiline
      autocomplete="street-address"
      :disabled="disabled"
      :error="feedback.field('detail')"
      @blur="feedback.blur('detail')"
    />
    <Switch
      v-model="form.isDefault"
      label="设为默认地址"
      :disabled="disabled"
    />
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
