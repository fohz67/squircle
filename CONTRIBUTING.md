# Contributing

Thanks for helping! The bar for changes here is simple: **correct shapes, and no slower**.

```bash
pnpm install
pnpm test        # must stay green, including parity with figma-squircle
pnpm dev         # website + playground, uses the library source through the workspace
pnpm bench       # path generation micro-benchmark
```

- Changes to `packages/squircle/src/path.ts` must keep the parity tests passing (same commands, ≤ 0.005px at default precision). Include `pnpm bench` numbers before/after in the PR.
- Changes to the engine (`core.ts`) should explain their effect on main-thread time; `pnpm bench:browser` (needs `pnpm site:build` and `pnpm --filter site preview --port 4173`) reports DevTools CPU metrics.
- Keep the library dependency-free.
- One topic per PR, with a test when behaviour changes.
