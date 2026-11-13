<script setup lang="ts">
import { useRouter } from "vue-router";
import { Button, ListCell, ListCellGroup, Tag, Thumb } from "@waimai/ui";
import { storeStatuses } from "@waimai/shared";
import MyPage from "../../../common/MyPage.vue";
import { api } from "../../../common/api";
import { useMerchantProfile } from "../../../common/merchantProfile";
const router = useRouter();
const { store, pending, error, entry, load } = useMerchantProfile(() =>
  api("/merchant/store", {}, "MERCHANT"),
);
</script>
<template>
  <MyPage role="MERCHANT">
    <section
      v-if="pending || error"
      class="app-card"
      aria-label="店铺信息"
      :aria-busy="pending"
    >
      <p v-if="pending" class="body-sm app-muted" role="status">正在加载店铺</p>
      <p v-else class="body-sm app-error" role="alert">
        {{ error }}<Button variant="text" @click="load">重试</Button>
      </p>
    </section>
    <section v-else class="app-card merchant-profile" aria-label="我的店铺">
      <div v-if="store" class="merchant-profile__summary">
        <Thumb kind="logo" :src="store.logo" :name="store.name" />
        <div class="merchant-profile__name">
          <h2 class="title-sm">{{ store.name }}</h2>
          <Tag :tone="storeStatuses[store.status].tone">{{
            storeStatuses[store.status].label
          }}</Tag>
        </div>
      </div>
      <p v-if="store?.status === 'FROZEN'" class="body-sm app-muted">
        {{ store.frozenReason || "店铺已冻结，设置仅可查看" }}
      </p>
      <ListCellGroup v-if="entry"
        ><ListCell
          :title="entry.label"
          :icon="entry.icon"
          arrow
          @click="router.push(entry.key)"
      /></ListCellGroup>
    </section>
    <ListCellGroup
      ><ListCell
        title="评价管理"
        icon="star"
        arrow
        @click="router.push('/merchant/reviews')"
    /></ListCellGroup>
  </MyPage>
</template>
<style scoped>
.merchant-profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.merchant-profile__summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.merchant-profile__name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.merchant-profile__name h2 {
  margin: 0 0 var(--space-2);
}
</style>
