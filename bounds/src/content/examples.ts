import { poly } from '../core/poly.ts';
import type { Poly } from '../core/poly.ts';
import type { Kind } from '../core/bounds.ts';

/**
 * The pairs chapter 1 puts on the chart, each from a slide.
 *
 * Every example opens with constants that are worth looking at rather than
 * constants that happen to work: the n − 10 clicker opens on c = 0.5, which
 * works from n = 20, so the reader's first move is to push c towards the
 * slide's 0.99 and watch n₀ run away to 1000, then past 1 and watch it never
 * come back.
 */

export interface Example {
  readonly id: string;
  /** Short name for the picker. */
  readonly name: string;
  readonly T: Poly;
  readonly f: Poly;
  readonly kind: Kind;
  readonly lower?: string;
  readonly upper?: string;
  readonly slide: string;
  /** One or two sentences on what to try. */
  readonly note: string;
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'n-minus-10',
    name: 'n − 10 vs n',
    T: poly(-10, 1),
    f: poly(0, 1),
    kind: 'Ω',
    lower: '0.5',
    slide: 'Lecture 3, slide 8 (clicker)',
    note: 'Any c below 1 works, if you wait long enough: try 0.9, then 0.99. At 1 or above, n − 10 can never catch cn, and no n₀ helps.',
  },
  {
    id: 'four-n',
    name: '4n + 10 vs n',
    T: poly(10, 4),
    f: poly(0, 1),
    kind: 'Ω',
    lower: '4',
    slide: 'Lecture 3, slide 7',
    note: 'A floor can sit well below. c = 4 works from n = 0, and so does every smaller c. Switch to Θ and add a ceiling.',
  },
  {
    id: 'half-n2',
    name: '½n² vs n²',
    T: poly(0, 0, '1/2'),
    f: poly(0, 0, 1),
    kind: 'Ω',
    lower: '0.5',
    slide: 'Lecture 3, slide 7',
    note: 'The constant in front does not change the class: ½n² is Ω(n²), as long as c is at most ½.',
  },
  {
    id: 'theta-n2',
    name: '32n² + 17n + 1 vs n²',
    T: poly(1, 17, 32),
    f: poly(0, 0, 1),
    kind: 'Θ',
    lower: '32',
    upper: '33',
    slide: 'Lecture 3, slide 11',
    note: 'A floor and a ceiling of the same shape: Θ(n²). The ceiling needs c₂ above 32 and a moment to get clear of 17n + 1.',
  },
  {
    id: 'theta-n',
    name: '32n² + 17n + 1 vs n',
    T: poly(1, 17, 32),
    f: poly(0, 1),
    kind: 'Θ',
    lower: '1',
    upper: '100',
    slide: 'Lecture 3, slide 11',
    note: 'The floor is easy. The ceiling is not: however big c₂ is, 32n² passes c₂·n. So it is Ω(n) but not Θ(n).',
  },
  {
    id: 'theta-n3',
    name: '32n² + 17n + 1 vs n³',
    T: poly(1, 17, 32),
    f: poly(0, 0, 0, 1),
    kind: 'Θ',
    lower: '0.1',
    upper: '1',
    slide: 'Lecture 3, slide 11',
    note: 'Now the ceiling is easy and the floor is hopeless: however small c₁ is, c₁·n³ climbs past it. O(n³), not Θ(n³).',
  },
  {
    id: 'building',
    name: '14n² + 4n + 6 vs n²',
    T: poly(6, 4, 14),
    f: poly(0, 0, 1),
    kind: 'Θ',
    lower: '1',
    upper: '15',
    slide: 'The Big-O Building',
    note: 'The building’s own example. The basement, n², is a floor from n = 0; the roof, 15n², is a ceiling from n = 6. Together: Θ(n²).',
  },
];
