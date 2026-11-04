import { describe, expect, it } from 'vitest';
import { bestN0, bestN0Clrs, check, relationHolds } from '../src/core/bounds.ts';
import { SLIDE_16, compare, isPolynomial, poly as g, relates } from '../src/core/growth.ts';
import {
  evalQ,
  holdsFrom,
  parseQ,
  poly,
  polyScale,
  polySub,
  q,
  showPoly,
  showQ,
  sign,
  smallestN0,
} from '../src/core/poly.ts';
import type { Poly, Q as Frac } from '../src/core/poly.ts';
import {
  BAR,
  DEEPER,
  FOO,
  HORNER,
  POLY_NAIVE,
  POWERS_FAST,
  POWERS_SLOW,
  PRINT1,
  PRINT2,
  PROGRAMS,
  SUM_PRODUCT,
  TIMES_TABLE,
  TRIANGLES,
  TRIPLE_LOOPS,
  X,
  ascending,
  boxSize,
  countOf,
  descending,
  inBox,
  insertionSort,
  inSquare,
  squareCount,
  written,
} from '../src/core/programs.ts';

const Q = (s: string) => {
  const r = parseQ(s);
  if (!r) throw new Error(s);
  return r;
};

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** The slow truth: scan every whole n up to far past any root. */
function slowSmallestN0(p: Poly, limit = 400): number | null {
  if (p.length > 0 && sign(p[p.length - 1] as never) < 0) return null;
  let last = -1;
  for (let n = 0; n <= limit; n++) if (sign(evalQ(p, n)) < 0) last = n;
  return last + 1;
}

describe('exact arithmetic', () => {
  it('reads decimals and fractions exactly', () => {
    expect(Q('0.99')).toEqual(q(99, 100));
    expect(Q('1/2')).toEqual(q(1, 2));
    expect(Q('1e6')).toEqual(q(1000000));
    expect(Q('-2.5')).toEqual(q(-5, 2));
    expect(parseQ('abc')).toBeNull();
    expect(parseQ('1/0')).toBeNull();
    expect(showQ(q(99, 100))).toBe('0.99');
    expect(showQ(q(1, 3))).toBe('1/3');
  });

  it('writes polynomials the way the slides do', () => {
    expect(showPoly(poly(1, 17, 32))).toBe('32n² + 17n + 1');
    expect(showPoly(poly(-10, 1))).toBe('n − 10');
    expect(showPoly(poly(0, '1/2', '1/2'))).toBe('½n² + ½n');
    expect(showPoly(poly(0, 1000000, 1))).toBe('n² + 10⁶n');
  });

  it('smallestN0 agrees with scanning every n, on 400 random polynomials', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const r = rng(seed);
      const deg = 1 + Math.floor(r() * 3);
      // Integer roots between 0 and 60 as well as random coefficients, so that
      // exact zeros at whole numbers, the hard case, come up often.
      let p: Poly;
      if (r() < 0.5) {
        let cs = [1];
        for (let k = 0; k < deg; k++) {
          const root = Math.floor(r() * 60);
          // multiply by (n - root)
          cs = [...cs.map((c) => -root * c), 0].map((v, i) => v + (i > 0 ? (cs[i - 1] ?? 0) : 0));
        }
        p = poly(...cs);
      } else {
        p = poly(...[...Array(deg + 1).keys()].map(() => Math.floor(r() * 200) - 100));
        if (p.length === 0) continue;
        if (sign(p[p.length - 1] as never) < 0 && r() < 0.7) p = p.map((c) => q(-c.n, c.d));
      }
      expect(smallestN0(p), `seed ${seed}: ${showPoly(p)}`).toBe(slowSmallestN0(p));
      for (const n0 of [0, 3, 17, 40]) {
        const fast = holdsFrom(p, n0);
        let first: number | null = null;
        for (let n = n0; n <= 400; n++) {
          if (sign(evalQ(p, n)) < 0) {
            first = n;
            break;
          }
        }
        if (first === null && slowSmallestN0(p) !== null) expect(fast).toEqual({ ok: true });
        else expect(fast).toEqual({ ok: false, at: first });
      }
    }
  });
});

