# The Big-O Building

An animated, step-through explanation of the definition of Big-O:

```
T(n) <= c * f(n)   for all n > n0
```

The page opens by stating what the notation claims, before the metaphor starts:
Big-O is a ceiling. `T(n) = O(f(n))` says there exists a constant `c` and a
starting point `n0` such that `c * f(n)` never drops below `T(n)` once `n` is
past `n0`. It is an upper bound, not a measurement, and the last step comes back
to what that does and does not promise.

In between it is told as a building. `T(n)` starts on the roof, every term of it
standing side by side. Then `n` grows: the leading term swells until it owns the
whole slab and shoulders the lower order terms off the edge, and they land on
the street. Left alone up there, at the size it grew to, it brings the slab down
and goes through with it, which is the picture of `14n^2` being smaller than
`T(n)`, and only `c` can lift it back out.
Then `f(n)` tries to go up on its own and can only ride the elevator down to the
basement, because without `c` it is smaller than `T(n)`. Bring `c` along and it
goes straight back to the roof.

The worked example throughout is `T(n) = 14n^2 + 4n + 6`, with `f(n) = n^2`,
`c = 15` and `n0 = 5`. Note that `c = 14` never works, for any `n`, since
`4n + 6` is always positive; anything above 14 works eventually, and
`15n^2 >= 14n^2 + 4n + 6` holds from `n = 6` on. A plot of the real curves sits
beside the building so the metaphor never says something the numbers cannot
back up.

Step numbers in this file are the ones the page itself shows in its counter,
`1 of 9` through `9 of 9`. In the source they are the indices of the `scenes`
and `CHARTS` arrays, which start at zero, so step 3 is `scenes[2]`.

## What the building means, and where it stops meaning it

Two things about the metaphor are easy to get wrong, so the page says both of
them out loud rather than leaving the reader to notice.

**The roof changes meaning once.** In the first steps the roof means "part of
`T(n)`", which is why all four chips sit level even though `14n^2` dwarfs `6`:
height is membership, not size. Once the chips sink below the slab and come back
up as `c * f(n)`, the roof means "at or above `T(n)`", which is what lets `n^2`
be sent to the basement for being too small. Without naming that switch the two
readings contradict each other, because under the earlier rule `n^2` belongs on
the roof.

**The lower order terms are outgrown, not killed.** `4n + 6` does not shrink as
`n` grows, it grows too; what shrinks is `(4n + 6) / 14n^2`. So the roof is not
a scarce resource the terms compete for, it is only wide enough to *name* one
term, and the ones you stop naming are still down there and still positive. That
is the whole reason `c` is 15 and not 14, and the note beside the bodies says so:
`not gone, still > 0, which is why c > 14`.

### The crossing is the same crossing

`15n^2 >= T(n)` rearranges to `n^2 >= 4n + 6`. Those are the same inequality, so
the moment the shape `n^2` finally outgrows the two terms that were pushed off
the roof is exactly `n0`. The page uses this three times on the one fact:

- the gap curve is `15n^2 - T(n)`, which is `n^2 - 4n - 6`, which is also
  `n^2 - (4n + 6)`, so the one plot answers both questions and carries both
  readings as labels
- the `f(n)` step draws `4n + 6` alongside `n^2` and dots their crossing at
  `n = 5.16`
- in the building, the `n0` marker and the street are the same line, so `f(n)`
  riding down past the street is visibly passing the terms it will later outgrow

One more thing the plot says and the building cannot: `n` counts input size, so
it is a whole number. The gap curve turns positive at `n = 5.162`, which is why
`n > n0` with `n0 = 5` is the right phrasing and `n >= 5` would be wrong
(`15 * 25 = 375`, just under `T(5) = 376`).

### The bound does not have to be tight

The last step exists because every step before it walks toward `n^2`, and a
reader can easily finish them believing Big-O *is* the leading term. It is not.
The definition asks whether a ceiling exists, not which ceiling is lowest, so
plenty of other functions are correct answers too:

