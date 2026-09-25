/**
 * Polynomials with exact rational coefficients, and the one question this page
 * keeps asking of them: from which n on is p(n) ≥ 0?
 *
 * Every bound on the page reduces to that. T(n) ≤ c·f(n) for all n ≥ n₀ is the
 * claim that c·f(n) − T(n) ≥ 0 from n₀ on; T(n) ≥ c·f(n) is the claim that
 * T(n) − c·f(n) ≥ 0. So one exact test answers O, Ω and Θ.
 *
 * **Why exact.** The lecture's own clicker turns on c = 0.99 against n − 10,
 * where the answer is n₀ = 1000 and the difference at n = 1000 is exactly zero.
 * In floating point 0.99 is not 0.99, and whether 1000 passes or fails comes down
 * to rounding. So coefficients are fractions of BigInts, typed in as decimals,
 * and every verdict the page gives is checked at whole numbers with no rounding
 * at all. Floating point is used only to find roughly where the roots are, and
 * every candidate it suggests is then checked exactly.
 *
 * n ranges over whole numbers n ≥ 0, as in the definition (c > 0, n₀ ≥ 0).
 */

export interface Q {
  readonly n: bigint;
  readonly d: bigint;
}

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x || 1n;
};

export function q(n: bigint | number, d: bigint | number = 1n): Q {
  let nn = BigInt(n);
  let dd = BigInt(d);
  if (dd === 0n) throw new Error('division by zero');
  if (dd < 0n) {
    nn = -nn;
    dd = -dd;
  }
  const g = gcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

/** "0.99", "1/2", "-3", "1e6" → an exact fraction. */
export function parseQ(text: string): Q | null {
  const s = text.trim().replace(/\s+/g, '').replace(/_/g, '');
  if (/^[+-]?\d+\/\d+$/.test(s)) {
    const [a, b] = s.split('/');
    if (BigInt(b as string) === 0n) return null;
    return q(BigInt(a as string), BigInt(b as string));
  }
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s);
  if (!m || (!m[2] && !m[3])) return null;
  const sign = m[1] === '-' ? -1n : 1n;
  const whole = m[2] || '0';
  const frac = m[3] ?? '';
  const exp = Number(m[4] ?? 0);
  let num = BigInt(whole + frac) * sign;
  let den = 10n ** BigInt(frac.length);
  if (exp > 0) num *= 10n ** BigInt(exp);
  if (exp < 0) den *= 10n ** BigInt(-exp);
  return q(num, den);
}

export const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Q, b: Q): Q => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);
export const sign = (a: Q): -1 | 0 | 1 => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0);
export const cmp = (a: Q, b: Q): -1 | 0 | 1 => sign(sub(a, b));
export const toNumber = (a: Q): number => Number(a.n) / Number(a.d);
export const ZERO = q(0);
export const ONE = q(1);

export function showQ(a: Q): string {
  if (a.d === 1n) return a.n.toString();
  // Terminating decimals read better than fractions: 0.99, not 99/100.
  let d = a.d;
  let twos = 0;
  let fives = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    twos++;
  }
  while (d % 5n === 0n) {
    d /= 5n;
    fives++;
  }
  if (d === 1n) {
    const places = Math.max(twos, fives);
    const scaled = (a.n * 10n ** BigInt(places)) / a.d;
    const neg = scaled < 0n;
    const digits = (neg ? -scaled : scaled).toString().padStart(places + 1, '0');
    return `${neg ? '-' : ''}${digits.slice(0, -places)}.${digits.slice(-places)}`;
  }
  return `${a.n}/${a.d}`;
}

/** Coefficients from the constant term up: [a₀, a₁, a₂, …]. */
export type Poly = readonly Q[];

export const poly = (...cs: (number | string | Q)[]): Poly =>
  trim(
    cs.map((c) => {
      if (typeof c === 'object') return c;
      const r = parseQ(String(c));
      if (!r) throw new Error(`bad coefficient ${c}`);
      return r;
    }),
  );

function trim(p: Q[]): Q[] {
  const out = [...p];
  while (out.length > 0 && sign(out[out.length - 1] as Q) === 0) out.pop();
  return out;
}

export const degree = (p: Poly): number => p.length - 1;

export function polyAdd(a: Poly, b: Poly): Poly {
  const out: Q[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) out.push(add(a[i] ?? ZERO, b[i] ?? ZERO));
  return trim(out);
}

export const polyScale = (a: Poly, c: Q): Poly => trim(a.map((x) => mul(x, c)));
export const polySub = (a: Poly, b: Poly): Poly => polyAdd(a, polyScale(b, q(-1)));

/** p(n), exactly, at a whole number n. */
export function evalQ(p: Poly, n: bigint | number): Q {
  const x = q(BigInt(n));
  let acc = ZERO;
  for (let i = p.length - 1; i >= 0; i--) acc = add(mul(acc, x), p[i] as Q);
  return acc;
}

export function evalF(p: Poly, x: number): number {
  let acc = 0;
  for (let i = p.length - 1; i >= 0; i--) acc = acc * x + toNumber(p[i] as Q);
  return acc;
}

const derivF = (c: number[]): number[] => c.slice(1).map((a, i) => a * (i + 1));
const evalC = (c: number[], x: number) => c.reduceRight((acc, a) => acc * x + a, 0);

