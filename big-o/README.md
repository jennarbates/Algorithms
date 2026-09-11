# The Big-O Building

An animated, step-through explanation of the definition of Big-O:

```
T(n) <= c * f(n)   for all n > n0
```

told as a building. `T(n)` starts on the roof, every term of it standing side by
side. Then `n` grows: the leading term swells until it owns the whole slab and
shoulders the lower order terms off the edge, and they land on the street. What
is left up top is `c * f(n)`. Then `f(n)` tries to go up on its own and can only
ride the elevator down to the basement, below even the terms that were pushed
off, because without `c` it is smaller than `T(n)`. Bring `c` along and it goes
straight back to the roof.

The worked example throughout is `T(n) = 14n^2 + 4n + 6`, with `f(n) = n^2`,
`c = 15` and `n0 = 5`. Note that `c = 14` does not work, since `14n^2` is
always a little below `T(n)`; `c` has to grow enough to cover the dead terms,
and `15n^2 >= 14n^2 + 4n + 6` holds exactly from `n = 6` on. A plot of the
real curves sits beside the building so the metaphor never says something the
numbers cannot back up.

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

There are seven steps, not five, and the split is deliberate: within a step the
caption, the equation strip, the bracket over the roof and the note in the sky
all hold still. Things move, but nothing that has to be read is replaced while
it is being read. Where an argument has three parts it gets three steps and
three clicks, rather than three captions on timers inside one step.

### Sinking below the roof line

`14n^2` on its own is not a bound: dropping `4n + 6` took something positive
away, so what is left is under `T(n)`. From step 3 to step 5 the two survivors
say so by position. They drop from the roof to `y = 122`, which is below the
slab, and the roof is drawn a second time on top of the chips (`#roofOver`, a
fill plus its two edge lines so it leaves no seam on the original and never
reaches the elevator shaft) so that a chip down there is cut by the roof instead
of floating in front of it. The drop has to clear the slab completely, because
the number a chip carries is printed at its centre: sink it halfway and the
label is the part the roof hides. At the end of step 5 the pair rises back
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
| 1 | n 0 to 12 | `T(n)` on its own |
| 2 | n 0 to 12 | `T(n)` against `14n^2`, with the sliver between them marked: that sliver is all of `4n + 6` |
| 3 | n 0 to 12 | the same picture with that sliver magnified eight times, see below |
| 4 | n 0 to 12 | `T(n)` and `15n^2` at full height, with the distance between them measured at `n = 3` and `n = 9` |
| 5 | the gap, y from -20 to 100 | `15n^2 - T(n)`, which is `n^2 - 4n - 6`, red below zero and green above. At this scale the sign change at `n = 5.16` is obvious, where on the raw curves it is a couple of pixels. This one subtracts on screen, see below |
| 6 | n 0 to 12, y to 620 | `n^2` large enough to see at last, with `T(n)` leaving the top of the chart at `n = 6.5` and the distance between them marked at `n = 6` |
| 7 | n 0 to 12 | the same `n^2` curve scaled vertically from `c = 1` to `c = 15`, with a live readout of `c`, landing on the dashed target above `T(n)` |

### Magnifying `4n + 6`

Step 2 says the sliver between `T(n)` and `14n^2` is all of `4n + 6`. Step 3
lets that be checked. At `n = 11.4` the whole of `4n + 6` is 51.6 against a
`T(n)` of 1871, which on a plot 486 pixels tall is about ten pixels, so an
18px square is cut out of the plot at that spot and redrawn eight times bigger
as a detail panel in the empty upper left, with connector lines back to the box
it came from. The panel grows out of that box rather than appearing, so the zoom
is watched instead of asserted.

None of it is a special case: a view can carry its own box (`bx0`, `bx1`, `by0`,
`by1`), so `sxOf` and `syOf` place the panel's window in the panel's rectangle
and every existing helper, `curve`, `band` and `vgap`, draws into it unchanged.
Every word sits outside the panel, because the band sweeps corner to corner and
leaves no room inside for a label.

Step 7 is the point of the whole page: multiplying by a constant only ever
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

Under `prefers-reduced-motion` the subtraction is skipped and step 5 opens on
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
