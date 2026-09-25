import { describe, expect, it } from 'vitest';
import { check } from '../src/core/bounds.ts';
import { parseQ, poly } from '../src/core/poly.ts';
import { poly as g, relates } from '../src/core/growth.ts';
import {
  DEEPER,
  POWERS_FAST,
  POWERS_SLOW,
  PRINT1,
  PRINT2,
  SUM_PRODUCT,
  TIMES_TABLE,
  TRIANGLES,
  countOf,
  squareCount,
  written,
} from '../src/core/programs.ts';
import { QUESTIONS, TIERS, questionsIn } from '../src/content/questions.ts';
import type { Question } from '../src/content/questions.ts';

/**
 * The bank, checked rather than trusted. Computed answers are recomputed here a
 * second, slower way; written claims about particular functions are tested.
 */

const Q = (s: string) => parseQ(s) as NonNullable<ReturnType<typeof parseQ>>;
const byId = (id: string): Question => {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(id);
  return q;
};
const answer = (id: string) => {
  const q = byId(id);
  if (q.kind !== 'number') throw new Error(id);
  return q.answer;
};

describe('shape', () => {
  it('the right option moves around, so it cannot be found by position', () => {
    for (const t of TIERS) {
      const places = questionsIn(t)
        .filter((q) => q.kind === 'choice')
        .map((q) => (q.kind === 'choice' ? q.options.findIndex((o) => o.ok) : -1));
      if (places.length > 1) expect(new Set(places).size, `tier ${t}`).toBeGreaterThan(1);
    }
  });

  it('ids unique, every tier populated', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const t of TIERS) expect(questionsIn(t).length).toBeGreaterThanOrEqual(5);
  });

  it('choices have one right option, multis at least one', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'choice')
        expect(
          q.options.filter((o) => o.ok),
          q.id,
        ).toHaveLength(1);
      if (q.kind === 'multi')
        expect(
          q.options.some((o) => o.ok),
          q.id,
        ).toBe(true);
    }
  });

  it('near misses are wrong and distinct', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'number') continue;
      const vs = q.near.map((x) => x.v);
      expect(vs, q.id).not.toContain(q.answer);
      expect(new Set(vs).size).toBe(vs.length);
    }
  });

  it("every witness question's example really is a witness", () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'witness') continue;
      const w = {
        n0: q.example.n0,
        ...(q.example.lower ? { lower: Q(q.example.lower) } : {}),
        ...(q.example.upper ? { upper: Q(q.example.upper) } : {}),
      };
      expect(check(q.T, q.f, q.rel, w), q.id).toEqual({ ok: true });
    }
  });
});

describe('numbers, the slow way', () => {
  it('half-n0: the first n with n - 10 >= n/2', () => {
    let n = 0;
    while (!(n - 10 >= n / 2)) n++;
    expect(answer('half-n0')).toBe(n);
  });

  it('print1-at-10 and the tracer agree', () => {
    expect(answer('print1-at-10')).toBe(countOf(PRINT1, 10));
    expect(countOf(PRINT2, 10)).toBe(20);
  });

  it('sp-at-10 and square-at-10', () => {
    expect(answer('sp-at-10')).toBe(countOf(SUM_PRODUCT, 10));
    expect(answer('square-at-10')).toBe(squareCount(10));
    expect(squareCount(5)).toBe(6);
  });

  it('triple: count the loops', () => {
    let c = 0;
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= i; j++) for (let k = 1; k <= j; k++) c++;
    expect(answer('triple')).toBe(c);
  });

  it('triangles-at-8 and deeper-at-6: run the loops by hand', () => {
    let t = 0;
    for (let i = 1; i <= 8; i++)
      for (let j = i + 1; j <= 8; j++) for (let k = j + 1; k <= 8; k++) t++;
    expect(answer('triangles-at-8')).toBe(t);
    expect(countOf(TRIANGLES, 8)).toBe(t);
    let d = 0;
    for (let i = 1; i <= 6; i++) for (let j = i; j <= 6; j++) for (let k = 1; k <= j; k++) d++;
    expect(answer('deeper-at-6')).toBe(d);
    expect(countOf(DEEPER, 6)).toBe(d);
  });

  it('box-at-9: the triples with i in 1..3, j in 4..6, k in 7..9, all of which run', () => {
    let kept = 0;
    for (let i = 1; i <= 9; i++)
      for (let j = i + 1; j <= 9; j++)
        for (let k = j + 1; k <= 9; k++) if (i <= 3 && j >= 4 && j <= 6 && k >= 7) kept++;
    expect(answer('box-at-9')).toBe(kept);
  });

  it('slow-at-10 and speedup-at-199', () => {
    let m = 0;
    for (let k = 1; k <= 10; k++) for (let t = 1; t <= k; t++) m++;
    expect(answer('slow-at-10')).toBe(m);
    expect(answer('speedup-at-199')).toBe(countOf(POWERS_SLOW, 199) / countOf(POWERS_FAST, 199));
    expect(answer('speedup-at-199')).toBe(100);
  });

  it('brute-force: 10!', () => {
    let f = 1;
    for (let k = 2; k <= 10; k++) f *= k;
    expect(answer('brute-force')).toBe(f);
  });
});

