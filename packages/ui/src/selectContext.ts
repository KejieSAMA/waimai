import type { InjectionKey } from "vue";

export const selectPresentationKey: InjectionKey<"native" | "dropdown"> =
  Symbol("selectPresentation");
