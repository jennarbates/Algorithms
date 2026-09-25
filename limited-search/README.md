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
| 2 · Plenty of boards | Halving, as in lecture: ⌈log₂(n + 1)⌉ tests. Then the same procedure with 3, 2 or 1 boards, failing where it runs out, with the strengths it can no longer tell apart.                                                                                                               |
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
- Every first-board list is checked against a hand rule at every strength, on
  fixed lists and 300 random ones.
- `tests/questions.test.ts` recomputes each numeric answer by walking the list
  a second way, and checks that the options marked right in "which edit lowers
  it" are exactly the ones that do.

## Imports carry `.ts`

As in [`../bounds`](../bounds), `src/core` and `src/content` import with `.ts`
extensions and use only erasable TypeScript, so Node loads them directly.
