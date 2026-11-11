<script setup lang="ts">
import { Button, Tag, Thumb } from "@waimai/ui";
import { storeStatuses, type StoreStatus, type Action } from "@waimai/shared";
defineProps<{
  name: string;
  status: StoreStatus;
  logo?: string;
  category?: string;
  city?: string;
  owner?: string;
  joined?: string;
  orders?: number;
  rating?: number;
  reason?: string;
  actions?: Action[];
}>();
</script>
<template>
  <div class="xz-merchant">
    <div class="xz-merchant__main">
      <Thumb kind="logo" :src="logo" :name="name" />
      <div class="xz-merchant__info">
        <div class="xz-merchant__top">
          <span class="xz-merchant__name title-sm">{{ name }}</span
          ><Tag :tone="storeStatuses[status].tone">{{
            storeStatuses[status].label
          }}</Tag>
        </div>
        <div class="xz-merchant__meta body-sm">
          {{ category }} · {{ city
          }}<template v-if="owner"> · 负责人 {{ owner }}</template>
        </div>
        <div class="xz-merchant__meta body-sm">
          <template v-if="joined"
            >{{ status === "PENDING" ? "提交于" : "入驻" }}
            {{ joined }}</template
          ><template v-if="orders != null"> · 月订单 {{ orders }}</template
          ><template v-if="rating != null"> · 评分 {{ rating }}</template>
        </div>
      </div>
    </div>
    <div v-if="reason" class="xz-merchant__reason body-sm">{{ reason }}</div>
    <div v-if="actions?.length" class="xz-merchant__actions">
      <Button
        v-for="a in actions"
        :key="a.label"
        size="sm"
        :variant="a.variant || 'outline'"
        @click="a.onClick?.()"
        >{{ a.label }}</Button
      >
    </div>
  </div>
</template>
