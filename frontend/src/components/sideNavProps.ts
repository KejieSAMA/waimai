import type { PropType } from "vue";
import type { NavGroup } from "@waimai/ui";
export const sideNavProps = {
  role: String,
  groups: { type: Array as PropType<NavGroup[]>, required: true as const },
  modelValue: String,
  brand: {
    type: [String, Boolean] as PropType<string | false>,
    default: "盟信",
  },
  subtitle: String,
};
