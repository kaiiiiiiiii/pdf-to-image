import { tanstackConfig } from "@tanstack/eslint-config";

const ignores = [
  "**/.output/**",
  "**/.nitro/**",
  "**/.tanstack/**",
  "**/node_modules/**",
  "eslint.config.js",
  "prettier.config.js",
  "scripts/**",
  "routeTree.gen.ts",
];

export default [{ ignores }, ...tanstackConfig];
