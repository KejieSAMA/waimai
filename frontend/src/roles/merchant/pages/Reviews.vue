<script setup lang="ts">
import { reactive } from "vue";
import { useRoute } from "vue-router";
import { Button, Dialog, Input, Select } from "@waimai/ui";
import { useMerchantReviews, time } from "@waimai/shared";
import { api } from "../../../common/api";
import BackofficePage from "../../../components/BackofficePage.vue";
import DataTable from "../../../components/DataTable.vue";
import Pagination from "../../../components/Pagination.vue";
const route = useRoute();
const state = reactive(
  useMerchantReviews((path, options) => api(path, options, "MERCHANT"), {
    rating: String(route.query.rating ?? "all"),
    reply: String(route.query.reply ?? "all"),
  }),
);
const columns = [
  { key: "order", title: "订单" },
  { key: "rating", title: "评分" },
  { key: "content", title: "用户评价" },
  { key: "reply", title: "商家回复" },
  { key: "actions", title: "操作" },
];
</script>
<template>
  <BackofficePage :body-scroll="false">
    <template #header>
      <div class="app-card app-row">
        <Select
          v-model="state.rating"
          label="评分"
          :disabled="state.saving"
          :options="[
            { value: 'all', label: '全部评价' },
            { value: 'bad', label: '差评（2 星及以下）' },
          ]"
        />
        <Select
          v-model="state.reply"
          label="回复"
          :disabled="state.saving"
          :options="[
            { value: 'all', label: '全部状态' },
            { value: 'pending', label: '待回复' },
            { value: 'replied', label: '已回复' },
          ]"
        />
        <Button variant="outline" :disabled="state.loading" @click="state.load"
          >刷新</Button
        >
        <span v-if="state.readonly && !state.loading" class="body-sm app-muted"
          >当前店铺仅可查看</span
        >
      </div>
      <p v-if="state.error" class="app-error body-sm" role="alert">
        {{ state.error
        }}<Button variant="text" @click="state.load">重试</Button>
      </p>
    </template>
    <p
      v-if="state.loading && !state.list.length"
      class="app-empty body-sm"
      role="status"
    >
      正在加载评价
    </p>
    <DataTable
      v-else
      fill
      :rows="state.list"
      :columns="columns"
      :reset-key="JSON.stringify([state.page, state.rating, state.reply])"
      :aria-busy="state.loading"
    >
      <template #order="{ row }"
        ><span class="body-sm">{{ row.order.orderNo }}</span>
        <p class="caption app-muted">
          {{ row.order.doneAt ? time(row.order.doneAt) : "—" }}
        </p></template
      >
      <template #rating="{ row }">{{ row.rating }} 星</template>
      <template #content="{ row }"
        ><p class="review-text body-sm">{{ row.content }}</p></template
      >
      <template #reply="{ row }"
        ><p class="review-text body-sm">
          {{ row.reply || "待回复" }}
        </p></template
      >
      <template #actions="{ row }"
        ><Button
          variant="text"
          size="sm"
          :disabled="state.readonly || state.saving"
          @click="state.edit(row)"
          >{{ row.reply ? "修改回复" : "回复评价" }}</Button
        ></template
      >
    </DataTable>
    <template #footer
      ><Pagination
        v-model="state.page"
        :total="state.total"
        @update:model-value="state.load"
    /></template>
    <template #overlay>
      <Dialog
        :open="!!state.editing"
        variant="modal"
        title="回复评价"
        :close-disabled="state.saving"
        @close="state.editing = undefined"
      >
        <p class="body-md review-text">{{ state.editing?.content }}</p>
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
            variant="outline"
            :disabled="state.saving"
            @click="state.editing = undefined"
            >取消</Button
          ><Button
            :disabled="state.saving || !state.content.trim()"
            @click="state.save"
            >保存回复</Button
          ></template
        >
      </Dialog>
    </template>
  </BackofficePage>
</template>
<style scoped>
.review-text {
  max-width: var(--size-cart-panel);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
</style>
