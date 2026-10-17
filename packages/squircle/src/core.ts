import { getSquirclePath } from "./path";
import { injectStyles } from "./styles";

export interface SquircleOptions {
  /** Corner radius in px. */
  cornerRadius?: number;
  topLeftCornerRadius?: number;
  topRightCornerRadius?: number;
  bottomRightCornerRadius?: number;
  bottomLeftCornerRadius?: number;
  /** 0 → 1. Default: 0.6 (iOS). */
  cornerSmoothing?: number;
  preserveSmoothing?: boolean;
  /**
   * Border width in px. The border is drawn by a single `::before` ring that
   * follows the squircle exactly, without nested wrapper elements.
   */
  borderWidth?: number;
  /** Any CSS `background` value: a color, a gradient, an image… Default: currentColor. */
  border?: string;
  /** Fixed size: skips observation entirely. */
  width?: number;
  height?: number;
  /**
   * While the height keeps changing at a constant width (accordions, expanding
   * cards), reuse one oversized path and write the exact one once the size has
   * been stable for `settle` ms. Trades exact bottom corners during the motion
   * for fewer path writes. Default: 0 (disabled).
   */
  settle?: number;
  /**
   * Use native CSS `corner-shape: superellipse()` where supported (Chromium 139+).
   * Zero JS work, real CSS border. The curve is an approximation of Figma
   * smoothing, not an exact match. Default: false.
   */
  native?: boolean;
}

export interface SquircleHandle {
  update(options: SquircleOptions): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Path cache, shared by every instance. LRU: hits are moved to the back, the
// oldest entry is evicted. Same-size cards are extremely common, so most
// instances never compute a path.
// ---------------------------------------------------------------------------
const CACHE_LIMIT = 512;
const pathCache = new Map<string, string>();

function cached(key: string, build: () => string): string {
  let v = pathCache.get(key);
  if (v !== undefined) {
    pathCache.delete(key);
    pathCache.set(key, v);
    return v;
  }
  v = build();
  if (pathCache.size >= CACHE_LIMIT) pathCache.delete(pathCache.keys().next().value!);
  pathCache.set(key, v);
  return v;
}

/** @internal exposed for tests / devtools */
export function _cacheSize() {
  return pathCache.size;
}

// ---------------------------------------------------------------------------
// One ResizeObserver for the whole page.
//
// ResizeObserver callbacks run after layout and before paint, so the first
// notification (delivered for every newly observed element) sets the clip
// before the element is ever painted: no `offsetWidth` read, no forced
// synchronous layout. `clip-path` is paint-only, so writing it from the
// callback cannot cause a resize loop.
// ---------------------------------------------------------------------------
const instances = new Map<Element, Instance>();
let ro: ResizeObserver | null = null;

function observer(): ResizeObserver {
  return (ro ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const inst = instances.get(entry.target);
      if (!inst) continue;
      const box = entry.borderBoxSize?.[0];
      if (box) inst.resize(box.inlineSize, box.blockSize);
      else {
        const el = entry.target as HTMLElement;
        inst.resize(el.offsetWidth, el.offsetHeight);
      }
    }
  }));
}

let nativeSupport: boolean | undefined;
function supportsNative() {
  return (nativeSupport ??= typeof CSS !== "undefined" && CSS.supports("corner-shape", "superellipse(2)"));
}

const SETTLE_STEP = 256;

class Instance {
  private w = -1;
  private h = -1;
  private lastClip = "";
  private settling = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private observed = false;
  private nativeMode = false;
  private nativeBorder = false;

  constructor(
    private el: HTMLElement,
    private o: SquircleOptions,
  ) {
    this.configure();
  }

  update(next: SquircleOptions) {
    const prev = this.o;
    const o = { ...prev, ...next };
    if (shallowEqual(prev, o)) return;
    this.o = o;
    this.lastClip = "";
    this.configure();
    if (this.w > 0 && this.h > 0) this.write(this.w, this.h);
  }

  private configure() {
    const { el, o } = this;
    const bw = o.borderWidth ?? 0;
    const st = el.style;

    this.nativeMode = !!o.native && supportsNative();
    if (this.nativeMode) {
      this.unobserve();
      st.clipPath = "";
      el.removeAttribute("data-squircle-border");
      st.setProperty("corner-shape", `superellipse(${nativeExponent(o.cornerSmoothing ?? 0.6)})`);
      st.borderRadius = radiusCss(o, (o.cornerSmoothing ?? 0.6) * 0.5 + 1);
      if (bw > 0) {
        st.border = `${bw}px solid ${o.border ?? "currentColor"}`;
        this.nativeBorder = true;
      } else if (this.nativeBorder) {
        st.border = "";
        this.nativeBorder = false;
      }
      return;
    }

    st.removeProperty("corner-shape");
    if (this.nativeBorder) {
      st.border = "";
      this.nativeBorder = false;
    }
    if (bw > 0) {
      injectStyles();
      el.setAttribute("data-squircle-border", "");
      st.setProperty("--squircle-border-width", bw + "px");
      st.setProperty("--squircle-border", o.border ?? "currentColor");
    } else if (el.hasAttribute("data-squircle-border")) {
      el.removeAttribute("data-squircle-border");
      st.removeProperty("--squircle-border-width");
      st.removeProperty("--squircle-border");
      st.removeProperty("--squircle-ring");
    }

    if (o.width !== undefined && o.height !== undefined) {
      this.unobserve();
      this.resize(o.width, o.height);
    } else if (!this.observed) {
      this.observed = true;
      instances.set(el, this);
      observer().observe(el, { box: "border-box" });
    }
  }

