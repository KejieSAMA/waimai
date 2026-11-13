// 把 demo 依赖的 UMD 构建复制到 vendor/，页面用 classic script 加载，file:// 可直接打开。
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const out = join(root, "vendor");
mkdirSync(out, { recursive: true });

const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const plugins = [
  "advancedFormat",
  "customParseFormat",
  "localeData",
  "quarterOfYear",
  "weekOfYear",
  "weekYear",
  "weekday",
];
const files = [
  [join(pkgDir("vue"), "dist/vue.global.prod.js"), "vue.global.prod.js"],
  [join(pkgDir("dayjs"), "dayjs.min.js"), "dayjs.min.js"],
  ...plugins.map((p) => [join(pkgDir("dayjs"), `plugin/${p}.js`), `dayjs-${p}.js`]),
  [join(pkgDir("ant-design-vue"), "dist/antd-with-locales.min.js"), "antd.min.js"],
  [join(pkgDir("ant-design-vue"), "dist/reset.css"), "reset.css"],
];
for (const [from, name] of files) {
  copyFileSync(from, join(out, name));
  console.log(`vendor/${name}`);
}
