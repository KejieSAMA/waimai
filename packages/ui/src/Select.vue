<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  useAttrs,
  watch,
} from "vue";
import Icon from "./Icon.vue";
import ScrollBars from "./ScrollBars.vue";
import { useValue } from "./useValue";
import { selectPresentationKey } from "./selectContext";
import {
  matchSelectOption,
  moveSelectIndex,
  selectOptions,
} from "./selectOptions";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  modelValue?: string;
  defaultValue?: string;
  options: (string | { value: string; label: string })[];
  label?: string;
  error?: string;
  placeholder?: string;
  width?: number | string;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  blur: [event: FocusEvent];
  "update:modelValue": [value: string];
}>();
const attrs = useAttrs();
const generatedId = useId();
const id = computed(() => String(attrs.id ?? `xz-field-select-${generatedId}`));
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style as string | undefined,
}));
const controlAttrs = computed(() =>
  Object.fromEntries(
    Object.entries(attrs).filter(([key]) => !["class", "style"].includes(key)),
  ),
);
const native = ref<HTMLSelectElement>();
defineExpose({ focus: () => (trigger.value ?? native.value)?.focus() });
const dropdown = inject(selectPresentationKey, "native") === "dropdown";
const optionsList = computed(() =>
  selectOptions(props.options, props.placeholder),
);
const value = useValue(
  () => props.modelValue,
  props.defaultValue ??
    (props.placeholder ? "" : (optionsList.value[0]?.value ?? "")),
  (next) => emit("update:modelValue", next),
);
const selectedIndex = computed(() =>
  optionsList.value.findIndex((option) => option.value === value.value),
);
const selectedLabel = computed(
  () =>
    optionsList.value[selectedIndex.value]?.label ?? props.placeholder ?? "",
);
const widthStyle = computed(() =>
  props.width
    ? {
        width:
          typeof props.width === "number" ? `${props.width}px` : props.width,
      }
    : undefined,
);
const trigger = ref<HTMLButtonElement>(),
  popup = ref<HTMLElement>();
const viewport = ref<HTMLElement>(),
  content = ref<HTMLElement>();
const listboxId = `xz-select-${useId()}`;
const opened = ref(false),
  active = ref(-1);
const menuStyle = ref({ top: "0px", left: "0px", width: "0px", height: "0px" });
let typed = "",
  lastTypedAt = 0;

