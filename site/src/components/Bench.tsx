import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { Squircle } from "@fohz67/squircle/react";
import { getSquirclePath } from "@fohz67/squircle";
import { Squircle as SquircleJs } from "@squircle-js/react";
import { getSvgPath } from "figma-squircle";
import { Info, LoaderCircle, Play } from "lucide-react";
import { Box, Seg } from "./ui";

type Lib = "ours" | "theirs";
interface Result {
  mount: Record<Lib, number>;
  firstPaint: Record<Lib, boolean>;
  stale: Record<Lib, number>;
  resize: Record<Lib, number>;
  path: Record<Lib, number>;
}

// Phase markers: a no-op in the browser UI; bench/browser.bench.mjs hooks them to
// read Chrome DevTools main-thread metrics per phase.
const mark = async (name: string) => {
  const w = window as unknown as { __benchMark?: (n: string) => Promise<void> };
  if (w.__benchMark) await w.__benchMark(name);
};

const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

async function settle() {
  await new Promise((r) => setTimeout(r, 250));
  for (let i = 0; i < 3; i++) await frame();
}

function Cells({ lib, n }: { lib: Lib; n: number }) {
  const C = lib === "ours" ? Squircle : SquircleJs;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <C key={i} className="cell" cornerRadius={16} cornerSmoothing={1} />
      ))}
    </>
  );
}

/** Width encoded in a squircle path: the x of the first absolute "L" command. */
function clipWidth(el: HTMLElement) {
  const m = /L ([\d.]+)/.exec(el.style.clipPath);
  return m ? +m[1] : NaN;
}

/**
 * Observe `el` with a ResizeObserver created *after* the libraries' observers.
 * Callbacks run in creation order, after layout and right before paint, so
 * this sees exactly the clip-path that is about to be painted.
 */
function paintProbe(el: HTMLElement, cb: (width: number, clipW: number) => void) {
  const ro = new ResizeObserver((entries) => {
    const box = entries[0].borderBoxSize?.[0];
    cb(box ? box.inlineSize : el.offsetWidth, clipWidth(el));
  });
  ro.observe(el);
  return () => ro.disconnect();
}

