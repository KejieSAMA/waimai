import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  return {
    plugins: [vue()],
    base: "/mobile/",
    server: {
      host: "0.0.0.0",
      port: Number(env.MOBILE_PORT || 5174),
      strictPort: true,
      proxy: {
        "/api": { target: `http://127.0.0.1:${env.PORT || 3000}` },
        "/uploads": { target: `http://127.0.0.1:${env.PORT || 3000}` },
      },
    },
    preview: { host: "0.0.0.0", port: 5174 },
  };
});
