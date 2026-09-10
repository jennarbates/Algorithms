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