describe('lecture 3: Ω and Θ', () => {
  const nMinus10 = poly(-10, 1);
  const n = poly(0, 1);
  const n2 = poly(0, 0, 1);
  const n3 = poly(0, 0, 0, 1);

  it('clicker, slide 8: 0.99 is the largest c offered that works for n − 10 ≥ cn', () => {
    expect(bestN0(nMinus10, n, 'Ω', { lower: Q('0.5') })).toBe(20);
    expect(bestN0(nMinus10, n, 'Ω', { lower: Q('0.99') })).toBe(1000);
    expect(bestN0(nMinus10, n, 'Ω', { lower: Q('2') })).toBeNull();
    expect(bestN0(nMinus10, n, 'Ω', { lower: Q('20') })).toBeNull();
    // At n = 1000 the two sides are exactly equal, which is why it has to be exact.
    expect(check(nMinus10, n, 'Ω', { lower: Q('0.99'), n0: 1000 })).toEqual({ ok: true });
    expect(check(nMinus10, n, 'Ω', { lower: Q('0.99'), n0: 999 })).toMatchObject({
      ok: false,
      at: 999,
    });
  });

  it('slide 7: 4n + 10 = Ω(n) and ½n² = Ω(n²)', () => {
    expect(check(poly(10, 4), n, 'Ω', { lower: Q('4'), n0: 0 })).toEqual({ ok: true });
    expect(check(poly(0, 0, '1/2'), n2, 'Ω', { lower: Q('1/2'), n0: 0 })).toEqual({ ok: true });
  });

  it('slide 11: 32n² + 17n + 1 is Θ(n²), and neither Θ(n) nor Θ(n³)', () => {
    const T = poly(1, 17, 32);
    expect(bestN0(T, n2, 'Θ', { lower: Q('32'), upper: Q('33') })).toBe(18);
    expect(check(T, n2, 'Θ', { lower: Q('32'), upper: Q('33'), n0: 18 })).toEqual({ ok: true });
    expect(check(T, n, 'Θ', { lower: Q('1'), upper: Q('1000'), n0: 0 })).toMatchObject({
      ok: false,
      side: 'upper',
      hopeless: true,
    });
    expect(check(T, n3, 'Θ', { lower: Q('0.001'), upper: Q('1'), n0: 50 })).toMatchObject({
      ok: false,
      side: 'lower',
      hopeless: true,
    });
    expect(relationHolds(T, n2, 'Θ')).toBe(true);
    expect(relationHolds(T, n, 'Θ')).toBe(false);
    expect(relationHolds(T, n3, 'Θ')).toBe(false);
  });

  it('lecture 2 clicker: both witnesses work for n² + 10⁶n ≤ cn²', () => {
    const T = poly(0, 1000000, 1);
    expect(check(T, n2, 'O', { upper: Q('2'), n0: 1000000 })).toEqual({ ok: true });
    expect(check(T, n2, 'O', { upper: Q('1000001'), n0: 1 })).toEqual({ ok: true });
    expect(check(T, n2, 'O', { upper: Q('2'), n0: 999999 })).toMatchObject({
      ok: false,
      at: 999999,
    });
  });

  it('the Big-O building: 14n² + 4n + 6 sits between n² and 15n² from n = 6', () => {
    const T = poly(6, 4, 14);
    expect(bestN0(T, n2, 'Θ', { lower: Q('1'), upper: Q('15') })).toBe(6);
    expect(bestN0(T, n2, 'Ω', { lower: Q('14') })).toBe(0);
  });
});

