<script setup lang="ts">
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
import { run, busy } from "../../../common/feedback";
const list = ref<Address[]>([]),
  editing = ref(""),
  deleting = ref<Address | null>(null);
const form = reactive({ contact: "", phone: "", detail: "", isDefault: false });
async function load() {
  list.value = await api<Address[]>("/user/addresses");
}
onMounted(() => run(load));
function edit(a: Address) {
  editing.value = a.id;
  Object.assign(form, a);
}
function clear() {
  editing.value = "";
  Object.assign(form, { contact: "", phone: "", detail: "", isDefault: false });
}
async function save() {
  await run(async () => {
    await api("/user/addresses" + (editing.value ? "/" + editing.value : ""), {
      method: editing.value ? "PUT" : "POST",
      body: form,
    });
    clear();
    await load();
  });
}
async function remove() {
  if (!deleting.value) return;
  await run(async () => {
    await api("/user/addresses/" + deleting.value!.id, { method: "DELETE" });
    deleting.value = null;
    await load();
  });
}
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">收货地址</h1>
    <ListCellGroup
      ><ListCell
        v-for="a in list"
        :key="a.id"
        :title="a.contact + ' · ' + phoneTail(a.phone)"
        :desc="a.detail"
        :value="a.isDefault ? '默认地址' : ''"
        ><template #extra
          ><Button variant="text" size="sm" @click="edit(a)">编辑</Button
          ><Button variant="danger-text" size="sm" @click="deleting = a"
            >删除</Button
          ></template
        ></ListCell
      ></ListCellGroup
    >
    <form class="app-card app-form" @submit.prevent="save">
      <h2 class="title-sm">{{ editing ? "编辑地址" : "新增地址" }}</h2>
      <Input v-model="form.contact" label="收货人" required /><Input
        v-model="form.phone"
        label="手机号"
        required
        inputmode="tel"
      /><Input v-model="form.detail" label="详细地址" required /><Switch
        v-model="form.isDefault"
        label="默认地址"
      />
      <div class="app-row">
        <Button type="submit" :disabled="busy">保存地址</Button
        ><Button v-if="editing" variant="outline" @click="clear"
          >取消编辑</Button
        >
      </div>
    </form>
    <Dialog :open="!!deleting" title="删除地址" @close="deleting = null"
      ><p>确认删除该收货地址</p>
      <template #actions
        ><Button variant="outline" @click="deleting = null">取消</Button
        ><Button variant="danger" :disabled="busy" @click="remove"
          >删除地址</Button
        ></template
      ></Dialog
    >
  </div>
</template>
