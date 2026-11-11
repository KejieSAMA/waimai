import type { InjectionKey } from "vue";
export const dialogPresentationKey: InjectionKey<"center" | "modal"> = Symbol(
  "dialog-presentation",
);
