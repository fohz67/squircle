import { describe, expect, it } from "vitest";
import { getSvgPath } from "figma-squircle";
import { getSquirclePath } from "../src/path";

const nums = (p: string) => (p.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const cmds = (p: string) => p.replace(/[-\d.\s]+/g, "");

function expectSame(opts: Parameters<typeof getSvgPath>[0]) {
  const ours = getSquirclePath({ ...opts, precision: 4 });
  const ref = getSvgPath(opts);
  expect(cmds(ours)).toBe(cmds(ref));
  const a = nums(ours);
  const b = nums(ref);
  expect(a.length).toBe(b.length);
  a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(1e-3));
}

// Deterministic PRNG so failures are reproducible.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe("getSquirclePath: parity with figma-squircle", () => {
  it("matches on common sizes", () => {
    for (const s of [0, 0.3, 0.6, 1])
      for (const r of [0, 4, 12, 22, 48])
        for (const [w, h] of [
          [320, 180],
          [40, 40],
          [10, 300],
          [1200, 24],
        ])
          expectSame({ width: w, height: h, cornerRadius: r, cornerSmoothing: s });
  });

  it("matches with preserveSmoothing", () => {
    for (const s of [0.2, 0.6, 1]) for (const r of [8, 30, 90]) expectSame({ width: 120, height: 80, cornerRadius: r, cornerSmoothing: s, preserveSmoothing: true });
  });

  it("matches with per-corner radii (fuzzed)", () => {
    const rand = rng(42);
    for (let i = 0; i < 500; i++) {
      expectSame({
        width: 1 + rand() * 800,
        height: 1 + rand() * 800,
        topLeftCornerRadius: rand() * 120,
        topRightCornerRadius: rand() < 0.2 ? 0 : rand() * 120,
        bottomRightCornerRadius: rand() * 120,
        bottomLeftCornerRadius: rand() < 0.2 ? 0 : rand() * 120,
        cornerSmoothing: rand(),
        preserveSmoothing: rand() < 0.5,
      });
    }
  });
});

describe("getSquirclePath", () => {
  it("default precision (2) stays within 0.005px of figma-squircle", () => {
    const rand = rng(7);
    for (let i = 0; i < 500; i++) {
      const opts = { width: rand() * 3000, height: rand() * 3000, cornerRadius: rand() * 200, cornerSmoothing: rand() };
      const a = nums(getSquirclePath(opts));
      const b = nums(getSvgPath(opts));
      expect(a.length).toBe(b.length);
      a.forEach((v, j) => expect(Math.abs(v - b[j])).toBeLessThanOrEqual(0.0051));
    }
  });

  it("formats numbers without float artefacts", () => {
    const p = getSquirclePath({ width: 12345.678, height: 0.5, cornerRadius: 0 });
    expect(p).toBe("M 12345.68 0 l 0 0 L 12345.68 0.5 l 0 0 L 0 0.5 l 0 0 L 0 0 l 0 0 Z");
  });

  it("returns empty for empty boxes", () => {
    expect(getSquirclePath({ width: 0, height: 10, cornerRadius: 4 })).toBe("");
    expect(getSquirclePath({ width: NaN, height: 10 })).toBe("");
  });

  it("is shorter than figma-squircle at default precision", () => {
    const opts = { width: 343.5, height: 217.25, cornerRadius: 22, cornerSmoothing: 1 };
    expect(getSquirclePath(opts).length).toBeLessThan(getSvgPath(opts).length * 0.75);
  });

  it("applies the x/y offset to absolute commands only", () => {
    const base = getSquirclePath({ width: 100, height: 50, cornerRadius: 10 });
    const moved = getSquirclePath({ width: 100, height: 50, cornerRadius: 10, x: 5, y: 7 });
    expect(nums(moved)[0]).toBeCloseTo(nums(base)[0] + 5);
    expect(nums(moved)[1]).toBeCloseTo(nums(base)[1] + 7);
    expect(cmds(moved)).toBe(cmds(base));
  });
});
