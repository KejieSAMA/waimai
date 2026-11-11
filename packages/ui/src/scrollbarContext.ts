import { inject, type InjectionKey } from "vue";

export const overlayScrollbarsKey: InjectionKey<boolean> =
  Symbol("overlayScrollbars");
export const useOverlayScrollbars = () => inject(overlayScrollbarsKey, false);