describe('written claims', () => {
  it('witness-theta: c2 = 50 works from n = 1 and not from 0', () => {
    const T = poly(1, 17, 32);
    const n2 = poly(0, 0, 1);
    expect(check(T, n2, 'O', { upper: Q('50'), n0: 1 })).toEqual({ ok: true });
    expect(check(T, n2, 'O', { upper: Q('50'), n0: 0 })).toMatchObject({ ok: false, at: 0 });
  });

  it('growth-choice: 2^n passes n^10 between 58 and 59 and stays ahead', () => {
    const big = (n: number) => 2n ** BigInt(n) > BigInt(n) ** 10n;
    expect(big(58)).toBe(false);
    expect(big(59)).toBe(true);
    for (let n = 59; n <= 300; n++) expect(big(n)).toBe(true);
  });

  it('which-true: the n³ floor and the n ceiling really fail', () => {
    const T = poly(1, 17, 32);
    expect(check(T, poly(0, 1), 'O', { upper: Q('1000'), n0: 0 })).toMatchObject({
      ok: false,
      hopeless: true,
    });
    expect(check(T, poly(0, 0, 0, 1), 'Ω', { lower: Q('0.001'), n0: 0 })).toMatchObject({
      ok: false,
      hopeless: true,
    });
    expect(check(T, poly(0, 1), 'Ω', { lower: Q('1'), n0: 0 })).toEqual({ ok: true });
  });

  it('box-which: only the ordered thirds are all real triples', () => {
    const n = 30;
    const runs = (i: number, j: number, k: number) => i < j && j < k;
    const all = (inside: (i: number, j: number, k: number) => boolean) => {
      for (let i = 1; i <= n; i++)
        for (let j = 1; j <= n; j++)
          for (let k = 1; k <= n; k++) if (inside(i, j, k) && !runs(i, j, k)) return false;
      return true;
    };
    expect(all((i, j, k) => 2 * i <= n && 2 * j <= n && 2 * k >= n)).toBe(false);
    expect(all((i, j, k) => 3 * i <= n && 3 * j <= n && 3 * k <= n)).toBe(false);
    expect(all((i, j, k) => 3 * i <= n && 3 * j > n && 3 * j <= 2 * n && 3 * k > 2 * n)).toBe(true);
    expect(all(() => true)).toBe(false);
  });

  it('deeper-bounds: exactly the ticked options hold', () => {
    const q = byId('deeper-bounds');
    if (q.kind !== 'multi') throw new Error();
    const truth = [
      relates(DEEPER.growth, 'Θ', g(3)),
      relates(DEEPER.growth, 'O', g(4)),
      relates(DEEPER.growth, 'Ω', g(2)),
      relates(DEEPER.growth, 'O', g(2)),
      relates(DEEPER.growth, 'Θ', g(2)),
      relates(DEEPER.growth, 'Ω', g(4)),
    ];
    expect(q.options.map((o) => o.ok === true)).toEqual(truth);
  });

  it('strictly-faster: n against 2n is below everywhere and still Θ', () => {
    expect(check(poly(0, 1), poly(0, 2), 'Θ', { lower: Q('1/2'), upper: Q('1/2'), n0: 0 })).toEqual(
      { ok: true },
    );
  });

  it('which-floor: the output sizes', () => {
    for (const n of [5, 12]) {
      expect(written(TIMES_TABLE, n)).toHaveLength(n * n);
      expect(written(POWERS_SLOW, n)).toHaveLength(n);
      expect(written(POWERS_FAST, n)).toHaveLength(n);
    }
  });

  it('largest-c: 0.5 from 20, 2 and 20 never', () => {
    const T = poly(-10, 1);
    const f = poly(0, 1);
    expect(check(T, f, 'Ω', { lower: Q('0.5'), n0: 20 })).toEqual({ ok: true });
    expect(check(T, f, 'Ω', { lower: Q('2'), n0: 0 })).toMatchObject({ ok: false, hopeless: true });
  });
});
