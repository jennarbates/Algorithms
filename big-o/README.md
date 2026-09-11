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
transition between scenes is never below the fold. Under 1180px wide, or in a
very short window, the three panes stack and the controls pin to the bottom of
the window instead.

The worked example and the name of every part are carried inside the visual,
not only in the prose. The equation strip above the drawing colours `c` green,
`f(n)` gold and the lower order terms red, the same four colours the legend and
the plot use, and brackets over the roof name whatever is standing on it in
that scene.

Scene 2 animates the squeeze, and the mechanism is the point: nothing jumps. The
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

### Where the 15 comes from

Scene 3 used to swap the `14` chip for a `15` in one frame, which reads as a
number changing for no reason. It is now the scene's whole subject, in four
beats, with the equation strip, the bracket over the roof and a note in the sky
beside the roof all moving together.

1. The pair shrinks back from its scene 2 size and the bracket names it again as
   `14n^2, the survivor`, but the strip reads `but 14n^2 < T(n)` in red and the
   note says `14n^2 is not a bound`. Dropping `4n + 6` took something positive
   away, so what is left is under `T(n)` and bounds nothing.
2. `n^2` slides right to make room and a dashed green `+1` chip stands up in the
   gap. The bracket becomes `14n^2 + 1n^2` and the note gives the arithmetic:
   raising `c` by one adds a whole `n^2`, because `15n^2 - 14n^2 = n^2`. The chip
   is dashed because it is not a term of `T(n)`, it is what the constant buys.
3. The `+1` slides into the constant and fades, `n^2` slides back, and only then
   does the chip roll from `14` to `15`.
4. The bracket becomes `c*f(n) = 15n^2`, the strip becomes `<= 15*n^2` in green,
   the `n0` marker comes up on the street, and the note closes the argument: that
   spare `n^2` covers `4n + 6` once `n >= 6`.

The point of splitting it up is that the `15` is never asserted. It is arrived at
as `14 + 1`, and the `1` has a visible reason to exist.

## The plot

The plot is not one fixed picture. Each scene gets its own window on the same
functions, chosen so the thing that scene is claiming is actually visible, and
the move from one window to the next is animated so the zoom can be followed.

| Scene | Window | What it shows |
| --- | --- | --- |
| 1 | n 0 to 12 | `T(n)` on its own |
| 2 | n 0 to 12 | `T(n)` against `14n^2`, with the sliver between them marked: that sliver is all of `4n + 6` |
| 3 | the gap, y from -20 to 100 | `15n^2 - T(n)`, which is `n^2 - 4n - 6`, red below zero and green above. At this scale the sign change at `n = 5.16` is obvious, where on the raw curves it is a couple of pixels. This one derives itself first, see below |
| 4 | n 0 to 12, y to 620 | `n^2` large enough to see at last, with `T(n)` leaving the top of the chart at `n = 6.5` and the distance between them marked at `n = 6` |
| 5 | n 0 to 12 | the same `n^2` curve scaled vertically from `c = 1` to `c = 15`, with a live readout of `c`, landing on the dashed target above `T(n)` |

Scene 5 is the point of the whole page: multiplying by a constant only ever
stretches a curve up the y axis, it never bends it, and that stretch is enough
to clear `T(n)` from `n0` on.

### Where `15n^2 - T(n)` comes from

Scene 3 is the one plot that cannot just appear. `15n^2 - T(n)` is not a
function anyone handed us, it is the distance between the two curves, and
opening on the finished picture makes it look like a new curve out of nowhere.
So the chart builds it in three beats, and the equation strip above the plot
carries the algebra in step with the drawing.

1. **`is T(n) <= 15n^2 ?`** Both curves at full height, on top of each other.
   The distance is measured twice: at `n = 3`, where `15n^2` is 9 below `T(n)`,
   and at `n = 9`, where it is 39 above. Nine and thirty-nine against heights of
   144 and 1176, which is why the crossing cannot be seen here.
2. **`same question: is 15n^2 - T(n) >= 0 ?`** `T(n)` sinks onto the axis and
   `15n^2` is carried down with it, because subtracting `T(n)` from both is
   exactly that. The y window deliberately holds still for the first 45% of the
   move, so what you see is the curves coming down rather than the camera
   closing in, and only then follows them down into the zoomed window.
3. **`15n^2 - (14n^2 + 4n + 6) = n^2 - 4n - 6`** The finished picture. Two dots
   on it carry the same 9 and 39 back, at `n = 3` below the line and `n = 9`
   above it, so the curve is visibly the distance that was measured in beat one
   and not a new object.

Under `prefers-reduced-motion` the derivation is skipped and scene 3 opens on
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
