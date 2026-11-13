// PC 端把共享层的语义（按钮 variant、状态 tone、图标名）映射到 ant-design-vue。
// 共享层（@waimai/shared、@waimai/ui 的类型）保持不变，手机端继续使用原映射。
import type { Action } from "@waimai/shared";
import type { TagItem } from "@waimai/ui";

export type ButtonVariant = NonNullable<Action["variant"]>;

export interface AntButtonProps {
  type?: "primary" | "default" | "link" | "text" | "dashed";
  danger?: boolean;
  ghost?: boolean;
}

/** 与原 Button 的 variant 一一对应：text 是品牌色文字按钮，因此用 link 而不是灰色 text。 */
export function buttonProps(
  variant: ButtonVariant = "primary",
): AntButtonProps {
  switch (variant) {
    case "primary":
      return { type: "primary" };
    case "secondary":
      return { type: "primary", ghost: true };
    case "outline":
      return { type: "default" };
    case "text":
      return { type: "link" };
    case "danger":
      return { type: "primary", danger: true };
    case "danger-outline":
      return { type: "default", danger: true };
    case "danger-text":
      return { type: "link", danger: true };
  }
}

export type Tone = NonNullable<TagItem["tone"]>;

/** 状态色调 → a-tag 预设色。brand 对应方案 A 主色所在的 volcano 色板。 */
export function tagColor(tone: Tone | undefined): string | undefined {
  switch (tone) {
    case "brand":
      return "volcano";
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "info":
      return "processing";
    case "danger":
      return "error";
    case "accent":
      return "gold";
    default:
      return undefined;
  }
}
