<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
const props = withDefaults(
  defineProps<{
    data: { label: string; value: number }[];
    title?: string;
    subtitle?: string;
    height?: number;
    width?: number;
    prefix?: string;
    unit?: string;
    tickFormat?: (value: number) => string;
    valueFormat?: (value: number) => string;
  }>(),
  { height: 240, width: 640, prefix: "", unit: "" },
);
const plot = ref<HTMLDivElement>(),
  width = ref(props.width),
  active = ref<number | null>(null);
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!plot.value) return;
  observer = new ResizeObserver((entries) => {
    const next = Math.round(entries[0].contentRect.width);
    if (next > 0) width.value = next;
  });
  observer.observe(plot.value);
});
onBeforeUnmount(() => observer?.disconnect());
function niceStep(max: number) {
  const raw = max / 4,
    mag = Math.pow(10, Math.floor(Math.log10(raw))),
    ratio = raw / mag;
  return (
    (ratio <= 1
      ? 1
      : ratio <= 2
        ? 2
        : ratio <= 2.5
          ? 2.5
          : ratio <= 5
            ? 5
            : 10) * mag
  );
}
const step = computed(() =>
  niceStep(Math.max(1, ...props.data.map((d) => d.value))),
);
const top = computed(
  () =>
    Math.ceil(Math.max(1, ...props.data.map((d) => d.value)) / step.value) *
    step.value,
);
const ticks = computed(() =>
  Array.from(
    { length: Math.round(top.value / step.value) + 1 },
    (_, i) => i * step.value,
  ),
);
const band = computed(
  () => Math.max(10, width.value - 52) / Math.max(1, props.data.length),
);
const barWidth = computed(() => Math.min(24, Math.max(4, band.value - 8)));
const base = computed(() => props.height - 26);
const y = (value: number) => 20 + (props.height - 46) * (1 - value / top.value);
const full = (value: number) =>
  props.valueFormat?.(value) ??
  props.prefix + value.toLocaleString("en-US") + props.unit;
const tick = (value: number) =>
  props.tickFormat?.(value) ??
  (value >= 1e8
    ? Number((value / 1e8).toFixed(1)) + "亿"
    : value >= 1e4
      ? Number((value / 1e4).toFixed(1)) + "万"
      : value.toLocaleString("en-US"));
function barPath(index: number, value: number) {
  const x = 44 + index * band.value + (band.value - barWidth.value) / 2;
  const yy = y(value),
    height = base.value - yy,
    r = Math.min(4, height, barWidth.value / 2);
  if (height <= 0) return "";
  return `M${x} ${base.value}V${yy + r}Q${x} ${yy} ${x + r} ${yy}H${x + barWidth.value - r}Q${x + barWidth.value} ${yy} ${x + barWidth.value} ${yy + r}V${base.value}Z`;
}
const selected = computed(() =>
  active.value === null ? null : props.data[active.value],
);
</script>
<template>
  <figure class="xz-chart">
    <figcaption v-if="title" class="xz-chart__title">
      <span class="title-sm">{{ title }}</span
      ><span v-if="subtitle" class="xz-chart__sub body-sm">{{ subtitle }}</span>
    </figcaption>
    <div ref="plot" class="xz-chart__plot" :style="{ height: height + 'px' }">
      <svg
        :width="width"
        :height="height"
        role="img"
        :aria-label="(title || '趋势') + '，柱状图'"
      >
        <g v-for="(value, i) in ticks" :key="'g' + i">
          <line
            class="xz-chart__grid"
            x1="44"
            :x2="width - 8"
            :y1="Math.round(y(value)) + 0.5"
            :y2="Math.round(y(value)) + 0.5"
          />
          <text
            class="xz-chart__tick"
            x="36"
            :y="y(value) + 4"
            text-anchor="end"
          >
            {{ tick(value) }}
          </text>
        </g>
        <g v-for="(d, i) in data" :key="'b' + i">
          <path
            :class="['xz-chart__bar', { 'is-hover': active === i }]"
            :d="barPath(i, d.value)"
          />
          <text
            class="xz-chart__tick"
            :x="44 + (i + 0.5) * band"
            :y="height - 6"
            text-anchor="middle"
          >
            {{ d.label }}
          </text>
          <rect
            class="xz-chart__hit"
            :x="44 + i * band"
            y="20"
            :width="band"
            :height="height - 46"
            tabindex="0"
            :aria-label="d.label + ' ' + full(d.value)"
            @mouseenter="active = i"
            @mouseleave="active = null"
            @focus="active = i"
            @blur="active = null"
          />
        </g>
        <text
          v-if="data.length && active === null"
          class="xz-chart__value"
          :x="44 + (data.length - 0.5) * band"
          :y="y(data[data.length - 1].value) - 6"
          text-anchor="middle"
        >
          {{ tick(data[data.length - 1].value) }}
        </text>
      </svg>
      <div
        v-if="selected && active !== null"
        class="xz-chart__tip"
        :style="{
          left: 44 + (active + 0.5) * band + 'px',
          top: y(selected.value) - 8 + 'px',
        }"
      >
        <b class="title-sm">{{ full(selected.value) }}</b
        ><span class="caption">{{ selected.label }}</span>
      </div>
    </div>
    <div class="xz-sr">
      <table>
        <caption>
          {{
            title || "数据"
          }}
        </caption>
        <tbody>
          <tr v-for="(d, i) in data" :key="i">
            <th>{{ d.label }}</th>
            <td>{{ full(d.value) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>
