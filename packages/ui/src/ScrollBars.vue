<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from "vue";
import { scrollbarMetrics, scrollOffsetFromThumb } from "./scrollbar";
import { useOverlayScrollbars } from "./scrollbarContext";

type Axis = "x" | "y";
const props = withDefaults(
  defineProps<{
    target?: HTMLElement | null;
    content?: HTMLElement | null;
    axis?: Axis | "both";
    label?: string;
  }>(),
  { axis: "y", label: "滚动内容" },
);
const enabled = useOverlayScrollbars();
const targetId = `xz-scroll-${useId()}`;
const x = ref(scrollbarMetrics(0, 0, 0));
const y = ref(scrollbarMetrics(0, 0, 0));
const tracks = { x: ref<HTMLElement>(), y: ref<HTMLElement>() };
const axes = computed<Axis[]>(() =>
  props.axis === "both" ? ["x", "y"] : [props.axis],
);
const metrics = computed(() => ({ x: x.value, y: y.value }));
const dragging = ref<{
  axis: Axis;
  pointer: number;
  start: number;
  offset: number;
} | null>(null);
let frame: number | undefined;
let stopObserving: (() => void) | undefined;
let disposed = false;

function measure() {
  frame = undefined;
  const target = props.target;
  if (!target || !enabled) return;
  x.value = scrollbarMetrics(
    target.clientWidth,
    target.scrollWidth,
    target.scrollLeft,
    tracks.x.value?.clientWidth || target.clientWidth,
  );
  y.value = scrollbarMetrics(
    target.clientHeight,
    target.scrollHeight,
    target.scrollTop,
    tracks.y.value?.clientHeight || target.clientHeight,
  );
}
function refresh() {
  if (!disposed && frame === undefined) frame = requestAnimationFrame(measure);
}
function moveTo(axis: Axis, offset: number) {
  const target = props.target;
  if (!target) return;
  const position = Math.max(0, Math.min(metrics.value[axis].maxScroll, offset));
  if (axis === "y") target.scrollTop = position;
  else target.scrollLeft = position;
  refresh();
}
function startDrag(axis: Axis, event: PointerEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const thumb = event.currentTarget as HTMLElement;
  thumb.focus({ preventScroll: true });
  thumb.setPointerCapture(event.pointerId);
  dragging.value = {
    axis,
    pointer: event.pointerId,
    start: axis === "y" ? event.clientY : event.clientX,
    offset: metrics.value[axis].thumbOffset,
  };
}
function drag(event: PointerEvent) {
  const state = dragging.value;
  if (!state || event.pointerId !== state.pointer) return;
  const pointer = state.axis === "y" ? event.clientY : event.clientX;
  moveTo(
    state.axis,
    scrollOffsetFromThumb(
      state.offset + pointer - state.start,
      metrics.value[state.axis],
    ),
  );
}
function stopDrag(event: PointerEvent) {
  if (dragging.value?.pointer === event.pointerId) dragging.value = null;
}
function page(axis: Axis, event: PointerEvent) {
  if (
    event.button !== 0 ||
    event.target !== event.currentTarget ||
    !props.target
  )
    return;
  event.preventDefault();
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const point =
    axis === "y" ? event.clientY - bounds.top : event.clientX - bounds.left;
  const direction = point < metrics.value[axis].thumbOffset ? -1 : 1;
  const size =
    axis === "y" ? props.target.clientHeight : props.target.clientWidth;
  const offset =
    axis === "y" ? props.target.scrollTop : props.target.scrollLeft;
  moveTo(axis, offset + direction * size);
}
function keydown(axis: Axis, event: KeyboardEvent) {
  if (!props.target) return;
  const size =
    axis === "y" ? props.target.clientHeight : props.target.clientWidth;
  const offset =
    axis === "y" ? props.target.scrollTop : props.target.scrollLeft;
  const positions: Record<string, number> = {
    Home: 0,
    End: metrics.value[axis].maxScroll,
    PageUp: offset - size,
    PageDown: offset + size,
    [axis === "y" ? "ArrowUp" : "ArrowLeft"]: offset - 40,
    [axis === "y" ? "ArrowDown" : "ArrowRight"]: offset + 40,
  };
  if (!(event.key in positions)) return;
  event.preventDefault();
  event.stopPropagation();
  moveTo(axis, positions[event.key]);
}
function wheel(axis: Axis, event: WheelEvent) {
  if (!props.target) return;
  const size =
    axis === "y" ? props.target.clientHeight : props.target.clientWidth;
  const delta = axis === "y" ? event.deltaY : event.deltaX || event.deltaY;
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size : 1;
  const offset =
    axis === "y" ? props.target.scrollTop : props.target.scrollLeft;
  event.preventDefault();
  event.stopPropagation();
  moveTo(axis, offset + delta * scale);
}
function thumbStyle(axis: Axis) {
  const value = metrics.value[axis];
  return axis === "y"
    ? {
        height: `${value.thumbSize}px`,
        transform: `translateY(${value.thumbOffset}px)`,
      }
    : {
        width: `${value.thumbSize}px`,
        transform: `translateX(${value.thumbOffset}px)`,
      };
}

