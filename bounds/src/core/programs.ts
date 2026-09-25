import { poly } from './poly.ts';
import type { Poly } from './poly.ts';
import { poly as grows } from './growth.ts';
import type { Growth } from './growth.ts';

/**
 * The lecture's programs, as data the page can run.
 *
 * Each one is its pseudocode, line by line as on the slide, and a `run` that
 * executes it for a given n and records every statement it executes, in order.
 * The counting the lecture does by hand is then a count of those records, and
 * the closed forms stored here (n² + n for Print1, 2n for Print2, n(n + 1)/2
 * for sum-product) are checked against the counts in `tests/programs.test.ts`
 * for every n from 0 to 40. A formula on the page is never just asserted.
 *
 * `counted` marks what the question is counting: characters printed for Print1
 * and Print2, the innermost statement for the others. The running time is that
 * count up to a constant, which is why the page uses one for the other.
 */

export interface Step {
  /** Line number in `lines`, from 1. */
  readonly line: number;
  readonly i?: number;
  readonly j?: number;
  readonly k?: number;
  /** What it printed, for Print1 and Print2. */
  readonly out?: string;
  readonly counted: boolean;
}

export interface Program {
  readonly id: string;
  readonly title: string;
  readonly slide: string;
  readonly lines: readonly string[];
  readonly run: (n: number) => Step[];
  /** The exact count of `counted` steps, as a polynomial in n. */
  readonly count: Poly;
  /** The count in words, the way the lecture writes it. */
  readonly countText: string;
  readonly growth: Growth;
  /** What `counted` counts, for labels. */
  readonly unit: string;
}

export const PRINT1: Program = {
  id: 'print1',
  title: 'Print1(n)',
  slide: 'Lecture 3, slides 19 to 21',
  lines: ['for i = 1 to n do', '  print "X"', '  for j = 1 to n do', '    print "Y"'],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++) {
      out.push({ line: 2, i, out: 'X', counted: true });
      for (let j = 1; j <= n; j++) out.push({ line: 4, i, j, out: 'Y', counted: true });
    }
    return out;
  },
  count: poly(0, 1, 1),
  countText: 'n² + n',
  growth: grows(2),
  unit: 'characters printed',
};

export const PRINT2: Program = {
  id: 'print2',
  title: 'Print2(n)',
  slide: 'Lecture 3, slides 22 to 24',
  lines: [
    'for i = 1 to n do',
    '  print "X"',
    '  if i == 1 then',
    '    for j = 1 to n do',
    '      print "Y"',
  ],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++) {
      out.push({ line: 2, i, out: 'X', counted: true });
      out.push({ line: 3, i, counted: false });
      if (i === 1)
        for (let j = 1; j <= n; j++) out.push({ line: 5, i, j, out: 'Y', counted: true });
    }
    return out;
  },
  count: poly(0, 2),
  countText: '2n',
  growth: grows(1),
  unit: 'characters printed',
};

export const FOO: Program = {
  id: 'foo',
  title: 'foo',
  slide: 'Lecture 3, slides 4 and 12',
  lines: ['for i = 1 to n do', '  for j = 1 to n do', '    do something…'],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= n; j++) out.push({ line: 3, i, j, counted: true });
    return out;
  },
  count: poly(0, 0, 1),
  countText: 'n²',
  growth: grows(2),
  unit: 'times the inner line runs',
};

export const BAR: Program = {
  id: 'bar',
  title: 'bar',
  slide: 'Lecture 3, slides 4 and 12',
  lines: [
    'for i = 1 to n do',
    '  for j = 1 to n do',
    '    for k = 1 to n do',
    '      do something else…',
  ],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= n; j++)
        for (let k = 1; k <= n; k++) out.push({ line: 4, i, j, k, counted: true });
    }
    return out;
  },
  count: poly(0, 0, 0, 1),
  countText: 'n³',
  growth: grows(3),
  unit: 'times the inner line runs',
};

export const SUM_PRODUCT: Program = {
  id: 'sum-product',
  title: 'sum-product',
  slide: 'Lecture 3, slides 5, 9 and 10',
  lines: ['sum = 0', 'for i = 1 to n do', '  for j = i to n do', '    sum += A[i]*A[j]'],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++)
      for (let j = i; j <= n; j++) out.push({ line: 4, i, j, counted: true });
    return out;
  },
  count: poly(0, '1/2', '1/2'),
  countText: 'n(n + 1)/2',
  growth: grows(2),
  unit: 'times the inner line runs',
};

