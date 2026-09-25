/**
 * Boards, weights, and strategies for finding a board's bending strength.
 *
 * The conventions, used everywhere on the page and in the questions:
 *
 * - Weights are the whole numbers 1 to n (n one-pound weights stacked up).
 * - The bending strength s is the largest weight a board holds. It is one of
 *   the n + 1 whole numbers 0 to n. s = 0 means the board breaks under a single
 *   pound; s = n means it holds all n and never breaks in this experiment.
 * - Testing weight w on a board breaks it exactly when w > s. A broken board is
 *   gone. A board that holds is as good as new and can be tested again.
 * - Every board is identical, so they all have the same s.
 * - A test is one weight put on one board, whether it holds or breaks. The
 *   test that breaks a board counts.
 * - The strength is found when only one value of s is still possible. Running
 *   out of boards while two or more are possible is a failure, not a guess.
 *
 * What the tester knows at any point is an interval: s is somewhere in lo..hi.
 * lo is the heaviest weight seen held (0 before any), hi is one less than the
 * lightest weight seen to break (n before any). A useful test is a weight w
 * with lo < w <= hi; anything else has a known answer and is refused.
 *
 * A strategy is an adaptive procedure: given what is known, the next weight.
 * Because every useful test shrinks lo..hi, a run takes at most n tests, and
 * `evaluate` can afford to run a strategy against every possible s.
 *
 * Imports carry `.ts` and the file uses only erasable TypeScript, as in
 * `../bounds`, so Node can load it directly.
 */

/** Stands for "as many boards as you like". */
export const UNLIMITED = Number.POSITIVE_INFINITY;

export interface Knowledge {
  readonly n: number;
  /** s is at least this. */
  readonly lo: number;
  /** s is at most this. */
  readonly hi: number;
  /** Boards still unbroken. */
  readonly boards: number;
  /** Boards broken so far. */
  readonly broken: number;
  /** Tests made so far. */
  readonly tests: number;
}

export interface Test {
  readonly w: number;
  readonly broke: boolean;
  /** Which board carried it, 1 for the first. */
  readonly board: number;
  /** What was known after it. */
  readonly after: Knowledge;
}

export interface Strategy {
  readonly name: string;
  readonly boards: number;
  /** The next weight to test, or null to give up. */
  readonly next: (k: Knowledge) => number | null;
}

export type Outcome =
  | { readonly kind: 'found'; readonly strength: number }
  | { readonly kind: 'stranded'; readonly lo: number; readonly hi: number }
  | {
      readonly kind: 'invalid';
      readonly w: number | null;
      readonly lo: number;
      readonly hi: number;
    };

export interface Run {
  readonly n: number;
  readonly s: number;
  readonly boards: number;
  readonly tests: readonly Test[];
  readonly outcome: Outcome;
}

export function start(n: number, boards: number): Knowledge {
  return { n, lo: 0, hi: n, boards, broken: 0, tests: 0 };
}

export const isFound = (k: Knowledge) => k.lo === k.hi;
export const isStranded = (k: Knowledge) => k.lo < k.hi && k.boards <= 0;
export const isUseful = (k: Knowledge, w: number) => Number.isInteger(w) && w > k.lo && w <= k.hi;
/** How many strengths are still possible. */
export const candidates = (k: Knowledge) => k.hi - k.lo + 1;

/** Record the answer to testing w. The caller has checked w is useful. */
export function apply(k: Knowledge, w: number, broke: boolean): Knowledge {
  return broke
    ? { ...k, hi: w - 1, boards: k.boards - 1, broken: k.broken + 1, tests: k.tests + 1 }
    : { ...k, lo: w, tests: k.tests + 1 };
}

/** Run a strategy against a board of true strength s. */
export function run(strategy: Strategy, n: number, s: number): Run {
  let k = start(n, strategy.boards);
  const tests: Test[] = [];
  const done = (outcome: Outcome): Run => ({ n, s, boards: strategy.boards, tests, outcome });

  // Every useful test shrinks lo..hi by at least one, so n + 1 rounds is plenty.
  for (let round = 0; round <= n + 1; round++) {
    if (isFound(k)) return done({ kind: 'found', strength: k.lo });
    if (isStranded(k)) return done({ kind: 'stranded', lo: k.lo, hi: k.hi });
    const w = strategy.next(k);
    if (w === null || !isUseful(k, w)) return done({ kind: 'invalid', w, lo: k.lo, hi: k.hi });
    const broke = w > s;
    const board = k.broken + 1;
    k = apply(k, w, broke);
    tests.push({ w, broke, board, after: k });
  }
  return done({ kind: 'invalid', w: null, lo: k.lo, hi: k.hi });
}

export interface Evaluation {
  readonly n: number;
  /** True when every strength 0..n is found without running out of boards. */
  readonly ok: boolean;
  /** Tests used for each s = 0..n, or null where the strategy fails. */
  readonly perStrength: readonly (number | null)[];
  /** The most tests any s needs, over the strengths that succeed. */
  readonly worst: number;
  /** Every s that needs `worst` tests. */
  readonly worstAt: readonly number[];
  /** The first s where the strategy fails, with the run that shows it. */
  readonly failure: { readonly s: number; readonly run: Run; readonly why: string } | null;
}

