<script setup lang="ts">
import { computed } from "vue";
import { money, type Order } from "@waimai/shared";
import { Icon } from "../../../components/pc";
import { orderPresentation } from "../orderPresentation";
const props = defineProps<{ order: Order }>();
const view = computed(() => orderPresentation(props.order));
const columns = [
  { key: "name", title: "商品" },
  { key: "price", title: "单价", width: 90, align: "right" as const },
  {
    key: "qty",
    dataIndex: "qty",
    title: "数量",
    width: 60,
    align: "right" as const,
  },
  { key: "subtotal", title: "小计", width: 90, align: "right" as const },
];
</script>
<template>
  <section class="app-card order-goods" aria-label="商品与费用">
    <header class="order-goods__head">
      <h2 class="title-sm">{{ order.store.name }}</h2>
      <span class="caption">共 {{ view.quantity }} 件</span>
    </header>
    <a-table
      class="order-goods__table"
      :columns="columns"
      :data-source="order.items"
      row-key="id"
      :pagination="false"
      size="small"
      table-layout="fixed"
    >
      <template #bodyCell="{ column, record }">
        <div v-if="column.key === 'name'" class="order-goods__item">
          <div class="order-goods__thumb" aria-hidden="true">
            <Icon name="bowl" :size="24" />
          </div>
          <div class="order-goods__name">
            <strong>{{ record.nameSnapshot }}</strong>
            <p v-if="record.spec" class="caption">{{ record.spec }}</p>
          </div>
        </div>
        <span v-else-if="column.key === 'price'" class="xz-num">{{
          money(record.priceCentsSnapshot)
        }}</span>
        <span v-else-if="column.key === 'qty'" class="xz-num">{{
          record.qty
        }}</span>
        <strong v-else-if="column.key === 'subtotal'" class="xz-num">{{
          record.lineTotalCents == null ? "—" : money(record.lineTotalCents)
        }}</strong>
      </template>
    </a-table>
    <ul class="order-goods__compact">
      <li v-for="item in order.items" :key="item.id">
        <strong>{{ item.nameSnapshot }}</strong>
        <p v-if="item.spec" class="caption app-muted">{{ item.spec }}</p>
        <dl>
          <div>
            <dt>单价</dt>
            <dd>{{ money(item.priceCentsSnapshot) }}</dd>
          </div>
          <div>
            <dt>数量</dt>
            <dd>{{ item.qty }}</dd>
          </div>
          <div>
            <dt>小计</dt>
            <dd>
              {{
                item.lineTotalCents == null ? "—" : money(item.lineTotalCents)
              }}
            </dd>
          </div>
        </dl>
      </li>
    </ul>
    <div class="order-goods__fees">
      <dl>
        <div v-for="fee in view.fees" :key="fee.label">
          <dt>{{ fee.label }}</dt>
          <dd>{{ fee.value }}</dd>
        </div>
        <div class="order-goods__total">
          <dt>{{ view.amountLabel }}</dt>
          <dd class="price">{{ money(order.payCents) }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
<style scoped>
.order-goods {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.order-goods__head {
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-4);
}
.order-goods__head h2 {
  margin: 0;
  overflow-wrap: anywhere;
}
.order-goods__head span,
.order-goods__name p,
.order-goods__fees dt {
  color: var(--ink-muted);
}
.order-goods__head span {
  flex: none;
}
.order-goods__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.order-goods__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--size-button-lg);
  height: var(--size-button-lg);
  background: var(--surface-sunken);
  color: var(--ink-muted);
  border-radius: var(--radius-md);
}
.order-goods__name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.order-goods__name p {
  margin: var(--space-1) 0 0;
}
.order-goods__fees {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: var(--space-4);
  padding-inline: var(--space-2);
}
.order-goods__fees dl {
  width: min(100%, var(--size-cart-panel));
  margin: 0;
}
.order-goods__fees dl > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}
.order-goods__fees dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.order-goods__table :deep(.ant-table-cell) {
  padding-inline: var(--space-2);
}
.order-goods__total {
  border-top: 1px solid var(--line);
  margin-top: var(--space-2);
  padding-top: var(--space-4) !important;
}
.order-goods__total dd {
  color: var(--price);
}
.order-goods__compact {
  display: none;
  list-style: none;
  padding: 0;
  margin: 0;
}
.order-goods__compact li {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--line);
  overflow-wrap: anywhere;
}
.order-goods__compact dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin: var(--space-2) 0 0;
}
.order-goods__compact dt {
  color: var(--ink-muted);
}
.order-goods__compact dd {
  margin: 0;
}
@container order-detail (max-width:559px) {
  .order-goods__table {
    display: none;
  }
  .order-goods__compact {
    display: block;
  }
}
</style>
