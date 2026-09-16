# Gale-Shapley

An interactive page that explains the stable matching algorithm to someone with
no maths background, without simplifying it into something untrue.

Three students, three schools, one seat each. Watch who asks whom, who gets
held, who gets bumped, and then try to break the result. Then switch the page
into practice and work it yourself, on instances it never animates.

## The idea

The algorithm has no maths in it. It is a social procedure: ask, hold, bump,
repeat. What blocks people is not the procedure but the presentation, so the
default surface here uses names, faces and plain sentences, and the formal
machinery sits behind expanders nobody has to open.

The plain version is not a dumbed-down version. It is the actual algorithm, met
in the order a person can absorb it.

One thing the page exists to show above all else: **the result depends on who
does the asking.** Run it with the students asking and every student gets the
best outcome available to them in any stable arrangement. Run it with the schools
asking and every student gets their worst. Same algorithm, same preferences,
opposite answers.

## One screen

The page never scrolls. On a desktop the board, the work beside it and the
controls are all in view at once, and so is every question in practice. That is
the same contract [`../big-o`](../big-o) keeps, and it is kept the same way.

```
header                 title, Walkthrough/Practice, the condition being earned
 board          work    the two columns of the walkthrough
footnote               credit, and the keys
```

The point is not tidiness. Every argument this page makes is about people drawn
on the board: the claims in "Why this works" scrub the board to particular
moments of the run and draw a red line for a pairing that would have to exist.
Stacked down a page, the button that scrubs sat **two thousand pixels below the
thing it scrubbed**, so clicking it appeared to do nothing at all. The board
stays on screen so that it cannot.

### The rules

1. `html, body` are `100dvh` and `overflow: hidden`. The document never scrolls.
2. One flex column: header `flex: 0 0 auto`, the deck `flex: 1 1 auto`, footnote
   `flex: 0 0 auto`.
3. Every flex child on that path carries **`min-height: 0`**. A flex item
   defaults to refusing to shrink below its own content, so one missing line is
   all it takes for the lock to stop holding, and nothing looks wrong until the
   content grows.
4. One internal scroller per column, and never the thing the reader acts on.
   `.side__body` and `.practice__body` scroll; the controls under them do not.
5. Controls are pinned to the bottom of their column.
6. Below 1180px wide or 720px tall, the whole thing unlocks: `height: auto`,
   `overflow: visible`, one column, every internal scroller released. That rule
   lives at the end of `global.css` so it beats the locked ones wherever they
   sit. Locking a window that cannot hold the content is worse than not locking
   it, because it hides the bottom of whatever is open instead of letting the
   reader reach it.

720px is where the floor lands: the board is tallest before the run starts, at
517px, and the header, the two strips above it, the gaps and the footnote take
the rest.

### Four ways this breaks

Each of these failed silently while the page was being converted, so they are
written down rather than remembered.

**The chain through `#root`.** React mounts into a div, so the shell is
`body > #root > .page`, not the `body > .app` a hand-written page gets.
`height: 100%` on `.page` resolves against `#root`, which has no height, and
becomes `auto`. The shell is flex the whole way down instead, which needs no
ancestor to declare a height.

**`1fr` is not `minmax(0, 1fr)`.** A `1fr` track will not go below its content's
min-content width. Clamping the blurb on a card to one line made that width the
whole sentence, and the board's two panels quietly stopped being equal and
pushed past its edge.

**The board is two boxes.** `.board` is the frame that takes the height it is
given and scrolls if it is starved; `.board__inner` is what the pairing lines
are positioned against. That order is the whole reason for the extra element:
put the scroll on the box the lines are positioned against and the SVG stays put
while the cards move under it, so every line ends up pointing at the wrong card.

**The card blurbs decide the board's height, backwards.** Left to wrap freely
they took more lines as the column got narrower, so the board grew from 482px at
1000px wide to 645px at 640px. A board that gets taller as its column narrows
cannot be fitted to a screen. They are clamped to two lines, which is a ceiling
without costing the text, and the escape hatch unclamps them.

## Keys

Arrow keys belong to whichever mode is on screen, and never to a text field.

