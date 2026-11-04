# Breaking boards

An interactive page for an optional COMPSCI 311 problem about searching when a
wrong guess costs you something. Boards are identical and each has a bending
strength, the heaviest weight it holds; you have n one-pound weights. With one
board the only safe way is 1, 2, 3, …, up to n tests. With two, is there a way
whose worst case is a fraction of n that shrinks to nothing as n grows?

The page does not answer that. It is a sandbox: the two ends of the problem are
shown in full, and the middle is left for the reader to try strategies on, each
one checked against every possible strength. Four chapters and three tiers of
practice.

| Chapter              | What it earns                                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 · One board        | The forced scan, replayed test by test against a strength you pick, with the tests every strength needs drawn underneath: worst case n, at strengths n − 1 and n. Going up by 2 or 3 instead is run the same way, and the page names the first strength it cannot pin down, and why. |
| 2 · Plenty of boards | Halving, as in lecture: ⌈log₂(n + 1)⌉ tests, and why no plan does better (each test has two answers, so t tests tell apart at most 2ᵗ strengths). Then the same procedure with 3, 2 or 1 boards, failing where it runs out, with the strengths it can no longer tell apart.          |
| 3 · Two boards       | Type the first board's weights (say `10, 25, 40`); the second board's part is forced and added by the page. Every strength is run: the worst case, where it happens, worst / n, and a chart of saved strategies at any n against the lines n and log₂ n.                             |
| 4 · Play it          | Pick every weight yourself against a random hidden strength or an adversary that decides as it goes, with 1, 2, 3 or plenty of boards.                                                                                                                                               |

## Running it

```bash
npm install
npm run dev
```

`npm test` runs the suites, `npm run build` writes the single-file
`dist/index.html` that `../site/build.sh` publishes at `/limited-search/`.

## The conventions

Written once in `src/core/boards.ts` and used everywhere, the questions included.

- The strength s is the largest weight a board holds, one of 0 to n: n + 1
  possibilities. s = 0 means it breaks under one pound; s = n means it holds
  every weight there is and never breaks in the experiment.
- Weight w breaks a board exactly when w > s. A broken board is gone; one that
  holds can be used again.
- A test is one weight on one board, and the test that breaks a board counts.
- The strength is found when one value is left. Running out of boards with two
  or more left is a failure, never a guess.

## What the page will not do

It never states, charts or presets a two-board strategy that beats a constant
fraction of n, and the practice never asks for one or for its growth rate. The
questions are about particular lists at a particular n: what they cost, where
the worst case sits, and which edit lowers it. `tests/questions.test.ts` scans
every file under `src/`, `index.html` and this README for the usual names of
the answer, so a later edit cannot slip one in by accident.

## Checked, not trusted

- The evaluator runs a strategy against every strength from 0 to n. It rejects
  a test whose answer is already known, and reports the first strength where a
  strategy runs out of boards, with the weights that broke them and what was
  still possible.
- One board is n for every n up to 60, at exactly n − 1 and n. Halving is
  ⌈log₂(n + 1)⌉ for every n up to 300, and with two boards at n = 100 it fails
  at strength 0, having broken both at 50 and 25.
- With plenty of boards, a search over every plan (each test splits the
  strengths still possible into the part that breaks and the part that holds)
  finds none that beats halving, for every n up to 300.
- Every first-board list is checked against a hand rule at every strength, on
  fixed lists and 300 random ones.
- `tests/questions.test.ts` recomputes each numeric answer by walking the list
  a second way, and checks that the options marked right in "which edit lowers
  it" are exactly the ones that do.

## CLRS

The course follows Kleinberg and Tardos, and the page keeps the lecture's
conventions. CLRS (third edition) lines up with the second chapter only.

- **Halving is CLRS's binary search.** Exercise 2.3-5 (§2.3, page 39) asks for
  binary search in a sorted array and an argument that its worst case is
  Θ(lg n); Exercise 4.5-3 (page 97) gets the same bound from the recurrence
  T(n) = T(n/2) + Θ(1). The page's exact count ⌈log₂(n + 1)⌉ agrees with that
  bound and is sharper than anything CLRS states for binary search.
- **Why nothing beats it is CLRS §8.1.** The decision-tree model (pages 191
  to 193) draws an algorithm as a tree with a test at each fork, and Theorem
  8.1's proof uses the fact that a binary tree of height h has at most 2ʰ leaves.
  CLRS applies it to sorting, with n! orderings as the leaves; here the leaves
  are the n + 1 strengths, so some strength needs ⌈log₂(n + 1)⌉ tests whatever
  the plan. The chapter 2 card "Why no plan does better" and the tier 1
  question `no-plan-beats` are this argument, and `tests/core.test.ts` checks
  it by searching every plan.
- **The scan has the shape of CLRS's linear search.** Exercise 2.1-3 (on
  page 22) is linear search, and Exercise 2.2-3 (page 29) asks for its worst case:
  every one of the n entries checked. The one-board scan is the same walk from
  the bottom, and its worst case is n tests for the same reason.

Where the conventions differ, and what moves:

- CLRS writes lg for log₂. The page keeps log₂, as in lecture.
- CLRS's binary search looks for a value v among n sorted entries and returns
  an index or NIL. Here the unknown is a strength, one of n + 1, and every test
  has exactly two answers, so the count is stated for n + 1 possibilities:
  ⌈log₂(n + 1)⌉. CLRS's §8.1 comparisons also have two answers (≤ or >), so
  the decision-tree argument carries over unchanged.
- CLRS states its bounds asymptotically (Θ(lg n), Ω(n lg n)). The page and the
  bank give exact counts at a particular n, because every answer is checked by
  running the plan.

What CLRS does not cover: there is no version of this problem in CLRS 3e, and
nothing on searching when failures are limited. Its adversaries are
not this kind either: the key chooser of §11.3.3 (page 265) picks its keys in
advance, and the quicksort "killer adversary" in the chapter 7 notes (page 190)
produces a bad array for a given implementation, after seeing a randomized
one's random choices. CLRS does not present either as answering tests one at a
time, as the adversary in "Play it" does. The one-board chapter, the
two-board chapter and that adversary have no CLRS counterpart, and the page
does not point to one.

## Imports carry `.ts`

As in [`../bounds`](../bounds), `src/core` and `src/content` import with `.ts`
extensions and use only erasable TypeScript, so Node loads them directly.
