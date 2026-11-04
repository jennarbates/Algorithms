# Floors and ceilings

An interactive page for COMPSCI 311 lecture 3: Big-Omega, Big-Theta and
running-time analysis. [`../big-o`](../big-o) tells the ceiling as a building;
this page is the floor, the two together, and where the counts they bound come
from. Four chapters from the lecture, two more that practise the same skills on
programs of their own, and six tiers of practice, 46 questions in all.

One convention, stated once because the n₀ answers depend on it. The page
checks the lecture's definition, as Kleinberg and Tardos §2.2 write it:
T(n) ≤ c·f(n) for O and T(n) ≥ c·f(n) for Ω, for all n ≥ n₀, with c > 0 and
n₀ ≥ 0. CLRS §3.1 writes the same sets with more conditions: 0 ≤ T(n) ≤ c·f(n),
0 ≤ c·f(n) ≤ T(n), and n₀ positive. For functions that end up nonnegative, which
CLRS assumes of everything inside the notation and which every running time is,
the two agree on every verdict. What can move is the smallest n₀: for n − 10 = O(n)
with c = 1 it is 0 here and 10 in CLRS, and wherever it is 0 here for a function
that is never negative, CLRS writes 1. The page names the difference in chapter
1's claim card, for the constants on screen, and tier 1 has a question that asks
for CLRS's answer. The [CLRS section](#clrs) has the details.

