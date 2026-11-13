<script setup lang="ts">
import { Button, Dialog, Input, ListCell, ListCellGroup } from "@waimai/ui";
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
  <div class="app-stack">
    <div class="app-row">
      <Button @click="edit(null)">新增类目</Button>
    </div>
    <p v-if="error" role="alert" class="app-error body-sm">
      {{ error }}<Button variant="text" @click="load">重试</Button>
    </p>
    <p v-else-if="loading" role="status">正在加载</p>
    <p v-else-if="loaded && !list.length">暂无类目</p>
    <ListCellGroup
      ><ListCell v-for="c in list" :key="c.id" :title="c.name" :value="c.sort"
        ><template #extra
          ><Button size="sm" variant="text" @click="edit(c)">编辑</Button
          ><Button
            size="sm"
            variant="danger-text"
            @click="
              dialogError = '';
              deleting = c;
            "
            >删除</Button
          ></template
        ></ListCell
      ></ListCellGroup
    ><Dialog
      :open="open"
      :close-disabled="busy"
      :confirm-discard="true"
      :dirty="dirty"
      title="编辑类目"
      variant="sheet"
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
  </div>
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
