<div align="center">

# Squircle

**Figma-accurate squircles for the web, built for pages that render hundreds of them.**

One `ResizeObserver` for the whole page · zero React re-renders · never a frame behind · borders and gradient borders on a single element · 3.9 KB gzip with React · zero dependencies

[![npm](https://img.shields.io/npm/v/@fohz67/squircle?color=000&label=npm)](https://www.npmjs.com/package/@fohz67/squircle)
[![CI](https://github.com/fohz67/squircle/actions/workflows/ci.yml/badge.svg)](https://github.com/fohz67/squircle/actions/workflows/ci.yml)
[![minzipped size](https://img.shields.io/bundlejs/size/@fohz67/squircle?color=000&label=size)](https://bundlejs.com/?q=@fohz67/squircle)
[![license](https://img.shields.io/github/license/fohz67/squircle?color=000)](LICENSE)

[Website & playground](https://fohz67.github.io/squircle/) · [npm](https://www.npmjs.com/package/@fohz67/squircle) · [Performance notes](docs/PERFORMANCE.md)

</div>

---

```bash
npm i @fohz67/squircle
```

```tsx
import { Squircle } from "@fohz67/squircle/react";

<Squircle cornerRadius={24} cornerSmoothing={1} className="bg-white p-6">
  Hello squircle
</Squircle>;
```

## Why

`border-radius` joins a circular arc to a straight edge with a sudden jump in curvature. Corner smoothing (what Figma, iOS and macOS use) ramps the curvature in gradually. That's the "squircle".

The browser can't draw that with CSS yet (except `corner-shape` in recent Chromium), so libraries compute an SVG path and apply it as `clip-path`. That part is easy. **Doing it for 700 elements on a product listing without hurting interaction latency is the hard part**, and it's why this library exists: it was born in a production e-commerce site where every card, badge, input and button is a squircle.

## Features

- **Same API as `@squircle-js/react`**: `cornerRadius`, `cornerSmoothing`, `asChild`, `width`, `height`, `defaultWidth`, `defaultHeight`. Migration is an import change.
- **Borders**: `borderWidth` + `border`. One element, the ring follows the curve exactly. `border` accepts any CSS background: colors, gradients, images, CSS variables.
- **Per-corner radii** with Figma's budget distribution.
- **Vanilla core**: `squircle(element, options)` for Vue, Svelte, Solid, web components, plain HTML.
- **Pure path function**: `getSquirclePath()` for SVG, canvas, Node, workers. Output matches `figma-squircle` within 0.005px.
- **SSR-safe**: server HTML is a regular rounded rectangle until the shape is measured.
- **Native mode (experimental)**: `native` uses CSS `corner-shape: superellipse()` where supported, with no JavaScript work.

## Benchmarks

Measured against `@squircle-js/react@1.3.0` with the same props on the same page. Run them yourself on the [website](https://fohz67.github.io/squircle/#benchmark) or with `pnpm bench` / `pnpm --filter bench bench:browser`.

**1,000 squircles, Chromium (new headless), Apple M-series, median of 3**. CPU time comes from Chrome DevTools `Performance.getMetrics`:

| | @fohz67/squircle | @squircle-js/react | |
|---|---:|---:|---|
| Resize (40 frames), main-thread total | **249 ms** | 523 ms | 2.1× less |
| Resize, JavaScript only | **83 ms** | 363 ms | 4.4× less |
| Resize, frames painted with a stale shape | **0 %** | 100 % | always in sync |
| Mount, main-thread total | **15 ms** | 26 ms | 1.7× less |
| Mount, first paint already squircled | **yes** | no | |
| Path generation, in browser | **760 ns** | 4,760 ns | 6.3× faster |
| Path generation, Node 24 | **~500 ns** | ~5,500 ns | 11× faster |

"Stale shape" is checked right before each paint, by a `ResizeObserver` registered after the libraries' own: it compares the width encoded in the element's `clip-path` with the element's actual width. squircle.js stores sizes in React state, so the new path lands one render (one frame) after the resize. While a card grows, its right edge is cropped every frame.

### What's different under the hood

| | @fohz67/squircle | @squircle-js/react 1.3 |
|---|---|---|
| ResizeObservers for N elements | **1** | N |
| `window` resize listeners | **0** | N |
| React re-render on resize | **none** | every element |
| Path cache | **shared LRU** (identical cards share one path) | per-component `useMemo` |
| Redundant `clip-path` writes | **skipped** | every render |
| Borders | **1 element, solid or gradient** | not supported |
| Per-corner radii / ref forwarding | **yes / yes** | no / no |
| Runtime dependencies | **0** | 2 |

Details, methodology and the WebAssembly experiment: **[docs/PERFORMANCE.md](docs/PERFORMANCE.md)**.

## Usage

### React

```tsx
import { Squircle } from "@fohz67/squircle/react";

// Plain
<Squircle cornerRadius={22} cornerSmoothing={1} className="bg-white">…</Squircle>

// Border: one element, one observer
<Squircle cornerRadius={22} cornerSmoothing={1} borderWidth={1} border="#e4e4e7" className="bg-white">…</Squircle>

// Gradient border
<Squircle cornerRadius={28} borderWidth={3} border="linear-gradient(135deg, #0a6cf0, #18b4cf, #8b5cf6)">…</Squircle>

// Your own element (props, className, style, handlers and refs are merged)
<Squircle asChild cornerRadius={14} cornerSmoothing={1}>
  <a href="/checkout" className="btn">Checkout</a>
</Squircle>

// Per corner
<Squircle topLeftCornerRadius={40} topRightCornerRadius={8} bottomRightCornerRadius={40} bottomLeftCornerRadius={8} />

// Known size: no observation at all
<Squircle width={48} height={48} cornerRadius={14} />
```

`ref` is forwarded to the DOM element. The component is a client component (`"use client"` is included).

### Vanilla

```ts
import { squircle } from "@fohz67/squircle";

const handle = squircle(document.querySelector(".card")!, {
  cornerRadius: 24,
  cornerSmoothing: 1,
  borderWidth: 1,
  border: "#e4e4e7",
});

handle.update({ cornerRadius: 32 }); // merges with previous options
handle.destroy();
```

### Path only

```ts
import { getSquirclePath } from "@fohz67/squircle";

const d = getSquirclePath({ width: 200, height: 120, cornerRadius: 24, cornerSmoothing: 0.6 });
// → <path d={d} />, Path2D, clip-path: path('…'), etc.
```

### SSR

Server HTML is a rounded rectangle with the same `border-radius`, and borders render as an inset `box-shadow`, so nothing looks broken before hydration. The tiny stylesheet the border needs is injected at runtime; to have the border fallback on the very first paint, import it once:

```ts
import "@fohz67/squircle/styles.css"; // 375 bytes
```

## API

### `<Squircle>` props / `squircle()` options

| Option | Type | Default | |
|---|---|---|---|
| `cornerRadius` | `number` | `0` | Radius in px |
| `topLeftCornerRadius` … `bottomLeftCornerRadius` | `number` | `cornerRadius` | Per-corner override |
| `cornerSmoothing` | `number` | `0.6` | `0` = plain rounded rect, `0.6` = iOS, `1` = max |
| `preserveSmoothing` | `boolean` | `false` | Keep smoothing when the corner lacks room (Figma behaviour) |
| `borderWidth` | `number` | `0` | Border width in px, drawn inside the box |
| `border` | `string` | `currentColor` | Any CSS `background` value |
| `width`, `height` | `number` | | Fixed size: skips observation |
| `settle` | `number` (ms) | `0` | During height animations at constant width, reuse an oversized path and write the exact one after `settle` ms of stability |
| `native` | `boolean` | `false` | Use CSS `corner-shape` where supported (approximate curve, real CSS border) |
| `asChild` | `boolean` | `false` | React only: render the child element |
| `defaultWidth`, `defaultHeight` | `number` | | React only: initial inline size |

### `getSquirclePath(options)`

`width`, `height`, the radius and smoothing options above, plus `x`, `y` (offset) and `precision` (decimals, default `2`).

## Notes

- **The border is drawn inside the box**, over the edge of the content, like `box-shadow: inset`. Add padding if your content touches the edges. Positioned children with `z-index: 1` or more paint over it.
- `clip-path` also clips `box-shadow` and `outline`. For an outer shadow, wrap the squircle and use `filter: drop-shadow(…)` on the wrapper.
- `::before` is used for the border: on elements that already use their own `::before`, put the border on a wrapper.

## Migrating

**From `@squircle-js/react`**: change the import. `SquircleNoScript` isn't needed, the server output already has `border-radius`.

**From nested "border" wrappers** (an outer squircle with a background and `padding: 1px` around an inner squircle): replace the whole stack with one element and `borderWidth={1} border="…"`. That turns each bordered card from 3 observed elements into 1.

## Development

```bash
pnpm install
pnpm test           # vitest: parity with figma-squircle (1,000+ fuzzed cases), engine, React
pnpm dev            # website on http://localhost:5173
pnpm bench          # Node: path generation, figma-squircle vs JS vs WASM
```

Repo layout: `packages/squircle` (the library), `site` (website, deployed to GitHub Pages), `bench` (Node + headless-browser benchmarks, AssemblyScript experiment).

## Credits

Corner-smoothing geometry from Figma's [“Desperately seeking squircles”](https://www.figma.com/blog/desperately-seeking-squircles/) and the reference implementation [figma-squircle](https://github.com/phamfoo/figma-squircle) (MIT) by Tien Pham. React API modelled after [squircle.js](https://squircle.js.org) (MIT) by Antoni Silvestrovic, so switching is painless.

## License

[MIT](LICENSE) © fohz67
