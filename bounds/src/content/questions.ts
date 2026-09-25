import { bestN0 } from '../core/bounds.ts';
import type { Kind } from '../core/bounds.ts';
import { factorial } from '../core/growth.ts';
import { evalQ, parseQ, poly } from '../core/poly.ts';
import type { Poly } from '../core/poly.ts';
import { PRINT1, SUM_PRODUCT, countOf, squareCount } from '../core/programs.ts';

/**
 * The practice questions, one tier per chapter.
 *
 * The same rules as `../graphs` and `../gale-shapley`. Every number is computed
 * here from the engine when the file loads, never typed in. A witness question
 * stores the functions and the relation and nothing else, and any constants the
 * reader gives that really hold are marked right, checked exactly. Written
 * options that make a claim about a particular function or program are
 * recomputed in `tests/questions.test.ts`.
 *
 * The lecture's clicker questions are all here, marked with their slide, with
 * the wording kept where the wording is the point.
 *
 * `../worksheets/bounds.mjs` imports this file directly, so the printable
 * workbook asks exactly these questions and its key comes from the same engine.
 */

export type Tier = 1 | 2 | 3 | 4;

export interface Option {
  readonly t: string;
  readonly ok?: true;
  readonly why: string;
}

interface Common {
  readonly id: string;
  readonly tier: Tier;
  readonly tests: string;
  readonly prompt: string;
  /** Monospaced block under the prompt: code, or a claim. */
  readonly quote?: string;
  readonly clicker?: string;
  readonly close: string;
}

export interface ChoiceQuestion extends Common {
  readonly kind: 'choice';
  readonly options: readonly Option[];
}

export interface MultiQuestion extends Common {
  readonly kind: 'multi';
  readonly options: readonly Option[];
}

export interface NumberQuestion extends Common {
  readonly kind: 'number';
  readonly unit: string;
  readonly answer: number;
  readonly why: string;
  readonly near: readonly { readonly v: number; readonly why: string }[];
}

/** Give constants and an n₀ that make the bound hold. Any pair that really holds is right. */
export interface WitnessQuestion extends Common {
  readonly kind: 'witness';
  readonly T: Poly;
  readonly f: Poly;
  readonly rel: Kind;
  /** A pair that works, for the answer key: shown as one example, never as the answer. */
  readonly example: { readonly lower?: string; readonly upper?: string; readonly n0: number };
  readonly why: string;
}

export type Question = ChoiceQuestion | MultiQuestion | NumberQuestion | WitnessQuestion;

export const TIERS: readonly Tier[] = [1, 2, 3, 4];

export const TIER_LABELS: Readonly<Record<Tier, string>> = {
  1: 'Floors and ceilings',
  2: 'Count every step',
  3: 'The triangle',
  4: 'Polynomial or not',
};

const Q = (s: string) => parseQ(s) as NonNullable<ReturnType<typeof parseQ>>;
const n1 = poly(0, 1);
const n2 = poly(0, 0, 1);

/** The smallest n₀ with n − 10 ≥ 0.5n. */
const halfN0 = bestN0(poly(-10, 1), n1, 'Ω', { lower: Q('0.5') }) ?? -1;
/** The smallest n₀ that makes 32n² + 17n + 1 ≤ 33n². */
const ceil33 = bestN0(poly(1, 17, 32), n2, 'O', { upper: Q('33') }) ?? -1;
const print1At10 = countOf(PRINT1, 10);
const sumProductAt10 = countOf(SUM_PRODUCT, 10);
const squareAt10 = squareCount(10);
const tripleAt6 = Number(evalQ(poly(0, '1/3', '1/2', '1/6'), 6).n);
const matchingsAt10 = factorial(10);

