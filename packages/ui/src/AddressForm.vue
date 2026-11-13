<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import {
  addressErrors,
  useFormFeedback,
  type AddressDraft,
} from "@waimai/shared";
import Input from "./Input.vue";
import Switch from "./Switch.vue";
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
    class="xz-address-form"
    :aria-busy="disabled"
    @submit.prevent="
      !disabled && feedback.check() && emit('submit', { ...form })
    "
  >
    <Input
      v-model="form.contact"
      name="contact"
      :error="feedback.field('contact')"
      @blur="feedback.blur('contact')"
      label="收货人"
      required
      maxlength="30"
      autocomplete="name"
      :disabled="disabled"
    />
    <Input
      v-model="form.phone"
      name="phone"
      :error="feedback.field('phone')"
      @blur="feedback.blur('phone')"
      label="手机号"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      required
      pattern="1[3-9][0-9]{9}"
      maxlength="11"
      hint="请输入 11 位手机号"
      :disabled="disabled"
    />
    <Input
      v-model="form.detail"
      name="detail"
      :error="feedback.field('detail')"
      @blur="feedback.blur('detail')"
      label="详细地址"
      multiline
      required
      minlength="2"
      maxlength="200"
      autocomplete="street-address"
      placeholder="街道、楼栋及门牌号"
      :disabled="disabled"
    />
    <Switch
      v-model="form.isDefault"
      label="设为默认地址"
      :disabled="disabled"
    />
    <p v-if="error" class="xz-address-form__error body-sm" role="alert">
      {{ error }}
    </p>
  </form>
</template>
<style scoped>
.xz-address-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.xz-address-form__error {
  margin: 0;
  color: var(--danger);
}
</style>
