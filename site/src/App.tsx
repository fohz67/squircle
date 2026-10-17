import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  Cpu,
  Database,
  Gauge,
  Info,
  Layers,
  Moon,
  ScanLine,
  Server,
  SlidersHorizontal,
  Square,
  Sun,
  Terminal,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { Squircle } from "@fohz67/squircle/react";
import { getSquirclePath } from "@fohz67/squircle";
import { Hero } from "./components/Hero";
import { Playground } from "./components/Playground";
import { Bench } from "./components/Bench";
import { Code } from "./components/Code";
import { Box, GitHubIcon, NPM, REPO, SectionHead } from "./components/ui";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <section className="block" id="playground">
          <div className="wrap">
            <SectionHead eyebrow="Playground" icon={<SlidersHorizontal size={13} />} title="Tune it, resize it.">
              Every slider and every drag of the corner goes through the same shared ResizeObserver. The card itself never re-renders.
            </SectionHead>
            <Playground />
          </div>
        </section>
        <Usage />
        <Features />
        <Comparison />
        <Performance />
        <Final />
      </main>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------- nav */

function Nav() {
  const [theme, setTheme] = useState<string | undefined>(() => document.documentElement.dataset.theme);
  const dark = theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <a className="brand" href="#">
          <Squircle className="brand-mark" width={22} height={22} cornerRadius={7} cornerSmoothing={1} />
          squircle
          <span className="version">1.0</span>
        </a>
        <div className="nav-links">
          <a href="#playground">Playground</a>
          <a href="#usage">Docs</a>
          <a href="#compare">Compare</a>
          <a href="#performance">Performance</a>
        </div>
        <div className="nav-right">
          <Squircle asChild cornerRadius={9} cornerSmoothing={1}>
            <a className="icon-btn" href={REPO} aria-label="GitHub repository">
              <GitHubIcon />
            </a>
          </Squircle>
          <Squircle asChild cornerRadius={9} cornerSmoothing={1}>
            <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </Squircle>
        </div>
      </div>
    </nav>
  );
}

/* ----------------------------------------------------------------- usage */

const EXAMPLES: { id: string; label: string; file: string; code: string; note: string; preview: ReactNode }[] = [
  {
    id: "basic",
    label: "Basic",
    file: "Card.tsx",
    code: `import { Squircle } from "@fohz67/squircle/react";

export function Card() {
  return (
    <Squircle cornerRadius={24} cornerSmoothing={1} className="card">
      Hello, squircle.
    </Squircle>
  );
}`,
    note: "Renders a div. Until it is measured (SSR, no JavaScript) it falls back to a regular border-radius of the same size.",
    preview: (
      <Squircle cornerRadius={24} cornerSmoothing={1} className="preview-card">
        Hello, squircle.
      </Squircle>
    ),
  },
  {
    id: "border",
    label: "Border",
    file: "Card.tsx",
    code: `<Squircle
  cornerRadius={22}
  cornerSmoothing={1}
  borderWidth={1}
  border="#e4e4e7"
>
  One element. One observer.
</Squircle>`,
    note: "The border is a ring clipped with an even-odd path, drawn by the element's own ::before. It follows the curve exactly, with no nested wrappers.",
    preview: (
      <Squircle cornerRadius={22} cornerSmoothing={1} borderWidth={1} border="var(--line-2)" className="preview-card">
        One element. One observer.
      </Squircle>
    ),
  },
  {
    id: "gradient",
    label: "Gradient border",
    file: "Card.tsx",
    code: `<Squircle
  cornerRadius={28}
  cornerSmoothing={1}
  borderWidth={1.5}
  border="linear-gradient(180deg, #0a0a0a, transparent)"
>
  …
</Squircle>`,
    note: "border accepts any CSS background: colors, gradients, images or CSS variables.",
    preview: (
      <Squircle
        cornerRadius={28}
        cornerSmoothing={1}
        borderWidth={1.5}
        border="linear-gradient(180deg, var(--ink), transparent 85%)"
        className="preview-card"
        style={{ padding: "34px 40px" }}
      >
        Fading border
      </Squircle>
    ),
  },
  {
    id: "aschild",
    label: "asChild",
    file: "Checkout.tsx",
    code: `<Squircle asChild cornerRadius={12} cornerSmoothing={1}>
  <a href="/checkout" className="button">
    Checkout
  </a>
</Squircle>`,
    note: "Applies the shape to your own element. Props, className, style, event handlers and refs are merged.",
    preview: (
      <Squircle asChild cornerRadius={12} cornerSmoothing={1}>
        <a className="btn solid" href="#usage">
          Checkout <ArrowRight size={15} />
        </a>
      </Squircle>
    ),
  },
  {
    id: "corners",
    label: "Per corner",
    file: "Tile.tsx",
    code: `<Squircle
  topLeftCornerRadius={44}
  topRightCornerRadius={10}
  bottomRightCornerRadius={44}
  bottomLeftCornerRadius={10}
  cornerSmoothing={0.8}
/>`,
    note: "Different radii per corner, using Figma's budget distribution when corners compete for space.",
    preview: (
      <Squircle
        topLeftCornerRadius={44}
        topRightCornerRadius={10}
        bottomRightCornerRadius={44}
        bottomLeftCornerRadius={10}
        cornerSmoothing={0.8}
        style={{ width: 200, height: 140, background: "var(--ink)" }}
      />
    ),
  },
  {
    id: "vanilla",
    label: "Vanilla",
    file: "main.ts",
    code: `import { squircle } from "@fohz67/squircle";

const card = squircle(document.querySelector(".card"), {
  cornerRadius: 24,
  cornerSmoothing: 1,
  borderWidth: 1,
  border: "#e4e4e7",
});

card.update({ cornerRadius: 32 });
card.destroy();`,
    note: "The framework-agnostic core: Vue, Svelte, Solid, web components, plain HTML. Same single observer, same cache.",
    preview: (
      <Box r={20} className="preview-card">
        <div className="muted" style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
          {'squircle(el, { … })'}
        </div>
      </Box>
    ),
  },
  {
    id: "path",
    label: "Path only",
    file: "icon.ts",
    code: `import { getSquirclePath } from "@fohz67/squircle";

const d = getSquirclePath({
  width: 200,
  height: 120,
  cornerRadius: 24,
  cornerSmoothing: 0.6,
});
// → <path d={d} />, Path2D, clip-path: path("…")`,
    note: "A pure function for SVG, canvas, Node or workers. Output matches figma-squircle within 0.005px.",
    preview: (
      <svg width="200" height="120" viewBox="0 0 200 120" aria-hidden>
        <path d={getSquirclePath({ width: 200, height: 120, cornerRadius: 24, cornerSmoothing: 0.6 })} fill="var(--ink)" />
      </svg>
    ),
  },
];

