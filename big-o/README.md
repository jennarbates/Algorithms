# The Big-O Building

An animated, step-through explanation of the definition of Big-O:

```
T(n) <= c * f(n)   for all n > n0
```

told as a building. `T(n)` starts on the roof. Its lower order terms jump off
and land on the street. What is left up top is `c * f(n)`. Then `f(n)` tries to
go up on its own and can only ride the elevator down to the basement, below
even the terms that jumped, because without `c` it is smaller than `T(n)`.
Bring `c` along and it goes straight back to the roof.

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

Scene 2 animates the jump: the two lower order terms leap clear of the roof,
tumble, bounce once and land in a spreading pool on the street. All of it
respects `prefers-reduced-motion`, which snaps the terms straight to the
pavement.

## The plot

The plot is not one fixed picture. Each scene gets its own window on the same
functions, chosen so the thing that scene is claiming is actually visible, and
the move from one window to the next is animated so the zoom can be followed.

| Scene | Window | What it shows |
| --- | --- | --- |
| 1 | n 0 to 12 | `T(n)` on its own |
| 2 | n 0 to 12 | `T(n)` against `14n^2`, with the sliver between them marked: that sliver is all of `4n + 6` |
| 3 | the gap, y from -20 to 100 | `15n^2 - T(n)`, which is `n^2 - 4n - 6`, red below zero and green above. At this scale the sign change at `n = 5.16` is obvious, where on the raw curves it is a couple of pixels |
| 4 | n 0 to 12, y to 620 | `n^2` large enough to see at last, with `T(n)` leaving the top of the chart at `n = 6.5` and the distance between them marked at `n = 6` |
| 5 | n 0 to 12 | the same `n^2` curve scaled vertically from `c = 1` to `c = 15`, with a live readout of `c`, landing on the dashed target above `T(n)` |

Scene 5 is the point of the whole page: multiplying by a constant only ever
stretches a curve up the y axis, it never bends it, and that stretch is enough
to clear `T(n)` from `n0` on.

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
