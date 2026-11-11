<script setup lang="ts">
import PageHeader from "../../../components/PageHeader.vue";
import { onMounted, reactive, ref } from "vue";
import {
  Button,
  Input,
  Switch,
  ListCell,
  ListCellGroup,
  Dialog,
} from "@waimai/ui";
import { type Address, phoneTail } from "@waimai/shared";
import { api } from "../../../common/api";

const list = ref<Address[]>([]),
  editing = ref(""),
  editorOpen = ref(false),
  deleting = ref<Address | null>(null),
  loading = ref(false),
  saving = ref(false),
  removing = ref(false),
  error = ref(""),
  formError = ref("");
const form = reactive({ contact: "", phone: "", detail: "", isDefault: false });
async function load() {
  loading.value = true;
  error.value = "";
  try {
    list.value = await api<Address[]>("/user/addresses");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "地址加载失败";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
function edit(address?: Address) {
  editing.value = address?.id ?? "";
  Object.assign(form, {
    contact: address?.contact ?? "",
    phone: address?.phone ?? "",
    detail: address?.detail ?? "",
    isDefault: address?.isDefault ?? false,
  });
  formError.value = "";
  editorOpen.value = true;
}
async function save() {
  if (saving.value) return;
  saving.value = true;
  formError.value = "";
  try {
    await api("/user/addresses" + (editing.value ? "/" + editing.value : ""), {
      method: editing.value ? "PUT" : "POST",
      body: { ...form },
    });
    editorOpen.value = false;
    await load();
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : "地址保存失败";
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!deleting.value || removing.value) return;
  removing.value = true;
  formError.value = "";
  try {
    await api("/user/addresses/" + deleting.value.id, { method: "DELETE" });
    deleting.value = null;
    await load();
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : "地址删除失败";
  } finally {
    removing.value = false;
  }
}
</script>
<template>
  <section class="app-stack" aria-label="收货地址">
    <PageHeader title="收货地址">
      <template #actions
        ><Button
          icon="plus"
          :disabled="loading || saving || removing"
          @click="edit()"
          >新增地址</Button
        ></template
      >
    </PageHeader>
    <div v-if="error" class="app-error body-sm" role="alert">
      {{ error
      }}<Button variant="text" size="sm" :disabled="loading" @click="load"
        >重试</Button
      >
    </div>
    <p v-if="loading && !list.length" class="app-empty body-sm" role="status">
      加载中
    </p>
    <p v-else-if="!list.length && !error" class="app-card app-empty body">
      暂无收货地址，可新增地址
    </p>
    <ListCellGroup v-if="list.length" :aria-busy="loading">
      <ListCell
        v-for="address in list"
        :key="address.id"
        :title="address.contact + ' · ' + phoneTail(address.phone)"
        :desc="address.detail"
        :value="address.isDefault ? '默认地址' : ''"
      >
        <template #extra>
          <Button
            variant="text"
            size="sm"
            :disabled="loading || saving || removing"
            @click="edit(address)"
            >编辑</Button
          >
          <Button
            variant="danger-text"
            size="sm"
            :disabled="loading || saving || removing"
            @click="
              deleting = address;
              formError = '';
            "
            >删除</Button
          >
        </template>
      </ListCell>
    </ListCellGroup>
    <Dialog
      variant="modal"
      :open="editorOpen"
      :title="editing ? '编辑地址' : '新增地址'"
      @close="!saving && (editorOpen = false)"
    >
      <form
        id="address-form"
        class="app-form"
        :aria-busy="saving"
        @submit.prevent="save"
      >
        <Input
          v-model="form.contact"
          label="收货人"
          required
          maxlength="30"
          autocomplete="name"
          :disabled="saving"
        />
        <Input
          v-model="form.phone"
          label="手机号"
          required
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          pattern="1[0-9]{10}"
          maxlength="11"
          hint="请输入 11 位手机号"
          :disabled="saving"
        />
        <Input
          v-model="form.detail"
          label="详细地址"
          required
          minlength="2"
          maxlength="200"
          autocomplete="street-address"
          :disabled="saving"
        />
        <Switch v-model="form.isDefault" label="默认地址" :disabled="saving" />
        <p v-if="formError" class="app-error body-sm" role="alert">
          {{ formError }}
        </p>
      </form>
      <template #actions>
        <Button variant="outline" :disabled="saving" @click="editorOpen = false"
          >取消</Button
        >
        <Button type="submit" form="address-form" :disabled="saving">{{
          saving ? "保存中" : "保存地址"
        }}</Button>
      </template>
    </Dialog>
    <Dialog
      variant="modal"
      :open="!!deleting"
      title="删除地址"
      @close="!removing && (deleting = null)"
    >
      <p>确认删除 {{ deleting?.contact }} 的收货地址？</p>
      <p class="body-sm app-muted">{{ deleting?.detail }}</p>
      <p v-if="formError" class="app-error body-sm" role="alert">
        {{ formError }}
      </p>
      <template #actions>
        <Button variant="outline" :disabled="removing" @click="deleting = null"
          >取消</Button
        >
        <Button variant="danger" :disabled="removing" @click="remove"
          >删除地址</Button
        >
      </template>
    </Dialog>
  </section>
</template>
