// Path generation micro-benchmark: figma-squircle vs ours (JS) vs WASM.
// Run: pnpm bench   (from the repo root or this folder)
import { readFileSync, existsSync } from "node:fs";
import { getSvgPath } from "figma-squircle";
import { getSquirclePath } from "@fohz67/squircle";

const N = 200_000;
// Realistic, non-repeating sizes so nothing is accidentally cached by the JIT.
const sizes = Array.from({ length: N }, (_, i) => [200 + (i % 997) * 0.37, 80 + (i % 389) * 0.53]);

function bench(name, fn) {
  for (let i = 0; i < 20_000; i++) fn(sizes[i][0], sizes[i][1]); // warm-up
  globalThis.gc?.();
  let sink = 0;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) sink += fn(sizes[i][0], sizes[i][1]).length;
  const ms = performance.now() - t0;
  return { name, "ns / path": Math.round((ms * 1e6) / N), "paths / ms": Math.round(N / ms), sink };
}

const rows = [
  bench("figma-squircle 1.1 (used by squircle.js)", (w, h) => getSvgPath({ width: w, height: h, cornerRadius: 22, cornerSmoothing: 1 })),
  bench("@fohz67/squircle (JS)", (w, h) => getSquirclePath({ width: w, height: h, cornerRadius: 22, cornerSmoothing: 1 })),
];

const wasmFile = new URL("./wasm/build/squircle.wasm", import.meta.url);
if (existsSync(wasmFile)) {
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmFile), { env: { abort() {} } });
  const { path, outPtr, memory } = instance.exports;
  const ptr = outPtr();
  const dec = new TextDecoder();
  // TextDecoder over a view (no copy) is the cheapest way back to a JS string.
  rows.push(bench("AssemblyScript → WASM (+ TextDecoder)", (w, h) => dec.decode(new Uint8Array(memory.buffer, ptr, path(w, h, 22, 1)))));
  // Latin-1 fast path
  rows.push(
    bench("AssemblyScript → WASM (+ fromCharCode)", (w, h) => {
      const len = path(w, h, 22, 1);
      return String.fromCharCode.apply(null, new Uint8Array(memory.buffer, ptr, len));
    }),
  );
} else {
  console.log("(WASM not built, run `pnpm build:wasm` in bench/ to include it)\n");
}

const base = rows[0]["ns / path"];
console.table(rows.map(({ sink, ...r }) => ({ ...r, "vs figma-squircle": (base / r["ns / path"]).toFixed(2) + "×" })));
