<script setup lang="ts">
import { Button, DishCard, Input, Select, Switch } from "@waimai/ui";
import PageHeader from "../../../components/PageHeader.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  type Product,
  type Category,
  type Store,
  firstImage,
} from "@waimai/shared";
import { api, upload } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const route = useRoute(),
  router = useRouter(),
  categories = ref<Category[]>([]),
  store = ref<Store>(),
  newCategory = ref("");
const form = reactive({
  name: "",
  dishCategoryId: "",
  description: "",
  images: "[]",
  price: "28",
  stock: "100",
  lowStock: "5",
  limit: "",
  listed: true,
});
const editing = computed(() => typeof route.params.id === "string");
onMounted(() =>
  run(async () => {
    categories.value = await api<Category[]>(
      "/merchant/dish-categories",
      {},
      "MERCHANT",
    );
    store.value = await api<Store>("/merchant/store", {}, "MERCHANT");
    form.dishCategoryId = categories.value[0]?.id ?? "";
    if (editing.value) {
      const p = await api<Product>(
        "/merchant/products/" + route.params.id,
        {},
        "MERCHANT",
      );
      Object.assign(form, {
        ...p,
        price: String(p.priceCents / 100),
        stock: String(p.stock),
        lowStock: String(p.lowStock),
        limit: p.limitPerOrder ? String(p.limitPerOrder) : "",
        listed: p.status === "ON",
      });
    }
  }),
);
async function image(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file)
    await run(async () => {
      form.images = JSON.stringify([await upload(file, "MERCHANT")]);
    });
}
async function addCategory() {
  await run(async () => {
    const c = await api<Category>(
      "/merchant/dish-categories",
      { method: "POST", body: { name: newCategory.value } },
      "MERCHANT",
    );
    categories.value.push(c);
    form.dishCategoryId = c.id;
    newCategory.value = "";
  });
}
async function save() {
  await run(async () => {
    await api(
      "/merchant/products" + (editing.value ? "/" + route.params.id : ""),
      {
        method: editing.value ? "PUT" : "POST",
        body: {
          name: form.name,
          dishCategoryId: form.dishCategoryId,
          description: form.description,
          images: form.images,
          priceCents: Math.round(Number(form.price) * 100),
          stock: Number(form.stock),
          lowStock: Number(form.lowStock),
          limitPerOrder: form.limit ? Number(form.limit) : null,
          listed: form.listed,
        },
      },
      "MERCHANT",
    );
    await router.push("/merchant/products");
  });
}
</script>
<template>
  <form class="app-stack" @submit.prevent="save">
    <PageHeader
      :title="editing ? '编辑商品' : '新增商品'"
      :breadcrumb="['商品管理', editing ? '编辑商品' : '新增商品']"
      ><template #actions
        ><Button type="submit" :disabled="busy || store?.status === 'FROZEN'"
          >保存商品</Button
        ></template
      ></PageHeader
    >
    <div class="ds-grid ds-form">
      <div class="app-card app-form">
        <h2 class="title-sm">基本信息</h2>
        <label class="app-upload body-sm"
          >商品图片<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            :disabled="busy || store?.status === 'FROZEN'"
            @change="image" /></label
        ><img
          v-if="firstImage(form.images)"
          :src="firstImage(form.images)"
          alt="商品图片"
          class="app-image"
        /><Input
          v-model="form.name"
          label="商品名称"
          required
          maxlength="80"
        /><Select
          v-model="form.dishCategoryId"
          label="商品分类"
          placeholder="选择分类"
          :options="categories.map((c) => ({ value: c.id, label: c.name }))"
        />
        <div class="app-row">
          <Input v-model="newCategory" label="新增分类" /><Button
            variant="outline"
            :disabled="
              !newCategory.trim() || busy || store?.status === 'FROZEN'
            "
            @click="addCategory"
            >新增分类</Button
          >
        </div>
        <div class="app-grid">
          <Input
            v-model="form.price"
            label="售价（元）"
            type="number"
            min="0.01"
            step="0.01"
            required
          /><Input
            v-model="form.stock"
            label="库存"
            type="number"
            min="0"
            required
          /><Input
            v-model="form.lowStock"
            label="预警库存"
            type="number"
            min="0"
          /><Input
            v-model="form.limit"
            label="每单限购"
            type="number"
            min="1"
            hint="留空表示不限购"
          />
        </div>
        <Input
          v-model="form.description"
          label="商品描述"
          multiline
          maxlength="1000"
        />
      </div>
      <div class="app-stack">
        <div class="app-card app-stack">
          <h2 class="title-sm">用户端预览</h2>
          <DishCard
            :name="form.name || '商品名称'"
            :price="Number(form.price) || 0"
            :image="firstImage(form.images)"
            :desc="form.description"
          /><Switch v-model="form.listed" label="保存后上架" />
        </div>
        <Button type="submit" :disabled="busy || store?.status === 'FROZEN'"
          >保存商品</Button
        >
      </div>
    </div>
  </form>
</template>
