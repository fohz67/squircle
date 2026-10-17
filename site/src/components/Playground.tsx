import { useLayoutEffect, useRef, useState } from "react";
import { MoveDiagonal2, Ruler } from "lucide-react";
import { Squircle } from "@fohz67/squircle/react";
import { Code } from "./Code";
import { Box, Seg, Slider } from "./ui";

type BorderKind = "none" | "solid" | "gradient";
type Fill = "surface" | "ink" | "glass";

const GRADIENT = "linear-gradient(180deg, var(--ink), transparent)";

export function Playground() {
  const [radius, setRadius] = useState(48);
  const [smoothing, setSmoothing] = useState(1);
  const [bw, setBw] = useState(1);
  const [border, setBorder] = useState<BorderKind>("solid");
  const [fill, setFill] = useState<Fill>("surface");
  const [ghost, setGhost] = useState(false);
  const size = useSize();

  const borderValue = border === "gradient" ? GRADIENT : "var(--line-2)";
  const borderCode = border === "gradient" ? '"linear-gradient(180deg, #000, transparent)"' : '"#d9d9dc"';

  const code = [
    `<Squircle`,
    `  cornerRadius={${radius}}`,
    `  cornerSmoothing={${smoothing}}`,
    ...(border !== "none" ? [`  borderWidth={${bw}}`, `  border=${borderCode}`] : []),
    `  className="card"`,
    `/>`,
  ].join("\n");

  return (
    <div className="play">
      <Box r={20} className="panel">
        <Slider label="cornerRadius" value={radius} min={0} max={140} onChange={setRadius} suffix="px" />
        <Slider label="cornerSmoothing" value={smoothing} min={0} max={1} step={0.01} onChange={setSmoothing} />
        <div className="divider" />
        <div className="control">
          <div className="control-top">
            <span>border</span>
          </div>
          <Seg value={border} options={["none", "solid", "gradient"]} onChange={setBorder} />
        </div>
        {border !== "none" && <Slider label="borderWidth" value={bw} min={1} max={10} onChange={setBw} suffix="px" />}
        <div className="control">
          <div className="control-top">
            <span>background</span>
          </div>
          <Seg value={fill} options={["surface", "ink", "glass"]} onChange={setFill} />
        </div>
        <div className="divider" />
        <label className="toggle">
          Compare with border-radius
          <input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} />
        </label>
      </Box>

      <div className="play-right">
        <Box r={20} className="stage">
          <div className="stage-meta top">
            <span>
              <Ruler size={13} />
              <span ref={size.label} />
            </span>
            <span>no re-render on resize</span>
          </div>
          <div className="resizable" ref={size.ref}>
            <Squircle
              className={"sq demo-card fill-" + fill}
              cornerRadius={radius}
              cornerSmoothing={smoothing}
              borderWidth={border === "none" ? 0 : bw}
              border={borderValue}
            >
              <span>
                <b>Resize me</b>
                drag the bottom-right corner
              </span>
            </Squircle>
            {ghost && <div className="overlay-ghost" style={{ borderRadius: radius }} />}
          </div>
          <div className="stage-meta bottom">
            <span />
            <span>
              <MoveDiagonal2 size={13} />
              resizable
            </span>
          </div>
        </Box>
        <Code file="Card.tsx">{code}</Code>
      </div>
    </div>
  );
}

/** Live size readout, written to the DOM directly so the demo stays render-free. */
function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      if (label.current) label.current.textContent = `${el.offsetWidth} × ${el.offsetHeight}`;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, label };
}
