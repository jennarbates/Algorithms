# Floors and ceilings

An interactive page for COMPSCI 311 lecture 3: Big-Omega, Big-Theta and
running-time analysis. [`../big-o`](../big-o) tells the ceiling as a building;
this page is the floor, the two together, and where the counts they bound come
from. Four chapters from the lecture, two more that practise the same skills on
programs of their own, and six tiers of practice.

| Chapter                    | What it earns                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Ω and Θ                | Pick a pair from the slides (n − 10 against n, 32n² + 17n + 1 against n, n² and n³, the building's own 14n² + 4n + 6), pick O, Ω or Θ, type the constants and n₀. The page checks the definition exactly and names the first n where it breaks, and whether any n₀ could save that constant.                                                        |
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

## Imports carry `.ts`

As in [`../graphs`](../graphs), `src/core` and `src/content` import with `.ts`
extensions and use only erasable TypeScript, so Node loads them directly. That is
how `../worksheets/bounds.mjs` builds the printable workbook from this engine and
this bank.