/** Run the strategy against every possible strength and report the worst. */
export function evaluate(strategy: Strategy, n: number): Evaluation {
  const perStrength: (number | null)[] = [];
  let failure: Evaluation['failure'] = null;
  for (let s = 0; s <= n; s++) {
    const r = run(strategy, n, s);
    if (r.outcome.kind === 'found' && r.outcome.strength === s) perStrength.push(r.tests.length);
    else {
      perStrength.push(null);
      failure ??= { s, run: r, why: explain(r) };
    }
  }
  const counts = perStrength.filter((c): c is number => c !== null);
  const worst = counts.length ? Math.max(...counts) : 0;
  const worstAt = perStrength.flatMap((c, s) => (c === worst ? [s] : []));
  return { n, ok: failure === null, perStrength, worst, worstAt, failure };
}

/** "1, 2 and 3". */
export function andList(xs: readonly (number | string)[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${String(xs[xs.length - 1])}`;
}

/** "anything from 0 to 24", "0 or 1". */
export function range(lo: number, hi: number): string {
  if (lo === hi) return `${lo}`;
  if (hi === lo + 1) return `${lo} or ${hi}`;
  return `anything from ${lo} to ${hi}`;
}

/** A sentence saying how a run ended. */
export function explain(r: Run): string {
  const o = r.outcome;
  if (o.kind === 'found')
    return `Found: the strength is ${o.strength}, in ${r.tests.length} tests.`;
  if (o.kind === 'invalid') {
    if (o.w === null) return `The strategy stopped with the strength still ${range(o.lo, o.hi)}.`;
    return `The strategy asked for weight ${o.w}, but only ${o.lo + 1} to ${o.hi} would tell it anything.`;
  }
  const breaks = r.tests.filter((t) => t.broke).map((t) => t.w);
  const who =
    r.boards === 1
      ? `The only board broke at ${breaks[0] ?? '?'}`
      : r.boards === 2
        ? `Both boards broke (at ${andList(breaks)})`
        : `All ${r.boards} boards broke (at ${andList(breaks)})`;
  return `${who}, and the strength could still be ${range(o.lo, o.hi)}.`;
}

// --- strategies ------------------------------------------------------------------

/** One weight at a time from the bottom: the only safe way with a single board. */
export function scan(boards = 1): Strategy {
  return { name: 'one at a time', boards, next: (k) => k.lo + 1 };
}

/** Jump `step` weights at a time: the unsafe way with one board, for contrast. */
export function stride(step: number, boards = 1): Strategy {
  return {
    name: `every ${step === 2 ? 'other' : `${step}th`} weight`,
    boards,
    next: (k) => Math.min(k.hi, k.lo + step),
  };
}

/** Test the middle of what is still possible: binary search, lectures' standard. */
export function halving(boards: number = UNLIMITED): Strategy {
  return {
    name: 'halving',
    boards,
    next: (k) => k.lo + Math.ceil((k.hi - k.lo) / 2),
  };
}

/**
 * The reader's two-board strategy: the first board is tested at the listed
 * weights in order. Once it breaks, the second board has to scan upward from the
 * last weight that held, one weight at a time, because a break with the last
 * board and two or more strengths left is a failure. If the first board holds
 * through the whole list, it carries on one weight at a time after the last.
 */
export function firstBoardList(list: readonly number[]): Strategy {
  return {
    name: list.length ? list.join(', ') : '(no list)',
    boards: 2,
    next: (k) => {
      if (k.broken === 0) {
        const w = list.find((x) => x > k.lo);
        if (w !== undefined && w <= k.hi) return w;
      }
      return k.lo + 1;
    },
  };
}

/** Which phase a test in a list strategy belongs to, for the picture. */
export function phaseOf(list: readonly number[], t: Test): 'list' | 'after' | 'second' {
  if (t.board > 1) return 'second';
  return list.includes(t.w) ? 'list' : 'after';
}

export type Parsed =
  | { readonly ok: true; readonly list: readonly number[] }
  | { readonly ok: false; readonly why: string };

/** Read "10, 25, 40" as a list of first-board weights for weights 1..n. */
export function parseList(text: string, n: number): Parsed {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter((p) => p !== '');
  const list: number[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { ok: false, why: `"${p}" is not a whole number.` };
    const w = Number(p);
    if (w < 1 || w > n) return { ok: false, why: `${w} is not a weight: they run from 1 to ${n}.` };
    const prev = list[list.length - 1];
    if (prev !== undefined && w <= prev)
      return { ok: false, why: `${w} comes after ${prev}: the list has to go up.` };
    list.push(w);
  }
  return { ok: true, list };
}

// --- playing ---------------------------------------------------------------------

/**
 * An adversary's answer to testing w, for the play mode. It can say anything
 * consistent with what the tester knows, since any s in lo..hi is still
 * possible. It breaks the last board whenever that leaves two or more
 * strengths, which ends the game in its favour; otherwise it leaves the larger
 * set of strengths, breaking on a tie. Greedy, not perfect: it never looks
 * further ahead than one test.
 */
export function adversary(k: Knowledge, w: number): boolean {
  const ifBreak = w - k.lo; // lo..w-1
  const ifHold = k.hi - w + 1; // w..hi
  if (k.boards === 1 && ifBreak >= 2) return true;
  return ifBreak >= ifHold;
}

/** ⌈log₂(n + 1)⌉: how many tests halving needs at worst for n + 1 strengths. */
export function log2Ceil(n: number): number {
  let t = 0;
  while (2 ** t < n + 1) t++;
  return t;
}