| bound | `c` | holds from |
| --- | --- | --- |
| `15n^2` | 15 | `n = 6` |
| `100n^2` | 100 | `n = 1` |
| `n^3` | 1 | `n = 15` |

All three are true statements about `T(n)`, each weaker than the last. The
building draws them as three ceilings stacked over the roof, and the plot widens
to `n = 0 to 30`, which is far enough out for `n^3` to have visibly left both of
the others behind (`n^3` passes `15n^2` at `n = 15`, so a window ending at 12
would have made the loose bound look like the tight one).

`n^2` is worth saying because it is the lowest ceiling that fits, and the page
names that stronger claim as what it is: `Theta`, not Big-O.

## Writing for a reader with no background

The page assumes algebra and nothing else. No computer science, no limits, no
asymptotic notation known in advance. Concretely that means:

- `n` and `T(n)` are defined in words before they are used for anything: `n` is
  the size of the input and `T(n)` is the number of steps the code takes on an
  input that size. Step 2 says this outright rather than leaving it to be
  inferred from the axis labels.
- the same step defines *term*, *leading term* and *lower order*, because the
  whole roof metaphor rests on them.
- the formal line in the sidebar is written out in words, not quantifiers.
  `there is a c and an n0 with ...` rather than `exists c, n0 : ...`. The reader
  who wants the symbol version has the banner across the top of the page.
- `asymptotic` is defined at the point it is first used, in step 8, as the name
  for the `from some point onward` part of the definition.
- `Theta` is given its pronunciation and its meaning, pinned from both sides,
  rather than being dropped in as a symbol in the last step.
- every `n` the page evaluates at is a whole number, because it told the reader
  `n` is a count. That arithmetic lives in the captions rather than on the plot,
  for the reason in *The plot argues in symbols* below, and the magnifier is
  centred on a whole `n` too. The only fractional values on the page are places
  where two curves cross, `n = 5.16`, and those are named as crossings rather
  than as inputs.
- the `n0 = 5` versus `from n = 6 on` gap is the easiest thing on the page to
  trip over, so step 6 shows both sides of it, 25 against 26 and 36 against 30,
  and then says why the rule reads `for every n greater than n0`.

## Layout and motion

On a desktop the page is locked to one screen: the building, the plot and the
caption sit side by side, and the controls stay in the same view, so the
transition between steps is never below the fold. Under 1180px wide, or in a
very short window, the three panes stack and the controls pin to the bottom of
the window instead.

The worked example and the name of every part are carried inside the visual,
not only in the prose. The equation strip above the drawing colours `c` green,
`f(n)` gold and the lower order terms red, the same four colours the legend and
the plot use, and brackets over the roof name whatever is standing on it in
that step.

Step 3 animates the squeeze, and the mechanism is the point: nothing jumps. The
`14` and `n^2` chips grow in two pumps, from full size to 2.4x, pinned at their
left edge so all of that growth travels rightward. The two lower order terms are
carried along in front of them, the gap between the pair and the small terms
closing from 22px to 13px as the pressure builds, until each one runs out of roof
and topples over the edge: `6` on the first pump, `4n` on the second. The fall
has no upward hop, because a chip that is shoved does not leap; it just tips,
tumbles, bounces once and lands in a spreading pool on the street.

Then the slab goes too. With `4n` still in the air the pair leans on it, a red
zigzag opens across the concrete and the whole drawing starts to tremble, a
shake that grows from nothing over 420ms. Then it fails. The roof is clipped
away between `x = 160` and `x = 346`, which is nearly all of it, the span that
went missing drops into the street as two halves tipping apart (`#slabFall`,
so the roof that is suddenly gone has somewhere to have gone), eight fragments
tumble after it, dust lifts off the break, and the drawing takes a 6.5px shake
decaying over a second.

The pair falls on `t^2`, straight down, with no bounce at the bottom, only an
overshoot and a settle, because heavy things do not spring back. It keeps its
2.4x the whole way and keeps it at rest. Shrinking it on the way through would
take away the reason the roof broke, so the size that did the damage is the
size that lands, and it only returns to normal at the step change, once the
point has been made.

