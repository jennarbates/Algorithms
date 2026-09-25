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

export const PROGRAMS: readonly Program[] = [PRINT1, PRINT2, FOO, BAR, SUM_PRODUCT];

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
