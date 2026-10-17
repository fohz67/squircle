import { useState } from "react";
import { ArrowRight, Check, Copy, Search, ShieldCheck } from "lucide-react";
import { Squircle } from "@fohz67/squircle/react";
import { getSquirclePath } from "@fohz67/squircle";
import { Box, GitHubIcon, REPO, useCopy } from "./ui";

export function Hero() {
  const { copied, copy } = useCopy();
  return (
    <header className="hero">
      <div className="wrap">
        <Box r={10} className="pill">
          <b>v1.0</b>
          <span className="sep" />
          Zero dependencies · ~4 KB gzip
        </Box>
        <h1>Squircles that never cost you a frame</h1>
        <p className="lead">
          Figma-accurate corner smoothing for the web. One observer for the whole page, no React re-renders, and borders that follow the curve
          on a single element.
        </p>
        <div className="cta">
          <Squircle asChild cornerRadius={12} cornerSmoothing={1} borderWidth={1} border="var(--line)">
            <button className="install" onClick={() => copy("npm i @fohz67/squircle")} aria-label="Copy install command">
              <span>
                <span className="dollar">$ </span>npm i @fohz67/squircle
              </span>
              <Squircle cornerRadius={7} cornerSmoothing={1} className="copy">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Squircle>
            </button>
          </Squircle>
          <Squircle asChild cornerRadius={12} cornerSmoothing={1}>
            <a className="btn solid" href={REPO}>
              <GitHubIcon size={15} />
              View on GitHub
            </a>
          </Squircle>
        </div>

        <Box r={24} className="showcase">
          <div className="showcase-grid">
            <Anatomy />
            <Kit />
          </div>
        </Box>
      </div>
    </header>
  );
}

/** The two curves on top of each other, with the point where each corner starts. */
function Anatomy() {
  const [s, setS] = useState(1);
  const W = 460;
  const H = 280;
  const R = 70;
  const X = 30;
  const Y = 34;
  const d = getSquirclePath({ width: W, height: H, cornerRadius: R, cornerSmoothing: s, x: X, y: Y });
  const p = Math.min((1 + s) * R, Math.min(W, H) / 2);

  return (
    <div className="anatomy">
      <div className="kit-label">Anatomy of a corner</div>
      <svg className="curves" viewBox={`${X + W - 300} ${Y - 44} 330 230`} role="img" aria-label="Squircle compared with border-radius">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse" x={X + W} y={Y}>
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--line)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x={X + W - 300} y={Y - 44} width="330" height="230" fill="url(#grid)" />
        <path d={d} fill="var(--surface)" stroke="none" />
        <rect x={X} y={Y} width={W} height={H} rx={R} fill="none" stroke="var(--ink-2)" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        {/* where each corner starts on the top edge */}
        <g fontFamily="var(--mono)" fontSize="9" fill="var(--ink-3)">
          <line x1={X + W - R} x2={X + W - R} y1={Y - 14} y2={Y} stroke="var(--ink-3)" strokeDasharray="2 2" />
          <line x1={X + W - p} x2={X + W - p} y1={Y - 28} y2={Y} stroke="var(--ink)" />
          <text x={X + W - R + 6} y={Y - 6}>
            r
          </text>
          <text x={X + W - p - 6} y={Y - 20} textAnchor="end" fill="var(--ink)">
            (1 + ξ) · r
          </text>
          <circle cx={X + W - p} cy={Y} r="3" fill="var(--ink)" />
          <circle cx={X + W - R} cy={Y} r="3" fill="var(--bg-2)" stroke="var(--ink-3)" />
        </g>
      </svg>
      <div className="anatomy-foot">
        <div className="legend">
          <span>
            <i /> Squircle
          </span>
          <span>
            <i className="dash" /> border-radius
          </span>
        </div>
        <div className="anatomy-slider">
          <label htmlFor="xi">smoothing ξ</label>
          <input
            id="xi"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={s}
            style={{ "--p": s * 100 + "%" } as React.CSSProperties}
            onChange={(e) => setS(+e.target.value)}
          />
          <output>{s.toFixed(2)}</output>
        </div>
      </div>
    </div>
  );
}

/** Real components built with the library, not screenshots. */
function Kit() {
  return (
    <div className="kit">
      <div className="kit-label">Live components</div>
      <Box r={18} className="kit-card">
        <div className="kit-row">
          <Squircle cornerRadius={12} cornerSmoothing={1} className="kit-avatar">
            <ShieldCheck size={18} />
          </Squircle>
          <div>
            <div className="kit-title">Order confirmed</div>
            <div className="kit-sub">Shipped in 24 h · tracking sent</div>
          </div>
          <Squircle cornerRadius={7} cornerSmoothing={1} className="kit-badge">
            #4821
          </Squircle>
        </div>
      </Box>
      <Box r={13} className="kit-input">
        <Search size={15} />
        Search products
        <kbd>⌘K</kbd>
      </Box>
      <div className="kit-buttons">
        <Squircle asChild cornerRadius={12} cornerSmoothing={1} borderWidth={1} border="var(--line)">
          <button className="btn ghost">Cancel</button>
        </Squircle>
        <Squircle asChild cornerRadius={12} cornerSmoothing={1}>
          <button className="btn solid">
            Continue <ArrowRight size={15} />
          </button>
        </Squircle>
      </div>
    </div>
  );
}
