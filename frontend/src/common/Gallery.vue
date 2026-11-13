<script setup lang="ts">
// 开发环境组件画廊：方案 A 主题下的 antd 组件与 PC 封装预览（浅色 / 深色由顶栏切换）。
import { Price } from "@waimai/ui";
import {
  Button,
  Checkbox,
  Dialog,
  DishCard,
  Input,
  ListCell,
  ListCellGroup,
  OrderCard,
  QtyStepper,
  SearchBar,
  Select,
  StatCard,
  StoreCard,
  Switch,
  Tabs,
  Tag,
  Thumb,
} from "../components/pc";
import CartPanel from "../components/CartPanel.vue";
import DataTable from "../components/DataTable.vue";
import DataTableMedia from "../components/DataTableMedia.vue";
import FilterBar from "../components/FilterBar.vue";
import InfoList from "../components/InfoList.vue";
import PageHeader from "../components/PageHeader.vue";
import Pagination from "../components/Pagination.vue";
import TrendChart from "../components/TrendChart.vue";
import { ref } from "vue";
import { useTheme } from "@waimai/tokens";
import { orderStatuses, productStatuses, storeStatuses } from "@waimai/shared";

const text = ref("牛肉面"),
  on = ref(true),
  qty = ref(2),
  tab = ref("全部"),
  chip = ref("全部"),
  select = ref("推荐"),
  page = ref(1),
  selected = ref<string[]>([]),
  dialog = ref(false);