| Key   | What it does                                                          |
| ----- | --------------------------------------------------------------------- |
| `->`  | One step of the run                                                   |
| `<-`  | Look at the moment before, exactly as clicking a line of the log does |
| `Esc` | Back to now                                                           |

`<-` does not undo anything. There is no step-back on this page by design: a run
that can be rewound invites the reader to treat a pairing as decided and then
undecided, which is the misreading the page is built against. Looking back
leaves the run where it was, and the banner over the board says so.

## Commands

```bash
npm install
npm run dev            # dev server with hot reload
npm test               # the verifier suite
npm run test:watch     # same, in watch mode
npm run test:exercise  # the reimplementation exercise (see exercises/engine)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run format         # prettier --write
npm run build          # typecheck, then emit dist/index.html
```

`npm run build` produces **one self-contained HTML file**. That is a hard
requirement rather than a preference: the page is published as an artifact where
external hosts are blocked, so all CSS, JS and imagery has to be inlined.
`vite-plugin-singlefile` does the inlining.

## Where the code lives

```
src/
  core/          the algorithm, with no UI and no DOM
    types.ts       domain types
    engine.ts      the process, as a pure state machine
    stability.ts   blocking pairs, and the explanation behind each one
    enumerate.ts   brute force over every arrangement, used to check the above
    history.ts     a run with every moment kept, and which moment is being viewed
    asks.ts        every ask in a run as a grid, the evidence that it finishes
    holds.ts       when each receiver first held somebody, and that they never stop
    replay.ts      the three moments that show why a pair cannot break the result
  hooks/
    useRun.ts      the page's one piece of state, over core/history
  content/
    cast.ts        who appears on the page and what they look like
    presets.ts     the nine instances the page ships with
    proofs.ts      the words of the "Why this works" section, plain and formal
    questions.ts   the practice bank, four tiers of it
    narration.ts   the words of the run log, one line per event
  components/    React components
tests/           the verifier suite, plus the one-screen rules in layout.test.ts
exercises/       reimplement the engine from scratch, same suite
docs/            plans for what is not built yet
```

## Three things worth knowing before changing anything

**`step` is pure.** `(state) => state`, never mutating. That is what makes
stepping backwards, replaying and running to completion inside a test all
trivial, and it is why the UI can render straight from state. Keep it that way.

**Every claim about a preset is checked, not asserted.** `tests/presets.test.ts`
enumerates every possible arrangement for the small instances and confirms that
each preset really does have the property the page says it has: that this one has
exactly one stable arrangement, that flipping the sides changes nothing here,
that seven people get displaced in a row there. If a preference list is edited
and a preset quietly becomes a different market, the suite fails rather than the
page teaching something false.

The large preset is held to a further standard: it must be **typical** of its
size, not the most lopsided seed available. A test compares it against the
average over four hundred random markets of the same size. Cherry-picking would
have made a better demo and a worse lesson.

**The one-screen lock is half tested, and it is worth knowing which half.**
`tests/layout.test.ts` reads `global.css` and checks the rules the lock is built
from: every box on the shrink path names a zero minimum, every grid track that
carries clamped text uses `minmax(0, 1fr)`, the scroll is on the board's frame
and not on the box the pairing lines sit in, no controls row is a scroller, and
the escape hatch is last in the file and releases every scroller the locked
layer creates. Those are the four ways the lock breaks silently, and each check
has been confirmed to fail when its rule is broken.

What no test here can check is whether the lock actually **holds**, because that
is a layout outcome and there is no layout engine in the suite. jsdom would not
help: it lays nothing out and reports every rectangle as zero. That half is a
browser's job, so the check stays manual. Open the page at **1181x721**, the
tightest window the lock still covers, and confirm the document does not scroll,
the board does not scroll, and the controls are in view in both modes, on all
three tabs of the walkthrough and on every question in practice. The margin
there is three pixels, so a single extra line of copy anywhere in the header or
the footnote is enough to break it.

## Practice

Watching a run is not the same as being able to work one, and the gap between
them is where a problem set lives. So the page has a second mode, reached by the
`Watch it happen / Work it yourself` switch under the title, and it takes the
whole page over rather than sitting underneath the board. A reader who can still
see the answer cannot be asked for it.

