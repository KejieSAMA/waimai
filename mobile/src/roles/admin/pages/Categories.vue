<script setup lang="ts">
import { Button, Dialog, Input, ListCell, ListCellGroup } from "@waimai/ui";
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
  <div class="app-stack">
    <div class="app-row">
      <h1 class="title-lg">类目管理</h1>
      <Button @click="edit(null)">新增类目</Button>
    </div>
    <ListCellGroup
      ><ListCell v-for="c in list" :key="c.id" :title="c.name" :value="c.sort"
        ><template #extra
          ><Button size="sm" variant="text" @click="edit(c)">编辑</Button
          ><Button size="sm" variant="danger-text" @click="deleting = c"
            >删除</Button
          ></template
        ></ListCell
      ></ListCellGroup
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
  </div>
</template>
