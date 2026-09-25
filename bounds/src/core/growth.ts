/**
 * Growth classes, for the comparisons that are not about one polynomial against
 * another: is n² + n Ω(√n)? Is n log n + 2n + 20 polynomial? Does 2ⁿ outgrow n¹⁰?
 *
 * A class is the dominant term of a function with its constant dropped:
 * n^a (log n)^b, or bⁿ, or n!. For functions made of such terms with positive
 * coefficients, the dominant term decides every O, Ω and Θ question, and
 * comparing two classes is a lexicographic comparison. That is the whole
 * content of "any polynomial beats any logarithm, any exponential beats any
 * polynomial" from lecture 2, written as an ordering.
 *
 * This is the rule of thumb made exact for this family, not a general theorem
 * about all functions; every function the page compares is in the family, and
 * `tests/growth.test.ts` checks each comparison it relies on numerically.
 */

export type Growth =
  | { readonly kind: 'poly'; readonly a: number; readonly b: number }
  | { readonly kind: 'exp'; readonly base: number }
  | { readonly kind: 'fact' };

export const poly = (a: number, b = 0): Growth => ({ kind: 'poly', a, b });
export const expo = (base: number): Growth => ({ kind: 'exp', base });
export const FACT: Growth = { kind: 'fact' };

const rank = (g: Growth) => (g.kind === 'poly' ? 0 : g.kind === 'exp' ? 1 : 2);

/** -1 if f grows strictly slower than g, 0 if they are Θ of each other, 1 if faster. */
export function compare(f: Growth, g: Growth): -1 | 0 | 1 {
  const r = rank(f) - rank(g);
  if (r !== 0) return r < 0 ? -1 : 1;
  if (f.kind === 'poly' && g.kind === 'poly') {
    if (f.a !== g.a) return f.a < g.a ? -1 : 1;
    if (f.b !== g.b) return f.b < g.b ? -1 : 1;
    return 0;
  }
  if (f.kind === 'exp' && g.kind === 'exp') return f.base === g.base ? 0 : f.base < g.base ? -1 : 1;
  return 0;
}

export type Relation = 'O' | 'Ω' | 'Θ';

/** Is f = O(g), Ω(g) or Θ(g)? */
export function relates(f: Growth, rel: Relation, g: Growth): boolean {
  const c = compare(f, g);
  return rel === 'O' ? c <= 0 : rel === 'Ω' ? c >= 0 : c === 0;
}

export const isPolynomial = (g: Growth): boolean => g.kind === 'poly';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (k: number) => [...String(k)].map((ch) => SUP[Number(ch)] ?? ch).join('');

export function showGrowth(g: Growth): string {
  if (g.kind === 'fact') return 'n!';
  if (g.kind === 'exp') return `${g.base}ⁿ`;
  const { a, b } = g;
  const n = a === 0 ? '' : a === 0.5 ? '√n' : a === 1 ? 'n' : `n${sup(a)}`;
  const l = b === 0 ? '' : b === 1 ? 'log n' : `(log n)${sup(b)}`;
  return [n, l].filter(Boolean).join(' ') || '1';
}

/**
 * A function the page can plot and classify: a name as the slides write it, a
 * way to evaluate it, and its growth class.
 */
export interface Fn {
  readonly id: string;
  readonly label: string;
  readonly at: (n: number) => number;
  readonly growth: Growth;
}

const lg = (n: number) => (n <= 1 ? 0 : Math.log2(n));
const factorial = (n: number) => {
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
};

/** Lecture 3, slide 16: six polynomial running times and three that are not. */
export const SLIDE_16: readonly Fn[] = [
  { id: 'f1', label: 'n', at: (n) => n, growth: poly(1) },
  { id: 'f2', label: '4n + 100', at: (n) => 4 * n + 100, growth: poly(1) },
  { id: 'f3', label: 'n log n + 2n + 20', at: (n) => n * lg(n) + 2 * n + 20, growth: poly(1, 1) },
  { id: 'f4', label: '0.01n²', at: (n) => 0.01 * n * n, growth: poly(2) },
  { id: 'f5', label: 'n²', at: (n) => n * n, growth: poly(2) },
  { id: 'f6', label: '20n² + 2n + 3', at: (n) => 20 * n * n + 2 * n + 3, growth: poly(2) },
  { id: 'f7', label: '2ⁿ', at: (n) => 2 ** n, growth: expo(2) },
  { id: 'f8', label: '3ⁿ', at: (n) => 3 ** n, growth: expo(3) },
  { id: 'f9', label: 'n!', at: factorial, growth: FACT },
];

export { factorial, lg };
