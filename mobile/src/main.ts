import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { makeRouter } from "./router";
import { startDeviceRouting } from "./common/device";
import "@waimai/tokens/style.css";
import "./common/style.css";
const deviceRouting = startDeviceRouting();
if (import.meta.hot) import.meta.hot.dispose(deviceRouting.stop);
if (!deviceRouting.redirected) {
  const app = createApp(App);
  app.onUnmount(deviceRouting.stop);
  app.use(createPinia());
  app.use(makeRouter());
  app.mount("#app");
}
