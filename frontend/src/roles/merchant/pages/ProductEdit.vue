<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import {
  Button,
  Checkbox,
  Dialog,
  DishCard,
  ImageUpload,
  Input,
  Select,
  Tag,
} from "../../../components/pc";
import { computed, onScopeDispose, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { type Category, firstImage } from "@waimai/shared";
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
const { form, categories, editing, locked, images, dirty, feedback } = editor;
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
</script>
<template>
  <BackofficePage>
    <template #header>
      <div class="product-editor-heading">
        <a-breadcrumb aria-label="面包屑">
          <a-breadcrumb-item
            ><RouterLink to="/merchant/products"
              >商品管理</RouterLink
            ></a-breadcrumb-item
          >
          <a-breadcrumb-item aria-current="page">{{
            editing ? "编辑商品" : "新增商品"
          }}</a-breadcrumb-item>
        </a-breadcrumb>
        <Tag v-if="!form.listed">草稿</Tag>
      </div>
    </template>
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
      :aria-label="editing ? '编辑商品' : '新增商品'"
      @submit.prevent="save(form.listed)"
    >
      <div class="ds-grid ds-form">
        <div class="ds-stack">
          <section class="ds-card product-basic">
            <h2 class="ds-card__title title">基础信息</h2>
            <div class="ds-fields product-basic__fields">
              <Input
                v-model="form.name"
                name="name"
                :disabled="locked"
                :error="feedback.field('name')"
                @blur="feedback.blur('name')"
                label="商品名称"
                required
                maxlength="30"
              />
              <div class="product-basic__select">
                <Select
                  v-model="form.dishCategoryId"
                  name="dishCategoryId"
                  :disabled="locked"
                  :error="feedback.field('dishCategoryId')"
                  @blur="feedback.blur('dishCategoryId')"
                  layout="vertical"
                  label="所属分类"
                  placeholder="选择分类"
                  :options="
                    categories.map((c) => ({ value: c.id, label: c.name }))
                  "
                />
              </div>
              <Input
                v-model="form.price"
                name="price"
                :disabled="locked"
                :error="feedback.field('price')"
                @blur="feedback.blur('price')"
                label="售价"
                prefix="¥"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
              <Input
                v-model="form.original"
                name="original"
                :disabled="locked"
                :error="feedback.field('original')"
                @blur="feedback.blur('original')"
                label="划线价"
                prefix="¥"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="选填，需高于售价"
              />
              <Input
                v-model="form.stock"
                name="stock"
                :disabled="locked"
                :error="feedback.field('stock')"
                @blur="feedback.blur('stock')"
                label="库存"
                suffix="份"
                type="number"
                min="0"
                required
              /><Input
                v-model="form.limit"
                name="limit"
                :disabled="locked"
                :error="feedback.field('limit')"
                @blur="feedback.blur('limit')"
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
              name="description"
              :disabled="locked"
              :error="feedback.field('description')"
              @blur="feedback.blur('description')"
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
                name="lowStock"
                :disabled="locked"
                :error="feedback.field('lowStock')"
                @blur="feedback.blur('lowStock')"
                label="预警库存"
                type="number"
                min="0"
              />
              <p class="body-sm app-muted">保存后按平台审核规则处理上架</p>
              <Button variant="text" :disabled="locked" @click="openCategory"
                >新增分类</Button
              >
            </div>
          </section>
        </div>
      </div>
    </form>
    <template #footer
      ><div class="app-row bo-product-actions">
        <Button variant="outline" @click="router.push('/merchant/products')"
          >取消</Button
        ><Button
          variant="secondary"
          :disabled="locked || !dirty"
          @click="save(false)"
          >存为草稿</Button
        ><Button
          type="submit"
          form="product-editor"
          :disabled="locked || !dirty"
          >{{ form.listed ? "保存并上架" : "保存商品" }}</Button
        >
      </div></template
    >
    <template #overlay>
      <Dialog
        ref="categoryPanel"
        :open="categoryDialog"
        :confirm-discard="true"
        :dirty="!!newCategory.trim()"
        title="新增分类"
        variant="modal"
        :close-disabled="categorySaving"
        @close="categoryDialog = false"
      >
        <form
          id="product-category-form"
          class="app-stack category-form"
          @submit.prevent="addCategory"
        >
          <p class="body-sm app-muted">创建分类后，可在商品编辑中直接选择。</p>
          <Input
            v-model="newCategory"
            label="分类名称"
            placeholder="例如：招牌面、小菜、饮品"
            hint="最多 40 个字"
            maxlength="40"
            required
            autofocus
            :disabled="categorySaving"
            :error="categoryError"
          />
        </form>
        <template #actions
          ><Button
            variant="outline"
            :disabled="categorySaving"
            @click="categoryPanel?.close()"
            >取消</Button
          ><Button
            type="submit"
            form="product-category-form"
            :disabled="locked || categorySaving || !newCategory.trim()"
            >{{ categorySaving ? "新增中" : "新增分类" }}</Button
          ></template
        >
      </Dialog>
    </template>
  </BackofficePage>
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

<style scoped>
.product-editor-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
#product-editor {
  container: product-editor / inline-size;
}
.ds-form > .ds-stack {
  min-width: 0;
}
.product-basic {
  container: product-basic / inline-size;
}
.product-basic__fields {
  grid-template-columns: minmax(0, 1fr);
}
.product-basic__select {
  min-width: 0;
}
@container product-basic (min-width: 640px) {
  .product-basic__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@container product-basic (min-width: 960px) {
  .product-basic__fields {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@container product-editor (max-width: 919px) {
  .ds-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
.category-form p {
  margin: 0;
}
.bo-product-actions {
  margin-left: auto;
}
</style>