### Four tiers, and a ramp inside each

**Tier 1** is the run itself, in the page's own words: work it by hand with the
students asking, then with the schools asking, decide which of six arrangements
hold, and account for the two people who do not move between the two runs.
**Tier 2** is the reading a problem set actually grades. It takes one statement
from K&T chapter 1, exercise 1, and spends six questions on it: what an instance
is, which formula says it, which formulas negate it, which English sentence
negates it, what is wrong with an argument that reaches the right conclusion the
wrong way, and then the correct disproof, assembled line by line. **Tier 3** is
where a textbook chapter ends: how many questions the process can possibly ask,
what an O(n²) bound rests on besides the procedure, the proof that the asking
side does best, what holds of every instance rather than of this one, whether
misreporting a list ever pays, and which of the assumptions are load-bearing.
**Tier 4** is what the chapter proves and then sets as exercises: the measure of
progress that bounds the loop and the proof that nobody is left out, which are
facts (1.2) to (1.5) of the text; the good-and-bad-people argument and forbidden
pairs, which are its two solved exercises; and hospitals with several posts and a
surplus of students, and what indifference costs, which are exercises 4 and 5.

Six questions each, and the order inside a tier climbs too.

| Tier 1 asks                               | The belief it is aimed at                                |
| ----------------------------------------- | -------------------------------------------------------- |
| the run, with the students asking         | that watching a run is working one                       |
| the run, with the schools asking          | that the answer does not depend on who asks              |
| which of six arrangements hold            | that an arrangement is judged by how happy it looks      |
| why two people are in the same seat twice | that the two runs are two samples                        |
| what is wrong with a worksheet answer     | that "flip the sides" is an answer whichever run you did |
| whether the order of the asks matters     | that a worksheet fixes an order because it has to        |

| Tier 2 asks                                 | The belief it is aimed at                                |
| ------------------------------------------- | -------------------------------------------------------- |
| what an instance is                         | that the instance includes who proposes                  |
| which formula says the statement            | that quantifier order is notation                        |
| which of six formulas negate it             | that negating the relation negates the claim             |
| which English sentence negates it           | that "some" and "every" can be swapped in English safely |
| what a flawed counterexample failed to show | that one stable matching settles an ∃M claim             |
| the disproof, assembled                     | that finding the instance is the proof                   |

| Tier 3 asks                                | The belief it is aimed at                                |
| ------------------------------------------ | -------------------------------------------------------- |
| the largest number of asks there can be    | that a displacement chain can be exponential             |
| what turns O(n³) into O(n²) here           | that a running time is a property of the procedure alone |
| the proof that the asking side does best   | that "first violation" is a stylistic choice             |
| which of six claims hold of every instance | that the algorithm can reach every stable matching       |
| whether misreporting a list pays           | that a proposer can game the order of their own list     |
| what breaks if lists may be incomplete     | that strictness and completeness are conveniences        |

| Tier 4 asks                                | The belief it is aimed at                                       |
| ------------------------------------------ | --------------------------------------------------------------- |
| which quantity bounds the loop             | that any quantity that grows will do                            |
| the proof that nobody is left out          | that it follows from the process finishing                      |
| why every good student gets a good school  | that a claim about every arrangement can be proved from the run |
| what forbidden pairs change                | that a forbidden pair is the same as being ranked last          |
| hospitals with several posts and a surplus | that unequal sides have no stable assignment                    |
| what ties cost                             | that ties can always be broken away                             |

Tiers 2, 3 and 4 follow Kleinberg and Tardos chapter 1: its statements (1.1)
through (1.9), its two solved exercises, and exercises 1, 2, 4, 5 and 8. The
running time question and the `Ranking` array in tier 3 are chapter 2.3 of the
same book, where the `O(n²)` bound is proved by saying which data structure
makes each iteration constant time.

### Nothing with a computable answer is written down

Where a question has an answer the core can work out, the question does not
store it. The two run-it-by-hand questions store an instance and a side, and the
component runs the engine. The arrangement question does not even store which of
its six options are correct, because `isStable` decides that, and the sentence
naming the two people who would both switch is generated from `blockingPairs`.
Edit a preference list and these answers move with it.

