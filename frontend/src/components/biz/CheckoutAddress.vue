<script setup lang="ts">
// PC 版：逻辑与 @waimai/ui 同名组件一致，控件换成 antd 适配组件。
import { useId } from "vue";
import { phoneTail, type Address, type AddressDraft } from "@waimai/shared";
import AddressForm from "./AddressForm.vue";
import Button from "../antd/PcButton.vue";
import Dialog from "../antd/PcDialog.vue";
import Icon from "../antd/AppIcon.vue";
import Tag from "../antd/PcTag.vue";
defineProps<{
  addresses: Address[];
  selected?: Address;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  selectorOpen: boolean;
  editorOpen: boolean;
  editing?: Address;
  saving?: boolean;
  saveError?: string;
  variant: "modal" | "sheet";
}>();
const emit = defineEmits<{
  select: [id: string];
  add: [];
  edit: [address: Address];
  retry: [];
  openSelector: [];
  closeSelector: [];
  closeEditor: [];
  save: [draft: AddressDraft];
}>();
const formId = `checkout-address-${useId()}`;
</script>
<template>
  <div class="xz-checkout-address">
    <p v-if="loading && !selected" class="body-sm" role="status">加载地址中</p>
    <div v-else-if="selected" class="xz-checkout-address__selected">
      <Icon name="location" :size="22" />
      <div class="xz-checkout-address__info">
        <p class="title-sm">
          {{ selected.contact }}
          <span class="body-sm xz-checkout-address__muted">{{
            phoneTail(selected.phone)
          }}</span
          ><Tag v-if="selected.isDefault">默认</Tag>
        </p>
        <p :class="variant === 'modal' ? 'body-md' : 'body'">
          {{ selected.detail }}
        </p>
      </div>
      <div class="xz-checkout-address__actions">
        <Button
          size="sm"
          variant="text"
          :disabled="disabled || loading"
          @click="emit('openSelector')"
          >更换</Button
        >
        <Button
          size="sm"
          variant="text"
          :disabled="disabled || loading"
          @click="emit('edit', selected)"
          >编辑</Button
        >
      </div>
    </div>
    <div v-else-if="!error" class="xz-checkout-address__empty">
      <Icon name="location" /><span
        :class="variant === 'modal' ? 'body-md' : 'body'"
        >{{
          addresses.length ? "请选择收货地址" : "添加收货地址，方便准确送达"
        }}</span
      >
      <Button
        variant="outline"
        :disabled="disabled"
        @click="addresses.length ? emit('openSelector') : emit('add')"
        >{{ addresses.length ? "选择地址" : "新增地址" }}</Button
      >
    </div>
    <div v-if="error" class="xz-checkout-address__error body-sm" role="alert">
      {{ error
      }}<Button
        size="sm"
        variant="text"
        :disabled="disabled || loading"
        @click="emit('retry')"
        >重试</Button
      >
    </div>
    <Dialog
      :open="selectorOpen"
      title="选择收货地址"
      :variant="variant"
      @close="!saving && emit('closeSelector')"
    >
      <div class="xz-checkout-address__list">
        <div
          v-for="address in addresses"
          :key="address.id"
          class="xz-checkout-address__option"
          :class="{ 'is-selected': selected?.id === address.id }"
        >
          <button
            type="button"
            class="xz-checkout-address__pick"
            :disabled="disabled || saving"
            :aria-label="
              '使用 ' + address.contact + ' 的地址：' + address.detail
            "
            @click="emit('select', address.id)"
          >
            <span class="title-sm"
              >{{ address.contact }}
              <span class="body-sm">{{ phoneTail(address.phone) }}</span></span
            >
            <span class="body-sm">{{ address.detail }}</span>
            <span v-if="selected?.id === address.id" class="caption"
              >当前地址</span
            >
          </button>
          <Button
            size="sm"
            variant="text"
            :disabled="disabled || saving"
            @click="emit('edit', address)"
            >编辑</Button
          >
        </div>
        <p v-if="!addresses.length" class="body-sm">暂无收货地址</p>
      </div>
      <template #actions
        ><Button
          :size="variant === 'sheet' ? 'lg' : 'md'"
          variant="outline"
          :disabled="disabled || saving"
          @click="emit('add')"
          >新增地址</Button
        ></template
      >
    </Dialog>
    <Dialog
      :open="editorOpen"
      :title="editing ? '编辑地址' : '新增地址'"
      :variant="variant"
      @close="!saving && emit('closeEditor')"
    >
      <AddressForm
        :form-id="formId"
        :value="editing"
        :disabled="saving"
        :error="saveError"
        @submit="emit('save', $event)"
      />
      <template #actions>
        <Button
          :size="variant === 'sheet' ? 'lg' : 'md'"
          variant="outline"
          :disabled="saving"
          @click="emit('closeEditor')"
          >取消</Button
        >
        <Button
          :size="variant === 'sheet' ? 'lg' : 'md'"
          type="submit"
          :form="formId"
          :disabled="saving"
          >{{ saving ? "保存中" : "保存地址" }}</Button
        >
      </template>
    </Dialog>
  </div>
</template>
<style scoped>
.xz-checkout-address__selected {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
}
.xz-checkout-address__info {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.xz-checkout-address p {
  margin: 0;
}
.xz-checkout-address__info p + p {
  margin-top: var(--space-2);
}
.xz-checkout-address__info .ant-tag {
  margin-left: var(--space-2);
}
.xz-checkout-address__muted {
  color: var(--ink-muted);
}
.xz-checkout-address__actions {
  display: flex;
  gap: var(--space-1);
  margin-left: auto;
}
.xz-checkout-address__empty {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  color: var(--ink-muted);
}
.xz-checkout-address__error {
  margin-top: var(--space-2);
  color: var(--danger);
}
.xz-checkout-address__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.xz-checkout-address__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--surface-sunken);
  border-radius: var(--radius-lg);
}
.xz-checkout-address__option.is-selected {
  background: var(--brand-soft);
}
.xz-checkout-address__pick {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.xz-checkout-address__pick:disabled {
  color: var(--ink-muted);
  cursor: default;
}
</style>
