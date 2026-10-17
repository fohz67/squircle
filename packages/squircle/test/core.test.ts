import "./setup-ro";
import { describe, expect, it, vi } from "vitest";
import { created, resizeTo } from "./setup-ro";
import { squircle, _cacheSize } from "../src/core";

const mk = () => document.body.appendChild(document.createElement("div"));

describe("squircle()", () => {
  it("uses a single ResizeObserver for every element", () => {
    const handles = Array.from({ length: 50 }, () => squircle(mk(), { cornerRadius: 12 }));
    expect(created.length).toBe(1);
    expect(created[0].targets.size).toBeGreaterThanOrEqual(50);
    handles.forEach((h) => h.destroy());
  });

  it("writes clip-path on resize and skips identical sizes", () => {
    const el = mk();
    const h = squircle(el, { cornerRadius: 16, cornerSmoothing: 1 });
    resizeTo(el, 200, 100);
    const first = el.style.clipPath;
    expect(first).toMatch(/^path\('M /);
    expect(el.hasAttribute("data-squircle-ready")).toBe(true);
    el.style.clipPath = "none"; // sentinel: a redundant write would overwrite it
    resizeTo(el, 200, 100);
    expect(el.style.clipPath).toBe("none");
    h.destroy();
  });

  it("shares paths between same-sized elements", () => {
    const before = _cacheSize();
    const els = Array.from({ length: 20 }, mk);
    const hs = els.map((el) => squircle(el, { cornerRadius: 9, cornerSmoothing: 0.42 }));
    els.forEach((el) => resizeTo(el, 300, 120));
    expect(_cacheSize() - before).toBe(1);
    expect(new Set(els.map((e) => e.style.clipPath)).size).toBe(1);
    hs.forEach((h) => h.destroy());
  });

  it("draws borders with one element and an even-odd ring", () => {
    const el = mk();
    const h = squircle(el, { cornerRadius: 20, borderWidth: 2, border: "red" });
    expect(el.hasAttribute("data-squircle-border")).toBe(true);
    expect(el.style.getPropertyValue("--squircle-border")).toBe("red");
    resizeTo(el, 100, 60);
    const ring = el.style.getPropertyValue("--squircle-ring");
    expect(ring.startsWith("path(evenodd, 'M ")).toBe(true);
    expect(ring.match(/M /g)?.length).toBe(2);
    expect(document.querySelector("style[data-squircle]")).not.toBeNull();
    h.update({ borderWidth: 0 });
    expect(el.hasAttribute("data-squircle-border")).toBe(false);
    h.destroy();
  });

  it("does not observe when width and height are fixed", () => {
    const el = mk();
    const h = squircle(el, { cornerRadius: 8, width: 40, height: 40 });
    expect(el.style.clipPath).toMatch(/^path/);
    expect(created[0].targets.has(el)).toBe(false);
    h.destroy();
  });

  it("removes the clip for empty boxes", () => {
    const el = mk();
    const h = squircle(el, { cornerRadius: 8 });
    resizeTo(el, 50, 50);
    resizeTo(el, 0, 50);
    expect(el.style.clipPath).toBe("");
    h.destroy();
  });

  it("settle: oversized path while height moves, exact path afterwards", () => {
    vi.useFakeTimers();
    const el = mk();
    const h = squircle(el, { cornerRadius: 8, settle: 100 });
    resizeTo(el, 100, 50);
    const exact50 = el.style.clipPath;
    resizeTo(el, 100, 60);
    const moving = el.style.clipPath;
    resizeTo(el, 100, 70);
    expect(el.style.clipPath).toBe(moving); // same bucket → no write
    vi.advanceTimersByTime(100);
    expect(el.style.clipPath).not.toBe(moving);
    expect(el.style.clipPath).not.toBe(exact50);
    h.destroy();
    vi.useRealTimers();
  });

  it("update() merges options and unobserves on destroy", () => {
    const el = mk();
    const h = squircle(el, { cornerRadius: 8, cornerSmoothing: 1 });
    resizeTo(el, 80, 80);
    const a = el.style.clipPath;
    h.update({ cornerRadius: 30 });
    expect(el.style.clipPath).not.toBe(a);
    h.destroy();
    expect(created[0].targets.has(el)).toBe(false);
  });
});