describe("CLRS's definition: 0 ≤ T(n) for O, 0 ≤ c·f(n) for Ω, n₀ positive", () => {
  /** The slow truth under CLRS: every condition scanned on its own, n₀ at least 1. */
  function slowClrs(T: Poly, f: Poly, kind: 'O' | 'Ω' | 'Θ', lo: Frac, up: Frac): number | null {
    const conds: Poly[] = [];
    if (kind !== 'Ω') conds.push(polySub(polyScale(f, up), T));
    if (kind !== 'O') conds.push(polySub(T, polyScale(f, lo)), polyScale(f, lo));
    if (kind === 'O') conds.push(T);
    let best = 1;
    for (const c of conds) {
      // Every root is below 1 + (largest coefficient)/(leading coefficient) ≤ 631 here.
      const n = slowSmallestN0(c, 1000);
      if (n === null) return null;
      best = Math.max(best, n);
    }
    return best;
  }

  it('agrees with scanning every n, on 300 random pairs', () => {
    let moved = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed * 7919);
      const ints = (k: number) => [...Array(k).keys()].map(() => Math.floor(r() * 60) - 30);
      const T = poly(...ints(2 + Math.floor(r() * 2)), 1 + Math.floor(r() * 5));
      const f = poly(...ints(1 + Math.floor(r() * 2)), 1 + Math.floor(r() * 3));
      const lo = q(1 + Math.floor(r() * 4), 2 + Math.floor(r() * 4));
      const up = q(1 + Math.floor(r() * 20), 1);
      for (const kind of ['O', 'Ω', 'Θ'] as const) {
        const w = { lower: lo, upper: up };
        const clrs = bestN0Clrs(T, f, kind, w);
        expect(clrs, `seed ${seed}: ${showPoly(T)} against ${showPoly(f)}, ${kind}`).toBe(
          slowClrs(T, f, kind, lo, up),
        );
        const page = bestN0(T, f, kind, w);
        if (clrs !== null && page !== null && clrs > Math.max(1, page)) moved++;
      }
    }
    // The nonnegativity conditions really do decide some of these, not just n₀ ≥ 1.
    expect(moved).toBeGreaterThan(10);
  });

  it('n − 10 against n: the only pair on the page where more than 0 → 1 moves', () => {
    const T = poly(-10, 1);
    const n = poly(0, 1);
    expect(bestN0(T, n, 'O', { upper: Q('1') })).toBe(0);
    expect(bestN0Clrs(T, n, 'O', { upper: Q('1') })).toBe(10);
    expect(bestN0Clrs(T, n, 'O', { upper: Q('5') })).toBe(10);
    // Ω and Θ do not move: c·n is never negative, and n₀ is already past 1.
    expect(bestN0Clrs(T, n, 'Ω', { lower: Q('0.5') })).toBe(bestN0(T, n, 'Ω', { lower: Q('0.5') }));
    expect(bestN0Clrs(T, n, 'Ω', { lower: Q('0.99') })).toBe(1000);
    // and where this page says 0, CLRS says 1
    expect(bestN0(poly(10, 4), n, 'Ω', { lower: Q('4') })).toBe(0);
    expect(bestN0Clrs(poly(10, 4), n, 'Ω', { lower: Q('4') })).toBe(1);
  });

  it("CLRS's witness for an + b = O(n²), c = a + |b| and n₀ = max(1, −b/a), on n − 10", () => {
    const T = poly(-10, 1);
    const n2 = poly(0, 0, 1);
    expect(bestN0Clrs(T, n2, 'O', { upper: Q('11') })).toBe(10);
    expect(bestN0(T, n2, 'O', { upper: Q('11') })).toBe(0);
  });

  it('never changes a verdict, only n₀', () => {
    for (const [T, f] of [
      [poly(-10, 1), poly(0, 1)],
      [poly(1, 17, 32), poly(0, 0, 1)],
      [poly(0, -3, '1/2'), poly(0, 0, 1)],
      [poly(6, 4, 14), poly(0, 0, 1)],
    ] as const) {
      for (const c of ['0.01', '0.5', '1', '14', '33', '100']) {
        for (const kind of ['O', 'Ω'] as const) {
          const w = { lower: Q(c), upper: Q(c) };
          expect(bestN0Clrs(T, f, kind, w) === null).toBe(bestN0(T, f, kind, w) === null);
        }
      }
    }
  });
});

describe('INSERTION-SORT, CLRS §2.2', () => {
  it('sorts, and its times column matches the table on p. 26 in the best and worst case', () => {
    for (let n = 1; n <= 40; n++) {
      const best = insertionSort(ascending(n));
      const worst = insertionSort(descending(n));
      expect(best.sorted).toEqual(ascending(n));
      expect(worst.sorted).toEqual(ascending(n));
      const m = n - 1;
      expect(best.times).toEqual([n, m, m, m, m, 0, 0, m]);
      const tri = (n * (n + 1)) / 2;
      expect(worst.times).toEqual([n, m, m, m, tri - 1, tri - n, tri - n, m]);
    }
  });

  it('every order of 1 to n costs between the sorted and the reversed array', () => {
    const perms = (xs: number[]): number[][] =>
      xs.length <= 1
        ? [xs]
        : xs.flatMap((x, i) =>
            perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]),
          );
    const total = (a: number[]) => insertionSort(a).times.reduce((s, t) => s + t, 0);
    for (let n = 1; n <= 7; n++) {
      const lo = total(ascending(n));
      const hi = total(descending(n));
      for (const p of perms(ascending(n))) {
        expect(total(p)).toBeGreaterThanOrEqual(lo);
        expect(total(p)).toBeLessThanOrEqual(hi);
        expect(insertionSort(p).sorted).toEqual(ascending(n));
      }
    }
  });
});

