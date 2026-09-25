import { describe, expect, it } from 'vitest';
import {
  UNLIMITED,
  adversary,
  apply,
  evaluate,
  explain,
  firstBoardList,
  halving,
  isFound,
  isStranded,
  log2Ceil,
  parseList,
  phaseOf,
  run,
  scan,
  start,
  stride,
} from '../src/core/boards.ts';
import type { Knowledge, Strategy } from '../src/core/boards.ts';

/**
 * The engine, checked against the conventions and against a second, plainer
 * computation wherever there is one.
 */

/** Tests a first-board list needs at strength s, worked out by hand-rule rather than by running it. */
function byRule(list: readonly number[], n: number, s: number): number {
  let used = 0;
  let held = 0;
  for (const w of list) {
    used++;
    if (w > s) return used + Math.min(s + 1, w - 1) - held; // second board walks up from held + 1
    held = w;
  }
  // Held through the list: the first board walks on from the last listed weight.
  return used + Math.min(s + 1, n) - held;
}

describe('conventions', () => {
  it('a board of strength s holds w exactly when w <= s', () => {
    const r = run(scan(), 10, 4);
    expect(r.tests.map((t) => [t.w, t.broke])).toEqual([
      [1, false],
      [2, false],
      [3, false],
      [4, false],
      [5, true],
    ]);
    expect(r.outcome).toEqual({ kind: 'found', strength: 4 });
  });

  it('strength 0 breaks under weight 1; strength n holds everything', () => {
    expect(run(scan(), 10, 0).tests).toHaveLength(1);
    expect(run(scan(), 10, 0).outcome).toEqual({ kind: 'found', strength: 0 });
    const top = run(scan(), 10, 10);
    expect(top.tests.every((t) => !t.broke)).toBe(true);
    expect(top.outcome).toEqual({ kind: 'found', strength: 10 });
  });

  it('breaking a board is fine if the strength is already pinned down', () => {
    // Strength 9 of 10: 10 breaks the only board, but 9 held, so the answer is known.
    const r = run(scan(), 10, 9);
    expect(r.tests[r.tests.length - 1]).toMatchObject({ w: 10, broke: true });
    expect(r.outcome).toEqual({ kind: 'found', strength: 9 });
  });

  it('apply narrows lo..hi and spends a board only on a break', () => {
    const k = start(20, 2);
    expect(apply(k, 8, false)).toMatchObject({ lo: 8, hi: 20, boards: 2, tests: 1 });
    expect(apply(k, 8, true)).toMatchObject({ lo: 0, hi: 7, boards: 1, broken: 1, tests: 1 });
    expect(isFound({ ...k, lo: 5, hi: 5 })).toBe(true);
    expect(isStranded({ ...k, lo: 0, hi: 1, boards: 0 })).toBe(true);
  });
});

describe('the evaluator', () => {
  it('one board: worst case n, at n - 1 and n, for every n', () => {
    for (let n = 1; n <= 60; n++) {
      const ev = evaluate(scan(), n);
      expect(ev.ok).toBe(true);
      expect(ev.worst).toBe(n);
      expect(ev.worstAt).toEqual(n === 1 ? [0, 1] : [n - 1, n]);
      expect(ev.perStrength).toEqual(Array.from({ length: n + 1 }, (_, s) => Math.min(s + 1, n)));
    }
  });

  it('halving with plenty of boards: worst case ceil(log2(n + 1))', () => {
    for (let n = 1; n <= 300; n++) {
      const ev = evaluate(halving(), n);
      expect(ev.ok, `n = ${n}`).toBe(true);
      expect(ev.worst, `n = ${n}`).toBe(Math.ceil(Math.log2(n + 1)));
      expect(log2Ceil(n)).toBe(ev.worst);
    }
  });

  it('halving with two boards fails, and says where and why', () => {
    const ev = evaluate(halving(2), 100);
    expect(ev.ok).toBe(false);
    expect(ev.failure?.s).toBe(0);
    expect(ev.failure?.why).toBe(
      'Both boards broke (at 50 and 25), and the strength could still be anything from 0 to 24.',
    );
    // High strengths never break a board, so they still succeed.
    expect(ev.perStrength[100]).toBe(7);
  });

  it('halving with enough boards for n never fails', () => {
    for (let n = 1; n <= 64; n++) expect(evaluate(halving(log2Ceil(n)), n).ok).toBe(true);
  });

  it('skipping with one board fails between every pair of tests', () => {
    const ev = evaluate(stride(2), 20);
    expect(ev.ok).toBe(false);
    expect(ev.failure?.s).toBe(0);
    expect(ev.failure?.why).toBe(
      'The only board broke at 2, and the strength could still be 0 or 1.',
    );
    // Every strength but 20 ends with the board broken between two neighbours
    // it never told apart.
    const failing = ev.perStrength.flatMap((c, s) => (c === null ? [s] : []));
    expect(failing).toEqual(Array.from({ length: 20 }, (_, s) => s));
  });

  it('a strategy that asks for a useless weight is reported, not trusted', () => {
    const silly: Strategy = { name: 'again', boards: 2, next: (k) => (k.tests === 0 ? 5 : 5) };
    const r = run(silly, 10, 7);
    expect(r.outcome).toEqual({ kind: 'invalid', w: 5, lo: 5, hi: 10 });
    expect(explain(r)).toBe(
      'The strategy asked for weight 5, but only 6 to 10 would tell it anything.',
    );
    const quits: Strategy = { name: 'quits', boards: 2, next: () => null };
    expect(evaluate(quits, 3).failure?.why).toBe(
      'The strategy stopped with the strength still anything from 0 to 3.',
    );
  });
});

