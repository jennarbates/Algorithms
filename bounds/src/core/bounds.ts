import { holdsFrom, polyScale, polySub, sign, smallestN0 } from './poly.ts';
import type { Poly, Q } from './poly.ts';

/**
 * O, Ω and Θ from the definitions, for polynomial T and f.
 *
 *   T = O(f)  if some c > 0, n₀ ≥ 0 have T(n) ≤ c·f(n) for all n ≥ n₀
 *   T = Ω(f)  if some c > 0, n₀ ≥ 0 have T(n) ≥ c·f(n) for all n ≥ n₀
 *   T = Θ(f)  if T = O(f) and T = Ω(f)
 *
 * The page asks the reader for the constants, so what is checked here is a
 * witness: these constants and this n₀. Θ takes two constants, a floor c₁ and
 * a ceiling c₂, and one n₀ for both; the lecture's definition allows two
 * different thresholds, and taking the larger of them always works, so one n₀
 * is no restriction.
 */

export type Kind = 'O' | 'Ω' | 'Θ';

export interface Witness {
  /** The ceiling constant, for O and Θ. */
  readonly upper?: Q;
  /** The floor constant, for Ω and Θ. */
  readonly lower?: Q;
  readonly n0: number;
}

export type Verdict =
  | { readonly ok: true }
  | {
      readonly ok: false;
      /** Which side broke. */
      readonly side: 'upper' | 'lower';
      /** The first n ≥ n₀ where it breaks. */
      readonly at: number;
      /** Whether any n₀ at all would have saved this constant. */
      readonly hopeless: boolean;
    }
  | { readonly ok: false; readonly side: 'constant'; readonly why: string };

/** c·f(n) − T(n): nonnegative exactly where the ceiling holds. */
export const ceilingGap = (T: Poly, f: Poly, c: Q): Poly => polySub(polyScale(f, c), T);
/** T(n) − c·f(n): nonnegative exactly where the floor holds. */
export const floorGap = (T: Poly, f: Poly, c: Q): Poly => polySub(T, polyScale(f, c));

export function check(T: Poly, f: Poly, kind: Kind, w: Witness): Verdict {
  const sides: ('upper' | 'lower')[] =
    kind === 'O' ? ['upper'] : kind === 'Ω' ? ['lower'] : ['upper', 'lower'];
  for (const side of sides) {
    const c = side === 'upper' ? w.upper : w.lower;
    if (!c || sign(c) <= 0) {
      return { ok: false, side: 'constant', why: 'The constant has to be greater than 0.' };
    }
  }
  const breaks: { side: 'upper' | 'lower'; at: number; hopeless: boolean }[] = [];
  for (const side of sides) {
    const c = (side === 'upper' ? w.upper : w.lower) as Q;
    const gap = side === 'upper' ? ceilingGap(T, f, c) : floorGap(T, f, c);
    const r = holdsFrom(gap, w.n0);
    if (!r.ok) breaks.push({ side, at: r.at, hopeless: smallestN0(gap) === null });
  }
  const first = breaks.sort((a, b) => a.at - b.at)[0];
  return first ? { ok: false, ...first } : { ok: true };
}

/** The smallest n₀ that works with these constants, or null if none does. */
export function bestN0(T: Poly, f: Poly, kind: Kind, w: Omit<Witness, 'n0'>): number | null {
  let best = 0;
  if (kind !== 'Ω') {
    const n = smallestN0(ceilingGap(T, f, w.upper as Q));
    if (n === null) return null;
    best = Math.max(best, n);
  }
  if (kind !== 'O') {
    const n = smallestN0(floorGap(T, f, w.lower as Q));
    if (n === null) return null;
    best = Math.max(best, n);
  }
  return best;
}

/**
 * Whether T = kind(f) at all, for polynomials: compare degrees, and for equal
 * degrees nothing more is needed, since any positive leading coefficients can
 * be matched by a constant. T and f are assumed eventually positive.
 */
export function relationHolds(T: Poly, f: Poly, kind: Kind): boolean {
  const dT = T.length - 1;
  const dF = f.length - 1;
  return kind === 'O' ? dT <= dF : kind === 'Ω' ? dT >= dF : dT === dF;
}
