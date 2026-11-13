<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Button, Dialog, PromotionFields } from "@waimai/ui";
import { usePromotionsEditor } from "@waimai/shared";
import { api } from "../../../common/api";
import { useDraftLeave } from "../../../common/draftLeave";
import PageSlot from "../../../components/PageSlot.vue";
import { usePageChrome } from "../../../common/pageChrome";
const router = useRouter();
const state = reactive(
  usePromotionsEditor((path, options) => api(path, options, "MERCHANT")),
);
const { open, choose } = useDraftLeave(
  () => state.dirty,
  () => state.saving,
);
const clearConfirm = ref(false),
  reloadConfirm = ref(false);
function update(index: number, field: "threshold" | "discount", value: string) {
  state.rules[index][field] = value;
}
async function submit() {
  if (!state.rules.length && state.canSave) {
    clearConfirm.value = true;
    return;
  }
  await state.save();
}
function reload() {
  if (state.dirty) reloadConfirm.value = true;
  else void state.load();
}
usePageChrome().actions = true;
</script>
<template>
  <div class="app-stack">
    <Button variant="text" icon="back" @click="router.push('/merchant/store')"
      >店铺设置</Button
    >
    <div class="app-card app-stack promotion-editor">
      <p v-if="state.loading" class="body-sm app-muted" role="status">
        正在读取满减配置
      </p>
      <p v-if="state.loaded && state.readonly" class="body-sm app-muted">
        当前店铺仅可查看满减配置
      </p>
      <PromotionFields
        v-if="state.loaded"
        :rules="state.rules"
        :disabled="state.readonly || state.loading || state.saving"
        @update="update"
        @add="state.add"
        @remove="state.remove"
      />
      <p v-if="state.issue" class="app-error body-sm" role="alert">
        {{ state.issue }}
      </p>
      <p v-if="state.error" class="app-error body-sm" role="alert">
        {{ state.error
        }}<Button
          variant="text"
          :disabled="state.saving || state.loading"
          @click="reload"
          >重新读取</Button
        >
      </p>
      <p v-if="state.notice" class="body-sm" role="status">
        {{ state.notice }}
      </p>
    </div>
    <PageSlot name="actions"
      ><div class="promotion-actions">
        <span class="body-sm app-muted">{{
          state.dirty ? "有未保存修改" : "暂无未保存修改"
        }}</span>
        <Button
          variant="outline"
          :disabled="!state.dirty || state.saving || state.loading"
          @click="state.reset"
          >取消修改</Button
        >
        <Button :disabled="!state.canSave" @click="submit">{{
          state.saving ? "正在保存" : "保存满减"
        }}</Button>
      </div></PageSlot
    >

    <Dialog :open="open" title="放弃修改" @close="choose(false)"
      ><p class="body-md">满减设置尚未保存，离开将丢失本次修改。</p>
      <template #actions
        ><Button variant="outline" @click="choose(false)">继续编辑</Button
        ><Button variant="danger" @click="choose(true)"
          >放弃修改</Button
        ></template
      ></Dialog
    >
    <Dialog
      :open="clearConfirm"
      title="取消满减"
      :close-disabled="state.saving"
      @close="clearConfirm = false"
      ><p class="body-md">保存后将取消本店全部满减，已创建的订单不受影响。</p>
      <p v-if="state.error" class="app-error body-sm" role="alert">
        {{ state.error }}
      </p>
      <template #actions
        ><Button
          variant="outline"
          :disabled="state.saving"
          @click="clearConfirm = false"
          >保留配置</Button
        ><Button
          :disabled="state.saving"
          @click="
            state.save().then((ok) => {
              if (ok) clearConfirm = false;
            })
          "
          >取消满减</Button
        ></template
      ></Dialog
    >
    <Dialog
      :open="reloadConfirm"
      title="重新读取"
      @close="reloadConfirm = false"
      ><p class="body-md">将放弃当前草稿并读取服务端最新配置。</p>
      <template #actions
        ><Button variant="outline" @click="reloadConfirm = false"
          >继续编辑</Button
        ><Button
          @click="
            reloadConfirm = false;
            state.load();
          "
          >重新读取</Button
        ></template
      ></Dialog
    >
  </div>
</template>
<style scoped>
.promotion-editor {
  max-width: calc(var(--size-cart-panel) * 2);
}
.promotion-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-3);
}
</style>
