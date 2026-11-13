<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import { reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { Button, Dialog, Input, Select } from "@waimai/ui";
import { useMerchantReviews, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { useListScroll } from "../../../common/pageScroll";
const listStart = ref<HTMLElement>();
const scroll = useListScroll(listStart);
const replyDialog = ref<InstanceType<typeof Dialog>>();
import { useDraftLeave } from "../../../common/draftLeave";
const route = useRoute();
const state = reactive(
  useMerchantReviews(
    (path, options) => api(path, options, "MERCHANT"),
    {
      rating: String(route.query.rating ?? "all"),
      reply: String(route.query.reply ?? "all"),
    },
    scroll,
  ),
);
const draftLeave = useDraftLeave(
  () => !!state.editing && state.content !== (state.editing.reply ?? ""),
  () => state.saving,
);
</script>
<template>
  <div class="app-stack">
    <div class="app-card app-stack">
      <Select
        v-model="state.rating"
        label="评分"
        :disabled="state.saving"
        :options="[
          { value: 'all', label: '全部评价' },
          { value: 'bad', label: '差评（2 星及以下）' },
        ]"
      /><Select
        v-model="state.reply"
        label="回复"
        :disabled="state.saving"
        :options="[
          { value: 'all', label: '全部状态' },
          { value: 'pending', label: '待回复' },
          { value: 'replied', label: '已回复' },
        ]"
      />
    </div>
    <div ref="listStart" />
    <p v-if="state.loading" class="app-muted body-sm" role="status">
      正在加载评价
    </p>
    <p v-if="state.error" class="app-error body-sm" role="alert">
      {{ state.error }}<Button variant="text" @click="state.retry">重试</Button>
    </p>
    <p
      v-if="!state.loading && !state.error && !state.list.length"
      class="app-empty body-sm"
    >
      暂无评价
    </p>
    <article v-for="row in state.list" :key="row.id" class="app-card app-stack">
      <div class="app-row">
        <strong class="title-sm">{{ row.rating }} 星</strong
        ><span class="caption app-muted">{{
          row.order.doneAt ? time(row.order.doneAt) : "—"
        }}</span>
      </div>
      <p class="caption app-muted">订单 {{ row.order.orderNo }}</p>
      <p class="body-md review-content">{{ row.content }}</p>
      <p v-if="row.reply" class="body-sm review-content">
        商家回复：{{ row.reply }}
      </p>
      <Button
        variant="outline"
        :disabled="state.readonly || state.saving"
        @click="state.edit(row)"
        >{{ row.reply ? "修改回复" : "回复评价" }}</Button
      >
    </article>
    <div class="app-row">
      <Button
        variant="outline"
        :disabled="state.page <= 1 || state.loading"
        @click="state.changePage(state.page - 1)"
        >上一页</Button
      ><span class="body-sm"
        >{{ state.page }} /
        {{ Math.max(1, Math.ceil(state.total / DEFAULT_PAGE_SIZE)) }}</span
      ><Button
        variant="outline"
        :disabled="
          state.page * DEFAULT_PAGE_SIZE >= state.total || state.loading
        "
        @click="state.changePage(state.page + 1)"
        >下一页</Button
      >
    </div>
    <Dialog
      ref="replyDialog"
      :open="!!state.editing"
      variant="sheet"
      title="回复评价"
      :close-disabled="state.saving"
      :confirm-discard="true"
      :dirty="state.content !== (state.editing?.reply ?? '')"
      @close="state.editing = undefined"
    >
      <p class="body-sm review-content">{{ state.editing?.content }}</p>
      <Input
        v-model="state.content"
        label="商家回复"
        multiline
        maxlength="500"
        :disabled="state.saving"
        hint="最多 500 字，可修改，修改会保留操作记录"
      />
      <p v-if="state.replyError" class="app-error body-sm" role="alert">
        {{ state.replyError }}
      </p>
      <template #actions
        ><Button
          block
          :disabled="state.saving || !state.content.trim()"
          @click="state.save"
          >保存回复</Button
        ></template
      >
    </Dialog>
  </div>
  <Dialog
    :open="draftLeave.open.value"
    title="放弃修改"
    @close="draftLeave.choose(false)"
    ><p>离开将放弃未保存的回复。</p>
    <template #actions
      ><Button variant="outline" @click="draftLeave.choose(false)"
        >继续编辑</Button
      ><Button variant="danger" @click="draftLeave.choose(true)"
        >放弃修改</Button
      ></template
    ></Dialog
  >
</template>
<style scoped>
.review-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
</style>
