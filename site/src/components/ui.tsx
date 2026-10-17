import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Squircle } from "@fohz67/squircle/react";

export const REPO = "https://github.com/fohz67/squircle";
export const NPM = "https://www.npmjs.com/package/@fohz67/squircle";

/** Bordered squircle surface, the building block of every panel on this page. */
export function Box({ r = 16, className, children, style }: { r?: number; className?: string; children?: ReactNode; style?: React.CSSProperties }) {
  return (
    <Squircle cornerRadius={r} cornerSmoothing={1} borderWidth={1} border="var(--line)" className={className} style={style}>
      {children}
    </Squircle>
  );
}

export function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function SectionHead({ eyebrow, icon, title, children }: { eyebrow: string; icon?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="section-head">
      <div className="eyebrow">
        {icon}
        {eyebrow}
      </div>
      <h2>{title}</h2>
      {children && <p className="sub">{children}</p>}
    </div>
  );
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  return { copied, copy };
}

export function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <Squircle asChild cornerRadius={8} cornerSmoothing={1}>
      <button className="icon-btn" onClick={() => copy(text)} aria-label="Copy code">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </Squircle>
  );
}

export function Slider(props: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  const p = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <div className="control">
      <div className="control-top">
        <span>{props.label}</span>
        <output>
          {props.value}
          {props.suffix}
        </output>
      </div>
      <input
        type="range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        style={{ "--p": p + "%" } as React.CSSProperties}
        onChange={(e) => props.onChange(+e.target.value)}
      />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, labels }: { value: T; options: T[]; onChange: (v: T) => void; labels?: Partial<Record<T, ReactNode>> }) {
  return (
    <Squircle cornerRadius={11} cornerSmoothing={1} className="seg">
      {options.map((o) => (
        <Squircle key={o} asChild cornerRadius={8} cornerSmoothing={1}>
          <button aria-pressed={value === o} onClick={() => onChange(o)}>
            {labels?.[o] ?? o}
          </button>
        </Squircle>
      ))}
    </Squircle>
  );
}