  resize(width: number, height: number) {
    if (this.nativeMode) return;
    const prevW = this.w;
    const prevH = this.h;
    if (prevW === width && prevH === height) return;
    this.w = width;
    this.h = height;

    if (width <= 0 || height <= 0) {
      clearTimeout(this.timer);
      this.el.style.clipPath = "";
      this.el.removeAttribute("data-squircle-ready");
      this.lastClip = "";
      return;
    }

    const settle = this.o.settle ?? 0;
    if (settle > 0 && prevW === width && prevH > 0) {
      // Height is moving: draw an oversized path (bottom corners fall outside
      // the box) and only write it when it changes bucket.
      clearTimeout(this.timer);
      this.settling = true;
      this.write(width, Math.ceil(height / SETTLE_STEP) * SETTLE_STEP + SETTLE_STEP);
      this.timer = setTimeout(() => {
        this.settling = false;
        this.write(this.w, this.h);
      }, settle);
      return;
    }
    if (this.settling) {
      clearTimeout(this.timer);
      this.settling = false;
    }
    this.write(width, height);
  }

  private write(width: number, height: number) {
    const o = this.o;
    const bw = o.borderWidth ?? 0;
    const r = o.cornerRadius ?? 0;
    const s = o.cornerSmoothing ?? 0.6;
    const key = width + "|" + height + "|" + r + "|" + s + "|" + cornerKey(o) + "|" + bw;
    if (key === this.lastClip) return;
    this.lastClip = key;

    const outer = cached("o" + key, () => getSquirclePath({ ...o, width, height, cornerSmoothing: s }));
    const st = this.el.style;
    st.clipPath = "path('" + outer + "')";

    if (bw > 0) {
      const ring = cached("r" + key, () => {
        const inner = getSquirclePath({
          width: width - 2 * bw,
          height: height - 2 * bw,
          cornerRadius: Math.max(0, r - bw),
          topLeftCornerRadius: inset(o.topLeftCornerRadius, bw),
          topRightCornerRadius: inset(o.topRightCornerRadius, bw),
          bottomRightCornerRadius: inset(o.bottomRightCornerRadius, bw),
          bottomLeftCornerRadius: inset(o.bottomLeftCornerRadius, bw),
          cornerSmoothing: s,
          preserveSmoothing: o.preserveSmoothing,
          x: bw,
          y: bw,
        });
        return "path(evenodd, '" + outer + " " + inner + "')";
      });
      st.setProperty("--squircle-ring", ring);
    }
    this.el.setAttribute("data-squircle-ready", "");
  }

  private unobserve() {
    if (!this.observed) return;
    this.observed = false;
    instances.delete(this.el);
    ro?.unobserve(this.el);
  }

  destroy() {
    clearTimeout(this.timer);
    this.unobserve();
  }
}

function inset(r: number | undefined, bw: number) {
  return r === undefined ? undefined : Math.max(0, r - bw);
}

function cornerKey(o: SquircleOptions) {
  if (
    o.topLeftCornerRadius === undefined &&
    o.topRightCornerRadius === undefined &&
    o.bottomRightCornerRadius === undefined &&
    o.bottomLeftCornerRadius === undefined
  )
    return "";
  return `${o.topLeftCornerRadius},${o.topRightCornerRadius},${o.bottomRightCornerRadius},${o.bottomLeftCornerRadius},${o.preserveSmoothing ? 1 : 0}`;
}

// Figma smoothing extends each corner over (1 + s) × r. A superellipse corner
// stays within its radius, so the native radius is scaled up a little and the
// exponent rises with smoothing. Visually close, not geometrically identical.
function nativeExponent(s: number) {
  return (1 + s * 0.8).toFixed(2);
}

function radiusCss(o: SquircleOptions, k: number) {
  const r = o.cornerRadius ?? 0;
  const c = (v: number | undefined) => (v ?? r) * k + "px";
  return `${c(o.topLeftCornerRadius)} ${c(o.topRightCornerRadius)} ${c(o.bottomRightCornerRadius)} ${c(o.bottomLeftCornerRadius)}`;
}

function shallowEqual(a: SquircleOptions, b: SquircleOptions) {
  const ka = Object.keys(a) as (keyof SquircleOptions)[];
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

/**
 * Turn any element into a squircle. Framework-agnostic.
 *
 * ```ts
 * const sq = squircle(el, { cornerRadius: 24, cornerSmoothing: 1, borderWidth: 1, border: "#e5e5e5" });
 * sq.update({ cornerRadius: 32 });
 * sq.destroy();
 * ```
 */
export function squircle(el: HTMLElement, options: SquircleOptions = {}): SquircleHandle {
  const existing = instances.get(el);
  if (existing) {
    existing.update(options);
    return existing;
  }
  return new Instance(el, options);
}