const { theme, toggle } = useTheme();
const statuses = [
  ...Object.values(productStatuses),
  ...Object.values(storeStatuses),
  ...Object.values(orderStatuses),
];
const rows = [
  {
    id: "1",
    name: "红烧牛肉面",
    category: "面食",
    price: "¥28",
    status: "在售",
  },
  {
    id: "2",
    name: "番茄鸡蛋面",
    category: "面食",
    price: "¥22",
    status: "已售罄",
  },
  {
    id: "3",
    name: "凉拌黄瓜",
    category: "小菜",
    price: "¥8",
    status: "已下架",
  },
];
const quote = {
  items: [],
  itemsCents: 5800,
  deliveryFeeCents: 300,
  discountCents: 500,
  payCents: 5600,
  shortfallCents: 0,
  checkoutAllowed: true,
} as unknown as import("@waimai/shared").Quote;
</script>
<template>
  <div class="app-stack pc-gallery">
    <PageHeader title="组件画廊" subtitle="方案 A 清爽橙 · ant-design-vue 4">
      <template #actions>
        <Button variant="outline" @click="toggle">{{
          theme === "light" ? "切换深色" : "切换浅色"
        }}</Button>
      </template>
    </PageHeader>

    <a-card title="按钮与状态" :bordered="false">
      <a-space wrap>
        <Button>主要按钮</Button><Button variant="secondary">次要按钮</Button
        ><Button variant="outline">描边按钮</Button
        ><Button variant="text">文字按钮</Button
        ><Button variant="danger">删除</Button
        ><Button variant="danger-outline">驳回</Button
        ><Button icon="plus">新增商品</Button>
      </a-space>
      <a-divider />
      <a-space wrap>
        <Tag v-for="s in statuses" :key="s.label" :tone="s.tone">{{
          s.label
        }}</Tag>
      </a-space>
    </a-card>

    <a-card title="表单" :bordered="false">
      <div class="pc-gallery__grid">
        <Input v-model="text" label="商品名称" hint="请输入商品名称" required />
        <Input v-model="text" label="店铺公告" multiline />
        <Select
          v-model="select"
          label="分类"
          :options="['推荐', '主食', '饮品']"
        />
        <SearchBar v-model="text" placeholder="搜索店铺、菜品" action="搜索" />
      </div>
      <a-divider />
      <a-space wrap :size="24">
        <Switch v-model="on" label="营业状态" />
        <Checkbox v-model="on" label="选中商品" />
        <QtyStepper v-model="qty" />
        <Price :value="28.5" :original="32" />
        <Thumb kind="logo" name="老张家" />
      </a-space>
      <a-divider />
      <Tabs
        v-model="tab"
        :items="[
          { key: '全部', label: '全部', count: 12 },
          { key: '待接单', label: '待接单', count: 3, alert: true },
          { key: '已完成', label: '已完成' },
        ]"
      />
      <Tabs
        v-model="chip"
        variant="chip"
        wrap
        :items="['全部', '快餐便当', '米粉面馆', '奶茶饮品']"
      />
    </a-card>

    <div class="pc-gallery__grid">
      <StatCard
        label="今日营业额（元）"
        value="3,286.50"
        :delta="12.4"
        tone="brand"
        icon="wallet"
      />
      <StatCard label="有效订单" :value="126" unit="单" :delta="-8.1" />
    </div>

    <div class="pc-gallery__grid pc-gallery__grid--3">
      <StoreCard
        name="老张家牛肉面（望京店）"
        :rating="4.8"
        sales="3000+"
        time="30 分钟"
        :min-order="20"
        :delivery-fee="3"
        :tags="['满 40 减 5']"
      />
      <StoreCard
        name="轻食沙拉"
        :rating="null"
        :min-order="25"
        :delivery-fee="0"
        status="closed"
      />
      <CartPanel
        :items="[
          { id: '1', name: '红烧牛肉面', qty: 2, price: 56 },
          { id: '2', name: '凉拌黄瓜', qty: 1, price: 8 },
        ]"
        :quote="quote"
      />
    </div>

    <div class="pc-gallery__grid">
      <DishCard
        name="红烧牛肉面"
        :price="28"
        :original="32"
        desc="慢炖牛腩，手工拉面"
        sales="1200+"
        :tags="['招牌']"
        :model-value="qty"
        @update:model-value="qty = $event"
      />
      <DishCard name="番茄鸡蛋面" :price="22" sold-out />
      <OrderCard
        title="老张家牛肉面"
        status="DELIVERING"
        :items="[{ name: '红烧牛肉面', qty: 2 }, { name: '凉拌黄瓜' }]"
        :total="64"
        time="今天 12:30"
        :actions="[
          { label: '查看详情' },
          { label: '再来一单', variant: 'primary' },
        ]"
      />
      <OrderCard
        view="merchant"
        title="尾号 1234"
        status="PENDING"
        serial="12"
        :items="[{ name: '红烧牛肉面', qty: 2, price: 56 }]"
        :total="56"
        note="少放辣"
      />
    </div>

    <FilterBar>
      <Input label="商品名称" layout="horizontal" placeholder="输入名称" />
      <Select label="状态" placeholder="全部" :options="['在售', '已下架']" />
    </FilterBar>
    <DataTable
      :columns="[
        { key: 'name', title: '商品' },
        { key: 'category', title: '分类', width: 120 },
        { key: 'price', title: '价格', width: 100, align: 'right', num: true },
        { key: 'status', title: '状态', width: 100 },
      ]"
      :rows="rows"
      selectable
      :selected="selected"
      :batch-actions="[{ label: '批量下架' }]"
      @select="selected = $event"
    >
      <template #name="{ row }"
        ><DataTableMedia :name="row.name" sub="月售 120"
      /></template>
      <template #footer
        ><Pagination v-model="page" :total="58" :page-size="10"
      /></template>
    </DataTable>

    <div class="pc-gallery__grid">
      <a-card :bordered="false">
        <TrendChart
          title="近 7 日营业额"
          prefix="¥"
          :data="[
            { label: '周一', value: 2860 },
            { label: '周二', value: 3120 },
            { label: '周三', value: 2580 },
            { label: '周四', value: 3460 },
            { label: '周五', value: 4210 },
            { label: '周六', value: 5120 },
            { label: '周日', value: 4680 },
          ]"
        />
      </a-card>
      <div class="app-stack">
        <ListCellGroup title="店铺设置">
          <ListCell
            title="营业时间"
            desc="每日营业"
            value="10:00–22:00"
            icon="clock"
            arrow
          />
          <ListCell title="退出登录" danger arrow />
        </ListCellGroup>
        <a-card :bordered="false">
          <InfoList
            :columns="2"
            :items="[
              { label: '联系人', value: '张先生' },
              { label: '手机号', value: '尾号 1234' },
              { label: '营业时间', value: '10:00–22:00' },
              { label: '起送价', value: '¥20' },
            ]"
          />
        </a-card>
        <div><Button @click="dialog = true">查看弹窗</Button></div>
      </div>
    </div>

    <Dialog
      :open="dialog"
      title="下架商品"
      :actions="[
        { label: '取消', onClick: () => (dialog = false) },
        {
          label: '确认下架',
          variant: 'danger',
          onClick: () => (dialog = false),
        },
      ]"
      @close="dialog = false"
    >
      <p>下架后用户将无法购买该商品，可随时重新上架。</p>
    </Dialog>
  </div>
</template>
<style scoped>
.pc-gallery {
  padding-bottom: var(--space-8);
}
.pc-gallery :deep(.ant-card) {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.pc-gallery__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  align-items: start;
}
.pc-gallery__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
</style>