describe('the programs', () => {
  it('every closed form matches a real run, n = 0 to 40', () => {
    for (const p of PROGRAMS) {
      for (let n = 0; n <= (p === BAR ? 20 : 40); n++) {
        const want = evalQ(p.count, n);
        expect(want.d).toBe(1n);
        expect(countOf(p, n), `${p.id} at n = ${n}`).toBe(Number(want.n));
      }
    }
  });

  it('clickers, slides 19 and 22: the printed output at n = 4', () => {
    const out = (p: typeof PRINT1) =>
      p
        .run(4)
        .map((s) => s.out ?? '')
        .join('');
    expect(out(PRINT1)).toBe('XYYYYXYYYYXYYYYXYYYY');
    expect(out(PRINT2)).toBe('XYYYYXXX');
  });

  it('clickers, slides 20, 21, 23, 24: counts and bounds', () => {
    expect(PRINT1.countText).toBe('n² + n');
    expect(PRINT2.countText).toBe('2n');
    // Print1: Ω(√n), Θ(n²) and O(n⁴) are all true: "all of the above".
    expect(relates(PRINT1.growth, 'Ω', g(0.5))).toBe(true);
    expect(relates(PRINT1.growth, 'Θ', g(2))).toBe(true);
    expect(relates(PRINT1.growth, 'O', g(4))).toBe(true);
    // Print2 is Θ(n) and nothing else on the list.
    expect(relates(PRINT2.growth, 'Θ', g(1))).toBe(true);
    for (const other of [g(0, 1), g(2), g(3)])
      expect(relates(PRINT2.growth, 'Θ', other)).toBe(false);
  });

  it('slides 4 and 12: foo and bar are both O(n³) but not the same', () => {
    expect(relates(FOO.growth, 'O', g(3))).toBe(true);
    expect(relates(BAR.growth, 'O', g(3))).toBe(true);
    expect(relates(FOO.growth, 'Θ', BAR.growth)).toBe(false);
  });

  it('slide 10, the easy way: the square is all real steps, ⌊n/2⌋(⌊n/2⌋ + 1) of them', () => {
    for (let n = 1; n <= 40; n++) {
      const steps = SUM_PRODUCT.run(n).filter((s) => inSquare(n, s.i as number, s.j as number));
      expect(steps.length).toBe(squareCount(n));
      // Every (i, j) in the square does run: j ≥ i always holds there.
      let square = 0;
      for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) if (inSquare(n, i, j)) square++;
      expect(square).toBe(squareCount(n));
      // The slide's (n/2)² holds for even n, and for odd n only ((n − 1)/2)² does.
      if (n % 2 === 0) expect(squareCount(n)).toBeGreaterThanOrEqual((n / 2) ** 2);
      else {
        expect(squareCount(n)).toBeLessThan((n / 2) ** 2);
        expect(squareCount(n)).toBeGreaterThanOrEqual(((n - 1) / 2) ** 2);
      }
    }
  });
});

