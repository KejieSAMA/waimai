import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { useAuth } from "./common/auth";
import { makeRouter } from "./router";
import { startDeviceRouting } from "./common/device";
import {
  overlayScrollbarsKey,
  selectPresentationKey,
  dialogPresentationKey,
} from "@waimai/ui";
import "@waimai/tokens/style.css";
import "./common/style.css";
const deviceRouting = startDeviceRouting();
if (import.meta.hot) import.meta.hot.dispose(deviceRouting.stop);
if (!deviceRouting.redirected) {
  const app = createApp(App);
  app.onUnmount(deviceRouting.stop);
  app.provide(overlayScrollbarsKey, true);
  app.provide(selectPresentationKey, "dropdown");
  app.provide(dialogPresentationKey, "modal");
  app.use(createPinia());
  app.onUnmount(useAuth().stop);
  app.use(makeRouter());
  app.mount("#app");
}