/**
 * Three loops deep, for chapter 5. Not from the slides: two programs whose
 * inner loop's range depends on the loops outside it, so the count is a sum
 * rather than a product, and the page counts it exactly, bounds it above by
 * letting every loop run to n, and bounds it below with a box of triples.
 */
export interface Range {
  readonly lo: number;
  readonly hi: number;
}

/** Three bands, one for each of i, j and k. The box is every triple with each index in its band. */
export interface Box {
  readonly i: Range;
  readonly j: Range;
  readonly k: Range;
}

export interface TripleLoop extends Program {
  /** Is the pair (i, j) ever reached by the two outer loops? */
  readonly reached: (n: number, i: number, j: number) => boolean;
  /** How many times the inner line runs for this (i, j): the length of the k loop. */
  readonly height: (n: number, i: number, j: number) => number;
  readonly box: (n: number) => Box;
  /** The three bands in words, i then j then k. */
  readonly bands: readonly [string, string, string];
  /** Why every triple in the box really runs. */
  readonly boxWhy: string;
  /**
   * A floor under the box: box(n) ≥ n³/den for every n ≥ n0. The tests check
   * it at every n up to 300 and that n0 is the first n from which it holds.
   */
  readonly floor: { readonly den: number; readonly n0: number };
  /** The exact count summed a second way, in words. */
  readonly sumText: string;
}

const size = (r: Range) => Math.max(0, r.hi - r.lo + 1);
export const boxSize = (b: Box): number => size(b.i) * size(b.j) * size(b.k);
const within = (r: Range, x: number) => r.lo <= x && x <= r.hi;
export const inBox = (b: Box, i: number, j: number, k: number): boolean =>
  within(b.i, i) && within(b.j, j) && within(b.k, k);

export const TRIANGLES: TripleLoop = {
  id: 'triangles',
  title: 'triangles(n)',
  slide: 'Chapter 5, not from the slides',
  lines: [
    'for i = 1 to n do',
    '  for j = i + 1 to n do',
    '    for k = j + 1 to n do',
    '      check points i, j, k',
  ],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++)
      for (let j = i + 1; j <= n; j++)
        for (let k = j + 1; k <= n; k++) out.push({ line: 4, i, j, k, counted: true });
    return out;
  },
  count: poly(0, '1/3', '-1/2', '1/6'),
  countText: 'n(n − 1)(n − 2)/6',
  growth: grows(3),
  unit: 'triples checked',
  reached: (_n, i, j) => j > i,
  height: (n, i, j) => (j > i ? Math.max(0, n - j) : 0),
  box(n) {
    const a = Math.floor(n / 3);
    const b = Math.floor((2 * n) / 3);
    return { i: { lo: 1, hi: a }, j: { lo: a + 1, hi: b }, k: { lo: b + 1, hi: n } };
  },
  bands: ['i ≤ n/3', 'n/3 < j ≤ 2n/3', 'k > 2n/3'],
  boxWhy:
    'The bands are in order, low, middle, high, so every triple in the box has i < j < k, and the loops reach every such triple.',
  floor: { den: 216, n0: 3 },
  sumText:
    'Column j has j − 1 cells, each running n − j times, so the total is the sum of (j − 1)(n − j): the number of ways to pick 3 of n points.',
};

export const DEEPER: TripleLoop = {
  id: 'deeper',
  title: 'deeper(n)',
  slide: 'Chapter 5, not from the slides',
  lines: ['for i = 1 to n do', '  for j = i to n do', '    for k = 1 to j do', '      do one step'],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++)
      for (let j = i; j <= n; j++)
        for (let k = 1; k <= j; k++) out.push({ line: 4, i, j, k, counted: true });
    return out;
  },
  count: poly(0, '1/6', '1/2', '1/3'),
  countText: 'n(n + 1)(2n + 1)/6',
  growth: grows(3),
  unit: 'times the inner line runs',
  reached: (_n, i, j) => j >= i,
  height: (_n, i, j) => (j >= i ? j : 0),
  box(n) {
    const h = Math.floor(n / 2);
    return { i: { lo: 1, hi: h }, j: { lo: Math.ceil(n / 2), hi: n }, k: { lo: 1, hi: h } };
  },
  bands: ['i ≤ n/2', 'j ≥ n/2', 'k ≤ n/2'],
  boxWhy:
    'i ≤ n/2 ≤ j, so the pair is reached, as in the triangle; and k ≤ n/2 ≤ j, so k is inside its loop.',
  floor: { den: 27, n0: 2 },
  sumText:
    'Column j is reached by the j rows i = 1 to j, and each of those cells runs j times: j · j. The total is 1² + 2² + … + n².',
};

