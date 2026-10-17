/**
 * The only CSS the library needs. Injected once on first use of a border; also
 * shipped as `@fohz67/squircle/styles.css` for SSR (so the pre-hydration
 * fallback border shows on first paint).
 *
 * - Every selector is wrapped in `:where()` → zero specificity, so any utility
 *   class (`absolute`, `shadow-*`, …) wins.
 * - Before the first measurement the border is an inset box-shadow following
 *   `border-radius`: correct without JS, during SSR, and with `noscript`.
 * - Once measured, a single `::before` draws the ring with an even-odd
 *   `clip-path`, on top of children, without taking layout space (like an
 *   inset box-shadow). Any CSS background works as the border: gradients too.
 */
export const SQUIRCLE_CSS =
  ":where([data-squircle-border]){position:relative}" +
  ":where([data-squircle-border]:not([data-squircle-ready])){box-shadow:inset 0 0 0 var(--squircle-border-width) var(--squircle-border)}" +
  ":where([data-squircle-border][data-squircle-ready])::before{content:\"\";position:absolute;inset:0;z-index:1;pointer-events:none;" +
  "background:var(--squircle-border);clip-path:var(--squircle-ring)}";

let injected = false;

export function injectStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  if (document.querySelector("style[data-squircle]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-squircle", "");
  style.textContent = SQUIRCLE_CSS;
  document.head.appendChild(style);
}