| Chapter                    | What it earns                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Ω and Θ                | Pick a pair from the slides (n − 10 against n, 32n² + 17n + 1 against n, n² and n³, the building's own 14n² + 4n + 6), pick O, Ω or Θ, type the constants and n₀. The page checks the definition exactly and names the first n where it breaks, whether any n₀ could save that constant, and whether CLRS's smallest n₀ would differ.               |
| 2 · Count every step       | Print1, Print2, foo and bar, run one statement at a time with the output building up, the count set against its formula, and every bound the clickers offer marked true or false.                                                                                                                                                                   |
| 3 · The triangle           | sum-product's (i, j) pairs as a grid. The hard way counts the triangle, n(n + 1)/2; the easy way outlines a square inside it and gets Ω(n²) without the exact count.                                                                                                                                                                                |
| 4 · Polynomial or not      | Slide 16's nine running times on a log or linear axis, their times at a billion steps a second, and stable matching's n! against n².                                                                                                                                                                                                                |
| 5 · Three loops deep       | Two triple loops whose ranges depend on the loops outside them (triangles, i < j < k, and deeper, sum-product with a k loop inside), stepped on the (i, j) grid with each cell's k count. The exact count is the sum of the cells; the ceiling lets every loop run to n; the floor keeps a box of triples, one band per index, that all really run. |
| 6 · Same answer, less work | A table of powers built from scratch, n(n + 1)/2 multiplications, against one that reuses the last entry, n. Both tables from real runs, the ratio 2/(n + 1) going to 0, and the output size as a floor on any algorithm: n entries, or n² for a times table.                                                                                       |

## Running it

```bash
npm install
npm run dev
```

`npm test` runs the suites, `npm run build` writes the single-file
`dist/index.html` that `../site/build.sh` publishes at `/bounds/`.

## Exact, not approximately right

The lecture's own clicker turns on c = 0.99 against n − 10, where the two sides
are exactly equal at n = 1000. In floating point 0.99 is not 0.99, and whether
1000 passes comes down to rounding. So `src/core/poly.ts` keeps coefficients
as fractions of BigInts, typed in as decimals, and every verdict on the page is
checked at whole numbers with no rounding. Floating point only suggests where
the roots are; every candidate it suggests is checked exactly. The smallest-n₀
search is tested against scanning every n on 400 random polynomials, many built
from integer roots so that exact zeros, the hard case, come up often.

## Checking the slide

Slide 10's easy way says the square holds "at least (n/2)²" steps. That is
true for even n. For odd n the square has ⌊n/2⌋(⌊n/2⌋ + 1) steps, a quarter
below (n/2)²: 6 against 6.25 at n = 5. The conclusion survives, since the count
is at least ((n − 1)/2)², and chapter 3 and tier 3 say so rather than repeat the
line as if it held for every n. `tests/core.test.ts` checks both halves.

## Practice

Six tiers, one per chapter, in the order the chapters run: 9, 10, 7, 7, 6 and 7
questions. The lecture's clickers are all there, marked with their slide. The
eight questions whose ids start `clrs-` are adapted from CLRS, third edition,
and say so in the prompt; the [CLRS section](#clrs) lists them. Inside each
tier the CLRS questions sit next to the lecture question they extend.

## Checked, not trusted

- Every program's closed form (n² + n, 2n, n², n³, n(n + 1)/2, and for the
  new chapters n(n − 1)(n − 2)/6, n(n + 1)(2n + 1)/6, n(n + 1)/2, n and n²) is
  checked against a real run for n = 0 to 40 (bar to 20).
- Chapter 5's boxes are checked triple by triple to be all real steps, and each
  floor (box ≥ n³/216 from n = 3 for triangles, ≥ n³/27 from n = 2 for deeper)
  at every n up to 300 and not one n earlier. Chapter 6's two power tables are
  checked equal, entry by entry, and the ratio 2/(n + 1) exact.
- Every lecture clicker answer is worked out in `tests/core.test.ts` from the
  engine: 0.99 is the largest c offered, Print1 prints `XYYYYXYYYYXYYYYXYYYY`,
  Print1 is Ω(√n), Θ(n²) and O(n⁴) at once, Print2 is Θ(n).
- `tests/questions.test.ts` recomputes each numeric answer a second, slower way,
  checks that every stored witness really is one, and tests the written claims
  (2ⁿ passes n¹⁰ between n = 58 and 59, and so on).
- `bestN0Clrs`, the smallest n₀ under CLRS's definition, is checked against
  scanning each of its conditions on 300 random pairs, at least ten of which
  the nonnegativity conditions really decide. INSERTION-SORT's count of each
  line is checked against CLRS's table for sorted and reversed arrays up to
  n = 40, and every order of 1 to 7 is checked to cost between the two.
  Horner's rule and the term-by-term evaluation are checked to give the same
  value.

## Imports carry `.ts`

As in [`../graphs`](../graphs), `src/core` and `src/content` import with `.ts`
extensions and use only erasable TypeScript, so Node loads them directly. That is
how `../worksheets/bounds.mjs` builds the printable workbook from this engine and
this bank.

## CLRS

The course follows Kleinberg and Tardos, and so does this page. CLRS, third
edition, covers the same material in these places.

| Chapter                    | CLRS 3e                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 · Ω and Θ                | §3.1, pp. 43 to 53: Θ, O and Ω as sets (pp. 44, 47 and 48), the assumption that every function is asymptotically nonnegative (p. 45), the worked example ½n² − 3n = Θ(n²) (p. 46), Theorem 3.1 (p. 48).                  |
| 2 · Count every step       | §2.2, pp. 23 to 29: INSERTION-SORT's cost cᵢ times the number of executions of each line, tⱼ, best and worst case, order of growth. §3.1, pp. 48 to 49: what O and Ω of "the running time" mean.                         |
| 3 · The triangle           | Appendix A.1, equations (A.1) and (A.2), p. 1146. Appendix A.2: "Bounding the terms" gives the ceiling n² (p. 1151), "Splitting summations" the floor (n/2)² (p. 1152). Exercise 3.1-1 (p. 52) is close to `additivity`. |
| 4 · Polynomial or not      | §3.2: equation (3.10), nᵇ = o(aⁿ) (p. 55); n! ≤ nⁿ, Stirling's approximation (3.18), n! = o(nⁿ) and n! = ω(2ⁿ) (pp. 57 to 58). Problem 1-1 (pp. 14 to 15). §34.1, pp. 1053 to 1054, on why polynomial time.              |
| 5 · Three loops deep       | Appendix A.1, equation (A.3), the sum of squares, deeper's count (p. 1147). The box of triples is A.2's split, one dimension up.                                                                                         |
| 6 · Same answer, less work | Problem 2-3, Horner's rule against evaluating each term from scratch (p. 41).                                                                                                                                            |

Lifted from it into the practice bank, with every number computed from the
engine and checked in the tests:

| Question                | Tier | From                                                                                                     |
| ----------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `clrs-o-nonneg`         | 1    | §3.1's definition of O (p. 47), to contrast the two conventions                                          |
| `clrs-half-n2`          | 1    | §3.1's worked example, ½n² − 3n = Θ(n²) with c₁ = 1/14, c₂ = ½, n₀ = 7 (p. 46)                           |
| `clrs-insertion-while`  | 2    | §2.2's count of line 5, tⱼ = j in the worst case (pp. 26 to 27)                                          |
| `clrs-insertion-bounds` | 2    | §3.1 on the running time of insertion sort (pp. 48 to 49), and Exercise 3.1-6 (p. 53)                    |
| `clrs-split`            | 3    | Appendix A.2, "Splitting summations" (p. 1152)                                                           |
| `clrs-one-second`       | 4    | Problem 1-1 (pp. 14 to 15), at this page's billion steps a second instead of CLRS's microsecond per step |
| `clrs-exp-constants`    | 4    | Exercise 3.1-4 (p. 53)                                                                                   |
| `clrs-horner`           | 6    | Problem 2-3 (p. 41)                                                                                      |

Three existing questions cite it as well: `o-converse` is Problem 3-4(a)
(p. 62), `poly-closure`'s closing line is the third of §34.1's reasons for
calling polynomial time tractable (p. 1054), and `which-floor` now says that
comparison sorting's Ω(n log n) is a worst-case bound, Theorem 8.1 (p. 193).

Where the two differ, and what moves:

- **The definition.** CLRS asks 0 ≤ T(n) for O and 0 ≤ c·f(n) for Ω and Θ, and
  a positive n₀. `src/core/bounds.ts` checks the lecture's version and
  `bestN0Clrs` works out CLRS's smallest n₀ beside it. On chapter 1's pairs no
  verdict changes. The smallest n₀ moves from 0 to 1 wherever it is 0 here (4n + 10
  against n, ½n², any floor of 32n² + 17n + 1 or 14n² + 4n + 6 with c at most
  the leading coefficient), and for n − 10 against n with O and any c ≥ 1 it moves
  from 0 to 10, because n − 10 is negative before that. In the bank no numeric
  answer moves: `half-n0` (20), `witness-theta` (18), `witness-triangles` (3) and
  `clrs-half-n2` (7) are the same under both, and the tests check all four.
  The one stored witness that is not a CLRS witness is `witness-4n`'s n₀ = 0,
  and its explanation says CLRS would write n₀ = 1. The witness questions still
  accept n₀ = 0, since they check the lecture's definition.
- **What gets counted.** CLRS §2.2 counts every line, each with its own cost cᵢ,
  and a loop test runs once more than its body. The page counts one statement
  per program (the characters printed, or the innermost line). The constants
  differ, the Θ never does; chapter 2 says so, and `clrs-insertion-while` counts
  a loop test the CLRS way.
- **Odd n.** Appendix A.2's split assumes n even, as the slide does. The page goes
  further and checks odd n (see [Checking the slide](#checking-the-slide)); CLRS
  is not wrong, it just does not need the odd case for Ω(n²).
- **Ω of a running time.** CLRS (p. 49) reads "the running time is Ω(g(n))",
  with no modifier, as a floor on every input, so a floor on the best case.
  Every program on the page has one input per n, so best and worst case are the
  same there and nothing on it disagrees; `clrs-insertion-bounds` is where the
  difference between "the running time" and "the worst-case running time" is
  asked about.

Not integrated: o and ω beyond the limit test `strictly-faster` already uses
(CLRS equation (3.1), p. 51); Exercise 2.2-1, a Θ(n³) witness whose floor needs
n₀ = 200001 with c₁ = 1/2000, which would repeat `clrs-half-n2` at a larger
scale; and Problems 3-2 and 3-3 (pp. 61 to 62), whose functions (n^(sin n),
lg(n!), iterated logarithms, towers of 2) are mostly outside chapter 4's growth
classes; 3-2(b), nᵏ against cⁿ, is what `growth-choice` already asks. Stable
matching, its n! brute force and slide 17's three reasons for polynomial time
are Kleinberg and Tardos, not CLRS: CLRS 3e does not treat stable matching, and §34.1 gives three
different reasons (few practical problems need a high degree, for many reasonable
models of computation, polynomial time in one model is polynomial time in
another, and polynomials are closed under adding,
multiplying and composing).
