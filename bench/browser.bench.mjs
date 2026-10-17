// Runs the site's in-page benchmark in headless Chromium and adds what a page
// cannot measure itself: main-thread CPU time per phase, read from the Chrome
// DevTools Protocol (Performance.getMetrics) at phase markers.
//
//   pnpm site:build && pnpm --filter site preview --port 4173
//   pnpm --filter bench bench:browser                 # N=1000, 3 runs
//   N=2000 RUNS=5 URL=http://localhost:4173/ pnpm --filter bench bench:browser
import { chromium } from "playwright-core";

const URL_ = process.env.URL ?? "http://localhost:4173/";
const N = process.env.N ?? "1000";
const RUNS = +(process.env.RUNS ?? 3);

// channel "chromium" = full browser in new headless mode (real compositor),
// not the stripped headless shell.
const browser = await chromium.launch({ channel: "chromium", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");

const KEYS = ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"];
let marks = {};
await page.exposeFunction("__benchMark", async (name) => {
  const { metrics } = await cdp.send("Performance.getMetrics");
  marks[name] = Object.fromEntries(metrics.filter((m) => KEYS.includes(m.name)).map((m) => [m.name, m.value * 1000]));
});

const runs = [];
for (let i = 0; i < RUNS; i++) {
  marks = {};
  await page.goto(`${URL_}?bench=${N}`);
  await page.waitForFunction(() => window.__benchResult, null, { timeout: 600_000, polling: 500 });
  const res = await page.evaluate(() => window.__benchResult);
  const cpu = {};
  for (const phase of ["mount", "resize"])
    for (const lib of ["ours", "theirs"]) {
      // mount markers repeat over 3 rounds; the last pair is kept (warm JIT)
      const a = marks[`${phase}:${lib}:start`];
      const b = marks[`${phase}:${lib}:end`];
      cpu[`${phase}:${lib}`] = Object.fromEntries(KEYS.map((k) => [k, b[k] - a[k]]));
    }
  runs.push({ res, cpu });
  process.stdout.write(".");
}
await browser.close();

const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
const fx = (v, d = 1) => +v.toFixed(d);
const row = (metric, get, d = 1) => {
  const ours = med(runs.map((r) => get(r, "ours")));
  const theirs = med(runs.map((r) => get(r, "theirs")));
  return { metric, "@fohz67/squircle": fx(ours, d), "@squircle-js/react": fx(theirs, d), ratio: ours > 0 ? (theirs / ours).toFixed(1) + "×" : "-" };
};

console.log(`\nN = ${N}, median of ${RUNS} runs, Chromium (new headless)\n`);
console.table([
  row("Resize 40 frames: main-thread CPU (ms)", (r, l) => r.cpu[`resize:${l}`].TaskDuration),
  row("  of which script (ms)", (r, l) => r.cpu[`resize:${l}`].ScriptDuration),
  row("  of which style recalc (ms)", (r, l) => r.cpu[`resize:${l}`].RecalcStyleDuration),
  row("Resize: frames painted with stale shape (%)", (r, l) => r.res.stale[l] * 100, 0),
  row("Mount: main-thread CPU (ms)", (r, l) => r.cpu[`mount:${l}`].TaskDuration),
  row("Mount: time to correct shape (ms)", (r, l) => r.res.mount[l]),
  row("Path generation (ns / path)", (r, l) => r.res.path[l], 0),
]);
console.log("First paint already squircled:", runs[0].res.firstPaint);