One number drives all of it. `scaleAt(t)` gives the scale of the surviving pair
at any moment, `bigAt(s)` turns that into their positions and `pushAt(s)` into
the positions of the two chips being shoved, so the push can never drift out of
step with the growth that is supposed to be causing it. `GROW` is set to the
scale at which `4n` runs out of roof, which is why the pair ends up filling the
slab with about 17px to spare. All of it respects `prefers-reduced-motion`,
which snaps the pair to full size and the terms straight to the pavement, and
opens the roof already broken with no shake, no falling span and no dust.

### One idea per step

There are nine steps, and the split is deliberate: within a step the
caption, the equation strip, the bracket over the roof and the note in the sky
all hold still. Things move, but nothing that has to be read is replaced while
it is being read. Where an argument has three parts it gets three steps and
three clicks, rather than three captions on timers inside one step.

### Sinking below the roof line

`14n^2` on its own is not a bound: dropping `4n + 6` took something positive
away, so what is left is under `T(n)`. From the end of step 3 through step 6 the
two survivors say so by position. They sit at `y = 122`, below the slab, and the roof
is drawn a second time on top of the chips (`#roofOver`, a fill plus its two
edge lines so it leaves no seam on the original and never reaches the elevator
shaft) so that a chip down there is cut by the roof instead of floating in front
of it. The drop has to clear the slab completely, because the number a chip
carries is printed at its centre: sink it halfway and the label is the part the
roof hides.

They get down there by breaking through, at the end of step 3, rather than by
gliding down when the step changes. One `clipPath` (`#slabGap`) is applied to
both copies of the roof at once, so the hole is a hole in one slab and not two
slabs disagreeing, and `roofBreak(on)` is the only thing that opens or closes
it. At the end of step 6 the pair rises back through, `roofBreak(false)` closes
the slab behind it, and that is the payoff for `c = 15`.

Because the pair goes through at 2.4x, the hole has to be almost the whole
slab, and that costs the argument something: steps 4 to 6 need a roof *line*
for the survivors to be under, and there is barely any roof left to be under.
So `#roofGhost` keeps the line without the slab. A dashed green rule sits at
`y = 108`, exactly where the concrete was, between two surviving stubs at each
end of the span. The stubs say it was a slab, the dashed line says where its
height was, and both go away when the real slab comes back. At 2.4x the pair
rests at `y = 162`, deep enough that its top clears that line by a clear
margin; at normal size from step 4 on it rests at `y = 122`, where the line
crosses its top edge the way the solid slab used to.

### Where the 15 comes from

Swapping the `14` chip for a `15` in one frame reads as a number changing for no
reason, so it is spread over three steps, and the `15` is never asserted. It is
arrived at as `14 + 1`, and the `1` has a visible reason to exist.

- **Step 4** opens with the pair already through the slab, reading `14`, with the
  strip saying `so 14n^2 < T(n)` in red and the note saying `14n^2 is not a bound`.
- **Step 5** slides `n^2` right and stands a dashed green `+1` chip in the gap.
  The bracket becomes `14n^2 + 1n^2` and the note gives the arithmetic: raising
  `c` by one adds a whole `n^2`, because `15n^2 - 14n^2 = n^2`. The chip is
  dashed because it is not a term of `T(n)`, it is what the constant buys.
- **Step 6** folds the `+1` into the constant, rolls `14` to `15`, lifts the pair
  back above the roof line, closes the slab behind it, and brings up the `n0`
  marker on the street.

## The plot

The plot is not one fixed picture. Each step gets its own window on the same
functions, chosen so the thing that step is claiming is actually visible, and
the move from one window to the next is animated so the zoom can be followed.

### The plot argues in symbols, the prose does the arithmetic

