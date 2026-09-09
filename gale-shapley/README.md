# Gale-Shapley

An interactive page that explains the stable matching algorithm to someone with
no maths background, without simplifying it into something untrue.

Three students, three schools, one seat each. Watch who asks whom, who gets
held, who gets bumped, and then try to break the result.

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
  content/
    cast.ts        who appears on the page and what they look like
    presets.ts     the six instances the page ships with
  components/    React components
tests/           the verifier suite
exercises/       reimplement the engine from scratch, same suite
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

## Language

The default surface has a vocabulary it sticks to, and `tests/narration.test.ts`
enforces it rather than trusting anyone to remember: it walks every event of
every preset in both directions and fails if a banned term reaches the page.
Jargon appears only inside expanders, and each expander introduces its term by
naming the plain phrase it replaces.

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