function Usage() {
  const [tab, setTab] = useState("basic");
  const ex = EXAMPLES.find((e) => e.id === tab)!;
  return (
    <section className="block" id="usage">
      <div className="wrap">
        <SectionHead eyebrow="Usage" icon={<Terminal size={13} />} title="Drop-in. Then some.">
          Same props as <code>@squircle-js/react</code> (<code>cornerRadius</code>, <code>cornerSmoothing</code>, <code>asChild</code>,{" "}
          <code>width</code>, <code>height</code>), plus borders, per-corner radii and a vanilla API.
        </SectionHead>
        <Squircle cornerRadius={12} cornerSmoothing={1} className="tabs" role="tablist">
          {EXAMPLES.map((e) => (
            <Squircle key={e.id} asChild cornerRadius={9} cornerSmoothing={1}>
              <button role="tab" aria-selected={tab === e.id} onClick={() => setTab(e.id)}>
                {e.label}
              </button>
            </Squircle>
          ))}
        </Squircle>
        <div className="usage">
          <div>
            <Code file={ex.file}>{ex.code}</Code>
            <p className="usage-note">
              <Info size={15} />
              <span>{ex.note}</span>
            </p>
          </div>
          <Box r={20} className="usage-preview">
            {ex.preview}
          </Box>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- features */

const FEATURES: [ReactNode, string, string][] = [
  [<ScanLine size={17} />, "One observer, period", "A single ResizeObserver serves every squircle on the page. squircle.js creates one per element, plus a window listener each."],
  [<Timer size={17} />, "Never a frame behind", "Sizes never go through React state. The clip-path is written after layout and before paint, so every frame shows the right shape."],
  [<Square size={17} />, "Real borders", "borderWidth and border draw a ring on the same element. Solid, translucent or gradient, it always follows the curve."],
  [<Zap size={17} />, "6–11× faster paths", "Same Figma geometry, but trigonometry is cached per smoothing value and the path is written as bytes."],
  [<Database size={17} />, "Shared cache", "Identical cards share one path in an LRU cache. Three hundred same-size product cards compute it once."],
  [<Server size={17} />, "SSR and no-JS safe", "Server HTML is a normal rounded rectangle, with an inset shadow for borders, until the shape is measured."],
];

function Features() {
  return (
    <section className="block" id="features">
      <div className="wrap">
        <SectionHead eyebrow="Features" icon={<Layers size={13} />} title="Built for pages with hundreds of them.">
          Born on a production store where a single product listing renders around 700 squircles. Here is what that taught us.
        </SectionHead>
        <div className="features">
          {FEATURES.map(([icon, t, d]) => (
            <Box key={t} r={20} className="feature">
              <Squircle cornerRadius={10} cornerSmoothing={1} className="ico">
                {icon}
              </Squircle>
              <h3>{t}</h3>
              <p>{d}</p>
            </Box>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ comparison */

const yes = (t: string) => (
  <span className="cell-ico">
    <span className="mark-yes">
      <Check size={11} strokeWidth={3} />
    </span>
    {t}
  </span>
);
const no = (t: string) => (
  <span className="cell-ico">
    <span className="mark-no">
      <X size={11} strokeWidth={3} />
    </span>
    {t}
  </span>
);

const ROWS: [string, ReactNode, ReactNode][] = [
  ["ResizeObservers for N elements", "1", "N"],
  ["window resize listeners", "0", "N"],
  ["React re-renders on resize", yes("None"), no("Every element")],
  ["Shape on first paint", yes("Yes"), no("No, after an effect")],
  ["Stale frames while resizing", yes("0%"), no("100%, one frame late")],
  ["Path cache", "Shared LRU", "Per component"],
  ["Borders", yes("One element, any background"), no("Not supported")],
  ["Per-corner radii", yes("Yes"), no("No")],
  ["Ref forwarding", yes("Yes"), no("No")],
  ["Framework-agnostic core", yes("Yes"), no("React only")],
  ["Runtime dependencies", "0", "2"],
];

function Comparison() {
  return (
    <section className="block" id="compare">
      <div className="wrap">
        <SectionHead eyebrow="Compare" icon={<Boxes size={13} />} title="Same API. Different engine.">
          squircle.js made squircles easy in React, and the API here is intentionally compatible. The difference is what happens when there are
          hundreds of them.
        </SectionHead>
        <Box r={20} className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>@fohz67/squircle</th>
                <th>@squircle-js/react 1.3</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([k, a, b]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="us">{a}</td>
                  <td className="them">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- performance */

const CPU_ROWS = [
  ["Resize (40 frames), main thread", "249 ms", "523 ms", "2.1× less"],
  ["Resize, JavaScript only", "83 ms", "363 ms", "4.4× less"],
  ["Resize, stale frames", "0%", "100%", "always in sync"],
  ["Mount, main thread", "15 ms", "26 ms", "1.7× less"],
  ["Mount, squircled on first paint", "yes", "no", ""],
  ["Path generation, in browser", "760 ns", "4,760 ns", "6.3× faster"],
];

const WASM_ROWS: [string, string, string, boolean?][] = [
  ["figma-squircle 1.1 (used by squircle.js)", "~5,500", "1×"],
  ["First JS version (string concatenation)", "~1,250", "4.5×"],
  ["AssemblyScript → WebAssembly", "~490", "11.3×"],
  ["@fohz67/squircle (pure JS, shipped)", "~500", "11×", true],
];

function Performance() {
  return (
    <section className="block" id="performance">
      <div className="wrap">
        <SectionHead eyebrow="Performance" icon={<Gauge size={13} />} title="Benchmark it yourself.">
          Real components from both libraries, same props, same page. A probe checks right before each paint whether the shape on screen matches
          the element, then times it.
        </SectionHead>
        <Bench />

        <h3 className="subhead">Main-thread CPU, from Chrome DevTools</h3>
        <p className="sub">
          A page can't measure its own CPU time, so <code>bench/browser.bench.mjs</code> runs this benchmark in headless Chromium and reads DevTools
          metrics per phase. Reference run: 1,000 squircles, Apple M-series, median of 3.
        </p>
        <Box r={20} className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>@fohz67/squircle</th>
                <th>@squircle-js/react</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {CPU_ROWS.map(([k, a, b, r]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="us">{a}</td>
                  <td className="them">{b}</td>
                  <td className="us">{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        <h3 className="subhead" id="wasm">
          Why not WebAssembly?
        </h3>
        <p className="sub">
          We tried. An AssemblyScript build was 2.5× faster than our first JavaScript. Not because of WASM, but because it wrote digits as integers
          into a byte buffer instead of concatenating float strings. We ported that idea back to JavaScript and the gap closed. Same speed, no async
          instantiation, no binary to ship.
        </p>
        <Box r={20} className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Implementation · Node 24, Apple M-series</th>
                <th>ns / path</th>
                <th>vs figma-squircle</th>
              </tr>
            </thead>
            <tbody>
              {WASM_ROWS.map(([k, a, b, us]) => (
                <tr key={k}>
                  <td className={us ? "us" : undefined}>
                    <span className="cell-ico">
                      {us ? <Cpu size={14} /> : null}
                      {k}
                    </span>
                  </td>
                  <td className={us ? "us" : "them"}>{a}</td>
                  <td className={us ? "us" : "them"}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- final cta */

function Final() {
  return (
    <div className="wrap">
      <Box r={28} className="final">
        <h2>Ship smoother corners.</h2>
        <p className="sub">One import. Same props you already use. Measurably less work on every frame.</p>
        <div className="cta">
          <Squircle asChild cornerRadius={12} cornerSmoothing={1}>
            <a className="btn solid" href="#usage">
              Get started <ArrowRight size={15} />
            </a>
          </Squircle>
          <Squircle asChild cornerRadius={12} cornerSmoothing={1} borderWidth={1} border="var(--line)">
            <a className="btn ghost" href={REPO}>
              <GitHubIcon size={15} /> Star on GitHub
            </a>
          </Squircle>
        </div>
      </Box>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <div className="wrap">
        <span>
          MIT License · <a href="https://github.com/fohz67">fohz67</a>
        </span>
        <span>
          Geometry from Figma's corner smoothing, after <a href="https://github.com/phamfoo/figma-squircle">figma-squircle</a> ·{" "}
          <a href={NPM}>npm</a> · <a href={REPO}>GitHub</a>
        </span>
      </div>
    </footer>
  );
}