`n` is a free variable, so picking an `n` to measure at is an arbitrary choice
the reader did not make, and a plot covered in values from arbitrary spots
reads as a table rather than a claim. So the annotations on the plot say what
is true of the relationship at every `n`: `15n^2` starts below `T(n)` and ends
above it, the red band is `4n + 6` and is positive everywhere, `n^2` is under
`T(n)` at every `n`. The gap markers and probe dots stay, because the marker
is a pointer rather than a measurement, but they no longer carry a number.

Three kinds of value survive on the plot, because they are answers rather than
samples: `n0 = 5`, the constant read-out counting up to `c = 15`, the crossing
at `n = 5.16`, and `n^3` holding from `n = 15`. The worked arithmetic that
checks all of this still exists, in the caption and in the `NUMBERS` line
beside it, where a reader who wants the sum can find it without the picture
being made of sums.

| Step | Window | What it shows |
| --- | --- | --- |
| 1 | n 0 to 12 | `T(n)` with everything above it washed green: the region a bound is allowed to live in. `T(n)` itself is drawn as the building's slab, same fill and same two edge lines, so the green reads as the roof and everything over it |
| 2 | n 0 to 12 | `T(n)` on its own |
| 3 | n 0 to 12 | `T(n)` against `14n^2`, with the sliver between them marked: that sliver is all of `4n + 6` |
| 4 | n 0 to 12 | the same picture with that sliver magnified eight times, see below |
| 5 | n 0 to 12 | `T(n)` and `15n^2` at full height, with the distance between them marked twice: once early where `15n^2` is underneath, once later where it is on top and staying there |
| 6 | the gap, y from -20 to 100 | `15n^2 - T(n)`, which is `n^2 - 4n - 6`, red below zero and green above. At this scale the sign change at `n = 5.16` is obvious, where on the raw curves it is a couple of pixels. This one subtracts on screen, see below |
| 7 | n 0 to 12, y to 620 | `n^2` large enough to see at last, with `T(n)` climbing out of the top of the frame and the distance between the two marked. `4n + 6` is drawn in too, low in the frame, with a dot where `n^2` overtakes it at `n = 5.16`, which is `n0` |
| 8 | n 0 to 12 | the same `n^2` curve scaled vertically from `c = 1` to `c = 15`, with a live readout of `c`, landing on the dashed target above `T(n)` |
| 9 | n 0 to 30 | `T(n)`, `15n^2` and `n^3`, far enough out that the loose bound has visibly pulled away from the tight one |

### Magnifying `4n + 6`

Step 3 says the sliver between `T(n)` and `14n^2` is all of `4n + 6`. Step 4
makes it visible. Somewhere around `n = 11` that sliver is about ten pixels on
a plot 486 pixels tall, so an 18px square is cut out of the plot there and
redrawn eight times bigger as a detail panel in the empty upper left, with
connector lines back to the box it came from. The panel grows out of that box rather than appearing, so the zoom
is watched instead of asserted.

None of it is a special case: a view can carry its own box (`bx0`, `bx1`, `by0`,
`by1`), so `sxOf` and `syOf` place the panel's window in the panel's rectangle
and every existing helper, `curve`, `band` and `vgap`, draws into it unchanged.
Every word sits outside the panel, because the band sweeps corner to corner and
leaves no room inside for a label.

What the panel is there to settle is a distinction, not a size. The *share*
`(4n + 6) / T(n)` really does fade toward zero, which is why `n^2` can carry the
name of the bound on its own. The *quantity* `4n + 6` does not: it grows without
limit and is positive at every `n`, so `14n^2` falls short of `T(n)` by exactly
that amount, forever. Those two facts point opposite ways and the step needs
both, so the panel ends on the sentence that separates them: a small share is
not a small number. That line sits in the panel rather than only in the caption
because the magnified band is the exact spot where a reader decides the dropped
terms were nothing.

Calling `4n + 6` a rounding error, which an earlier draft did, gets this wrong
twice. A rounding error is bounded and this is not, and it is the wrong reason
anyway: the terms can be left out of the name of the bound because a constant
can be raised to cover them, which is what the next two steps do, not because
they are too small to matter.

