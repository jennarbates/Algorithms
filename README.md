# Algorithms

Working implementations of algorithms worth understanding properly, each one
self-contained in its own folder with its own tooling.

**Live site: <https://jennarbates.github.io/Algorithms/>**

| Folder | What it is | Status |
| --- | --- | --- |
| [`gale-shapley/`](./gale-shapley) | Stable matching, as an interactive page that explains itself to someone with no maths background, plus four tiers of practice | In progress |
| [`big-o/`](./big-o) | The definition of Big-O, told as a building: small terms jump off the roof, f(n) needs c to get back up, and the basement turns out to be a floor, plus five tiers of practice | Live |
| [`bounds/`](./bounds) | Big-Omega, Big-Theta and running-time analysis from lecture 3: floors and ceilings checked exactly on a chart you set, programs counted line by line, the sum-product triangle, and polynomial against exponential time, plus four tiers of practice | Live |
| [`graphs/`](./graphs) | Graph traversal from lectures 4 to 6: BFS layers on the 1970 Internet, DFS and the queue-or-stack traversal, the two-colour bipartite test, and topological order, plus four tiers of practice | Live |

## Conventions

Each project is independent. There is no shared build at the root, because the
collection is meant to stay polyglot: a project here can be TypeScript, Python or
anything else without dragging the others into its toolchain. Shared editor and
CI config lives at the root, everything else lives in the project folder.

CI runs per project, from `.github/workflows/`.

## The website

The site is the landing page plus one page per visual, published to GitHub
Pages on every push to `main` by `.github/workflows/pages.yml`.

```
site/index.html      the landing page, plain HTML, one card per visual
site/build.sh        assembles everything into _site/ (also what CI runs)
_site/               the assembled output, ignored by git
```

Each visual is served at `/<folder-name>/`, so `gale-shapley/` is at
`https://jennarbates.github.io/Algorithms/gale-shapley/`.

`site/build.sh` does not keep a list of projects. It treats every top-level
folder that has a `package.json` with a `build` script as a visual, builds it,
and copies its `dist/index.html` into place. Projects that are not Node, or are
not ready to publish, are left out simply by not having that script.

To assemble the site locally and look at it:

```bash
bash site/build.sh
python3 -m http.server --directory _site 8000
```

`bash site/build.sh` runs the assembly script with bash (it needs bash, not sh,
for `set -o pipefail`). `python3 -m http.server` starts Python's built-in static
file server as a module (`-m`); `--directory _site` tells it which folder to
serve and `8000` is the port, so the site is at <http://localhost:8000/>.

### One-time setup on GitHub

Under the repository's **Settings, then Pages**, set **Source** to
**GitHub Actions**. Until that is set, the deploy job is refused.

### Adding a visual

1. Create the project in its own top-level folder. Its `npm run build` must
   produce a single self-contained `dist/index.html` (copy `gale-shapley/`'s
   `vite.config.ts` and `vite-plugin-singlefile` setup to get this for free).
2. Add a card to `site/index.html`. Copy the existing one and point its `href`
   at `./<folder-name>/`.
3. Add a row to the table at the top of this README.

Push to `main` and the site rebuilds itself.
