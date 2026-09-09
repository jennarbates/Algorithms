# Exercise: write the engine yourself

The reference implementation lives in `src/core/engine.ts`. The point of this
exercise is to write it again from nothing, so do not open that file until this
suite is green.

```bash
npm run test:exercise
```

## What you are implementing

`engine.ts` in this folder has the full type declarations and empty function
bodies. Designing the state shape is not the exercise, so it is given to you.
Implementing the process is.

Five functions:

- `createRoster` turns an instance into asker and receiver form, so the process
  can be written once instead of twice.
- `createEngine` builds the starting state.
- `nextFreeAsker` finds who goes next.
- `step` advances one half-move, from `ask` to `resolve` or back again.
- `matchingOf` reads the arrangement out, always oriented student to school.

`runToCompletion` and `run` are already written, because they are just loops.

## What the suite checks

Not only that the answers come out right. It checks the two properties that make
the process work at all, on every intermediate state:

- Askers only ever move **down** their own list.
- Receivers only ever move **up** theirs, and never go back to holding nobody.

It also checks, by brute force over every possible arrangement, that the result
is stable and that it is the **best** outcome the asking side gets in any stable
arrangement. A wrong implementation usually produces something stable but not
optimal, which is the interesting failure and the one worth sitting with.

## Failures worth expecting

- Forgetting a receiver can drop who they are holding for someone better gives a
  first-come-first-served result that is stable surprisingly often, but not
  optimal.
- Advancing the cursor only on rejection, rather than on every proposal, makes
  an asker ask the same receiver twice and the run never ends.
- Advancing the cursor before reading who to ask makes everyone skip their first
  choice, which fails almost immediately.
