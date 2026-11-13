<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import { Button, Dialog, Input } from "../../../components/pc";
import DataTable from "../../../components/DataTable.vue";
import { onMounted, ref } from "vue";
import type { Category } from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const list = ref<Category[]>([]),
  editing = ref<Category | null>(null),
  open = ref(false),
  name = ref(""),
  sort = ref("0"),
  deleting = ref<Category | null>(null);
async function load() {
  await run(async () => {
    list.value = await api<Category[]>("/admin/categories", {}, "ADMIN");
  });
}
onMounted(load);
function edit(category: Category | null) {
  editing.value = category;
  name.value = category?.name ?? "";
  sort.value = String(category?.sort ?? 0);
  open.value = true;
}
async function save() {
  await run(async () => {
    await api(
      "/admin/categories" + (editing.value ? "/" + editing.value.id : ""),
      {
        method: editing.value ? "PUT" : "POST",
        body: { name: name.value, sort: Number(sort.value) },
      },
      "ADMIN",
    );
    open.value = false;
    await load();
  });
}
async function remove() {
  if (!deleting.value) return;
  await run(async () => {
    await api(
      "/admin/categories/" + deleting.value!.id,
      { method: "DELETE" },
      "ADMIN",
    );
    deleting.value = null;
    await load();
  });
}
</script>
<template>
  <BackofficePage :body-scroll="false">
    <template #header>
      <div class="bo-page__actions">
        <Button @click="edit(null)">新增类目</Button>
      </div>
    </template>
    <DataTable
      fill
      :rows="list"
      :columns="[
        { key: 'name', title: '类目名称' },
        { key: 'sort', title: '排序' },
        { key: 'actions', title: '操作' },
      ]"
      ><template #actions="{ row }"
        ><Button size="sm" variant="text" @click="edit(row)">编辑</Button
        ><Button size="sm" variant="danger-text" @click="deleting = row"
          >删除</Button
        ></template
      ></DataTable
    ><Dialog :open="open" title="编辑类目" variant="modal" @close="open = false"
      ><form class="app-stack" @submit.prevent="save">
        <Input v-model="name" label="类目名称" required /><Input
          v-model="sort"
          label="排序"
          type="number"
          min="0"
        /><Button type="submit" :disabled="busy">保存类目</Button>
      </form></Dialog
    ><Dialog :open="!!deleting" title="删除类目" @close="deleting = null"
      ><p>确认删除 {{ deleting?.name }}</p>
      <template #actions
        ><Button variant="outline" @click="deleting = null">取消</Button
        ><Button variant="danger" :disabled="busy" @click="remove"
          >删除类目</Button
        ></template
      ></Dialog
    >
  </BackofficePage>
</template>
