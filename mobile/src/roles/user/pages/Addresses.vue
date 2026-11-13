<script setup lang="ts">
import PageSlot from "../../../components/PageSlot.vue";
import { computed, onMounted, onScopeDispose, reactive, ref } from "vue";
import {
  Button,
  Input,
  Switch,
  ListCell,
  ListCellGroup,
  Dialog,
} from "@waimai/ui";
import {
  addressErrors,
  useFormFeedback,
  type Address,
  phoneTail,
} from "@waimai/shared";
import { api } from "../../../common/api";

import { useFormFocus } from "../../../common/formFocus";
import { useDraftLeave } from "../../../common/draftLeave";
const list = ref<Address[]>([]),
  editing = ref(""),
  deleting = ref<Address | null>(null);
const form = reactive({ contact: "", phone: "", detail: "", isDefault: false });
const loading = ref(true),
  loaded = ref(false),
  busy = ref(false),
  error = ref(""),
  formError = ref("");
let active = true,
  version = 0;
onScopeDispose(() => {
  active = false;
  version++;
});
const baseline = ref(JSON.stringify(form)),
  formElement = ref<HTMLElement>();
const dirty = computed(() => JSON.stringify(form) !== baseline.value);
const feedback = useFormFeedback(() => addressErrors(form));
useFormFocus(formElement, feedback);
const { open: leaveOpen, choose: chooseLeave } = useDraftLeave(
  () => dirty.value,
  () => busy.value,
);
const switchOpen = ref(false);
let nextAddress: Address | undefined;
function assign(a?: Address) {
  editing.value = a?.id ?? "";
  Object.assign(form, {
    contact: a?.contact ?? "",
    phone: a?.phone ?? "",
    detail: a?.detail ?? "",
    isDefault: a?.isDefault ?? false,
  });
  baseline.value = JSON.stringify(form);
  feedback.reset();
  formError.value = "";
}
async function load() {
  const current = ++version;
  loading.value = true;
  error.value = "";
  try {
    const rows = await api<Address[]>("/user/addresses");
    if (active && current === version) {
      list.value = rows;
      loaded.value = true;
    }
  } catch (e) {
    if (active && current === version)
      error.value = e instanceof Error ? e.message : "地址读取失败";
  } finally {
    if (active && current === version) loading.value = false;
  }
}
onMounted(load);
function edit(a?: Address) {
  if (busy.value) return;
  if (dirty.value) {
    nextAddress = a;
    switchOpen.value = true;
  } else assign(a);
}
const clear = () => edit();
async function save() {
  if (busy.value || !loaded.value || !dirty.value || !feedback.check()) return;
  busy.value = true;
  formError.value = "";
  try {
    await api("/user/addresses" + (editing.value ? "/" + editing.value : ""), {
      method: editing.value ? "PUT" : "POST",
      body: { ...form },
    });
    if (!active) return;
    assign();
    await load();
  } catch (e) {
    if (active) {
      feedback.reject(e);
      formError.value = e instanceof Error ? e.message : "地址保存失败";
    }
  } finally {
    if (active) busy.value = false;
  }
}
async function remove() {
  if (busy.value || !deleting.value) return;
  busy.value = true;
  formError.value = "";
  try {
    const id = deleting.value.id;
    await api("/user/addresses/" + id, { method: "DELETE" });
    if (!active) return;
    deleting.value = null;
    if (editing.value === id) assign();
    await load();
  } catch (e) {
    if (active)
      formError.value = e instanceof Error ? e.message : "地址删除失败";
  } finally {
    if (active) busy.value = false;
  }
}
</script>
<template>
  <div class="app-stack">
    <p v-if="error" role="alert" class="app-error body-sm">
      {{ error }}<Button variant="text" @click="load">重试</Button>
    </p>
    <p v-else-if="loading" role="status">正在加载地址</p>
    <p v-else-if="loaded && !list.length">暂无收货地址</p>
    <ListCellGroup
      ><ListCell
        v-for="a in list"
        :key="a.id"
        :title="a.contact + ' · ' + phoneTail(a.phone)"
        :desc="a.detail"
        :value="a.isDefault ? '默认地址' : ''"
        ><template #extra
          ><Button
            variant="text"
            size="sm"
            :disabled="busy || loading"
            @click="edit(a)"
            >编辑</Button
          ><Button
            variant="danger-text"
            size="sm"
            :disabled="busy || loading"
            @click="
              formError = '';
              deleting = a;
            "
            >删除</Button
          ></template
        ></ListCell
      ></ListCellGroup
    >
    <form
      ref="formElement"
      novalidate
      id="mobile-edit-form"
      class="app-card app-form"
      @submit.prevent="save"
    >
      <p v-if="formError && !deleting" class="app-error body-sm" role="alert">
        {{ formError }}
      </p>
      <h2 class="title-sm">{{ editing ? "编辑地址" : "新增地址" }}</h2>
      <Input
        name="contact"
        :error="feedback.field('contact')"
        @blur="feedback.blur('contact')"
        :disabled="busy || loading || !loaded"
        v-model="form.contact"
        label="收货人"
        required
      /><Input
        name="phone"
        :error="feedback.field('phone')"
        @blur="feedback.blur('phone')"
        :disabled="busy || loading || !loaded"
        v-model="form.phone"
        label="手机号"
        required
        inputmode="tel"
      /><Input
        name="detail"
        :error="feedback.field('detail')"
        @blur="feedback.blur('detail')"
        :disabled="busy || loading || !loaded"
        v-model="form.detail"
        label="详细地址"
        required
      /><Switch
        v-model="form.isDefault"
        :disabled="busy || loading || !loaded"
        label="默认地址"
      />
      <div class="app-row">
        <PageSlot name="actions"
          ><div class="sc-full-actions">
            <Button
              size="lg"
              form="mobile-edit-form"
              type="submit"
              :disabled="busy || loading || !loaded || !dirty"
              >保存地址</Button
            >
          </div></PageSlot
        ><Button v-if="editing" variant="outline" @click="clear"
          >取消编辑</Button
        >
      </div>
    </form>
    <Dialog :open="switchOpen" title="放弃修改" @close="switchOpen = false"
      ><p>是否放弃当前地址修改？</p>
      <template #actions
        ><Button variant="outline" @click="switchOpen = false">继续编辑</Button
        ><Button
          variant="danger"
          @click="
            assign(nextAddress);
            switchOpen = false;
          "
          >放弃修改</Button
        ></template
      ></Dialog
    >
    <Dialog :open="leaveOpen" title="放弃修改" @close="chooseLeave(false)"
      ><p>离开将放弃未保存的地址修改。</p>
      <template #actions
        ><Button variant="outline" @click="chooseLeave(false)">继续编辑</Button
        ><Button variant="danger" @click="chooseLeave(true)"
          >放弃修改</Button
        ></template
      ></Dialog
    >
    <Dialog
      :open="!!deleting"
      :close-disabled="busy"
      title="删除地址"
      @close="deleting = null"
      ><p>确认删除该收货地址</p>
      <p v-if="formError" role="alert" class="app-error body-sm">
        {{ formError }}
      </p>
      <template #actions
        ><Button variant="outline" :disabled="busy" @click="deleting = null"
          >取消</Button
        ><Button variant="danger" :disabled="busy" @click="remove"
          >删除地址</Button
        ></template
      ></Dialog
    >
  </div>
</template>
