<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import { Button, Dialog, Input } from "../../../components/pc";
import DataTable from "../../../components/DataTable.vue";
import { ref } from "vue";
import { useCategoryEditor } from "@waimai/shared";
import { api } from "../../../common/api";
import { useDraftLeave } from "../../../common/draftLeave";
import { useFormFocus } from "../../../common/formFocus";
const editor = useCategoryEditor((path, options) =>
  api(path, options, "ADMIN"),
);
const {
  list,
  open,
  name,
  sort,
  deleting,
  loading,
  loaded,
  busy,
  error,
  dialogError,
  dirty,
  feedback,
  load,
  edit,
  save,
  remove,
} = editor;
const formElement = ref<HTMLElement>();
useFormFocus(formElement, feedback);
const draftLeave = useDraftLeave(
  () => open.value && dirty.value,
  () => busy.value,
);
</script>
<template>
  <BackofficePage :body-scroll="false">
    <template #header>
      <div class="bo-page__actions">
        <Button @click="edit(null)">新增类目</Button>
      </div>
      <p v-if="error" role="alert" class="app-error body-sm">
        {{ error }}<Button variant="text" @click="load">重试</Button>
      </p>
    </template>
    <DataTable
      fill
      :rows="list"
      :columns="[
        { key: 'name', title: '类目名称' },
        { key: 'sort', title: '排序' },
        { key: 'actions', title: '操作' },
      ]"
      ><template #empty>{{
        loading
          ? "正在加载"
          : error
            ? "读取失败，请重试"
            : loaded
              ? "暂无类目"
              : "正在加载"
      }}</template
      ><template #actions="{ row }"
        ><Button size="sm" variant="text" @click="edit(row)">编辑</Button
        ><Button
          size="sm"
          variant="danger-text"
          @click="
            dialogError = '';
            deleting = row;
          "
          >删除</Button
        ></template
      ></DataTable
    ><Dialog
      :open="open"
      :close-disabled="busy"
      :confirm-discard="true"
      :dirty="dirty"
      title="编辑类目"
      variant="modal"
      @close="open = false"
      ><form
        id="category-form"
        ref="formElement"
        novalidate
        class="app-stack"
        @submit.prevent="save"
      >
        <Input
          v-model="name"
          name="name"
          :error="feedback.field('name')"
          @blur="feedback.blur('name')"
          :disabled="busy"
          label="类目名称"
          required
        /><Input
          v-model="sort"
          name="sort"
          :error="feedback.field('sort')"
          @blur="feedback.blur('sort')"
          :disabled="busy"
          label="排序"
          type="number"
          min="0"
        />
        <p v-if="dialogError" class="app-error body-sm" role="alert">
          {{ dialogError }}
        </p>
      </form>
      <template #actions
        ><Button type="submit" form="category-form" :disabled="busy || !dirty"
          >保存类目</Button
        ></template
      ></Dialog
    ><Dialog
      :open="!!deleting"
      :close-disabled="busy"
      title="删除类目"
      @close="deleting = null"
      ><p>确认删除 {{ deleting?.name }}</p>
      <p v-if="dialogError" role="alert" class="app-error body-sm">
        {{ dialogError }}
      </p>
      <template #actions
        ><Button variant="outline" :disabled="busy" @click="deleting = null"
          >取消</Button
        ><Button variant="danger" :disabled="busy" @click="remove"
          >删除类目</Button
        ></template
      ></Dialog
    >
  </BackofficePage>
  <Dialog
    :open="draftLeave.open.value"
    title="放弃修改"
    @close="draftLeave.choose(false)"
    ><p>离开将放弃尚未保存的修改。</p>
    <template #actions
      ><Button variant="outline" @click="draftLeave.choose(false)"
        >继续编辑</Button
      ><Button variant="danger" @click="draftLeave.choose(true)"
        >放弃修改</Button
      ></template
    ></Dialog
  >
</template>
