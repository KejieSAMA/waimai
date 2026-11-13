<script setup lang="ts">
import { reactive } from "vue";
import { useRoute } from "vue-router";
import { Button, Dialog, Input, Select } from "@waimai/ui";
import { useMerchantReviews, time } from "@waimai/shared";
import { api } from "../../../common/api";
const route = useRoute();
const state = reactive(
  useMerchantReviews((path, options) => api(path, options, "MERCHANT"), {
    rating: String(route.query.rating ?? "all"),
    reply: String(route.query.reply ?? "all"),
  }),
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
    <p v-if="state.loading" class="app-muted body-sm" role="status">
      正在加载评价
    </p>
    <p v-if="state.error" class="app-error body-sm" role="alert">
      {{ state.error }}<Button variant="text" @click="state.load">重试</Button>
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
        @click="
          state.page--;
          state.load();
        "
        >上一页</Button
      ><span class="body-sm"
        >{{ state.page }} / {{ Math.max(1, Math.ceil(state.total / 20)) }}</span
      ><Button
        variant="outline"
        :disabled="state.page * 20 >= state.total || state.loading"
        @click="
          state.page++;
          state.load();
        "
        >下一页</Button
      >
    </div>
    <Dialog
      :open="!!state.editing"
      variant="sheet"
      title="回复评价"
      :close-disabled="state.saving"
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
</template>
<style scoped>
.review-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
</style>