describe('first-board lists', () => {
  const lists: readonly (readonly number[])[] = [
    [],
    [8, 16, 24],
    [20, 40],
    [5, 10, 15, 20, 25],
    [1],
    [30],
    [1, 2, 3],
    [29, 30],
    [3, 11, 12, 27],
  ];

  it('never fail, and match the hand rule at every strength', () => {
    for (const n of [30, 31, 50]) {
      for (const all of lists) {
        const list = all.filter((w) => w <= n);
        const ev = evaluate(firstBoardList(list), n);
        expect(ev.ok).toBe(true);
        for (let s = 0; s <= n; s++)
          expect(ev.perStrength[s], `${list.join()} n=${n} s=${s}`).toBe(byRule(list, n, s));
      }
    }
  });

  it('random lists: never fail, match the hand rule, and never beat halving', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let trial = 0; trial < 300; trial++) {
      const n = 2 + Math.floor(rand() * 120);
      const list = Array.from({ length: n }, (_, i) => i + 1).filter(() => rand() < 0.12);
      const ev = evaluate(firstBoardList(list), n);
      expect(ev.ok).toBe(true);
      for (let s = 0; s <= n; s++) expect(ev.perStrength[s]).toBe(byRule(list, n, s));
      expect(ev.worst).toBeGreaterThanOrEqual(log2Ceil(n));
      expect(ev.worst).toBeLessThanOrEqual(n);
    }
  });

  it('the second board only ever goes up one weight at a time', () => {
    const list = [8, 16, 24];
    for (let s = 0; s <= 30; s++) {
      const second = run(firstBoardList(list), 30, s).tests.filter((t) => t.board === 2);
      second.forEach((t, i) => {
        if (i > 0) expect(t.w).toBe((second[i - 1]?.w ?? 0) + 1);
      });
    }
  });

  it('labels each test with its phase', () => {
    const list = [8, 16];
    const r = run(firstBoardList(list), 20, 18);
    expect(r.tests.map((t) => phaseOf(list, t))).toEqual([
      'list',
      'list',
      'after',
      'after',
      'after',
    ]);
    const b = run(firstBoardList(list), 20, 10);
    expect(b.tests.map((t) => phaseOf(list, t))).toEqual([
      'list',
      'list',
      'second',
      'second',
      'second',
    ]);
  });
});

describe('parseList', () => {
  it('reads commas and spaces', () => {
    expect(parseList('10, 25 40', 50)).toEqual({ ok: true, list: [10, 25, 40] });
    expect(parseList('  ', 50)).toEqual({ ok: true, list: [] });
  });

  it('refuses what is not a list of weights going up', () => {
    expect(parseList('10, 5', 50)).toMatchObject({ ok: false });
    expect(parseList('10, 10', 50)).toMatchObject({ ok: false });
    expect(parseList('0, 5', 50)).toMatchObject({ ok: false });
    expect(parseList('51', 50)).toMatchObject({ ok: false });
    expect(parseList('2.5', 50)).toMatchObject({ ok: false });
    expect(parseList('ten', 50)).toMatchObject({ ok: false });
  });
});

describe('the adversary', () => {
  it('always answers consistently, and a one-at-a-time player always beats it in n tests', () => {
    for (const n of [5, 12, 30]) {
      let k: Knowledge = start(n, 1);
      while (!isFound(k)) {
        const w = k.lo + 1;
        const broke = adversary(k, w);
        k = apply(k, w, broke);
        expect(isStranded(k)).toBe(false);
      }
      expect(k.tests).toBeLessThanOrEqual(n);
    }
  });

  it('breaks the last board whenever that strands the player', () => {
    const k = start(20, 1);
    expect(adversary(k, 3)).toBe(true);
    expect(adversary(k, 1)).toBe(false);
  });

  it('with boards to spare it keeps the larger half, so halving still needs the full count', () => {
    for (const n of [7, 20, 100]) {
      let k: Knowledge = start(n, UNLIMITED);
      while (!isFound(k)) {
        const w = k.lo + Math.ceil((k.hi - k.lo) / 2);
        k = apply(k, w, adversary(k, w));
      }
      expect(k.tests).toBe(log2Ceil(n));
    }
  });
});