export const TRIPLE_LOOPS: readonly TripleLoop[] = [TRIANGLES, DEEPER];

/**
 * Same answer, less work, for chapter 6: a table of the powers x¹ to xⁿ, made
 * two ways. The slow one starts every power from scratch; the fast one gets
 * xᵏ from the xᵏ⁻¹ it has just written. Both write the same n entries, and
 * the write line records the value, so the tests can check the two tables are
 * equal and that each writes exactly n of them. `counted` is multiplications.
 */
export const X = 3n;

export const POWERS_SLOW: Program = {
  id: 'powers-slow',
  title: 'powers, from scratch',
  slide: 'Chapter 6, not from the slides',
  lines: ['for k = 1 to n do', '  p = 1', '  for t = 1 to k do', '    p = p · x', '  P[k] = p'],
  run(n) {
    const out: Step[] = [];
    for (let k = 1; k <= n; k++) {
      let p = 1n;
      out.push({ line: 2, k, counted: false });
      for (let t = 1; t <= k; t++) {
        p *= X;
        out.push({ line: 4, k, j: t, counted: true });
      }
      out.push({ line: 5, k, out: String(p), counted: false });
    }
    return out;
  },
  count: poly(0, '1/2', '1/2'),
  countText: 'n(n + 1)/2',
  growth: grows(2),
  unit: 'multiplications',
};

export const POWERS_FAST: Program = {
  id: 'powers-fast',
  title: 'powers, reusing the last one',
  slide: 'Chapter 6, not from the slides',
  lines: ['p = 1', 'for k = 1 to n do', '  p = p · x', '  P[k] = p'],
  run(n) {
    const out: Step[] = [{ line: 1, counted: false }];
    let p = 1n;
    for (let k = 1; k <= n; k++) {
      p *= X;
      out.push({ line: 3, k, counted: true });
      out.push({ line: 4, k, out: String(p), counted: false });
    }
    return out;
  },
  count: poly(0, 1),
  countText: 'n',
  growth: grows(1),
  unit: 'multiplications',
};

/** An n × n times table: n² entries to write, so no algorithm for it is faster than Ω(n²). */
export const TIMES_TABLE: Program = {
  id: 'times-table',
  title: 'times table',
  slide: 'Chapter 6, not from the slides',
  lines: ['for i = 1 to n do', '  for j = 1 to n do', '    T[i, j] = i · j'],
  run(n) {
    const out: Step[] = [];
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= n; j++) out.push({ line: 3, i, j, out: String(i * j), counted: true });
    return out;
  },
  count: poly(0, 0, 1),
  countText: 'n²',
  growth: grows(2),
  unit: 'entries written',
};

/** What a program writes, in order: the output whose size is a floor on any algorithm for it. */
export const written = (p: Program, n: number): string[] =>
  p.run(n).flatMap((s) => (s.out === undefined ? [] : [s.out]));

export const PROGRAMS: readonly Program[] = [
  PRINT1,
  PRINT2,
  FOO,
  BAR,
  SUM_PRODUCT,
  TRIANGLES,
  DEEPER,
  POWERS_SLOW,
  POWERS_FAST,
  TIMES_TABLE,
];

export const countOf = (p: Program, n: number): number => p.run(n).filter((s) => s.counted).length;

/**
 * The lecture's "easy way" for sum-product: keep only the steps with i ≤ n/2
 * and j ≥ n/2. Every one of them has j ≥ i, so they all really run, and there
 * are ⌊n/2⌋ · (⌊n/2⌋ + 1) of them.
 *
 * The slide says "at least (n/2)²". That is true when n is even, where the
 * count is n/2 · (n/2 + 1). For odd n it is a quarter short: at n = 5 the
 * square has 2 · 3 = 6 steps and (5/2)² = 6.25. The conclusion survives, since
 * the count is at least ((n − 1)/2)², which is Ω(n²) all the same, and the
 * page says so rather than repeat the slide's line as if it held for every n.
 */
export const inSquare = (n: number, i: number, j: number): boolean => 2 * i <= n && 2 * j >= n;

export const squareCount = (n: number): number => Math.floor(n / 2) * (Math.floor(n / 2) + 1);
