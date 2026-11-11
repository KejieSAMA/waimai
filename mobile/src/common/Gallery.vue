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
import CartBar from "../components/CartBar.vue";
import MerchantRow from "../components/MerchantRow.vue";
import MobilePage from "../components/MobilePage.vue";
import NavBar from "../components/NavBar.vue";
import NavBarIcon from "../components/NavBarIcon.vue";
import ProductRow from "../components/ProductRow.vue";
import TabBar from "../components/TabBar.vue";
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
    name: "UserHome",
    label: "用户首页",
    path: "/mobile/",
    light: references["../../../design-system/screenshots/UserHome-light.png"],
    dark: references["../../../design-system/screenshots/UserHome-dark.png"],
  },
  {
    name: "UserStore",
    label: "店铺点餐",
    path: "/mobile/store/store-0",
    light: references["../../../design-system/screenshots/UserStore-light.png"],
    dark: references["../../../design-system/screenshots/UserStore-dark.png"],
  },
  {
    name: "UserOrders",
    label: "用户订单",
    path: "/mobile/orders",
    light:
      references["../../../design-system/screenshots/UserOrders-light.png"],
    dark: references["../../../design-system/screenshots/UserOrders-dark.png"],
  },
  {
    name: "MerchantDashboard",
    label: "商家工作台",
    path: "/mobile/merchant/dashboard",
    light:
      references[
        "../../../design-system/screenshots/MerchantDashboard-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/MerchantDashboard-dark.png"
    ],
  },
  {
    name: "MerchantOrders",
    label: "商家订单",
    path: "/mobile/merchant/orders",
    light:
      references["../../../design-system/screenshots/MerchantOrders-light.png"],
    dark: references[
      "../../../design-system/screenshots/MerchantOrders-dark.png"
    ],
  },
  {
    name: "MerchantProducts",
    label: "商品管理",
    path: "/mobile/merchant/products",
    light:
      references[
        "../../../design-system/screenshots/MerchantProducts-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/MerchantProducts-dark.png"
    ],
  },
  {
    name: "MerchantProductEdit",
    label: "商品编辑",
    path: "/mobile/merchant/products/new",
    light:
      references[
        "../../../design-system/screenshots/MerchantProductEdit-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/MerchantProductEdit-dark.png"
    ],
  },
  {
    name: "AdminDashboard",
    label: "管理总览",
    path: "/mobile/admin/overview",
    light:
      references["../../../design-system/screenshots/AdminDashboard-light.png"],
    dark: references[
      "../../../design-system/screenshots/AdminDashboard-dark.png"
    ],
  },
  {
    name: "AdminMerchants",
    label: "商家管理",
    path: "/mobile/admin/merchants",
    light:
      references["../../../design-system/screenshots/AdminMerchants-light.png"],
    dark: references[
      "../../../design-system/screenshots/AdminMerchants-dark.png"
    ],
  },
  {
    name: "AdminMerchantAudit",
    label: "入驻审核",
    path: "/mobile/admin/audit",
    light:
      references[
        "../../../design-system/screenshots/AdminMerchantAudit-light.png"
      ],
    dark: references[
      "../../../design-system/screenshots/AdminMerchantAudit-dark.png"
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
    ><NavBar title="老张家牛肉面" back
      ><template #right
        ><NavBarIcon name="bell" label="消息" :badge="3" /></template></NavBar
    ><TabBar
      :items="[
        { key: 'home', label: '首页', icon: 'home' },
        { key: 'orders', label: '订单', icon: 'order' },
      ]"
      model-value="home"
    /><CartBar :count="2" :total="29" :delivery-fee="3" /><ProductRow
      name="招牌红烧牛肉面"
      :price="28"
      status="ON"
      :stock="100"
    /><MerchantRow
      name="老张家牛肉面"
      status="OPEN"
      category="米粉面馆"
      city="北京"
    /><MobilePage
      ><template #navBar><NavBar title="手机页面" /></template>
      <p class="body">页面内容</p></MobilePage
    >
  </div>
</template>
