# Performance notes

This library started as the `Squircle` component of a production e-commerce site. An INP audit of its home page counted **~700 squircles** mounted at once (product cards × responsive grids, badges, inputs, buttons), each one a `ResizeObserver` target writing `clip-path`. Every tap paid for that. These are the changes that came out of it, in order of impact.

## 1. Never route sizes through React state

The usual pattern (squircle.js, most hooks) is:

```
ResizeObserver → setState({ width, height }) → re-render → useMemo(path) → style={{ clipPath }}
```

Two problems:

- **Cost**: a resize of N elements re-renders N components.
- **Latency**: ResizeObserver callbacks run *after layout, before paint*. A `setState` there is not applied before paint: React schedules the render as a separate task. So the frame is painted with the **previous** clip-path, and the correct one lands a frame later. While an element grows, its right/bottom edge is cropped on every frame.

Here the observer callback computes the path and writes `el.style.clipPath` directly. `clip-path` is paint-only, so writing it from the callback can't trigger another layout or a ResizeObserver loop. The painted frame is always correct, and React is not involved after mount.

The site's benchmark measures this directly: it registers its own `ResizeObserver` *after* the libraries' observers (callbacks run in creation order), so its callback runs last before paint and sees exactly what is about to be painted. It compares the width encoded in the clip path with the element's width. Result with 1,000 elements over 40 resize frames: **0 % stale frames vs 100 %**.

## 2. One ResizeObserver for the page

N observers cost N registrations and N callback invocations per frame. One observer receives all entries in one callback. A `Map<Element, Instance>` dispatches them. `box: "border-box"` and `borderBoxSize` give the exact painted size (`contentRect` excludes padding, which is wrong for a clip).

## 3. No forced layout on mount

The first ResizeObserver notification for a newly observed element is delivered in the same frame, after layout and before paint. So there's no need to read `offsetWidth` in a layout effect (which forces a synchronous layout per element, or per batch). The first paint is already squircled; SSR HTML uses `border-radius` until then.

## 4. Shared path cache

Product grids are full of identical cards. Paths are cached by `width|height|radius|smoothing|corners|border` in a shared LRU (512 entries, hits move to the back). 300 cards of the same size compute one path. The last applied key is also kept per element, so unchanged sizes skip the DOM write entirely.

## 5. One element for borders

The original `SquircleCard` drew a border with three nested squircles (border colour + `padding: 1px`, an opaque middle layer, then content): three observed elements per card. Now:

- the element itself is clipped by the outer path;
- a `::before` covers it and is clipped by `path(evenodd, 'outer inner')` (a ring) with `background: var(--squircle-border)`.

One observed element, one cache lookup for both paths, and since the border is just a background, gradients work. The inner path is the squircle of the inset box with `radius - borderWidth` (the same approximation the nested version used; the error is invisible at border widths).

## 6. Faster path generation (and the WebAssembly detour)

`figma-squircle` builds the path with a tagged template, `toFixed(4)` on every number and a regex pass to collapse whitespace: **~5.5 µs** per path in Node 24.

Steps taken, measured with `pnpm bench` (200,000 distinct sizes, Apple M-series):

| Version | ns / path | vs figma-squircle |
|---|---:|---:|
| figma-squircle 1.1 | ~5,500 | 1× |
| Trig cached per smoothing value, plain string concatenation, 2 decimals | ~1,250 | 4.5× |
| **AssemblyScript → WASM**, ASCII bytes into linear memory + `TextDecoder` | **~490** | 11.3× |
| Same idea in JS: bytes into a reused `Uint8Array`, int32 digit formatting, constant divisors | **~500** | 11× |

Trigonometry only depends on the smoothing value; every corner is a linear scale of a unit corner, so `sin/cos/tan` run once per smoothing value, not per path.

The WASM build was the interesting part. It was 2.5× faster than the concatenating JS, and profiling showed why: most of the JS time went into turning ~70 floats per path into strings. The WASM version wrote digits as integers into a byte buffer and decoded once. Porting *that* to JS (`Math.round(v * 100) | 0`, divisions by literal `10`/`100` so V8 stays on int32 paths, `TextDecoder` over a reused buffer) closed the gap entirely.

So the library ships no WASM: same speed, no async instantiation, no binary to bundle, works in SSR and workers synchronously. The experiment stays in [`bench/wasm`](../bench/wasm) so anyone can reproduce it. In the browser the gain is smaller (Chrome: 760 ns vs 4,760 ns, 6.3×), and with the shared cache most elements don't build a path at all.

## 7. Optional: `settle`

For accordions and expanding cards (height changes every frame at a constant width), `settle: 120` reuses a path oversized to the next 256px bucket and writes the exact path once the height has been stable for 120 ms. Fewer writes, at the cost of square bottom corners *during* the motion (they're usually hidden by an `overflow: hidden` parent anyway). Off by default.

## 8. Optional: native `corner-shape`

Chromium 139+ supports `corner-shape: superellipse(k)`. With `native: true` and support detected, the library sets `border-radius` + `corner-shape` and does no JavaScript work at all; borders become real CSS borders. The superellipse is not the same curve as Figma's smoothing, so radius and exponent are mapped to look close, not identical. Off by default.

## Methodology

- `pnpm bench`: Node path micro-benchmark (warm-up, 200k distinct sizes so nothing is memoised by accident).
- Website benchmark: runs in your browser against the published `@squircle-js/react@1.3.0`. Mount is the median of 3 alternating rounds, with a quiet period between runs so neither library pays for the other's GC. Keep the tab visible: browsers throttle `requestAnimationFrame` in hidden tabs, which distorts timings (not the stale-frame count).
- `bench/browser.bench.mjs`: the same page in headless Chromium via Playwright, with `Performance.getMetrics` from the DevTools Protocol read at phase markers. That's main-thread CPU (`TaskDuration`, `ScriptDuration`, …), which a page cannot measure about itself.

Ideas not done yet, PRs welcome: skip clip updates for off-screen elements (IntersectionObserver), a CSS Paint Worklet (`mask: paint(squircle)`) renderer that runs off the main thread in Chromium.
