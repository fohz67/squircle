// AssemblyScript port of the symmetric-corner path generator. Writes the
// ASCII path into linear memory and returns its byte length; JS decodes it.
// This exists to answer "would WASM be faster?" with numbers.

const OUT: usize = 1024;
let pos: usize = 0;

@inline function ch(c: i32): void {
  store<u8>(OUT + pos, c);
  pos++;
}

function num(v: f64): void {
  let n = <i64>Math.round(v * 100);
  if (n < 0) {
    ch(45);
    n = -n;
  }
  let ip = n / 100;
  const fp = <i32>(n % 100);
  // integer part
  let digits = 0;
  let tmp = ip;
  do {
    digits++;
    tmp /= 10;
  } while (tmp > 0);
  for (let i = digits - 1; i >= 0; i--) {
    store<u8>(OUT + pos + i, 48 + <i32>(ip % 10));
    ip /= 10;
  }
  pos += digits;
  if (fp != 0) {
    ch(46);
    ch(48 + fp / 10);
    if (fp % 10 != 0) ch(48 + (fp % 10));
  }
}

@inline function sp(): void {
  ch(32);
}

export function path(width: f64, height: f64, radius: f64, smoothing: f64): i32 {
  pos = 0;
  const budget = Math.min(width, height) / 2;
  const r = Math.min(radius, budget);
  let s = smoothing;
  let p = (1 + s) * r;
  const maxS = budget / r - 1;
  if (s > maxS) s = maxS;
  if (p > budget) p = budget;
  const DEG = Math.PI / 180;
  const arcMeasure = 90 * (1 - s);
  const arc = Math.sin((arcMeasure / 2) * DEG) * r * Math.SQRT2;
  const p34 = r * Math.tan(((90 - arcMeasure) / 4) * DEG);
  const beta = 45 * s * DEG;
  const c = p34 * Math.cos(beta);
  const d = c * Math.tan(beta);
  const b = (p - arc - c - d) / 3;
  const a = 2 * b;

  ch(77); sp(); num(width - p); sp(); num(0);
  // top-right
  sp(); ch(99); sp(); num(a); sp(); num(0); sp(); num(a + b); sp(); num(0); sp(); num(a + b + c); sp(); num(d);
  sp(); ch(97); sp(); num(r); sp(); num(r); sp(); num(0); sp(); num(0); sp(); num(1); sp(); num(arc); sp(); num(arc);
  sp(); ch(99); sp(); num(d); sp(); num(c); sp(); num(d); sp(); num(b + c); sp(); num(d); sp(); num(a + b + c);
  sp(); ch(76); sp(); num(width); sp(); num(height - p);
  // bottom-right
  sp(); ch(99); sp(); num(0); sp(); num(a); sp(); num(0); sp(); num(a + b); sp(); num(-d); sp(); num(a + b + c);
  sp(); ch(97); sp(); num(r); sp(); num(r); sp(); num(0); sp(); num(0); sp(); num(1); sp(); num(-arc); sp(); num(arc);
  sp(); ch(99); sp(); num(-c); sp(); num(d); sp(); num(-(b + c)); sp(); num(d); sp(); num(-(a + b + c)); sp(); num(d);
  sp(); ch(76); sp(); num(p); sp(); num(height);
  // bottom-left
  sp(); ch(99); sp(); num(-a); sp(); num(0); sp(); num(-(a + b)); sp(); num(0); sp(); num(-(a + b + c)); sp(); num(-d);
  sp(); ch(97); sp(); num(r); sp(); num(r); sp(); num(0); sp(); num(0); sp(); num(1); sp(); num(-arc); sp(); num(-arc);
  sp(); ch(99); sp(); num(-d); sp(); num(-c); sp(); num(-d); sp(); num(-(b + c)); sp(); num(-d); sp(); num(-(a + b + c));
  sp(); ch(76); sp(); num(0); sp(); num(p);
  // top-left
  sp(); ch(99); sp(); num(0); sp(); num(-a); sp(); num(0); sp(); num(-(a + b)); sp(); num(d); sp(); num(-(a + b + c));
  sp(); ch(97); sp(); num(r); sp(); num(r); sp(); num(0); sp(); num(0); sp(); num(1); sp(); num(arc); sp(); num(-arc);
  sp(); ch(99); sp(); num(c); sp(); num(-d); sp(); num(b + c); sp(); num(-d); sp(); num(a + b + c); sp(); num(-d);
  sp(); ch(90);
  return <i32>pos;
}

export function outPtr(): usize {
  return OUT;
}
