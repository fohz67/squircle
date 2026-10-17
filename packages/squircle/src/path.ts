/**
 * Squircle (Figma "corner smoothing") SVG path generator.
 *
 * Geometry follows Figma's published construction (see "Desperately seeking
 * squircles", Daniel Furse) and is output-compatible with `figma-squircle`,
 * but is written for throughput:
 *   - trigonometry depends only on the smoothing value, so it is computed once
 *     per smoothing value and every corner is a linear scale of it;
 *   - the path is written as ASCII bytes into one reusable buffer with integer
 *     digit formatting (no template tag, no regex pass, no float-to-string);
 *   - an optional (x, y) offset lets the same function draw inset paths, which
 *     is what the border ring uses.
 */

export interface CornerRadii {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export interface SquirclePathOptions {
  width: number;
  height: number;
  /** Radius applied to every corner not overridden below. Default: 0. */
  cornerRadius?: number;
  topLeftCornerRadius?: number;
  topRightCornerRadius?: number;
  bottomRightCornerRadius?: number;
  bottomLeftCornerRadius?: number;
  /** 0 = plain rounded rectangle, 0.6 = iOS, 1 = maximum. Default: 0.6. */
  cornerSmoothing?: number;
  /**
   * When a corner has no room for the full smoothing, keep the smoothing and
   * squeeze the curve instead of reducing smoothing (Figma's behaviour).
   */
  preserveSmoothing?: boolean;
  /** Translate the path. Used for inset (border) paths. Default: 0. */
  x?: number;
  y?: number;
  /** Decimal places in the output. Default: 2 (≤ 0.005px error). */
  precision?: number;
}

interface CornerParams {
  a: number;
  b: number;
  c: number;
  d: number;
  p: number;
  arc: number;
  r: number;
}

const DEG = Math.PI / 180;

// Unit-radius coefficients per smoothing value. Bounded: smoothing values are
// almost always a handful of design-system constants.
interface Unit {
  arc: number;
  c: number;
  d: number;
}
const unitCache = new Map<number, Unit>();

function unitFor(s: number): Unit {
  let u = unitCache.get(s);
  if (u === undefined) {
    const arcMeasure = 90 * (1 - s);
    const arc = Math.sin((arcMeasure / 2) * DEG) * Math.SQRT2;
    const p3ToP4 = Math.tan(((90 - arcMeasure) / 4) * DEG);
    const beta = 45 * s * DEG;
    const c = p3ToP4 * Math.cos(beta);
    const d = c * Math.tan(beta);
    u = { arc, c, d };
    if (unitCache.size > 64) unitCache.clear();
    unitCache.set(s, u);
  }
  return u;
}

function cornerParams(r: number, smoothing: number, preserve: boolean, budget: number): CornerParams {
  if (r <= 0) return { a: 0, b: 0, c: 0, d: 0, p: 0, arc: 0, r: 0 };

  let s = smoothing;
  let p = (1 + s) * r;
  if (!preserve) {
    const maxS = budget / r - 1;
    if (s > maxS) s = maxS < 0 ? 0 : maxS;
    if (p > budget) p = budget;
  }

  const u = unitFor(s);
  const arc = u.arc * r;
  const c = u.c * r;
  const d = u.d * r;
  let b = (p - arc - c - d) / 3;
  let a = 2 * b;

  if (preserve && p > budget) {
    const p1ToP3Max = budget - d - arc - c;
    const maxB = p1ToP3Max - p1ToP3Max / 6;
    if (b > maxB) b = maxB;
    a = p1ToP3Max - b;
    p = budget;
  }

  return { a, b, c, d, p, arc, r };
}

/** Figma's budget distribution for corners with different radii. */
function distribute(radii: CornerRadii, width: number, height: number) {
  const radius: Record<keyof CornerRadii, number> = { ...radii };
  const budget: Record<keyof CornerRadii, number> = { topLeft: -1, topRight: -1, bottomRight: -1, bottomLeft: -1 };
  const order = (Object.keys(radius) as (keyof CornerRadii)[]).sort((k1, k2) => radius[k2] - radius[k1]);

  for (const corner of order) {
    const r = radius[corner];
    let min = Infinity;
    for (const [adj, side] of ADJACENT[corner]) {
      const adjR = radius[adj];
      let v: number;
      if (r === 0 && adjR === 0) v = 0;
      else {
        const len = side === 0 ? width : height;
        v = budget[adj] >= 0 ? len - budget[adj] : (r / (r + adjR)) * len;
      }
      if (v < min) min = v;
    }
    budget[corner] = min;
    radius[corner] = Math.min(r, min);
  }
  return { radius, budget };
}

// [adjacent corner, side] where side 0 = horizontal (width), 1 = vertical (height)
const ADJACENT: Record<keyof CornerRadii, [keyof CornerRadii, 0 | 1][]> = {
  topLeft: [
    ["topRight", 0],
    ["bottomLeft", 1],
  ],
  topRight: [
    ["topLeft", 0],
    ["bottomRight", 1],
  ],
  bottomLeft: [
    ["bottomRight", 0],
    ["topLeft", 1],
  ],
  bottomRight: [
    ["bottomLeft", 0],
    ["topRight", 1],
  ],
};

// Path text is written as ASCII bytes into one reusable buffer and decoded
// once. Concatenating ~70 float strings is what dominates a naive generator;
// writing integer digits by hand is much faster, and is the trick that made
// the WASM experiment look good in the first place (see docs/PERFORMANCE.md).
const buf = new Uint8Array(2048);
const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;
let pos = 0;
let scale = 100;
let digits = 2;

function cmd(c: number) {
  buf[pos++] = 32;
  buf[pos++] = c;
}

// Int32 arithmetic (`| 0`) with constant divisors keeps V8 on its integer
// fast paths (division by a literal becomes a multiply). Coordinates up to
// ±21,474,836px fit in int32 at 2 decimals, i.e. any real element.
function num(v: number) {
  if (digits !== 2) return numN(v);
  buf[pos++] = 32;
  let n = Math.round(v * 100) | 0;
  if (n < 0) {
    buf[pos++] = 45; // "-"
    n = -n;
  }
  let ip = (n / 100) | 0;
  const fp = n - ip * 100;
  if (ip < 10) buf[pos++] = 48 + ip;
  else if (ip < 100) {
    buf[pos++] = 48 + ((ip / 10) | 0);
    buf[pos++] = 48 + (ip % 10);
  } else if (ip < 1000) {
    buf[pos++] = 48 + ((ip / 100) | 0);
    buf[pos++] = 48 + (((ip / 10) | 0) % 10);
    buf[pos++] = 48 + (ip % 10);
  } else {
    let len = 4;
    for (let t = (ip / 10000) | 0; t > 0; t = (t / 10) | 0) len++;
    for (let i = pos + len - 1; i >= pos; i--) {
      buf[i] = 48 + (ip % 10);
      ip = (ip / 10) | 0;
    }
    pos += len;
  }
  if (fp === 0) return;
  buf[pos++] = 46; // "."
  const tens = (fp / 10) | 0;
  const units = fp - tens * 10;
  buf[pos++] = 48 + tens;
  if (units) buf[pos++] = 48 + units;
}

/** Any precision: generic but slower. */
function numN(v: number) {
  buf[pos++] = 32;
  let n = Math.round(v * scale);
  if (n < 0) {
    buf[pos++] = 45;
    n = -n;
  }
  let ip = Math.floor(n / scale);
  let fp = n - ip * scale;
  let len = 1;
  for (let t = ip; t >= 10; t = Math.floor(t / 10)) len++;
  for (let i = pos + len - 1; i >= pos; i--) {
    buf[i] = 48 + (ip % 10);
    ip = Math.floor(ip / 10);
  }
  pos += len;
  if (fp === 0) return;
  let d = digits;
  while (fp % 10 === 0) {
    fp /= 10;
    d--;
  }
  buf[pos++] = 46;
  for (let i = pos + d - 1; i >= pos; i--) {
    buf[i] = 48 + (fp % 10);
    fp = Math.floor(fp / 10);
  }
  pos += d;
}

function flush(): string {
  // from 1: skip the leading space
  if (decoder) return decoder.decode(buf.subarray(1, pos));
  let s = "";
  for (let i = 1; i < pos; i++) s += String.fromCharCode(buf[i]);
  return s;
}

export function getSquirclePath(options: SquirclePathOptions): string {
  const { width, height, cornerRadius = 0, cornerSmoothing = 0.6, preserveSmoothing = false, x = 0, y = 0, precision = 2 } = options;
  if (!(width > 0) || !(height > 0)) return "";

  const tl = options.topLeftCornerRadius ?? cornerRadius;
  const tr = options.topRightCornerRadius ?? cornerRadius;
  const br = options.bottomRightCornerRadius ?? cornerRadius;
  const bl = options.bottomLeftCornerRadius ?? cornerRadius;

  let TL: CornerParams, TR: CornerParams, BR: CornerParams, BL: CornerParams;
  if (tl === tr && tr === br && br === bl) {
    const budget = Math.min(width, height) / 2;
    TL = TR = BR = BL = cornerParams(Math.min(tl, budget), cornerSmoothing, preserveSmoothing, budget);
  } else {
    const { radius, budget } = distribute({ topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl }, width, height);
    TL = cornerParams(radius.topLeft, cornerSmoothing, preserveSmoothing, budget.topLeft);
    TR = cornerParams(radius.topRight, cornerSmoothing, preserveSmoothing, budget.topRight);
    BR = cornerParams(radius.bottomRight, cornerSmoothing, preserveSmoothing, budget.bottomRight);
    BL = cornerParams(radius.bottomLeft, cornerSmoothing, preserveSmoothing, budget.bottomLeft);
  }

  pos = 0;
  digits = precision;
  scale = 10 ** precision;

  cmd(M);
  num(x + width - TR.p);
  num(y);

  // top-right
  if (TR.r) {
    const { a, b, c, d, arc, r } = TR;
    cmd(C); num(a); num(0); num(a + b); num(0); num(a + b + c); num(d);
    cmd(A); num(r); num(r); arcFlags(); num(arc); num(arc);
    cmd(C); num(d); num(c); num(d); num(b + c); num(d); num(a + b + c);
  } else {
    cmd(l); num(TR.p); num(0);
  }

  cmd(L); num(x + width); num(y + height - BR.p);

  // bottom-right
  if (BR.r) {
    const { a, b, c, d, arc, r } = BR;
    cmd(C); num(0); num(a); num(0); num(a + b); num(-d); num(a + b + c);
    cmd(A); num(r); num(r); arcFlags(); num(-arc); num(arc);
    cmd(C); num(-c); num(d); num(-(b + c)); num(d); num(-(a + b + c)); num(d);
  } else {
    cmd(l); num(0); num(BR.p);
  }

  cmd(L); num(x + BL.p); num(y + height);

  // bottom-left
  if (BL.r) {
    const { a, b, c, d, arc, r } = BL;
    cmd(C); num(-a); num(0); num(-(a + b)); num(0); num(-(a + b + c)); num(-d);
    cmd(A); num(r); num(r); arcFlags(); num(-arc); num(-arc);
    cmd(C); num(-d); num(-c); num(-d); num(-(b + c)); num(-d); num(-(a + b + c));
  } else {
    cmd(l); num(-BL.p); num(0);
  }

  cmd(L); num(x); num(y + TL.p);

  // top-left
  if (TL.r) {
    const { a, b, c, d, arc, r } = TL;
    cmd(C); num(0); num(-a); num(0); num(-(a + b)); num(d); num(-(a + b + c));
    cmd(A); num(r); num(r); arcFlags(); num(arc); num(-arc);
    cmd(C); num(c); num(-d); num(b + c); num(-d); num(a + b + c); num(-d);
  } else {
    cmd(l); num(0); num(-TL.p);
  }

  cmd(Z);
  return flush();
}

// SVG command letters
const M = 77, L = 76, l = 108, C = 99, A = 97, Z = 90;

// x-axis-rotation 0, large-arc 0, sweep 1
function arcFlags() {
  num(0);
  num(0);
  num(1);
}