/**
 * Every real root, roughly, in increasing order. The roots of p lie between the
 * roots of its derivative, so find those first and bisect each stretch between
 * them. Only ever used to say where to look; the answers are checked exactly.
 */
function realRoots(c: number[]): number[] {
  while (c.length > 0 && c[c.length - 1] === 0) c = c.slice(0, -1);
  const d = c.length - 1;
  if (d < 1) return [];
  if (d === 1) return [-(c[0] as number) / (c[1] as number)];
  const lead = c[d] as number;
  const bound = 1 + Math.max(...c.slice(0, d).map((a) => Math.abs(a / lead)));
  const stops = [-bound, ...realRoots(derivF(c)).filter((x) => Math.abs(x) < bound), bound];
  const roots: number[] = [];
  for (let i = 1; i < stops.length; i++) {
    let lo = stops[i - 1] as number;
    let hi = stops[i] as number;
    let flo = evalC(c, lo);
    const fhi = evalC(c, hi);
    if (flo === 0) {
      roots.push(lo);
      continue;
    }
    if (Math.sign(flo) === Math.sign(fhi)) {
      // A touching root (a double root) shows up as a critical point where p is ~0.
      if (Math.abs(fhi) < 1e-9 * (1 + Math.abs(lead))) roots.push(hi);
      continue;
    }
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      const fm = evalC(c, mid);
      if (Math.sign(fm) === Math.sign(flo)) {
        lo = mid;
        flo = fm;
      } else hi = mid;
    }
    roots.push((lo + hi) / 2);
  }
  return [...new Set(roots.map((r) => Math.round(r * 1e9) / 1e9))].sort((a, b) => a - b);
}

/** The whole numbers worth checking exactly: every n near a root. */
function suspects(p: Poly): bigint[] {
  const rs = realRoots(p.map(toNumber));
  const out = new Set<bigint>();
  for (const r of rs) {
    if (r < -2) continue;
    const base = BigInt(Math.floor(r));
    for (let k = -3n; k <= 3n; k++) if (base + k >= 0n) out.add(base + k);
  }
  return [...out].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * The smallest n₀ with p(n) ≥ 0 for every whole n ≥ n₀, or null if there is
 * none, which happens exactly when p is eventually negative.
 */
export function smallestN0(p: Poly): number | null {
  if (p.length === 0) return 0;
  const lead = p[p.length - 1] as Q;
  if (sign(lead) < 0) return null;
  // Past the largest real root p has the sign of its leading coefficient, so the
  // last whole number where p < 0 is at or below the largest root. p < 0 only
  // strictly between roots, and between two neighbouring roots it has one sign,
  // so the last negative whole number is within reach of some root: either just
  // below a root it rises through, or just above the root it falls through. The
  // candidates near each root cover both; checking them all exactly finds it.
  let last = -1n;
  for (const n of suspects(p)) if (sign(evalQ(p, n)) < 0 && n > last) last = n;
  // Between two roots a negative stretch can be long, and only its ends are
  // candidates. Those ends are what matters: the last negative number is at the
  // top end of the last negative stretch.
  return Number(last + 1n);
}

export type Check =
  | { readonly ok: true }
  | {
      readonly ok: false;
      /** The first whole n ≥ n₀ where p(n) < 0. */
      readonly at: number;
    };

/** Does p(n) ≥ 0 hold for every whole n ≥ n₀? If not, the first n where it fails. */
export function holdsFrom(p: Poly, n0: number): Check {
  const start = BigInt(Math.max(0, Math.ceil(n0)));
  const top = smallestN0(p);
  if (top !== null && BigInt(top) <= start) return { ok: true };
  // It fails somewhere at or after n₀. The first failure is either n₀ itself or
  // the first whole number past a root where p turns negative.
  if (sign(evalQ(p, start)) < 0) return { ok: false, at: Number(start) };
  for (const n of suspects(p)) {
    if (n >= start && sign(evalQ(p, n)) < 0) return { ok: false, at: Number(n) };
  }
  // Only reachable if p stays negative from a root below n₀ onward, handled above.
  return { ok: false, at: top ?? Number(start) };
}

// --- display ------------------------------------------------------------------

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (k: number) => (k === 1 ? '' : [...String(k)].map((ch) => SUP[Number(ch)]).join(''));

/** 32n² + 17n + 1, the way the slides write it. */
export function showPoly(p: Poly): string {
  if (p.length === 0) return '0';
  const parts: string[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i] as Q;
    if (sign(c) === 0) continue;
    const neg = sign(c) < 0;
    const mag = neg ? q(-c.n, c.d) : c;
    const coef = i > 0 && mag.n === 1n && mag.d === 1n ? '' : showCoef(mag);
    const term = i === 0 ? showCoef(mag) : `${coef}n${sup(i)}`;
    parts.push(parts.length === 0 ? `${neg ? '−' : ''}${term}` : `${neg ? '−' : '+'} ${term}`);
  }
  return parts.join(' ');
}

function showCoef(c: Q): string {
  if (c.d === 2n && c.n === 1n) return '½';
  const s = showQ(c);
  // 10⁶ reads better than 1000000 in a formula.
  if (c.d === 1n && c.n >= 100000n && /^10*$/.test(s)) return `10${sup(s.length - 1)}`;
  return s;
}