Step 8 is the point of the whole page: multiplying by a constant only ever
stretches a curve up the y axis, it never bends it, and that stretch is enough
to clear `T(n)` from `n0` on.

### Where `15n^2 - T(n)` comes from

`15n^2 - T(n)` is not a function anyone handed us, it is the distance between
the two curves, and opening on the finished picture makes it look like a new
curve out of nowhere. So it is derived across two steps, each with one equation
strip that does not change while it is being read.

**Step 5, `is T(n) <= 15n^2 ?`** Both curves at full height, on top of each
other. The distance between them is marked twice, once on each side of the
crossing: early, where `15n^2` is the one underneath, and later, where it is
the one on top and stays there. Both gaps are tiny against the heights they
are measured from, which is why the crossing cannot be seen at this scale.

**Step 6, `15n^2 - (14n^2 + 4n + 6) = n^2 - 4n - 6`** `T(n)` sinks onto the axis
and `15n^2` is carried down with it, because subtracting `T(n)` from both is
exactly that. The y window deliberately holds still for the first 45% of the
move, so what you see is the curves coming down rather than the camera closing
in, and only then follows them into the zoomed window. Two dots on the finished
curve sit at the same two places the gaps were marked, one below the line and
one above it, so the curve is visibly the distance measured in the step before
and not a new object.

Under `prefers-reduced-motion` the subtraction is skipped and step 6 opens on
the finished plot.

## Practice

A reader can follow all nine steps and still leave with the wrong general rule.
The three that survive a good explanation are that Big-O *is* the leading term,
that lower order terms vanish, and that a bound is a measurement. So the page has
a second mode, reached by the `Walkthrough / Practice` switch in the header, and
every question in it is built around one specific wrong belief.

The mode switch swaps the three pane stage for one question panel and a progress
column. It is the same file, the same tokens and the same panel furniture, which
matters for a practical reason as well as a visual one: `site/build.sh` publishes
only each project's `dist/index.html`, so anything that lives in a second file
never reaches the site.

### Distractors are answers, not filler

Every option carries its own written explanation of the exact misconception it
encodes, and the explanation appears under the option that was clicked. Clicking
a wrong one is not punished: it opens that option's reasoning and leaves the
others available, so a reader can work through all four and find out why three of
them are wrong rather than only that they were. A question is scored on the first
answer, and the score is never downgraded afterwards, which is what makes reading
the rest free.

The distractors are the load-bearing part. `c = 14 works for large enough n` is
not a wrong answer someone made up, it is what the page's own argument sounds
like to a reader who took *outgrown* to mean *gone*. Two of them are true
statements that answer a different question, which is the harder kind to catch:
`c must exceed the leading coefficient` is true of this `T(n)` and false as a
rule, since `T(n) = 14n² - 4n` takes `c = 14` with nothing to spare, and
`O(n log n + n²)` is correct but is not what anyone writes.

Where a question has a step that settles it, the closing note links to that step
by number and title. Following the link is a round trip: the walkthrough puts a
`Back to question N` button beside its own controls until the reader takes it.

### Two tiers

**Tier 1** stays on `T(n) = 14n² + 4n + 6`, so it is checking whether the thing
that was just watched was understood. **Tier 2** takes the same definition to
functions and code the page never drew, which is the only way to tell
understanding from recall. Nine questions each.

| Tier 1 asks | The belief it is aimed at |
| --- | --- |
| why `c = 14` fails at every `n` | that a fading share is a vanishing quantity |
| which values of `n₀` work with `c = 15` | that `n₀` is a single number to be found |
| the smallest `n₀` once `c = 18` | that `c` and `n₀` are independent |
| which of six claims about `T(n)` hold at once | that a function has one bound |
| what height means in the drawing | that the roof means one thing throughout |
| what multiplying by `c` does to a curve | that a large enough constant can outrun a shape |
| what `T(n) = O(n²)` promises about a run | that a bound is a measurement |
| why `4n + 6` can be left out of the name | that the definition mentions terms |
| ordering `6`, `4n + 6`, `n²`, `14n²`, `n³` | that `n²` and `14n²` differ in growth |

