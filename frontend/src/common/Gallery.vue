<script setup lang="ts">
import {
  Button,
  DesignReferenceGallery,
  CategoryNav,
  Checkbox,
  Dialog,
  DishCard,
  Icon,
  Input,
  ListCell,
  ListCellGroup,
  OrderCard,
  Price,
  SearchBar,
  Select,
  StatCard,
  Stepper,
  StoreCard,
  Switch,
  Tabs,
  Tag,
  Thumb,
} from "@waimai/ui";
import CartPanel from "../components/CartPanel.vue";
import DataTable from "../components/DataTable.vue";
import DataTableMedia from "../components/DataTableMedia.vue";
import DesktopShell from "../components/DesktopShell.vue";
import FilterBar from "../components/FilterBar.vue";
import InfoList from "../components/InfoList.vue";
import PageHeader from "../components/PageHeader.vue";
import Pagination from "../components/Pagination.vue";
import SideNav from "../components/SideNav.vue";
import SiteHeader from "../components/SiteHeader.vue";
import TrendChart from "../components/TrendChart.vue";
import { ref } from "vue";
import { useTheme } from "@waimai/tokens";
const text = ref("牛肉面"),
  on = ref(true),
  qty = ref(2),
  tab = ref("全部"),
  select = ref("推荐"),
  dialog = ref(false);
