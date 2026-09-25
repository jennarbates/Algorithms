import { describe, expect, it } from 'vitest';
import { check } from '../src/core/bounds.ts';
import { parseQ, poly } from '../src/core/poly.ts';
import { PRINT1, PRINT2, SUM_PRODUCT, countOf, squareCount } from '../src/core/programs.ts';
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

  it('largest-c: 0.5 from 20, 2 and 20 never', () => {
    const T = poly(-10, 1);
    const f = poly(0, 1);
    expect(check(T, f, 'Ω', { lower: Q('0.5'), n0: 20 })).toEqual({ ok: true });
    expect(check(T, f, 'Ω', { lower: Q('2'), n0: 0 })).toMatchObject({ ok: false, hopeless: true });
  });
});