| Tier 2 asks | The belief it is aimed at |
| --- | --- |
| which of six rewrites are legal | that constants are forgiven in an exponent too |
| the count for a loop whose inner bound is `i` | that doing half the work loosens the bound |
| a loop that halves its counter | that a shrinking loop is a logarithmic one |
| whether Big-O means the worst case | that `O` and `Ω` are worst and best case |
| the smallest `n₀` for `3n² + 100n + 5000` | that a large `n₀` weakens the claim |
| which of six pairs have `f = O(g)` | that `f = O(g)` runs both ways |
| a sort followed by a separate `n²` pass | that sequential stages multiply |
| ordering the standard ladder | that the gaps in it are the same size |
| what `O(1)` claims | that `O(1)` means one step, or fast |

### The four formats

Each format exists because some nuance cannot be tested by the others.

- **Multiple choice** reveals one option at a time as it is clicked, so the
  question keeps teaching after it has been answered. The correct option sits at
  each of the four positions across the bank, because a reader who notices it is
  always second stops reading.
- **Multi-select** is the only way to ask whether `O(n²)`, `O(n³)`, `Θ(n²)` and
  `O(n² log n)` can all be true of one function. Partly right counts as wrong,
  which is the point: each row is its own claim. After checking, the rows are
  marked in four states rather than two, because ticking something false and
  leaving something true unticked are different mistakes. A solid green row was
  ticked and belongs, a dashed green one belongs and was left out.
- **Numeric entry** is checked against the real inequality, and the named near
  misses answer the specific thing that went wrong. Someone who types 137 for an
  `n₀` of 136 has the arithmetic right and the strictness of `n > n₀` wrong,
  which is a different error from typing 5 out of habit, and neither is addressed
  by showing the working alone.
- **Ordering** is the only format that can ask about a crossing, because it makes
  the reader commit to which function wins in the end rather than recognise the
  answer. Each row's reason names its own crossing: `n³` reaches `14n²` at
  exactly `n = 14`, where both are 2744.

### What the answer keys were checked against

Every number a question asserts was recomputed rather than reasoned about, and
the arithmetic behind the two `n₀` questions is worth recording:

| claim | check |
| --- | --- |
| `c = 15` needs `n₀ = 5` | `15 * 25 = 375` against `T(5) = 376`, then `540` against `534` |
| `c = 18` needs `n₀ = 1` | `4n² - 4n - 6 >= 0` from `n = 2`, where it is `2` |
| `c = 4` needs `n₀ = 136` for `3n² + 100n + 5000` | root of `n² - 100n - 5000` is `50 + sqrt(7500)`, about `136.6` |
| `T(n) = O(n³)` holds with `c = 1`, `n₀ = 14` | `2744` against `T(14) = 2806`, then `3375` against `3216` |

That last row is a trap the first draft of the question fell into. `n³` reaches
`14n²` at exactly `n = 14`, where both are `2744`, and it is tempting to read
that crossing as the answer. It is not: the bound is against `T(n)`, not against
its leading term, and `n³` is still 62 short at `n = 14`. The crossing that
matters is one step later.

## Files

```
index.html   the whole page: markup, styles and script, nothing external
build.mjs    copies index.html to dist/index.html so site/build.sh can publish it
package.json the build and preview scripts the site build looks for
```

## Running it

Open `index.html` directly in a browser. There is nothing to install.

To produce the `dist/` folder the site build expects:

```bash
npm run build
```

`npm run build` runs the `build` script from `package.json`, which is
`node build.mjs`: `node` is the JavaScript runtime and `build.mjs` is the small
copy script above.

To look at the built copy on a local server:

```bash
npm run preview
```

`npm run preview` runs `python3 -m http.server --directory dist 8000`:
`python3` starts Python, `-m http.server` runs its built-in static file server
as a module, `--directory dist` tells it which folder to serve, and `8000` is
the port, so the page is at <http://localhost:8000/>.
