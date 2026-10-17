import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    minify: true,
    target: "es2020",
  },
  {
    entry: { react: "src/react.tsx" },
    format: ["esm", "cjs"],
    dts: true,
    minify: true,
    target: "es2020",
    external: ["react", "@fohz67/squircle"],
    banner: { js: '"use client";' },
  },
]);