export const QUESTIONS: readonly Question[] = [
  // --- Tier 1: floors and ceilings -------------------------------------------------
  {
    id: 'o-converse',
    tier: 1,
    kind: 'choice',
    clicker: 'Lecture 3, slide 2',
    tests: 'what Big-O does not say',
    prompt: 'Suppose f is O(g). Which of the following is true?',
    options: [
      {
        t: 'g is O(f)',
        why: 'Not always: n is O(n²), but n² is not O(n).',
      },
      {
        t: 'g is not O(f)',
        why: 'Not always: 2n is O(n), and n is O(2n) as well.',
      },
      {
        t: 'g may be O(f), depending on the particular functions f and g',
        ok: true,
        why: 'Both happen. When it does, f and g are Θ of each other; when it does not, f grows strictly slower.',
      },
    ],
    close:
      'O is a ceiling, like ≤. Knowing a ≤ b tells you nothing about whether b ≤ a. That gap is exactly why the lecture brings in Ω and Θ.',
  },
  {
    id: 'largest-c',
    tier: 1,
    kind: 'choice',
    clicker: 'Lecture 3, slide 8',
    tests: 'choosing a constant for a lower bound',
    prompt:
      'Claim: n − 10 is Ω(n). To prove it we need n − 10 ≥ cn for all n ≥ n₀. What is the largest value of c below for which we can find some n₀ to make this statement true?',
    options: [
      { t: 'c = 0.5', why: 'It works, from n = 20, but it is not the largest that does.' },
      {
        t: 'c = 0.99',
        ok: true,
        why: 'n − 10 ≥ 0.99n means 0.01n ≥ 10, which is n ≥ 1000. Late, but it holds from there on.',
      },
      { t: 'c = 2', why: '2n is bigger than n − 10 at every n ≥ 0. No n₀ helps.' },
      { t: 'c = 20', why: 'Even further out of reach than c = 2.' },
    ],
    close:
      'Every c below 1 works and every c from 1 up fails, however long you wait. For Ω the constant has to fit under the leading coefficient, just as for O it has to clear it.',
  },
  {
    id: 'half-n0',
    tier: 1,
    kind: 'number',
    tests: 'finding n₀ for a given c',
    prompt: 'Take c = 0.5. What is the smallest n₀ with n − 10 ≥ 0.5n for every n ≥ n₀?',
    unit: 'n₀ =',
    answer: halfN0,
    why: 'n − 10 ≥ 0.5n means 0.5n ≥ 10, so n ≥ 20. At n = 20 both sides are exactly 10, and "≥" allows equality.',
    near: [
      {
        v: 21,
        why: 'At n = 20 both sides are 10, and the definition says ≥, so 20 already counts.',
      },
      { v: 10, why: 'That is where n − 10 stops being negative, not where it reaches 0.5n.' },
      { v: 19, why: 'At n = 19 the left side is 9 and the right side is 9.5, so it still fails.' },
    ],
    close:
      'Solving the inequality for n gives n₀ directly. Every witness on this page is found that way, and then checked at whole numbers.',
  },
  {
    id: 'witness-4n',
    tier: 1,
    kind: 'witness',
    tests: 'producing a lower-bound witness',
    prompt: 'Prove 4n + 10 = Ω(n) from the definition: give a c > 0 and an n₀ that work.',
    T: poly(10, 4),
    f: n1,
    rel: 'Ω',
    example: { lower: '4', n0: 0 },
    why: 'c = 4 and n₀ = 0: 4n + 10 ≥ 4n at every n, since 10 ≥ 0. Any c ≤ 4 works from n = 0, and c just above 4 works for a while and then fails.',
    close:
      'For a floor, the easy move is to drop terms: 4n + 10 ≥ 4n because the dropped term is positive. For a ceiling, the move is to round up.',
  },
  {
    id: 'witness-theta',
    tier: 1,
    kind: 'witness',
    tests: 'a floor and a ceiling at once',
    prompt:
      'Prove 32n² + 17n + 1 = Θ(n²): give a floor c₁, a ceiling c₂ and one n₀ where both hold.',
    T: poly(1, 17, 32),
    f: n2,
    rel: 'Θ',
    example: { lower: '32', upper: '33', n0: ceil33 },
    why: `c₁ = 32 is a floor from n = 0, since 17n + 1 ≥ 0. c₂ = 33 needs n² ≥ 17n + 1, which first holds at n = ${ceil33}. So c₁ = 32, c₂ = 33, n₀ = ${ceil33}. c₂ = 50 works from n = 1.`,
    close:
      'Θ is two witnesses stapled together. Find each side on its own, then use the larger n₀ for both.',
  },
  {
    id: 'witness-million',
    tier: 1,
    kind: 'choice',
    clicker: 'Lecture 2, slide 8',
    tests: 'there is more than one witness',
    prompt: 'To show n² + 10⁶n ≤ cn² for all n ≥ n₀, which choices work?',
    options: [
      { t: 'c = 2, n₀ = 10⁶', why: 'Works, but so does B.' },
      { t: 'c = 10⁶ + 1, n₀ = 1', why: 'Works, but so does A.' },
      {
        t: 'Both',
        ok: true,
        why: 'A: from n = 10⁶, 10⁶n ≤ n². B: from n = 1, 10⁶n ≤ 10⁶n². Different pairs, same claim.',
      },
      { t: 'Neither', why: 'Both work, each for its own reason.' },
    ],
    close:
      'A witness is any pair that works. Trading a bigger c for a smaller n₀ is always allowed, and a proof only needs one pair.',
  },
  {
    id: 'which-true',
    tier: 1,
    kind: 'multi',
    tests: 'reading O, Ω and Θ off a polynomial',
    prompt: 'Let T(n) = 32n² + 17n + 1. Tick every true statement.',
    options: [
      { t: 'T(n) = Θ(n²)', ok: true, why: 'Floor 32n², ceiling 33n² from n = 18.' },
      {
        t: 'T(n) = Ω(n)',
        ok: true,
        why: 'T(n) ≥ n at every n ≥ 0. A floor can be as low as you like.',
      },
      { t: 'T(n) = O(n³)', ok: true, why: 'A ceiling can be as high as you like.' },
      { t: 'T(n) = Θ(n³)', why: 'The floor fails: c·n³ passes 32n² for every c > 0 eventually.' },
      { t: 'T(n) = Θ(n)', why: 'The ceiling fails: 32n² passes c·n for every c.' },
      { t: 'T(n) = O(n)', why: 'Same ceiling, same failure.' },
    ],
    close: 'Θ(n²) is the one that says the most. Each of the other true lines is a weaker claim.',
  },

  // --- Tier 2: count every step ----------------------------------------------------
  {
    id: 'print1-output',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 3, slide 19',
    tests: 'tracing nested loops exactly',
    prompt: 'What is the output of Print1 with n = 4? (ignore spaces)',
    quote: PRINT1.lines.join('\n'),
    options: [
      {
        t: 'XYYY XYYY XYYY',
        why: 'Three rounds of three Y: that is n = 3, or a loop that stops one early.',
      },
      {
        t: 'XXXX YYYY YYYY YYYY YYYY',
        why: 'That prints all the X first. The X is inside the outer loop, before each round of Y.',
      },
      {
        t: 'XYYYY XYYYY XYYYY XYYYY',
        ok: true,
        why: 'Each of the 4 rounds prints one X and then 4 Y.',
      },
      {
        t: 'XYYYYY XYYYYY XYYYYY XYYYYY',
        why: 'Five Y per round: the inner loop runs n = 4 times, not 5.',
      },
    ],
    close: 'Trace the first two rounds by hand and the pattern writes itself.',
  },
  {
    id: 'print1-count',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 3, slide 20',
    tests: 'turning a trace into a formula',
    prompt: 'What is the exact number of characters Print1 prints, as a function of n?',
    quote: PRINT1.lines.join('\n'),
    options: [
      { t: 'n', why: 'That is the X alone.' },
      { t: 'n²', why: 'That is the Y alone.' },
      { t: 'n² − n', why: 'Nothing is subtracted: the X are printed as well as the Y.' },
      { t: 'n² + n', ok: true, why: 'n rounds, each printing 1 X and n Y: n(1 + n).' },
    ],
    close:
      'Count per round, then multiply by the number of rounds. Exact counts come first; the bound is read off them.',
  },
  {
    id: 'print1-bound',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 3, slide 21',
    tests: 'several true bounds at once',
    prompt: 'The running time of Print1 is:',
    options: [
      { t: 'Ω(√n)', why: 'True, since n² + n ≥ √n. But it is not the only true one.' },
      { t: 'Θ(n²)', why: 'True, and the most informative. But it is not the only true one.' },
      { t: 'O(n⁴)', why: 'True, as a loose ceiling. But it is not the only true one.' },
      { t: 'all of the above', ok: true, why: 'Each is a correct statement. Only Θ(n²) is tight.' },
    ],
    close: 'Being true and being tight are different things. Exams often ask for the tight one.',
  },
  {
    id: 'print2-output',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 3, slide 22',
    tests: 'tracing a loop that only runs once',
    prompt: 'What is the output of Print2 with n = 4? (ignore spaces)',
    quote: [
      'for i = 1 to n do',
      '  print "X"',
      '  if i == 1 then',
      '    for j = 1 to n do',
      '      print "Y"',
    ].join('\n'),
    options: [
      { t: 'XXXX YYYY YYYY YYYY YYYY', why: 'All the X come first here, and far too many Y.' },
      { t: 'XYYYYY XYYYYY XYYYYY', why: 'That ignores the if: the Y loop only runs when i = 1.' },
      { t: 'XYYYY X X X', ok: true, why: 'Round 1 prints X and 4 Y. Rounds 2 to 4 print just X.' },
      {
        t: 'XYYYYYY XYYYYYY XYYYYYY XYYYYYY',
        why: 'That runs the Y loop every round, with too many Y as well.',
      },
    ],
    close:
      'A loop nested inside another loop does not mean multiplying. Here the inner loop runs in exactly one round.',
  },
  {
    id: 'print2-count',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 3, slide 23',
    tests: 'counting when the inner loop is guarded',
    prompt: 'What is the exact number of characters Print2 prints, as a function of n?',
    options: [
      { t: 'n', why: 'That is the X alone.' },
      { t: '2n', ok: true, why: 'n X, plus n Y from the one round where i = 1.' },
      { t: 'n² − n', why: 'That treats the inner loop as running every round.' },
      { t: 'n²', why: 'Only if the inner loop ran every round.' },
    ],
    close: 'Add up what each round prints; do not multiply by the loop depth.',
  },
  {
    id: 'print2-bound',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 3, slide 24',
    tests: 'the tight bound on a guarded loop',
    prompt: 'What is the tight running-time bound of Print2?',
    options: [
      { t: 'Θ(log n)', why: 'Nothing here halves anything. 2n grows faster than log n.' },
      { t: 'Θ(n)', ok: true, why: '2n is Θ(n): floor n, ceiling 2n.' },
      { t: 'Θ(n²)', why: 'The nesting suggests it, but the inner loop runs once, not n times.' },
      { t: 'Θ(n³)', why: 'Far above the 2n it really takes.' },
    ],
    close: 'Nested-looking code can be linear. Count, then bound.',
  },
  {
    id: 'print1-at-10',
    tier: 2,
    kind: 'number',
    tests: 'using the formula',
    prompt: 'How many characters does Print1 print when n = 10?',
    unit: 'Characters =',
    answer: print1At10,
    why: `n² + n at n = 10: 100 + 10 = ${print1At10}.`,
    near: [
      { v: 100, why: 'That is only the Y. Each of the 10 rounds also prints one X.' },
      { v: 90, why: 'n² − n. The X are added, not taken away.' },
      { v: 20, why: 'That is Print2’s count, 2n.' },
    ],
    close: 'The page’s tracer counts every character as it prints. Try n = 10 there and compare.',
  },
  {
    id: 'foo-bar',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 3, slide 4',
    tests: 'why O alone cannot compare two algorithms',
    prompt:
      'foo is two nested loops from 1 to n; bar is three. Fact: both run in O(n³). Conclusion: foo and bar have the same asymptotic running time. What is wrong?',
    options: [
      { t: 'foo is not O(n³).', why: 'It is: n² ≤ n³ for every n ≥ 1.' },
      {
        t: 'O(n³) is only a ceiling. foo is really Θ(n²) and bar is Θ(n³), so they differ.',
        ok: true,
        why: 'Both facts are true and the conclusion does not follow from them. Comparing needs tight bounds.',
      },
      {
        t: 'Nothing: two O(n³) algorithms are the same speed asymptotically.',
        why: 'O(n³) includes everything from constant time up to n³.',
      },
      { t: 'bar is not O(n³).', why: 'It is exactly n³ steps.' },
    ],
    close: 'To say two running times are the same, show both are Θ of the same thing.',
  },

  // --- Tier 3: the triangle ----------------------------------------------------------
  {
    id: 'sp-at-10',
    tier: 3,
    kind: 'number',
    tests: 'the hard way: counting exactly',
    prompt: 'How many times does the inner line of sum-product run when n = 10?',
    quote: SUM_PRODUCT.lines.join('\n'),
    unit: 'Times =',
    answer: sumProductAt10,
    why: `For i = 1 the inner loop runs 10 times, for i = 2 nine times, down to once for i = 10: 10 + 9 + … + 1 = 10·11/2 = ${sumProductAt10}.`,
    near: [
      { v: 100, why: 'That is n², as if j started at 1. It starts at i.' },
      { v: 45, why: 'That is n(n − 1)/2, as if j started at i + 1. When j = i the line runs too.' },
      {
        v: 50,
        why: 'That is n²/2. The exact count has an extra n/2 from the diagonal, where i = j.',
      },
    ],
    close: 'The triangle including its diagonal: n(n + 1)/2, which is Θ(n²).',
  },
  {
    id: 'square-at-10',
    tier: 3,
    kind: 'number',
    tests: 'the easy way: a lower bound by ignoring work',
    prompt:
      'The easy way keeps only the steps with i ≤ n/2 and j ≥ n/2. When n = 10, how many steps does it keep?',
    unit: 'Steps kept =',
    answer: squareAt10,
    why: `i from 1 to 5, and j from 5 to 10: 5 × 6 = ${squareAt10}. At least (n/2)² = 25, which is all the argument needs.`,
    near: [
      {
        v: 25,
        why: 'That is the (n/2)² the slide quotes. The exact count is a little more, since j = n/2 is kept too.',
      },
      { v: 55, why: 'That is every step, the hard-way count.' },
      { v: 36, why: 'That is 6 × 6. i stops at 5, since i ≤ n/2 = 5.' },
    ],
    close:
      'Throwing work away gives a lower bound for free. The kept steps all really run, since j ≥ n/2 ≥ i there.',
  },
  {
    id: 'easy-way-why',
    tier: 3,
    kind: 'choice',
    tests: 'why a count of a part is a lower bound on the whole',
    prompt: 'Why does counting only the steps in the square prove that sum-product is Ω(n²)?',
    options: [
      {
        t: 'Because the square is most of the triangle.',
        why: 'It is about half. The argument needs "at least", not "most".',
      },
      {
        t: 'Because (n/2)² = n².',
        why: 'It is n²/4. The ¼ is a constant, and Ω does not care about constants.',
      },
      {
        t: 'Every step in the square really runs, so the full count is at least the square’s count, which is about n²/4.',
        ok: true,
        why: 'A part is never more than the whole. About n²/4 is Ω(n²), since the constant does not matter.',
      },
      {
        t: 'It proves O(n²), not Ω(n²).',
        why: 'Counting a part of the work can only show the work is at least something: a floor.',
      },
    ],
    close:
      'Upper bounds: round the count up. Lower bounds: throw work away. Neither needs the exact count.',
  },
  {
    id: 'odd-n',
    tier: 3,
    kind: 'choice',
    tests: 'checking a slide’s arithmetic',
    prompt:
      'The slide says the square holds at least (n/2)² steps. When n = 5 it holds 2 × 3 = 6 steps, and (5/2)² = 6.25. What follows?',
    options: [
      {
        t: 'sum-product is not Ω(n²).',
        why: 'It is: the exact count n(n + 1)/2 is at least n²/2.',
      },
      {
        t: 'The line is a little off for odd n, but it still holds at least ((n − 1)/2)², which is Ω(n²), so the conclusion stands.',
        ok: true,
        why: 'For even n the square has (n/2)(n/2 + 1) ≥ (n/2)² steps. For odd n it has ⌊n/2⌋(⌊n/2⌋ + 1), a quarter short of (n/2)².',
      },
      {
        t: 'The count must be 7, and 6 is a mistake.',
        why: 'i ∈ {1, 2} and j ∈ {3, 4, 5} is 6 pairs. The page’s grid counts them.',
      },
      {
        t: 'Ω arguments only work for even n.',
        why: 'Ω needs a floor for all large n, odd included, and ((n − 1)/2)² is one.',
      },
    ],
    close:
      'A lower bound only has to be true, not tight. Loosen it until it is obviously true, and move on.',
  },
  {
    id: 'triple',
    tier: 3,
    kind: 'number',
    tests: 'counting a nested loop that has not been seen before',
    prompt: 'How many times does the inner line run when n = 6?',
    quote: 'for i = 1 to n do\n  for j = 1 to i do\n    for k = 1 to j do\n      count += 1',
    unit: 'Times =',
    answer: tripleAt6,
    why: `For each i the inner two loops run 1 + 2 + … + i = i(i + 1)/2 times. Adding those for i = 1 to 6 gives 1 + 3 + 6 + 10 + 15 + 21 = ${tripleAt6}. In general n(n + 1)(n + 2)/6, which is Θ(n³).`,
    near: [
      { v: 216, why: 'That is n³, as if every loop ran all the way to n.' },
      { v: 21, why: 'That is the count for i = 6 alone, not the total.' },
      { v: 36, why: 'That is n², one loop too few.' },
    ],
    close:
      'Three nested loops, each bounded by the one outside it: a tetrahedron instead of a triangle, still Θ(n³).',
  },
  {
    id: 'additivity',
    tier: 3,
    kind: 'choice',
    tests: 'additivity, upgraded to Θ',
    prompt: 'f and g are nonnegative and f is O(g). Which is true of f + g?',
    options: [
      { t: 'f + g is Θ(f)', why: 'Only if g is also O(f). Try f = n, g = n².' },
      { t: 'f + g is O(g) but maybe not Ω(g)', why: 'f + g ≥ g, since f ≥ 0. The floor is free.' },
      {
        t: 'Nothing, unless f and g are polynomials',
        why: 'The argument uses only f ≥ 0 and f ≤ cg.',
      },
      {
        t: 'f + g is Θ(g)',
        ok: true,
        why: 'g ≤ f + g for the floor, and f + g ≤ (c + 1)g for the ceiling.',
      },
    ],
    close: 'This is the rule behind dropping lower-order terms: n² + 42n + n log n is Θ(n²).',
  },

  // --- Tier 4: polynomial or not -----------------------------------------------------
  {
    id: 'which-poly',
    tier: 4,
    kind: 'multi',
    tests: 'recognising polynomial time',
    prompt: 'Tick every running time that is polynomial, meaning O(nᵈ) for some constant d.',
    options: [
      { t: 'n log n + 2n + 20', ok: true, why: 'It is O(n²), since log n ≤ n.' },
      { t: '0.01n²', ok: true, why: 'O(n²). A small constant does not matter.' },
      { t: '20n² + 2n + 3', ok: true, why: 'O(n²).' },
      { t: '2ⁿ', why: 'It outgrows every nᵈ, however large d is.' },
      { t: '3ⁿ', why: 'Faster still than 2ⁿ.' },
      { t: 'n!', why: 'Faster than any cⁿ.' },
      { t: 'n¹⁰⁰', ok: true, why: 'Polynomial, with d = 100. Impractical, but polynomial.' },
    ],
    close:
      'Polynomial means some fixed degree works. It says nothing about how big that degree is.',
  },
  {
    id: 'why-poly',
    tier: 4,
    kind: 'multi',
    tests: 'why polynomial time is the definition of efficient',
    prompt:
      'Which are reasons the lecture gives for defining efficient as polynomial time? Tick every one.',
    options: [
      {
        t: 'It matches practice: almost all practically efficient algorithms are polynomial.',
        ok: true,
        why: 'Slide 17, first reason.',
      },
      {
        t: 'It usually separates a clever algorithm from brute force.',
        ok: true,
        why: 'Slide 17, second reason. Stable matching: n! by brute force, n² by propose-and-reject.',
      },
      {
        t: 'It is refutable: it lets us say an algorithm is not efficient, or that no efficient algorithm exists.',
        ok: true,
        why: 'Slide 17, third reason.',
      },
      {
        t: 'Every polynomial-time algorithm is fast in practice.',
        why: 'Not so: n¹⁰⁰ is polynomial. The claim is about what usually happens, not a guarantee.',
      },
    ],
    close:
      'A definition is useful when it matches practice and when it can be shown false. Polynomial time manages both.',
  },
  {
    id: 'brute-force',
    tier: 4,
    kind: 'number',
    tests: 'how fast n! grows',
    prompt:
      'Brute-force stable matching tries every way to pair n students with n colleges. How many is that when n = 10?',
    unit: 'Matchings =',
    answer: matchingsAt10,
    why: `The first student has 10 choices, the next 9, and so on: 10! = ${matchingsAt10.toLocaleString('en-US')}. Propose-and-reject makes at most n² = 100 proposals.`,
    near: [
      { v: 100, why: 'That is n², the bound on proposals. Brute force is far worse.' },
      { v: 1024, why: 'That is 2¹⁰. n! grows faster still.' },
      { v: 55, why: 'That is 10 + 9 + … + 1. The choices multiply, they do not add.' },
    ],
    close:
      'Ω(n!) against O(n²) is the gap slide 14 points at: "we must have done something clever".',
  },
  {
    id: 'growth-choice',
    tier: 4,
    kind: 'choice',
    tests: 'where exponential overtakes polynomial',
    prompt: 'n¹⁰ is far bigger than 2ⁿ at n = 10. Which is true?',
    options: [
      {
        t: 'n¹⁰ stays ahead, since it starts so far in front.',
        why: 'Where a function starts does not decide Big-O. Every exponential passes every polynomial.',
      },
      {
        t: 'They take turns being bigger for ever.',
        why: 'Once 2ⁿ is ahead, each step doubles it and multiplies n¹⁰ by less than 2.',
      },
      {
        t: '2ⁿ overtakes n¹⁰ eventually, and stays ahead forever.',
        ok: true,
        why: 'They cross just below n = 59. From there on, 2ⁿ is ahead for good.',
      },
      {
        t: 'They are Θ of each other.',
        why: '2ⁿ/n¹⁰ grows without bound, so no constant ceiling fits.',
      },
    ],
    close: 'Asymptotic means eventually. The crossing point can be late; it cannot be missing.',
  },
  {
    id: 'poly-closure',
    tier: 4,
    kind: 'choice',
    tests: 'why polynomial time composes',
    prompt:
      'An O(n²) algorithm calls an O(n³) subroutine once for each of its O(n²) steps, on inputs of size at most n. What is its running time?',
    options: [
      { t: 'O(n⁶)', why: 'That is n³ · n³. The outer loop is n², so it is n² · n³.' },
      {
        t: 'O(n⁵): still polynomial',
        ok: true,
        why: 'n² calls of O(n³) each is O(n⁵). Polynomials multiplied are polynomials.',
      },
      {
        t: 'O(2ⁿ)',
        why: 'Nothing here is exponential. Multiplying polynomials never leaves them.',
      },
      {
        t: 'O(n³), since only the largest term counts',
        why: 'That applies to terms added together. Nested work multiplies.',
      },
    ],
    close:
      'Polynomials are closed under adding, multiplying and composing. That is another reason the definition works.',
  },
];

export const questionsIn = (tier: Tier): Question[] => QUESTIONS.filter((q) => q.tier === tier);