watch(
  [() => props.target, () => props.content],
  ([target, content]) => {
    stopObserving?.();
    if (!target || !enabled) return;
    if (!target.id) target.id = targetId;
    target.classList.add("xz-overlay-viewport");
    target.addEventListener("scroll", refresh, { passive: true });
    target.addEventListener("input", refresh);
    target.addEventListener("load", refresh, true);
    const resize = new ResizeObserver(refresh);
    resize.observe(target);
    if (content && content !== target) resize.observe(content);
    const mutations = new MutationObserver(refresh);
    if (content)
      mutations.observe(content, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    stopObserving = () => {
      resize.disconnect();
      mutations.disconnect();
      target.removeEventListener("scroll", refresh);
      target.removeEventListener("input", refresh);
      target.removeEventListener("load", refresh, true);
      target.classList.remove("xz-overlay-viewport");
      dragging.value = null;
    };
    refresh();
  },
  { immediate: true, flush: "post" },
);
watch(
  [() => x.value.visible, () => y.value.visible, () => props.axis],
  refresh,
  {
    flush: "post",
  },
);
onBeforeUnmount(() => {
  disposed = true;
  stopObserving?.();
  if (frame !== undefined) cancelAnimationFrame(frame);
});
defineExpose({ refresh });
</script>

<template>
  <template v-if="enabled">
    <div
      v-for="axis in axes"
      :key="axis"
      :ref="
        (element) => {
          tracks[axis].value = element as HTMLElement | undefined;
        }
      "
      v-show="metrics[axis].visible"
      :class="[
        'xz-scrollbar',
        'xz-scrollbar--' + axis,
        {
          'has-cross-axis':
            axes.length === 2 && metrics[axis === 'y' ? 'x' : 'y'].visible,
        },
      ]"
      @pointerdown="page(axis, $event)"
      @wheel="wheel(axis, $event)"
    >
      <div
        class="xz-scrollbar__thumb"
        :class="{ 'is-dragging': dragging?.axis === axis }"
        :style="thumbStyle(axis)"
        role="scrollbar"
        tabindex="0"
        :aria-label="label + (axis === 'y' ? '纵向滚动条' : '横向滚动条')"
        :aria-controls="target?.id"
        :aria-orientation="axis === 'y' ? 'vertical' : 'horizontal'"
        :aria-valuemin="0"
        :aria-valuemax="Math.round(metrics[axis].maxScroll)"
        :aria-valuenow="
          Math.round(
            axis === 'y' ? target?.scrollTop || 0 : target?.scrollLeft || 0,
          )
        "
        @pointerdown="startDrag(axis, $event)"
        @pointermove="drag"
        @pointerup="stopDrag"
        @pointercancel="stopDrag"
        @lostpointercapture="stopDrag"
        @keydown="keydown(axis, $event)"
      />
    </div>
  </template>
</template>

<style>
.xz-overlay-viewport {
  scrollbar-width: none !important;
  scrollbar-gutter: auto !important;
}
.xz-overlay-viewport::-webkit-scrollbar {
  display: none !important;
  width: 0;
  height: 0;
}
.xz-scrollbar {
  position: absolute;
  z-index: 3;
  touch-action: none;
  user-select: none;
}
.xz-scrollbar--y {
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--space-3);
}
.xz-scrollbar--x {
  right: 0;
  bottom: 0;
  left: 0;
  height: var(--space-3);
}
.xz-scrollbar--y.has-cross-axis {
  bottom: var(--space-3);
}
.xz-scrollbar--x.has-cross-axis {
  right: var(--space-3);
}
.xz-scrollbar__thumb {
  position: absolute;
  border-radius: var(--radius-pill);
  background: color-mix(
    in srgb,
    var(--scrollbar-ink, var(--ink-muted)) 25%,
    transparent
  );
  cursor: default;
}
.xz-scrollbar--y .xz-scrollbar__thumb {
  top: 0;
  right: calc(var(--space-1) * 0.75);
  width: calc(var(--space-1) * 1.5);
}
.xz-scrollbar--x .xz-scrollbar__thumb {
  bottom: calc(var(--space-1) * 0.75);
  left: 0;
  height: calc(var(--space-1) * 1.5);
}
.xz-scrollbar__thumb:hover,
.xz-scrollbar__thumb.is-dragging {
  background: color-mix(
    in srgb,
    var(--scrollbar-ink, var(--ink-muted)) 50%,
    transparent
  );
}
.xz-scrollbar__thumb:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