// Browsers re-serialise with double quotes: path("M …").
const clipped = (el: HTMLElement) => /^path\(['"]M/.test(el.style.clipPath);

async function runMount(arena: HTMLDivElement, lib: Lib, n: number) {
  const host = arena.appendChild(document.createElement("div"));
  const root: Root = createRoot(host);
  await frame();
  const t0 = performance.now();
  flushSync(() => root.render(<Cells lib={lib} n={n} />));
  const cells = Array.from(host.children) as HTMLElement[];
  let firstPaintOk: boolean | undefined;
  const stop = paintProbe(cells[cells.length - 1], (w, cw) => {
    if (firstPaintOk === undefined) firstPaintOk = Math.abs(w - cw) < 0.5;
  });
  // Time until every element has its real squircle shape.
  let t1 = 0;
  for (let i = 0; i < 120; i++) {
    await frame();
    if (cells.every(clipped)) {
      t1 = performance.now();
      break;
    }
  }
  stop();
  return { ms: t1 ? t1 - t0 : NaN, firstPaintOk: !!firstPaintOk, host, root, cells };
}

async function runResize(arena: HTMLDivElement, cells: HTMLElement[], frames: number) {
  // Count frames painted with a clip-path computed for a different width.
  let painted = 0;
  let stale = 0;
  const stop = paintProbe(cells[cells.length - 1], (w, cw) => {
    painted++;
    if (!(Math.abs(w - cw) < 0.5)) stale++;
  });
  await frame();
  await frame();
  painted = stale = 0;
  let last = await frame();
  let total = 0;
  for (let i = 0; i < frames; i++) {
    arena.style.width = 600 + Math.round(300 * Math.abs(Math.sin(i / 9))) + "px";
    const now = await frame();
    total += now - last;
    last = now;
  }
  arena.style.width = "";
  stop();
  return { avgFrame: total / frames, staleRatio: painted ? stale / painted : 0 };
}

function runPath(lib: Lib, count: number) {
  const fn =
    lib === "ours"
      ? (w: number, h: number) => getSquirclePath({ width: w, height: h, cornerRadius: 22, cornerSmoothing: 1 })
      : (w: number, h: number) => getSvgPath({ width: w, height: h, cornerRadius: 22, cornerSmoothing: 1 });
  for (let i = 0; i < 2000; i++) fn(300 + i * 0.13, 100 + i * 0.07);
  let sink = 0;
  const t0 = performance.now();
  for (let i = 0; i < count; i++) sink += fn(200 + (i % 997) * 0.37, 80 + (i % 389) * 0.53).length;
  const ms = performance.now() - t0;
  if (sink < 0) console.log(sink);
  return (ms * 1e6) / count; // ns per path
}

export function Bench() {
  const arena = useRef<HTMLDivElement>(null);
  const [n, setN] = useState<"500" | "1000" | "2000">("1000");
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const runRef = useRef((count: number) => run(count));
  runRef.current = (count: number) => run(count);

  async function run(count = +n) {
    const el = arena.current!;
    const res: Result = {
      mount: { ours: 0, theirs: 0 },
      firstPaint: { ours: false, theirs: false },
      stale: { ours: 0, theirs: 0 },
      resize: { ours: 0, theirs: 0 },
      path: { ours: 0, theirs: 0 },
    };
    const label = (lib: Lib) => (lib === "ours" ? "@fohz67/squircle" : "@squircle-js/react");

    setRunning("Generating paths…");
    await settle();
    res.path.theirs = runPath("theirs", 20000);
    res.path.ours = runPath("ours", 20000);

    // Mount: 3 rounds, alternating order, median. Each run starts from a quiet
    // page so one library never pays for the other's cleanup or GC.
    const mounts: Record<Lib, number[]> = { ours: [], theirs: [] };
    for (let round = 0; round < 3; round++) {
      for (const lib of (round % 2 ? ["ours", "theirs"] : ["theirs", "ours"]) as Lib[]) {
        setRunning(`Mounting ${count} × ${label(lib)} (${round + 1}/3)…`);
        await settle();
        await mark(`mount:${lib}:start`);
        const m = await runMount(el, lib, count);
        await mark(`mount:${lib}:end`);
        mounts[lib].push(m.ms);
        res.firstPaint[lib] = m.firstPaintOk;
        m.root.unmount();
        m.host.remove();
      }
    }
    res.mount.ours = median(mounts.ours);
    res.mount.theirs = median(mounts.theirs);

    for (const lib of ["theirs", "ours"] as Lib[]) {
      setRunning(`Resizing ${count} × ${label(lib)}…`);
      await settle();
      const m = await runMount(el, lib, count);
      await settle();
      await mark(`resize:${lib}:start`);
      const r = await runResize(el, m.cells, 40);
      await mark(`resize:${lib}:end`);
      res.resize[lib] = r.avgFrame;
      res.stale[lib] = r.staleRatio;
      m.root.unmount();
      m.host.remove();
    }
    await settle();
    setResult(res);
    setRunning(null);
    (window as unknown as { __benchResult?: Result }).__benchResult = res;
  }

  // `?bench=1000` runs automatically; used by bench/browser.bench.mjs (headless Chrome).
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("bench");
    if (q === "500" || q === "1000" || q === "2000") {
      setN(q);
      setTimeout(() => runRef.current(+q), 500);
    }
  }, []);

  return (
    <div>
      <div className="bench-controls">
        <Seg value={n} options={["500", "1000", "2000"]} onChange={setN} labels={{ "500": "500", "1000": "1,000", "2000": "2,000" }} />
        <Squircle asChild cornerRadius={12} cornerSmoothing={1}>
          <button className="btn solid" onClick={() => run()} disabled={!!running}>
            {running ? <LoaderCircle size={15} className="spin" /> : <Play size={14} />}
            {running ? "Running" : result ? "Run again" : "Run benchmark"}
          </button>
        </Squircle>
        <span className="bench-status">{running ?? "Against the published @squircle-js/react 1.3.0, in your browser."}</span>
      </div>

      <div className="bench-grid">
        <Card
          title="Stale frames while resizing"
          desc={`${Number(n).toLocaleString("en")} squircles resized for 40 frames, checked right before each paint.`}
          r={result?.stale}
          format={(v) => Math.round(v * 100) + "%"}
          verdict={result ? (result.stale.ours === 0 ? "Always in sync" : `${Math.round(result.stale.ours * 100)}% stale`) : undefined}
        />
        <Card
          title="Time to correct shape"
          desc={`Mount ${Number(n).toLocaleString("en")} squircles until every one is clipped. Median of 3.`}
          r={result?.mount}
          format={(v) => (Number.isNaN(v) ? "timeout" : v.toFixed(1) + " ms")}
          verdict={
            result
              ? result.firstPaint.ours && !result.firstPaint.theirs
                ? "Right on first paint"
                : (result.mount.theirs / result.mount.ours).toFixed(1) + "× faster"
              : undefined
          }
        />
        <Card
          title="Path generation"
          desc="Per path, 20,000 distinct sizes, same Figma algorithm."
          r={result?.path}
          format={(v) => Math.round(v).toLocaleString("en") + " ns"}
          verdict={result ? (result.path.theirs / result.path.ours).toFixed(1) + "× faster" : undefined}
        />
      </div>
      <p className="note">
        <Info size={14} />
        Keep this tab visible while it runs: browsers throttle animation frames in background tabs. Timings depend on hardware; the stale-frame
        count does not.
      </p>
      <div ref={arena} className="bench-arena" aria-hidden />
    </div>
  );
}

function Card({
  title,
  desc,
  r,
  format,
  verdict,
}: {
  title: string;
  desc: string;
  r?: Record<Lib, number>;
  format: (v: number) => string;
  verdict?: string;
}) {
  const max = r ? Math.max(r.ours, r.theirs) || 1 : 1;
  const pct = (v: number) => (Number.isFinite(v) ? Math.max(1.5, (v / max) * 100) : 0);
  return (
    <Box r={20} className="bench-card">
      <h3>{title}</h3>
      <p className="desc">{desc}</p>
      <BarRow label="@fohz67/squircle" value={r ? format(r.ours) : "-"} pct={r ? pct(r.ours) : 0} us />
      <BarRow label="@squircle-js/react" value={r ? format(r.theirs) : "-"} pct={r ? pct(r.theirs) : 0} />
      <div className="verdict">{verdict ?? <span className="muted">-</span>}</div>
    </Box>
  );
}

function BarRow({ label, value, pct, us }: { label: string; value: string; pct: number; us?: boolean }) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <Squircle cornerRadius={4} cornerSmoothing={1} className={"bar" + (us ? " us" : "")}>
        <i style={{ width: pct + "%" }} />
      </Squircle>
    </div>
  );
}
