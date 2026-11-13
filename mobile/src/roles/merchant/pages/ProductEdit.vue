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
import { computed, onScopeDispose, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { type Category } from "@waimai/shared";
import PageSlot from "../../../components/PageSlot.vue";
import { api, upload } from "../../../common/api";
import { success } from "../../../common/feedback";
import { useProductEditor } from "@waimai/shared";
import { useDraftLeave } from "../../../common/draftLeave";
import { useFormFocus } from "../../../common/formFocus";
const route = useRoute(),
  router = useRouter();
const editor = useProductEditor(
  (path, options) => api(path, options, "MERCHANT"),
  (file) => upload(file, "MERCHANT"),
  computed(() => (typeof route.params.id === "string" ? route.params.id : "")),
);
const { form, categories, locked, images, dirty, feedback } = editor;
const formElement = ref<HTMLElement>();
useFormFocus(formElement, feedback);
const { open: leaveOpen, choose: chooseLeave } = useDraftLeave(
  () => dirty.value || (categoryDialog.value && !!newCategory.value.trim()),
  () => editor.saving.value || editor.uploading.value || categorySaving.value,
);
async function save(listed = form.listed) {
  if (await editor.save(listed)) {
    success("商品已保存");
    await router.push("/merchant/products");
  }
}
const image = (files: File[]) => editor.image(files);
function removeImage(index: number) {
  if (!locked.value)
    form.images = JSON.stringify(images.value.filter((_, i) => i !== index));
}
const categoryDialog = ref(false),
  categorySaving = ref(false),
  categoryError = ref("");
const categoryPanel = ref<InstanceType<typeof Dialog>>();
let alive = true;
onScopeDispose(() => {
  alive = false;
});
const newCategory = ref("");
function openCategory() {
  if (!locked.value) {
    categoryError.value = "";
    categoryDialog.value = true;
  }
}
async function addCategory() {
  if (locked.value || categorySaving.value) return;
  if (!newCategory.value.trim() || newCategory.value.trim().length > 40) {
    categoryError.value = "请输入 1–40 个字的分类名称";
    return;
  }
  categorySaving.value = true;
  categoryError.value = "";
  try {
    const row = await api<Category>(
      "/merchant/dish-categories",
      { method: "POST", body: { name: newCategory.value.trim() } },
      "MERCHANT",
    );
    if (!alive) return;
    categories.value.push(row);
    form.dishCategoryId = row.id;
    categoryDialog.value = false;
    newCategory.value = "";
  } catch (e) {
    if (alive)
      categoryError.value = e instanceof Error ? e.message : "分类保存失败";
  } finally {
    if (alive) categorySaving.value = false;
  }
}
const categoryPicker = ref(false),
  settingsOpen = ref(false);
watch(feedback.focusVersion, () => {
  if (["lowStock", "limit"].includes(feedback.first.value))
    settingsOpen.value = true;
});
</script>
<template>
  <p v-if="editor.error.value" class="app-error body-sm" role="alert">
    {{ editor.error.value }}
    <Button v-if="!editor.loaded.value" variant="text" @click="editor.load"
      >重试</Button
    >
  </p>
  <p v-if="editor.store.value?.status === 'FROZEN'" class="body-sm app-muted">
    店铺已冻结，商品仅可查看
  </p>
  <p v-if="editor.loading.value" class="app-muted body-sm" role="status">
    正在读取商品
  </p>
  <form
    ref="formElement"
    novalidate
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
        name="name"
        :error="feedback.field('name')"
        @blur="feedback.blur('name')"
        :disabled="locked"
        v-model="form.name"
        label="商品名称"
        required
        maxlength="30"
        hint="最多 30 个字"
      />
      <Input
        layout="horizontal"
        name="dishCategoryId"
        :disabled="locked"
        :error="feedback.field('dishCategoryId')"
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
        name="price"
        :error="feedback.field('price')"
        @blur="feedback.blur('price')"
        :disabled="locked"
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
        name="original"
        :error="feedback.field('original')"
        @blur="feedback.blur('original')"
        :disabled="locked"
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
        name="stock"
        :error="feedback.field('stock')"
        @blur="feedback.blur('stock')"
        :disabled="locked"
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
        name="description"
        :error="feedback.field('description')"
        @blur="feedback.blur('description')"
        :disabled="locked"
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
          name="lowStock"
          :error="feedback.field('lowStock')"
          @blur="feedback.blur('lowStock')"
          :disabled="locked"
          v-model="form.lowStock"
          form="product-editor"
          label="预警库存"
          type="number"
          min="0"
        /><Input
          layout="horizontal"
          name="limit"
          :error="feedback.field('limit')"
          @blur="feedback.blur('limit')"
          :disabled="locked"
          v-model="form.limit"
          form="product-editor"
          label="每单限购"
          type="number"
          min="1"
          placeholder="不限"
        /><Button variant="text" @click="openCategory">新增分类</Button>
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
          :disabled="locked || !dirty"
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
      ref="categoryPanel"
      :open="categoryDialog"
      :confirm-discard="true"
      :dirty="!!newCategory.trim()"
      :close-disabled="categorySaving"
      title="新增分类"
      variant="sheet"
      @close="categoryDialog = false"
      ><Input
        v-model="newCategory"
        label="分类名称"
        :disabled="categorySaving"
        :error="categoryError"
        autofocus
      /><template #actions
        ><Button
          :disabled="locked || categorySaving || !newCategory.trim()"
          @click="addCategory"
          >新增分类</Button
        ></template
      ></Dialog
    >
  </form>
  <Dialog :open="leaveOpen" title="放弃修改" @close="chooseLeave(false)"
    ><p>离开后将放弃尚未保存的商品修改。</p>
    <template #actions
      ><Button variant="outline" @click="chooseLeave(false)">继续编辑</Button
      ><Button variant="danger" @click="chooseLeave(true)"
        >放弃修改</Button
      ></template
    ></Dialog
  >
</template>
