import type { ReactNode } from "react";
import { Box, CopyButton } from "./ui";

// Tiny TSX/shell highlighter, enough for the snippets on this page.
const RULES: [RegExp, string][] = [
  [/^\/\/[^\n]*|^\/\*[\s\S]*?\*\//, "c"],
  [/^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'|^`(?:[^`\\]|\\.)*`/, "s"],
  [/^(?:import|from|export|const|let|function|return|new|true|false|null|undefined|type|interface|default|npm|i)\b/, "k"],
  [/^<\/?[A-Za-z][\w.]*/, "t"],
  [/^[a-zA-Z_][\w-]*(?==)/, "a"],
  [/^\d+(?:\.\d+)?/, "n"],
];

function highlight(src: string) {
  const out: ReactNode[] = [];
  let i = 0;
  let plain = "";
  while (i < src.length) {
    const rest = src.slice(i);
    let hit = false;
    for (const [re, cls] of RULES) {
      const m = re.exec(rest);
      if (m && m[0]) {
        if (plain) out.push(plain), (plain = "");
        out.push(
          <span key={i} className={"tk-" + cls}>
            {m[0]}
          </span>,
        );
        i += m[0].length;
        hit = true;
        break;
      }
    }
    if (!hit) {
      // consume a whole identifier at once so rules only match at word starts
      const w = /^[\w$]+|^./s.exec(rest)![0];
      plain += w;
      i += w.length;
    }
  }
  if (plain) out.push(plain);
  return out;
}

export function Code({ children, file }: { children: string; file?: string }) {
  return (
    <Box r={16} className="code-wrap">
      <div className="code-head">
        <span>{file ?? "tsx"}</span>
        <CopyButton text={children} />
      </div>
      <pre className="code">
        <code>{highlight(children)}</code>
      </pre>
    </Box>
  );
}
