import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, normalizePath, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

const workspaceEntries = new Set(
  ["ui", "shared", "tokens"].map((name) =>
    normalizePath(
      fileURLToPath(
        new URL(`../packages/${name}/src/index.ts`, import.meta.url),
      ),
    ),
  ),
);
const workspaceEntryReload: Plugin = {
  name: "waimai-workspace-entry-reload",
  configureServer(server) {
    server.watcher.add([...workspaceEntries]);
  },
  handleHotUpdate({ file, server }) {
    if (!workspaceEntries.has(normalizePath(file))) return;
    server.moduleGraph.invalidateAll();
    server.ws.send({ type: "full-reload" });
    return [];
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  return {
    plugins: [vue(), workspaceEntryReload],
    base: "/",
    server: {
      host: "0.0.0.0",
      port: Number(env.FRONTEND_PORT || 13599),
      strictPort: true,
      proxy: {
        "/api": { target: `http://127.0.0.1:${env.PORT || 3000}` },
        "/uploads": { target: `http://127.0.0.1:${env.PORT || 3000}` },
        "/mobile": {
          target: `http://127.0.0.1:${env.MOBILE_PORT || 5174}`,
          ws: true,
        },
      },
    },
    preview: { host: "0.0.0.0", port: 13599 },
  };
});