describe('chapter 5: three loops deep', () => {
  const n3 = poly(0, 0, 0, 1);

  it('each cell height is the length of its k loop, and the cells add up to the count', () => {
    for (const p of TRIPLE_LOOPS) {
      for (let n = 0; n <= 25; n++) {
        const per: Record<string, number> = {};
        for (const s of p.run(n)) per[`${s.i},${s.j}`] = (per[`${s.i},${s.j}`] ?? 0) + 1;
        let sum = 0;
        for (let i = 1; i <= n; i++)
          for (let j = 1; j <= n; j++) {
            const h = p.height(n, i, j);
            expect(h, `${p.id} n=${n} (${i},${j})`).toBe(per[`${i},${j}`] ?? 0);
            if (!p.reached(n, i, j)) expect(h).toBe(0);
            sum += h;
          }
        expect(sum).toBe(countOf(p, n));
      }
    }
  });

  it('every triple in each box really runs, and the box is the size the page says', () => {
    for (const p of TRIPLE_LOOPS) {
      for (let n = 0; n <= 30; n++) {
        const b = p.box(n);
        const ran = new Set(p.run(n).map((s) => `${s.i},${s.j},${s.k}`));
        let inside = 0;
        for (let i = 1; i <= n; i++)
          for (let j = 1; j <= n; j++)
            for (let k = 1; k <= n; k++)
              if (inBox(b, i, j, k)) {
                inside++;
                expect(ran.has(`${i},${j},${k}`), `${p.id} n=${n} (${i},${j},${k})`).toBe(true);
              }
        expect(inside).toBe(boxSize(b));
      }
    }
  });

  it("deeper's box is chapter 3's square, ⌊n/2⌋ values of k deep", () => {
    for (let n = 0; n <= 40; n++)
      expect(boxSize(DEEPER.box(n))).toBe(squareCount(n) * Math.floor(n / 2));
  });

  it('each floor, box ≥ n³/den, holds from n0 on (to n = 300) and not at n0 − 1', () => {
    for (const p of TRIPLE_LOOPS) {
      const { den, n0 } = p.floor;
      const holds = (n: number) => den * boxSize(p.box(n)) >= n ** 3;
      for (let n = n0; n <= 300; n++) expect(holds(n), `${p.id} at ${n}`).toBe(true);
      expect(holds(n0 - 1)).toBe(false);
    }
  });

  it('the ceiling: every loop run to n is at least the count, and both are Θ(n³)', () => {
    for (const p of TRIPLE_LOOPS) {
      expect(check(p.count, n3, 'O', { upper: Q('1'), n0: 0 }), p.id).toEqual({ ok: true });
      expect(relationHolds(p.count, n3, 'Θ')).toBe(true);
      expect(relates(p.growth, 'Θ', g(3))).toBe(true);
    }
    // The triangles witness in tier 5: 1/27 and 1/6, first good from n = 3.
    expect(bestN0(TRIANGLES.count, n3, 'Θ', { lower: Q('1/27'), upper: Q('1/6') })).toBe(3);
  });
});

describe('chapter 6: same answer, less work', () => {
  it('both power programs write the same n entries, the real powers of x', () => {
    for (let n = 0; n <= 40; n++) {
      const slow = written(POWERS_SLOW, n);
      const fast = written(POWERS_FAST, n);
      expect(slow).toEqual(fast);
      expect(slow).toHaveLength(n);
      slow.forEach((v, k) => expect(v).toBe(String(X ** BigInt(k + 1))));
    }
  });

  it('g/f = 2/(n + 1) exactly, so it goes to 0: g is O(f) and not Ω(f)', () => {
    for (let n = 1; n <= 40; n++)
      expect(countOf(POWERS_FAST, n) * (n + 1)).toBe(2 * countOf(POWERS_SLOW, n));
    expect(relates(POWERS_FAST.growth, 'O', POWERS_SLOW.growth)).toBe(true);
    expect(relates(POWERS_FAST.growth, 'Ω', POWERS_SLOW.growth)).toBe(false);
    expect(relationHolds(POWERS_FAST.count, POWERS_SLOW.count, 'Ω')).toBe(false);
  });

  it('the output floor: the fast one does exactly one multiplication per entry written', () => {
    for (let n = 0; n <= 40; n++) {
      expect(countOf(POWERS_FAST, n)).toBe(written(POWERS_FAST, n).length);
      expect(written(TIMES_TABLE, n)).toHaveLength(n * n);
    }
  });
});

describe('CLRS Problem 2-3: Horner against each term from scratch', () => {
  it('both give the value of the polynomial with aₖ = k + 1', () => {
    for (let n = 0; n <= 30; n++) {
      let want = 0n;
      for (let k = 0; k <= n; k++) want += BigInt(k + 1) * X ** BigInt(k);
      expect(written(HORNER, n)).toEqual([String(want)]);
      expect(written(POLY_NAIVE, n)).toEqual([String(want)]);
    }
  });
});

describe('growth classes', () => {
  it('slide 16: six polynomial, three not', () => {
    expect(SLIDE_16.filter((f) => isPolynomial(f.growth)).map((f) => f.id)).toEqual([
      'f1',
      'f2',
      'f3',
      'f4',
      'f5',
      'f6',
    ]);
  });

  it('every class comparison the page relies on shows up in the numbers', () => {
    // If compare says f outgrows g, f/g must be growing large by n = 60; if it
    // says Θ, the ratio must settle between two positive constants.
    const fs = SLIDE_16.filter((f) => f.id !== 'f9');
    for (const f of fs) {
      for (const h of fs) {
        const c = compare(f.growth, h.growth);
        const r1 = f.at(40) / h.at(40);
        const r2 = f.at(60) / h.at(60);
        if (c > 0) expect(r2).toBeGreaterThan(r1);
        if (c < 0) expect(r2).toBeLessThan(r1);
      }
    }
  });
});
