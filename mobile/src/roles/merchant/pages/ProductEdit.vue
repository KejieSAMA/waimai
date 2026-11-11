<script setup lang="ts">
import {
  Button,
  Dialog,
  ImageUpload,
  Icon,
  Input,
  ListCell,
  ListCellGroup,
  Switch,
} from "@waimai/ui";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { type Product, type Category, type Store } from "@waimai/shared";
import PageSlot from "../../../components/PageSlot.vue";
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
const categoryDialog = ref(false),
  categoryPicker = ref(false),
  settingsOpen = ref(false);
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
  <form
    id="product-editor"
    class="sc-form-fields"
    @submit.prevent="save(form.listed)"
  >
    <div class="sc-card">
      <p class="body">商品图片</p>
      <ImageUpload
        :images="images"
        :disabled="locked"
        @select="image"
        @remove="removeImage"
      />
      <p class="body-sm app-muted">
        第一张为主图，请上传 1:1 实拍图，最多 5 张，单张不超过 5MB
      </p>
    </div>
    <div class="sc-form">
      <Input
        layout="horizontal"
        v-model="form.name"
        label="商品名称"
        required
        maxlength="30"
        hint="最多 30 个字"
      />
      <Input
        layout="horizontal"
        :model-value="
          categories.find((c) => c.id === form.dishCategoryId)?.name || ''
        "
        label="所属分类"
        required
        readonly
        @click="categoryPicker = true"
        ><template #suffix><Icon name="chevron-right" :size="16" /></template
      ></Input>
      <Input
        layout="horizontal"
        v-model="form.price"
        label="售价"
        prefix="¥"
        type="number"
        min="0.01"
        step="0.01"
        required
      />
      <Input
        layout="horizontal"
        v-model="form.original"
        label="划线价"
        prefix="¥"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="选填，需高于售价"
      />
      <Input
        layout="horizontal"
        v-model="form.stock"
        label="库存"
        suffix="份"
        type="number"
        min="0"
        required
        :hint="'低于 ' + form.lowStock + ' 份时提醒'"
      />
    </div>
    <div class="sc-form">
      <Input
        layout="horizontal"
        v-model="form.description"
        label="商品描述"
        multiline
        maxlength="60"
        placeholder="口味、用料、分量，最多 60 字"
      />
    </div>
    <div class="xz-list">
      <ListCellGroup
        ><ListCell title="保存后立即上架" desc="按平台审核规则处理上架"
          ><template #extra
            ><Switch
              v-model="form.listed"
              aria-label="保存后立即上架"
              :disabled="locked" /></template></ListCell
      ></ListCellGroup>
      <Button variant="text" @click="settingsOpen = true">更多设置</Button>
      <Dialog
        :open="settingsOpen"
        title="更多设置"
        variant="sheet"
        @close="settingsOpen = false"
      >
        <Input
          layout="horizontal"
          v-model="form.lowStock"
          form="product-editor"
          label="预警库存"
          type="number"
          min="0"
        /><Input
          layout="horizontal"
          v-model="form.limit"
          form="product-editor"
          label="每单限购"
          type="number"
          min="1"
          placeholder="不限"
        /><Button variant="text" @click="categoryDialog = true"
          >新增分类</Button
        >
        <template #actions
          ><Button size="lg" @click="settingsOpen = false"
            >完成</Button
          ></template
        ></Dialog
      >
    </div>
    <PageSlot name="actions"
      ><div class="sc-actions">
        <Button
          size="lg"
          variant="secondary"
          :disabled="locked"
          @click="save(false)"
          >存为草稿</Button
        ><Button
          size="lg"
          type="submit"
          form="product-editor"
          :disabled="locked"
          >{{ form.listed ? "保存并上架" : "保存商品" }}</Button
        >
      </div></PageSlot
    >
    <Dialog
      :open="categoryPicker"
      title="选择分类"
      variant="sheet"
      @close="categoryPicker = false"
      ><div class="app-stack">
        <Button
          v-for="item in categories"
          :key="item.id"
          :variant="form.dishCategoryId === item.id ? 'secondary' : 'text'"
          @click="
            form.dishCategoryId = item.id;
            categoryPicker = false;
          "
          >{{ item.name }}</Button
        >
      </div></Dialog
    >
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