function placeMenu() {
  if (!trigger.value) return;
  const rect = trigger.value.getBoundingClientRect();
  const style = getComputedStyle(trigger.value);
  const gap = parseFloat(style.getPropertyValue("--space-2"));
  const padding = parseFloat(style.getPropertyValue("--space-1"));
  const rowHeight = parseFloat(style.getPropertyValue("--size-button-md"));
  const desired =
    Math.min(Math.max(1, optionsList.value.length), 6) * rowHeight +
    padding * 2;
  const below = window.innerHeight - rect.bottom - gap * 2;
  const above = rect.top - gap * 2;
  const upwards = below < desired && above > below;
  const height = Math.max(0, Math.min(desired, upwards ? above : below));
  const width = Math.min(rect.width, Math.max(0, window.innerWidth - gap * 2));
  menuStyle.value = {
    top: `${upwards ? rect.top - gap - height : rect.bottom + gap}px`,
    left: `${Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap))}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
}
function revealActive() {
  const row = content.value?.children[active.value] as HTMLElement | undefined;
  const target = viewport.value;
  if (!row || !target) return;
  if (row.offsetTop < target.scrollTop) target.scrollTop = row.offsetTop;
  else if (
    row.offsetTop + row.offsetHeight >
    target.scrollTop + target.clientHeight
  )
    target.scrollTop = row.offsetTop + row.offsetHeight - target.clientHeight;
}
async function openMenu(direction = 1) {
  if (props.disabled) return;
  active.value = selectedIndex.value;
  if (active.value < 0 && optionsList.value.length)
    active.value = direction < 0 ? optionsList.value.length - 1 : 0;
  placeMenu();
  opened.value = true;
  await nextTick();
  revealActive();
}
function closeMenu(focus = false) {
  opened.value = false;
  typed = "";
  if (focus) trigger.value?.focus({ preventScroll: true });
}
function choose(index: number) {
  const option = optionsList.value[index];
  if (!option || props.disabled) return;
  if (value.value !== option.value) value.value = option.value;
  closeMenu(true);
}
function toggleMenu() {
  if (opened.value) closeMenu();
  else void openMenu();
}
function outside(event: PointerEvent) {
  const target = event.target as Node;
  if (!trigger.value?.contains(target) && !popup.value?.contains(target))
    closeMenu();
}
function scrolled(event: Event) {
  if (!popup.value?.contains(event.target as Node)) closeMenu();
}
function keydown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (event.key === "Escape" && opened.value) {
    event.preventDefault();
    event.stopPropagation();
    closeMenu(true);
    return;
  }
  if (event.key === "Tab") {
    closeMenu();
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (opened.value) choose(active.value);
    else void openMenu();
    return;
  }
  if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    if (event.altKey && event.key === "ArrowUp" && opened.value) {
      closeMenu();
      return;
    }
    const direction = event.key === "ArrowUp" ? -1 : 1;
    if (!opened.value) void openMenu(direction);
    else
      active.value = moveSelectIndex(
        active.value,
        optionsList.value.length,
        direction,
      );
    if (event.key === "Home") active.value = optionsList.value.length ? 0 : -1;
    if (event.key === "End") active.value = optionsList.value.length - 1;
    void nextTick(revealActive);
    return;
  }
  if (
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    event.preventDefault();
    typed = Date.now() - lastTypedAt < 700 ? typed + event.key : event.key;
    lastTypedAt = Date.now();
    let index = matchSelectOption(optionsList.value, typed, active.value + 1);
    if (index < 0) {
      typed = event.key;
      index = matchSelectOption(optionsList.value, typed, active.value + 1);
    }
    if (index >= 0) {
      active.value = index;
      if (!opened.value) value.value = optionsList.value[index].value;
    }
  }
}
function removeListeners() {
  document.removeEventListener("pointerdown", outside, true);
  document.removeEventListener("scroll", scrolled, true);
  window.removeEventListener("resize", placeMenu);
}
watch(
  opened,
  (open) => {
    removeListeners();
    if (open) {
      document.addEventListener("pointerdown", outside, true);
      document.addEventListener("scroll", scrolled, true);
      window.addEventListener("resize", placeMenu);
    }
  },
  { flush: "post" },
);
watch(
  active,
  () => {
    if (opened.value) revealActive();
  },
  { flush: "post" },
);
watch(
  [optionsList, value],
  () => {
    if (opened.value) {
      active.value = selectedIndex.value;
      if (active.value < 0 && optionsList.value.length) active.value = 0;
      placeMenu();
      revealActive();
    }
  },
  { flush: "post" },
);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeMenu();
  },
);
onBeforeUnmount(removeListeners);
</script>

<template>
  <button
    @blur="emit('blur', $event)"
    v-if="dropdown"
    ref="trigger"
    v-bind="$attrs"
    :id="id"
    type="button"
    class="xz-select xz-select--dropdown body-md"
    :style="widthStyle"
    :disabled="disabled"
    :title="selectedLabel"
    :aria-invalid="!!error"
    :aria-describedby="
      [attrs['aria-describedby'], error ? id + '-error' : '']
        .filter(Boolean)
        .join(' ') || undefined
    "
    role="combobox"
    :aria-label="label || placeholder || '选择选项'"
    aria-haspopup="listbox"
    :aria-expanded="opened"
    :aria-controls="opened ? listboxId : undefined"
    :aria-activedescendant="
      opened && active >= 0 ? `${listboxId}-${active}` : undefined
    "
    @click="toggleMenu"
    @keydown="keydown"
  >
    <span v-if="label" class="xz-select__label body-md">{{ label }}</span>
    <span class="xz-select__value">{{ selectedLabel }}</span>
    <Icon name="chevron-down" :size="16" class="xz-select__chev" />
  </button>
  <label
    v-else
    v-bind="rootAttrs"
    class="xz-select"
    :for="id"
    :style="widthStyle"
  >
    <span v-if="label" class="xz-select__label body-md">{{ label }}</span>
    <select
      @blur="emit('blur', $event)"
      ref="native"
      v-bind="controlAttrs"
      :id="id"
      :name="String(attrs.name ?? '')"
      :aria-invalid="!!error"
      :aria-describedby="
        [attrs['aria-describedby'], error ? id + '-error' : '']
          .filter(Boolean)
          .join(' ') || undefined
      "
      v-model="value"
      class="xz-select__native body-md"
      :aria-label="label || placeholder"
      :disabled="disabled"
    >
      <option
        v-for="(option, index) in optionsList"
        :key="index + '-' + option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <Icon name="chevron-down" :size="16" class="xz-select__chev" />
  </label>
  <span
    v-if="error"
    :id="id + '-error'"
    class="xz-select-error body-sm"
    role="alert"
    >{{ error }}</span
  >
  <Teleport v-if="dropdown" to="body">
    <div v-if="opened" ref="popup" class="xz-select__menu" :style="menuStyle">
      <div
        :id="listboxId"
        ref="viewport"
        class="xz-select__options xz-overlay-viewport"
        role="listbox"
        :aria-label="label || placeholder || '选项'"
      >
        <div ref="content" class="xz-select__content">
          <div
            v-for="(option, index) in optionsList"
            :id="`${listboxId}-${index}`"
            :key="index + '-' + option.value"
            class="xz-select__option body-md"
            :class="{
              'is-active': active === index,
              'is-selected': selectedIndex === index,
            }"
            role="option"
            :aria-selected="selectedIndex === index"
            :title="option.label"
            @pointerdown.prevent
            @pointermove="active = index"
            @click="choose(index)"
          >
            <span class="xz-select__option-label">{{ option.label }}</span>
            <Icon v-if="selectedIndex === index" name="check" :size="16" />
          </div>
          <div v-if="!optionsList.length" class="xz-select__empty body-sm">
            暂无选项
          </div>
        </div>
      </div>
      <ScrollBars
        :target="viewport"
        :content="content"
        :label="label || '下拉选项'"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.xz-select-error {
  color: var(--danger);
}
.xz-select--dropdown {
  border: 0;
  text-align: left;
}
.xz-select--dropdown:disabled {
  cursor: not-allowed;
  color: var(--ink-muted);
}
.xz-select__value {
  flex: 1;
  min-width: 0;
  padding-right: var(--space-5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.xz-select__menu {
  position: fixed;
  z-index: 120;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  color: var(--ink);
  box-shadow: var(--shadow-float);
}
.xz-select__options {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.xz-select__content {
  position: relative;
}
.xz-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  box-sizing: border-box;
  height: var(--size-button-md);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.xz-select__option.is-active {
  background: var(--surface-hover);
}
.xz-select__option.is-selected {
  background: var(--brand-soft);
  color: var(--brand-text);
}
.xz-select__option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.xz-select__empty {
  display: flex;
  align-items: center;
  height: var(--size-button-md);
  padding: 0 var(--space-3);
  color: var(--ink-muted);
}
</style>
