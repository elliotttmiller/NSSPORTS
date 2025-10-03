import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
export default [
  {
    ...(() => {
      const { meta, configs, ...rest } = js;
      return rest;
    })(),
    languageOptions: {
      ...js.languageOptions,
      parserOptions: { ecmaVersion: 2021, sourceType: "module" },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["vite.config.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Disable obsolete rule for React 17+
    },
  },
];
