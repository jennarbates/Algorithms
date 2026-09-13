# Why this works: the proof section

A plan for a section below the challenge that shows, rather than states, why
the process has the properties the page claims for it. Three claims, each one
interactive against the run the reader has just watched.

Decisions already made:

- Cover three claims: it finishes, nobody is left out, and it is stable.
  Asker-optimality is deferred to a later phase. It does not replay cleanly,
  and the honest version of it on this page is a witness (every stable
  arrangement listed, the run's answer at the top of every student's column)
  plus a sketch, which deserves its own design.
- Form: a "Why this works" section under the challenge with one expander per
  claim. Not a separate guided mode; the claims should each be usable alone.
- Wording: plain first, in the page's vocabulary. A "say it the textbook way"
  toggle inside each expander reveals the formal restatement and names the
  terms it replaces, which is the same rule the rest of the page uses for
  jargon. The vocabulary test in `tests/narration.test.ts` applies to the
  plain layer of every claim.

## Status

- P0, P1 and P2 are built. `src/content/proofs.ts` holds the words,
  `src/components/WhyItWorks.tsx` holds the section and the `Claim` shell, and
  `tests/proofs.test.ts` holds the vocabulary test for the plain layer.
- Two decisions made while building P2. The plain sketches are functions of
  the asking side, because a sketch that says "student" while the schools are
  the ones walking down their lists is wrong. And the formal layer is checked
  the other way round: every banned term it uses must have a glossary entry
  naming the plain phrase it replaces, and every glossary entry must actually
  appear in the formal text.
- `WhyItWorks` takes an optional `bodies` map, one `ReactNode` per claim id.
  Each claim's body is its own component, slotted in from `App`. A claim with
  no body shows its claim and sketch alone.
- P3 is built. `src/core/asks.ts` is the pure grid (asker by receiver, keyed
  to the step of the ask; it throws if a cell would fill twice), and
  `src/components/FinishesBody.tsx` draws it. Every cell that fills at some
  point in the run is a button that scrubs the board to that ask, and cells
  ahead of the viewed moment are drawn faint so the reader can see what is
  still to come. The number in a cell is which question it was, first to last,
  so it agrees with the count above; the step number stays in the tooltip.
  `tests/asks.test.ts` checks, for every preset in both directions, that no
  cell fills twice and the count never exceeds n squared.
- P4 is built. `src/core/holds.ts` reads off a run the first ask each
  receiver ever got (the step their "nobody yet" chip vanished) and checks
  that everyone asked is holding somebody at every later moment.
  `src/components/LeftOutBody.tsx` is the body: a picker over the asking side,
  the picked person's own list with everyone they actually asked crossed off,
  one beat per receiver with a Look button that scrubs the board to the moment
  their hold began, and the count at the end. `tests/holds.test.ts` checks
  the invariant over every state of every preset in both directions.
- P5 is built. `src/core/replay.ts` takes a finished run and a pair and
  returns one of three shapes: already together, the asker is content (sits
  at or above this receiver on their own list, so nothing to replay), or the
  three beats with their step numbers. `src/components/HoldsBody.tsx` draws
  the beats, each with a Look button that scrubs the board; beat three draws
  the receiver's list at the end with its final hold in green and the asker
  in red. The pair is owned by `App` and shared with `PairChallenge`, so a
  pick in either place is a pick in both. While beats one and two are being
  looked at, `MatchLines` draws the would-be pairing as a wide translucent
  red line under the real ones. `tests/replay.test.ts` runs the replay for
  every possible pair on every preset in both directions and checks the ask
  is found, the answer is the next step, and the receiver's final hold always
  outranks the asker.
- Next: P6.

## The shape of every claim

Each expander has the same four parts, top to bottom:

1. The claim, one plain sentence.
2. A body driven by the current run. This is the part that is a visualisation
   and not a paragraph. It scrubs the board to particular moments in the run
   the reader has just watched, so the argument is always about people they
   can see rather than about variables.
3. The sketch: why it holds in general, in the same plain words.
4. The toggle to the formal version.

