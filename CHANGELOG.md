# Changelog

## 1.0.0

First public release, extracted from a production e-commerce codebase.

- `<Squircle>` React component, API-compatible with `@squircle-js/react`
- `squircle(element, options)` framework-agnostic core
- `getSquirclePath()` path generator, output-compatible with `figma-squircle`
- Single shared `ResizeObserver`, shared LRU path cache, no React state
- Borders and gradient borders on a single element (`borderWidth`, `border`)
- Per-corner radii, `preserveSmoothing`, `settle`, experimental `native` (`corner-shape`)
