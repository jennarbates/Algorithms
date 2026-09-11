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
the street. What is left up top is `c * f(n)`. Then `f(n)` tries to go up on its
own and can only ride the elevator down to the basement, because without `c` it
is smaller than `T(n)`. Bring `c` along and it goes straight back to the roof.

The worked example throughout is `T(n) = 14n^2 + 4n + 6`, with `f(n) = n^2`,
`c = 15` and `n0 = 5`. Note that `c = 14` never works, for any `n`, since
`4n + 6` is always positive; anything above 14 works eventually, and
`15n^2 >= 14n^2 + 4n + 6` holds from `n = 6` on. A plot of the real curves sits
beside the building so the metaphor never says something the numbers cannot
back up.

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
  `n` is a count. The magnified spot is `n = 11`. The only fractional values on
  the page are places where two curves cross, `n = 5.16`, and those are named as
  crossings rather than as inputs.
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

Step 2 animates the squeeze, and the mechanism is the point: nothing jumps. The
`14` and `n^2` chips grow in two pumps, from full size to 2.4x, pinned at their
left edge so all of that growth travels rightward. The two lower order terms are
carried along in front of them, the gap between the pair and the small terms
closing from 22px to 13px as the pressure builds, until each one runs out of roof
and topples over the edge: `6` on the first pump, `4n` on the second. The fall
has no upward hop, because a chip that is shoved does not leap; it just tips,
tumbles, bounces once and lands in a spreading pool on the street.

One number drives all of it. `scaleAt(t)` gives the scale of the surviving pair
at any moment, `bigAt(s)` turns that into their positions and `pushAt(s)` into
the positions of the two chips being shoved, so the push can never drift out of
step with the growth that is supposed to be causing it. `GROW` is set to the
scale at which `4n` runs out of roof, which is why the pair ends up filling the
slab with about 17px to spare. All of it respects `prefers-reduced-motion`,
which snaps the pair to full size and the terms straight to the pavement.

### One idea per step

There are nine steps, and the split is deliberate: within a step the
caption, the equation strip, the bracket over the roof and the note in the sky
all hold still. Things move, but nothing that has to be read is replaced while
it is being read. Where an argument has three parts it gets three steps and
three clicks, rather than three captions on timers inside one step.

### Sinking below the roof line

`14n^2` on its own is not a bound: dropping `4n + 6` took something positive
away, so what is left is under `T(n)`. From step 4 to step 6 the two survivors
say so by position. They drop from the roof to `y = 122`, which is below the
slab, and the roof is drawn a second time on top of the chips (`#roofOver`, a
fill plus its two edge lines so it leaves no seam on the original and never
reaches the elevator shaft) so that a chip down there is cut by the roof instead
of floating in front of it. The drop has to clear the slab completely, because
the number a chip carries is printed at its centre: sink it halfway and the
label is the part the roof hides. At the end of step 6 the pair rises back
through the slab, which is the payoff for `c = 15`.

### Where the 15 comes from

Swapping the `14` chip for a `15` in one frame reads as a number changing for no
reason, so it is spread over three steps, and the `15` is never asserted. It is
arrived at as `14 + 1`, and the `1` has a visible reason to exist.

- **Step 3** leaves the pair sunk, reading `14`, with the strip saying
  `so 14n^2 < T(n)` in red and the note saying `14n^2 is not a bound`.
- **Step 4** slides `n^2` right and stands a dashed green `+1` chip in the gap.
  The bracket becomes `14n^2 + 1n^2` and the note gives the arithmetic: raising
  `c` by one adds a whole `n^2`, because `15n^2 - 14n^2 = n^2`. The chip is
  dashed because it is not a term of `T(n)`, it is what the constant buys.
- **Step 5** folds the `+1` into the constant, rolls `14` to `15`, lifts the pair
  back above the roof line, and brings up the `n0` marker on the street.

## The plot

The plot is not one fixed picture. Each step gets its own window on the same
functions, chosen so the thing that step is claiming is actually visible, and
the move from one window to the next is animated so the zoom can be followed.

| Step | Window | What it shows |
| --- | --- | --- |
| 1 | n 0 to 12 | `T(n)` with everything above it washed green: the region a bound is allowed to live in |
| 2 | n 0 to 12 | `T(n)` on its own |
| 3 | n 0 to 12 | `T(n)` against `14n^2`, with the sliver between them marked: that sliver is all of `4n + 6` |
| 4 | n 0 to 12 | the same picture with that sliver magnified eight times, see below |
| 5 | n 0 to 12 | `T(n)` and `15n^2` at full height, with the distance between them measured at `n = 3` and `n = 9` |
| 6 | the gap, y from -20 to 100 | `15n^2 - T(n)`, which is `n^2 - 4n - 6`, red below zero and green above. At this scale the sign change at `n = 5.16` is obvious, where on the raw curves it is a couple of pixels. This one subtracts on screen, see below |
| 7 | n 0 to 12, y to 620 | `n^2` large enough to see at last, with `T(n)` leaving the top of the chart at `n = 6.5` and the distance between them marked at `n = 6`. `4n + 6` is drawn in too, low in the frame, with a dot where `n^2` overtakes it at `n = 5.16`, which is `n0` |
| 8 | n 0 to 12 | the same `n^2` curve scaled vertically from `c = 1` to `c = 15`, with a live readout of `c`, landing on the dashed target above `T(n)` |
| 9 | n 0 to 30 | `T(n)`, `15n^2` and `n^3`, far enough out that the loose bound has visibly pulled away from the tight one |

### Magnifying `4n + 6`

Step 3 says the sliver between `T(n)` and `14n^2` is all of `4n + 6`. Step 4
lets that be checked. At `n = 11` the whole of `4n + 6` is 50 against a
`T(n)` of 1744, which on a plot 486 pixels tall is about ten pixels, so an
18px square is cut out of the plot at that spot and redrawn eight times bigger
as a detail panel in the empty upper left, with connector lines back to the box
it came from. The panel grows out of that box rather than appearing, so the zoom
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

**Step 4, `is T(n) <= 15n^2 ?`** Both curves at full height, on top of each
other. The distance is measured twice: at `n = 3`, where `15n^2` is 9 below
`T(n)`, and at `n = 9`, where it is 39 above. Nine and thirty-nine against
heights of 144 and 1176, which is why the crossing cannot be seen here.

**Step 5, `15n^2 - (14n^2 + 4n + 6) = n^2 - 4n - 6`** `T(n)` sinks onto the axis
and `15n^2` is carried down with it, because subtracting `T(n)` from both is
exactly that. The y window deliberately holds still for the first 45% of the
move, so what you see is the curves coming down rather than the camera closing
in, and only then follows them into the zoomed window. Two dots on the finished
curve carry the same 9 and 39 back, at `n = 3` below the line and `n = 9` above
it, so it is visibly the distance measured in the step before and not a new
object.

Under `prefers-reduced-motion` the subtraction is skipped and step 6 opens on
the finished plot.

## Files

```
index.html   the whole page: markup, styles and script, nothing external
build.mjs    copies index.html to dist/index.html so site/build.sh can publish it
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