The section is disabled until the run is settled, with one line saying so.
All three arguments are about the finished board.

## Phases

### P0: history

`App` keeps every intermediate state instead of only the latest. Stepping
pushes, reset clears. `step` is pure and each state is small, so this costs
nothing, and it gives every proof a past moment to point at without touching
the engine or the exercise.

Housed in a hook, `useRun`, over a pure history module in `src/core/history.ts`
so the history logic is testable without React. One test: after k steps,
`states[k]` equals a fresh engine stepped k times, and `states[k].stepCount`
is k.

### P1: a scrubbable board

The board can show any past moment. A `viewStep` picks which state the panels,
the lines, the banner and the action headline draw from. While the reader is
looking at the past:

- a visible banner says so, with a "Back to now" button;
- the step button is disabled, so nobody can step from the middle of history.

The cheapest control for reaching a past moment is the log: click any line and
the board shows that moment. The proofs use the same mechanism
programmatically. There is still no step-back button; the log was always the
replacement for one, and this makes that literal.

Nothing about this phase should be visible in the default state of the page.

### P2: the section and the claim shell

`WhyItWorks` under the challenge, three `Claim` expanders sharing one skeleton
(claim, body, sketch, toggle). Formal wording lives in `content/proofs.ts`
next to the plain wording, so the vocabulary test can check one and not the
other.

### P3: claim one, it finishes

Plain: every question moves somebody one step down their own list, and a list
only has so many names on it.

Body: a grid, one row per asker and one column per receiver, so n by n cells.
A cell fills at the step its ask happened. Scrubbing through the run fills the
grid in step with the board, and the reader can see the same cell never fills
twice. The count of asks used out of n squared sits above it.

Sketch: n people, each with a list of n names, each ask uses up one name, so
there can be at most n times n asks, and then it must stop.

Formal: termination in at most n² proposals; each proposer's cursor is
monotone.

Degrades with instance size: past about six on a side the grid gives way to
the counter alone, in line with the v1 rule that one view degrades gracefully.

### P4: claim two, nobody is left out

Plain: nobody ever runs out of list, because the only way to run out is to
have asked everyone, and everyone who has been asked is holding somebody.

Body: pick any student. Suppose they had run out. The body dims every school
they asked, then scrubs to the step each of those schools was first asked and
shows its "nobody yet" chip vanishing, with a marker that it never comes back.
At the end it counts: all n schools holding somebody, only n students, so this
student is one of them, which is the contradiction, because the supposition was
that they were the one left free.

Sketch: the same, said once in general.

Formal: the matching is perfect; a receiver's hold is never released to empty.

### P5: claim three, it is stable

This reuses the challenge's pair picker and is the reason the section sits
under it.

Plain: for any two who are not together, at least one of them is happy where
they are.

Body, for a picked pair, say Priya and MIT, where Priya likes MIT more than
where she ended up. Three beats, each scrubbing the board:

1. Priya must have asked MIT, because she walked down her list past MIT to
   reach where she is. Scrub to that ask. The line overlay draws the
   would-be pairing in red.
2. What MIT did with her at that moment: held her, or turned her away.
3. MIT's hold only ever moves up its own list from there to the end. Scrub to
   the end and highlight MIT's final hold in its ranking, above Priya. So MIT
   does not want her back, and the red line never forms.

If the picked pair does not have that shape, because the student already sits
at or above that school on their own list, the body says so plainly: that is
not a pair that could break anything, because the student does not want it.

Sketch: the three beats in general terms.

Formal: no blocking pairs; the receiver-side invariant is what makes the
argument go.

### P6: polish and tests

- Narration tests for every claim sentence on every preset, in both
  directions, under the vocabulary rule.
- A test that the stability replay picks the correct ask step for every
  possible pair on every preset.
- Screenshots of each expander open, both themes, desktop and narrow.

## Dependencies on the engine

The stability replay needs the `ask` events in the log, and claim one needs
one `ask` event per proposal. The exercise suite already forces both, so the
section works unchanged against a rewritten engine.
