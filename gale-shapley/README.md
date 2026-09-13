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

## Layout

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
tests/           the verifier suite
exercises/       reimplement the engine from scratch, same suite
docs/            plans for what is not built yet
```

## Two things worth knowing before changing anything

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
