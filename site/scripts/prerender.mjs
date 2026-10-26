// Renders the page to static HTML after `vite build`, so crawlers and
// link previews get the full content without running JavaScript.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const ssrOut = root + "dist-ssr";

await build({
  root,
  logLevel: "warn",
  build: { ssr: "src/entry-server.tsx", outDir: ssrOut, emptyOutDir: true },
  ssr: { noExternal: ["@fohz67/squircle", "@squircle-js/react", "figma-squircle"] },
});

const { render } = await import(pathToFileURL(ssrOut + "/entry-server.js").href);
const file = root + "dist/index.html";
const html = readFileSync(file, "utf8");
if (!html.includes('<div id="root"></div>')) throw new Error("root placeholder not found in dist/index.html");
writeFileSync(file, html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`));
rmSync(ssrOut, { recursive: true, force: true });
console.log("prerendered dist/index.html");
