import js from "@eslint/js";
import ts from "typescript-eslint";
import vue from "eslint-plugin-vue";

const appRestrictions = (app, other) => ({
  files: [`${app}/**/*.{ts,vue}`],
  rules: {
    "no-restricted-imports": [
      "error",
      { patterns: [`**/${other}/**`, `@waimai/${other}*`] },
    ],
  },
});

export default ts.config(
  {
    ignores: [
      "design-system/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    rules: { "no-undef": "off" },
    languageOptions: {
      parserOptions: { parser: ts.parser, extraFileExtensions: [".vue"] },
    },
  },
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  appRestrictions("frontend", "mobile"),
  appRestrictions("mobile", "frontend"),
  {
    files: ["packages/ui/**/*.{ts,vue}", "packages/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["**/frontend/**", "**/mobile/**", "**/backend/**"] },
      ],
    },
  },
  {
    files: ["packages/shared/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", "window", "document", "localStorage"],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "*.vue",
            "**/ui/**",
            "**/frontend/**",
            "**/mobile/**",
            "**/backend/**",
          ],
        },
      ],
    },
  },
  ...["frontend", "mobile"].flatMap((app) =>
    ["user", "merchant", "admin"].map((role) => ({
      files: [`${app}/src/roles/${role}/**/*.{ts,vue}`],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              `**/${app === "frontend" ? "mobile" : "frontend"}/**`,
              ...["user", "merchant", "admin"]
                .filter((r) => r !== role)
                .map((r) => `**/${r}/**`),
            ],
          },
        ],
      },
    })),
  ),
);