`tests/questions.test.ts` holds the rest to the same standard. Every option has
a reason. Every multiple choice has exactly one right answer and does not always
put it first, and neither does any step of a proof, because a proof whose right
line is always first is answered by clicking down the left edge. Every written
line in a run question names the school that run actually puts that person in.
The arrangement question offers every stable matching the instance has, so
"tick every one that holds" is a complete question rather than a sample. And the
instances the tiers lean on are checked for the properties the questions claim
they have: the four-by-four has exactly two stable arrangements differing on
exactly Ravi and Maya, the two-by-two has no pair anywhere that is first on both
lists, and the good-and-bad instance really does put every good student with a
good school in every one of its stable arrangements.

Tier 4 adds three claims that no preset can settle, so the suite settles them
directly. The tie instance is enumerated to confirm that every matching of it
has a weakly blocking pair while some matching has no strongly blocking pair.
The hospitals variant is run by hand in the test, four students for three posts
across two hospitals, and the result is checked against both kinds of
instability the hospitals-and-residents definition names, including the one
about a student who ends up with nothing. And the quantity the first question
rejects is walked through every preset in both directions, confirming both
halves of the reason it gives: the number of free people is allowed to stand
still, which disqualifies it, and it never rises.

### The vocabulary rule, one tier at a time

Tier 1 is held to the same banned word list as the log and the proof section: no
proposer, no receiver, no stable, no matching. Tiers 2, 3 and 4 are formal, because
a problem set says "stable matching" and a reader who has only ever met "an
arrangement that holds" is stranded at the first line. They earn those words the
way every expander on this page does, by introducing each one with the plain
phrase it replaces, and the glossary sits beside the questions rather than
behind a link. The test fails the build if a banned term reaches a formal tier
without an entry, or if an entry is listed and never used.

### The three instances it adds

`worksheet` is the four-by-four from a CMPSCI 311 discussion sheet, with the
colleges and students given the page's names. It has exactly two stable
arrangements, which is what makes it a good exercise instance: "find another
one" has an answer, and the answer is not "run it the other way and see",
because only two of the four people move. `no-mutual-first` is two and two,
arranged in a cycle so that each school's own top student is a student whose top
choice is the other school. Nobody in it is first on the list of anybody who
is first on theirs, so neither of its two stable matchings contains such a pair,
and that is the counterexample tier 2 builds. `good-and-bad` is four and four,
split into two good students, two good schools and two of each that nobody wants,
with every list ranking both good people on the other side above both bad ones.
Every good student is with a good school in all four of its stable matchings,
which is the claim tier 4 argues by counting and `tests/questions.test.ts`
settles by exhaustive search.

## Language

The default surface has a vocabulary it sticks to, and `tests/narration.test.ts`
enforces it rather than trusting anyone to remember: it walks every event of
every preset in both directions and fails if a banned term reaches the page.
Jargon appears only inside expanders, and each expander introduces its term by
naming the plain phrase it replaces. `tests/proofs.test.ts` holds the "Why this
works" section to the same rule, and checks the other direction too: every
banned term the textbook wording uses has to come with the plain phrase it
replaces.

| Use                             | Not                         |
| ------------------------------- | --------------------------- |
| asks                            | proposes                    |
| holds, keeps as a maybe         | tentatively accepts         |
| lets go, back to looking        | is rejected from            |
| everyone is settled             | the algorithm terminates    |
| no two people would both switch | there are no blocking pairs |
| student, school                 | proposer, receiver, agent   |

## A note on the schools

Real universities, real school colours, invented preferences. The marks are our
own; no institutional logo or wordmark is reproduced anywhere. Every preference
list in the app is made up for the example, and the page says so.

Real names are used because they carry meaning a reader already has: "Ravi wants
NYU because he is set on New York" needs no setup, where "student 3 prefers
school 2" needs a paragraph. The risk that comes with them is that prestige
imposes a common ranking, and when everyone agrees there is only one stable
arrangement and the central lesson disappears. That is why each student in the
hand-built presets has an idiosyncratic reason for their ordering.
