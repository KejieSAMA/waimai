<script setup lang="ts">
import {
  Button,
  Checkbox,
  Dialog,
  DishCard,
  ImageUpload,
  Input,
  Select,
  Tag,
} from "@waimai/ui";
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
  original: "",
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
        original:
          p.originalPriceCents == null
            ? ""
            : String(p.originalPriceCents / 100),
        stock: String(p.stock),
        lowStock: String(p.lowStock),
        limit: p.limitPerOrder ? String(p.limitPerOrder) : "",
        listed: p.status === "ON",
      });
    }
  }),
);
const categoryDialog = ref(false);
const images = computed<string[]>(() => JSON.parse(form.images));
const locked = computed(() => busy.value || store.value?.status === "FROZEN");
async function image(files: File[]) {
  await run(async () => {
    if (files.length + images.value.length > 5)
      throw new Error("最多上传 5 张图片");
    const urls = await Promise.all(
      files.map((file) => upload(file, "MERCHANT")),
    );
    form.images = JSON.stringify([...images.value, ...urls]);
  });
}
function removeImage(index: number) {
  form.images = JSON.stringify(images.value.filter((_, i) => i !== index));
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
    categoryDialog.value = false;
  });
}
async function save(listed = form.listed) {
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
          originalPriceCents: form.original
            ? Math.round(Number(form.original) * 100)
            : null,
          stock: Number(form.stock),
          lowStock: Number(form.lowStock),
          limitPerOrder: form.limit ? Number(form.limit) : null,
          listed,
        },
      },
      "MERCHANT",
    );
    await router.push("/merchant/products");
  });
}
</script>
<template>
  <form id="product-editor" @submit.prevent="save(form.listed)">
    <PageHeader
      :title="editing ? '编辑商品' : '新增商品'"
      :breadcrumb="['商品管理', editing ? '编辑商品' : '新增商品']"
      ><template #tag><Tag v-if="!form.listed">草稿</Tag></template
      ><template #actions
        ><Button variant="outline" @click="router.push('/merchant/products')"
          >取消</Button
        ><Button variant="secondary" :disabled="locked" @click="save(false)"
          >存为草稿</Button
        ><Button type="submit" :disabled="locked">{{
          form.listed ? "保存并上架" : "保存商品"
        }}</Button></template
      ></PageHeader
    >
    <div class="ds-grid ds-form">
      <div class="ds-stack">
        <section class="ds-card">
          <h2 class="ds-card__title title">基础信息</h2>
          <div class="ds-fields">
            <Input
              v-model="form.name"
              label="商品名称"
              required
              maxlength="30"
              hint="最多 30 个字"
            />
            <Select
              v-model="form.dishCategoryId"
              label="所属分类"
              placeholder="选择分类"
              :options="categories.map((c) => ({ value: c.id, label: c.name }))"
            />
            <Input
              v-model="form.price"
              label="售价"
              prefix="¥"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
            <Input
              v-model="form.original"
              label="划线价"
              prefix="¥"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="选填，需高于售价"
            />
            <Input
              v-model="form.stock"
              label="库存"
              suffix="份"
              type="number"
              min="0"
              required
              :hint="'低于 ' + form.lowStock + ' 份时提醒'"
            /><Input
              v-model="form.limit"
              label="每单限购"
              suffix="份"
              type="number"
              min="1"
              placeholder="不限"
            />
          </div>
        </section>
        <section class="ds-card">
          <h2 class="ds-card__title title">商品图片</h2>
          <ImageUpload
            :images="images"
            :disabled="locked"
            @select="image"
            @remove="removeImage"
          />
          <p class="body-sm app-muted">
            第一张为主图，请上传 1:1 实拍图，最多 5 张，单张不超过 5MB
          </p>
        </section>
        <section class="ds-card">
          <h2 class="ds-card__title title">商品描述</h2>
          <Input
            v-model="form.description"
            multiline
            maxlength="60"
            placeholder="口味、用料、分量，最多 60 字"
          />
        </section>
      </div>
      <div class="ds-stack">
        <section class="ds-card">
          <h2 class="ds-card__title title">用户端预览</h2>
          <div class="ds-preview">
            <DishCard
              :name="form.name || '商品名称'"
              :price="Number(form.price) || 0"
              :original="form.original ? Number(form.original) : undefined"
              :image="firstImage(form.images)"
              :desc="form.description"
            />
          </div>
          <p class="body-sm app-muted">
            用户在店铺点餐页看到的样子，随左侧填写实时更新
          </p>
        </section>
        <section class="ds-card">
          <h2 class="ds-card__title title">上架设置</h2>
          <div class="ds-checks">
            <Checkbox
              v-model="form.listed"
              label="保存后立即上架"
              :disabled="locked"
            /><Input
              v-model="form.lowStock"
              label="预警库存"
              type="number"
              min="0"
            />
            <p class="body-sm app-muted">保存后按平台审核规则处理上架</p>
            <Button variant="text" @click="categoryDialog = true"
              >新增分类</Button
            >
          </div>
        </section>
      </div>
    </div>
    <Dialog
      :open="categoryDialog"
      title="新增分类"
      @close="categoryDialog = false"
      ><Input v-model="newCategory" label="分类名称" /><template #actions
        ><Button :disabled="locked || !newCategory.trim()" @click="addCategory"
          >新增分类</Button
        ></template
      ></Dialog
    >
  </form>
</template>
