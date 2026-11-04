import { describe, expect, it } from 'vitest';
import { bestN0, bestN0Clrs, check } from '../src/core/bounds.ts';
import { parseQ, poly } from '../src/core/poly.ts';
import { expo, poly as g, relates } from '../src/core/growth.ts';
import {
  DEEPER,
  HORNER,
  POLY_NAIVE,
  POWERS_FAST,
  POWERS_SLOW,
  PRINT1,
  PRINT2,
  SUM_PRODUCT,
  TIMES_TABLE,
  TRIANGLES,
  ascending,
  countOf,
  descending,
  insertionSort,
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

  it('clrs-o-nonneg: scan for the first n0 >= 1 with 0 <= n - 10 <= n from there on', () => {
    const holds = (n: number) => 0 <= n - 10 && n - 10 <= n;
    let n0 = 1;
    for (let n = 1; n <= 2000; n++) if (!holds(n)) n0 = n + 1;
    expect(answer('clrs-o-nonneg')).toBe(n0);
    expect(n0).toBe(10);
    // this page's definition asks only n - 10 <= n, which holds from 0
    let page = 0;
    for (let n = 0; n <= 2000; n++) if (!(n - 10 <= n)) page = n + 1;
    expect(page).toBe(0);
    expect(byId('clrs-o-nonneg').prompt).toContain(`smallest n₀ is ${page}`);
  });

  it('clrs-half-n2: the first n0 from which n²/14 <= n²/2 - 3n <= n²/2, scanned', () => {
    const q = byId('clrs-half-n2');
    if (q.kind !== 'witness') throw new Error();
    let n0 = 0;
    for (let n = 0; n <= 2000; n++) {
      const t = (n * n) / 2 - 3 * n;
      if (!((n * n) / 14 <= t && t <= (n * n) / 2)) n0 = n + 1;
    }
    expect(q.example.n0).toBe(n0);
    expect(n0).toBe(7);
  });

  it('clrs-insertion-while: run the while test by hand on 10, 9, ..., 1', () => {
    const A = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    let tests = 0;
    for (let j = 1; j < A.length; j++) {
      const key = A[j] as number;
      let i = j - 1;
      for (;;) {
        tests++;
        if (!(i >= 0 && (A[i] as number) > key)) break;
        A[i + 1] = A[i] as number;
        i--;
      }
      A[i + 1] = key;
    }
    expect(answer('clrs-insertion-while')).toBe(tests);
    expect(tests).toBe((10 * 11) / 2 - 1);
  });

  it('clrs-one-second: 12! fits in 10⁹ steps, 13! does not; 2ⁿ to 29, n² to 31,622', () => {
    let f = 1n;
    let n = 0;
    while (f * BigInt(n + 1) <= 1000000000n) f *= BigInt(++n);
    expect(answer('clrs-one-second')).toBe(n);
    expect(n).toBe(12);
    let e = 0;
    while (2 ** (e + 1) <= 1e9) e++;
    expect(e).toBe(29);
    let r = 0;
    while ((r + 1) * (r + 1) <= 1e9) r++;
    expect(r).toBe(31622);
    const q = byId('clrs-one-second');
    if (q.kind !== 'number') throw new Error();
    expect(q.near.map((x) => x.v)).toEqual([13, e, 10]);
    expect(q.why).toContain('n = 31,622');
  });

  it('clrs-horner: count the loop by hand', () => {
    let m = 0;
    for (let i = 10; i >= 0; i--) m++;
    expect(answer('clrs-horner')).toBe(m);
    let naive = 0;
    for (let k = 0; k <= 10; k++) for (let t = 1; t <= k; t++) naive++;
    expect(countOf(POLY_NAIVE, 10)).toBe(naive);
    expect(countOf(HORNER, 10)).toBe(11);
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

  it('clrs-o-nonneg: the near misses and the close', () => {
    // n − 10 is −9 at n = 1, and exactly 0 at n = 10
    expect(1 - 10).toBe(-9);
    const T = poly(-10, 1);
    // CLRS's witness for an + b = O(n²) on n − 10: c = 1 + |−10| = 11, n₀ = max(1, 10) = 10
    expect(bestN0Clrs(T, poly(0, 0, 1), 'O', { upper: Q('11') })).toBe(10);
    // and where this page's answer is 0, CLRS's is 1
    expect(bestN0(poly(10, 4), poly(0, 1), 'Ω', { lower: Q('4') })).toBe(0);
    expect(bestN0Clrs(poly(10, 4), poly(0, 1), 'Ω', { lower: Q('4') })).toBe(1);
  });

  it("no numeric n0 in the bank moves under CLRS, only witness-4n's 0", () => {
    expect(answer('half-n0')).toBe(bestN0Clrs(poly(-10, 1), poly(0, 1), 'Ω', { lower: Q('0.5') }));
    for (const id of ['witness-theta', 'witness-triangles', 'clrs-half-n2']) {
      const q = byId(id);
      if (q.kind !== 'witness') throw new Error(id);
      const w = {
        ...(q.example.lower ? { lower: Q(q.example.lower) } : {}),
        ...(q.example.upper ? { upper: Q(q.example.upper) } : {}),
      };
      expect(bestN0(q.T, q.f, q.rel, w), id).toBe(q.example.n0);
      expect(bestN0Clrs(q.T, q.f, q.rel, w), id).toBe(q.example.n0);
    }
  });

  it('witness-4n: n0 = 0 here, 1 under CLRS', () => {
    const q = byId('witness-4n');
    if (q.kind !== 'witness') throw new Error();
    expect(q.example.n0).toBe(0);
    expect(bestN0Clrs(q.T, q.f, 'Ω', { lower: Q('4') })).toBe(1);
  });

  it('clrs-half-n2: both sides are 3.5 at n = 7, c1 = 1/2 never works, anything below it does', () => {
    const q = byId('clrs-half-n2');
    if (q.kind !== 'witness') throw new Error();
    expect((7 * 7) / 2 - 3 * 7).toBe(3.5);
    expect((7 * 7) / 14).toBe(3.5);
    expect(1 / 2 - 1 / 14).toBeCloseTo(3 / 7, 12);
    expect(check(q.T, q.f, 'O', { upper: Q('1/2'), n0: 1 })).toEqual({ ok: true });
    expect(check(q.T, q.f, 'Ω', { lower: Q('1/2'), n0: 0 })).toMatchObject({
      ok: false,
      hopeless: true,
    });
    expect(bestN0(q.T, q.f, 'Ω', { lower: Q('0.49') })).not.toBeNull();
    // CLRS's extra 0 ≤ c₁n² adds nothing: its smallest n₀ is the same 7
    expect(bestN0Clrs(q.T, q.f, 'Θ', { lower: Q('1/14'), upper: Q('1/2') })).toBe(7);
  });

  it('clrs-insertion-while: the near misses are line 6, 1 + ... + 10 and the sorted case', () => {
    const q = byId('clrs-insertion-while');
    if (q.kind !== 'number') throw new Error();
    const worst = insertionSort(descending(10)).times;
    expect(q.near.map((x) => x.v)).toEqual([worst[5], 55, insertionSort(ascending(10)).times[4]]);
    expect(worst[5]).toBe((10 * 9) / 2);
    expect(55).toBe((10 * 11) / 2);
    expect(insertionSort(ascending(10)).times[4]).toBe(9);
  });

  it('clrs-insertion-bounds: exactly the ticked options hold, from the measured costs', () => {
    const q = byId('clrs-insertion-bounds');
    if (q.kind !== 'multi') throw new Error();
    const cost = (a: number[]) => insertionSort(a).times.reduce((s, t) => s + t, 0);
    // best case: first differences constant, so linear; worst: second differences constant
    const best = (n: number) => cost(ascending(n));
    const worst = (n: number) => cost(descending(n));
    const d1 = best(2) - best(1);
    const d2 = worst(3) - 2 * worst(2) + worst(1);
    for (let n = 1; n <= 60; n++) {
      expect(best(n + 1) - best(n)).toBe(d1);
      expect(worst(n + 2) - 2 * worst(n + 1) + worst(n)).toBe(d2);
    }
    expect(d1).toBeGreaterThan(0);
    expect(d2).toBeGreaterThan(0);
    const B = g(1);
    const W = g(2);
    const truth = [
      relates(W, 'O', g(2)),
      relates(B, 'Ω', g(1)),
      relates(B, 'Ω', g(2)),
      relates(W, 'Ω', g(2)),
      relates(W, 'O', g(2)) && relates(B, 'Ω', g(2)),
      relates(B, 'Θ', g(1)),
    ];
    expect(q.options.map((o) => o.ok === true)).toEqual(truth);
    // about n²/2 shifts on the reversed array
    expect(insertionSort(descending(100)).times[5]).toBe((100 * 99) / 2);
  });

  it('clrs-split: n is a true floor and too weak; the split gives (n/2)², one column under the square', () => {
    expect(relates(g(1), 'Ω', g(2))).toBe(false);
    for (let n = 1; n <= 200; n++) {
      const sum = (n * (n + 1)) / 2;
      expect(sum).toBeGreaterThanOrEqual(n);
      expect(sum).toBeLessThanOrEqual(n * n);
      if (n % 2 === 0) {
        let split = 0;
        for (let k = n / 2 + 1; k <= n; k++) split += n / 2;
        expect(split).toBe((n / 2) ** 2);
        expect(split).toBeLessThanOrEqual(sum);
        expect(split).toBe(squareCount(n) - n / 2);
      }
    }
  });

  it('clrs-one-second: the why and the close', () => {
    let f = 1;
    for (let k = 2; k <= 13; k++) f *= k;
    expect(f).toBe(6227020800);
    expect(Math.floor(f / 1e9)).toBe(6);
    let g14 = 1n;
    for (let k = 2n; k <= 14n; k++) g14 *= k;
    expect(g14 <= 10n ** 12n && g14 * 15n > 10n ** 12n).toBe(true);
    expect(1000000 ** 2).toBe(1e12);
    expect(byId('clrs-one-second').close).toContain('n = 14');
    expect(byId('clrs-one-second').close).toContain('1,000,000');
  });

  it('clrs-exp-constants: 2ⁿ⁺¹ is exactly 2·2ⁿ, and 4ⁿ/2ⁿ = 2ⁿ passes any constant', () => {
    for (let n = 0n; n <= 200n; n++) {
      expect(2n ** (n + 1n)).toBe(2n * 2n ** n);
      expect(2n ** (2n * n) / 2n ** n).toBe(2n ** n);
    }
    expect(2n ** 21n > 10n ** 6n).toBe(true);
    expect(relates(expo(4), 'O', expo(2))).toBe(false);
    expect(relates(expo(2), 'Θ', expo(2))).toBe(true);
    const q = byId('clrs-exp-constants');
    if (q.kind !== 'choice') throw new Error();
    expect(q.options.findIndex((o) => o.ok)).toBe(1);
  });

  it('clrs-horner: Horner and the naive way give the same value, with n + 1 against n(n + 1)/2', () => {
    for (const n of [0, 1, 5, 10, 25]) {
      expect(written(HORNER, n)).toEqual(written(POLY_NAIVE, n));
      expect(countOf(HORNER, n)).toBe(n + 1);
      expect(countOf(POLY_NAIVE, n)).toBe((n * (n + 1)) / 2);
    }
  });

  it('largest-c: 0.5 from 20, 2 and 20 never', () => {
    const T = poly(-10, 1);
    const f = poly(0, 1);
    expect(check(T, f, 'Ω', { lower: Q('0.5'), n0: 20 })).toEqual({ ok: true });
    expect(check(T, f, 'Ω', { lower: Q('2'), n0: 0 })).toMatchObject({ ok: false, hopeless: true });
  });
});