const { toggle } = useTheme();
const references = import.meta.glob<string>(
  "../../../design-system/screenshots/*.png",
  { eager: true, query: "?url", import: "default" },
);
const referencePages = [
  {
    name: "DeskUserHome",
    label: "用户首页",
    path: "/",
    light:
      references["../../../design-system/screenshots/DeskUserHome-light.png"],
    dark: references[
      "../../../design-system/screenshots/DeskUserHome-dark.png"
    ],
  },
  {
    name: "DeskUserStore",
    label: "店铺点餐",
    path: "/store/store-0",
    light:
      references["../../../design-system/screenshots/DeskUserStore-light.png"],
    dark: references[
      "../../../design-system/screenshots/DeskUserStore-dark.png"
    ],
  },
  {
    name: "DeskUserOrders",
    label: "用户订单",
    path: "/orders",
    light:
      references["../../../design-system/screenshots/DeskUserOrders-light.png"],
    dark: references[
      "../../../design-system/screenshots/DeskUserOrders-dark.png"
    ],
  },
  {
    name: "DeskMerchantDashboard",
    label: "商家工作台",
    path: "/merchant/dashboard",
    light:
      references[
        "../../../design-system/screenshots/DeskMerchantDashboard-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/DeskMerchantDashboard-dark.png"
    ],
  },
  {
    name: "DeskMerchantOrders",
    label: "商家订单",
    path: "/merchant/orders",
    light:
      references[
        "../../../design-system/screenshots/DeskMerchantOrders-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/DeskMerchantOrders-dark.png"
    ],
  },
  {
    name: "DeskMerchantProducts",
    label: "商品管理",
    path: "/merchant/products",
    light:
      references[
        "../../../design-system/screenshots/DeskMerchantProducts-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/DeskMerchantProducts-dark.png"
    ],
  },
  {
    name: "DeskMerchantProductEdit",
    label: "商品编辑",
    path: "/merchant/products/new",
    light:
      references[
        "../../../design-system/screenshots/DeskMerchantProductEdit-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/DeskMerchantProductEdit-dark.png"
    ],
  },
  {
    name: "DeskAdminDashboard",
    label: "管理总览",
    path: "/admin/overview",
    light:
      references[
        "../../../design-system/screenshots/DeskAdminDashboard-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/DeskAdminDashboard-dark.png"
    ],
  },
  {
    name: "DeskAdminMerchants",
    label: "商家管理",
    path: "/admin/merchants",
    light:
      references[
        "../../../design-system/screenshots/DeskAdminMerchants-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/DeskAdminMerchants-dark.png"
    ],
  },
  {
    name: "DeskAdminAudit",
    label: "入驻审核",
    path: "/admin/audit",
    light:
      references["../../../design-system/screenshots/DeskAdminAudit-light.png"],
    dark: references[
      "../../../design-system/screenshots/DeskAdminAudit-dark.png"
    ],
  },
];
</script>
<template>
  <div class="app-stack">
    <DesignReferenceGallery :pages="referencePages" />
    <div class="app-row">
      <h1 class="title-lg">组件画廊</h1>
      <Button variant="outline" @click="toggle">切换主题</Button>
    </div>
    <div class="app-card app-stack">
      <div class="app-row">
        <Icon name="bowl" /><Button icon="plus">新增商品</Button
        ><Tag tone="success">在售</Tag
        ><Price :value="28.5" :original="32" /><Thumb
          kind="logo"
          name="老张家"
        />
      </div>
      <Input v-model="text" label="商品名称" hint="请输入商品名称" />
      <div class="app-row">
        <Switch v-model="on" label="营业状态" /><Checkbox
          v-model="on"
          label="选中商品"
        /><Stepper v-model="qty" /><Select
          v-model="select"
          label="分类"
          :options="['推荐', '主食']"
        />
      </div>
      <SearchBar
        v-model="text"
        placeholder="搜索店铺、菜品"
        action="搜索"
      /><Tabs v-model="tab" :items="['全部', '在售', '已下架']" /><CategoryNav
        :items="['招牌推荐', '面食', '小菜', '饮品']"
      /><ListCellGroup title="店铺设置"
        ><ListCell
          title="营业时间"
          desc="每日营业"
          value="10:00–22:00"
          icon="clock"
          arrow /></ListCellGroup
      ><Button @click="dialog = true">查看弹窗</Button>
    </div>
    <div class="app-grid">
      <StatCard
        label="今日营业额（元）"
        value="3,286.50"
        :delta="12.4"
        tone="brand"
      /><StatCard label="有效订单" :value="126" unit="单" :delta="8.1" />
    </div>
    <StoreCard
      name="老张家牛肉面（望京店）"
      :rating="4.8"
      sales="3000+"
      time="30 分钟"
      distance="1.2km"
      :min-order="20"
      :delivery-fee="3"
      :tags="['满 30 减 5', '满 50 减 10', '首单立减 8']"
    /><DishCard
      name="招牌红烧牛肉面"
      :price="28"
      desc="每日现熬牛骨汤"
      sales="1200+"
      :model-value="qty"
      @update:model-value="qty = $event"
    /><OrderCard
      title="老张家牛肉面"
      status="PENDING"
      :items="[
        { name: '招牌红烧牛肉面', qty: 1 },
        { name: '卤蛋', qty: 1 },
      ]"
      :total="29"
      time="今天 12:30"
      :actions="[{ label: '查看订单' }]"
    /><Dialog
      :open="dialog"
      title="确认下架"
      :actions="[
        { label: '取消', onClick: () => (dialog = false) },
        {
          label: '确认下架',
          variant: 'primary',
          onClick: () => (dialog = false),
        },
      ]"
      @close="dialog = false"
      >下架后用户将无法购买该商品</Dialog
    ><PageHeader
      title="商品管理"
      subtitle="商品与库存"
      :breadcrumb="['商家中心', '商品管理']"
      ><template #actions><Button>新增商品</Button></template></PageHeader
    ><FilterBar
      ><Input label="商品名称" placeholder="搜索商品" /><Select
        label="分类"
        :options="['全部分类', '招牌推荐']" /></FilterBar
    ><DataTable
      :columns="[
        { key: 'name', title: '商品' },
        { key: 'price', title: '售价' },
      ]"
      :rows="[{ id: '1', name: '招牌红烧牛肉面', price: '¥28' }]"
      ><template #name="{ row }"
        ><DataTableMedia
          :name="row.name"
          sub="月售 1200+" /></template></DataTable
    ><Pagination :total="128" /><InfoList
      :items="[
        { label: '店铺名称', value: '老张家牛肉面' },
        { label: '营业时间', value: '10:00–22:00' },
      ]"
      :columns="2"
    /><TrendChart
      title="近 7 日营业额"
      :data="[
        { label: '周一', value: 2800 },
        { label: '周二', value: 3200 },
        { label: '周三', value: 3100 },
        { label: '周四', value: 3600 },
        { label: '周五', value: 4200 },
        { label: '周六', value: 4800 },
        { label: '周日', value: 3286.5 },
      ]"
    /><CartPanel
      :items="[{ id: '1', name: '招牌红烧牛肉面', qty: 1, price: 28 }]"
      :quote="{
        itemsCents: 2800,
        deliveryFeeCents: 300,
        discountCents: 0,
        payCents: 3100,
        count: 1,
        items: [],
      }"
    /><SiteHeader location="望京 SOHO" :user="{ name: '小王' }" /><SideNav
      role="merchant"
      :groups="[
        {
          items: [
            { key: 'desk', label: '工作台', icon: 'grid' },
            { key: 'orders', label: '订单', icon: 'order' },
          ],
        },
      ]"
      model-value="desk"
    /><DesktopShell
      role="admin"
      :groups="[
        { items: [{ key: 'overview', label: '数据总览', icon: 'chart' }] },
      ]"
      model-value="overview"
      ><p class="body">运营后台</p></DesktopShell
    >
  </div>
</template>
