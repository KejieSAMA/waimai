<script setup lang="ts">
// 共享层的 IconName → @ant-design/icons-vue；antd 没有的碗、太阳、月亮用原线性路径兜底。
import { computed, type Component } from "vue";
import type { IconName } from "@waimai/ui";
import {
  HomeOutlined,
  ProfileOutlined,
  UserOutlined,
  ShopOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  MinusOutlined,
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  BarChartOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  StarOutlined,
  EditOutlined,
  FilterOutlined,
  EllipsisOutlined,
  AppstoreOutlined,
  CheckOutlined,
  CloseOutlined,
  WalletOutlined,
  WarningOutlined,
  CameraOutlined,
} from "@ant-design/icons-vue";

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), {
  size: 16,
});

type LineIcon = "bowl" | "sun" | "moon";
const lines: Record<LineIcon, { paths: string[]; circle?: number[] }> = {
  bowl: {
    paths: [
      "M3.5 11.5h17a8.5 8 0 0 1-17 0z",
      "M9 8c0-1.6 1.5-1.6 1.5-3.2",
      "M13.5 8c0-1.6 1.5-1.6 1.5-3.2",
    ],
  },
  sun: {
    circle: [12, 12, 4],
    paths: [
      "M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42",
    ],
  },
  moon: { paths: ["M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"] },
};
const icons: Record<Exclude<IconName, LineIcon>, Component> = {
  home: HomeOutlined,
  order: ProfileOutlined,
  user: UserOutlined,
  store: ShopOutlined,
  search: SearchOutlined,
  cart: ShoppingCartOutlined,
  plus: PlusOutlined,
  minus: MinusOutlined,
  back: LeftOutlined,
  "chevron-right": RightOutlined,
  "chevron-down": DownOutlined,
  chart: BarChartOutlined,
  box: InboxOutlined,
  shield: SafetyCertificateOutlined,
  bell: BellOutlined,
  settings: SettingOutlined,
  clock: ClockCircleOutlined,
  location: EnvironmentOutlined,
  star: StarOutlined,
  edit: EditOutlined,
  filter: FilterOutlined,
  more: EllipsisOutlined,
  grid: AppstoreOutlined,
  check: CheckOutlined,
  close: CloseOutlined,
  wallet: WalletOutlined,
  alert: WarningOutlined,
  camera: CameraOutlined,
};
const line = computed(() =>
  props.name in lines ? lines[props.name as LineIcon] : undefined,
);
const icon = computed(() =>
  line.value ? undefined : icons[props.name as Exclude<IconName, LineIcon>],
);
</script>
<template>
  <component
    :is="icon"
    v-if="icon"
    :style="{ fontSize: size + 'px' }"
    aria-hidden="true"
  />
  <span
    v-else
    class="anticon"
    :style="{ fontSize: size + 'px' }"
    aria-hidden="true"
  >
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      <circle
        v-if="line?.circle"
        :cx="line.circle[0]"
        :cy="line.circle[1]"
        :r="line.circle[2]"
      />
      <path v-for="d in line?.paths" :key="d" :d="d" />
    </svg>
  </span>
</template>
