# How to walk a graph

An interactive page for COMPSCI 311 lectures 4 to 6: graphs, breadth-first and
depth-first search, bipartite testing, directed graphs and topological order.
Four chapters, each on the lecture's own graph, and four tiers of practice on
graphs the page never animates.

| Chapter               | Graph                                                            | What it earns                                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 · BFS               | The 1970 Internet (ARPANET), 13 sites, 17 links                  | Layer i is exactly the nodes at distance i. No edge skips a layer. Each line of the pseudocode runs at most n or 2m times, so O(m + n). Reversing the neighbour order changes the tree and never the layers. |
| 2 · DFS               | The 8-node graph from the DFS slide, and a graph in three pieces | Recursive DFS with its call stack. The generic traversal with A a queue (BFS) or a stack (DFS). DFS non-tree edges join a node to an ancestor. One search per component.                                     |
| 3 · Two colours       | The 1970 Internet, a cube, students and colleges, a 5-cycle      | Colour BFS layers by parity, check every edge. On a same-layer edge, draw the odd cycle through the lowest common ancestor, of length 2(j - i) + 1.                                                          |
| 4 · Topological order | The lecture's course prerequisites, and the same with a loop     | The reader picks which source goes next. Stuck exactly when there is a cycle, and the page shows it.                                                                                                         |

## Running it

```bash
npm install
npm run dev
```

`npm test` runs the suites, `npm run build` writes the single-file
`dist/index.html` that `../site/build.sh` publishes at `/graphs/`.

## Layout

```
src/core/       the algorithms, as pure functions that record every run as events
src/content/    the graphs (with where to draw them) and the practice questions
src/chapters/   one component per chapter
src/components/ the graph drawing, controls, practice
tests/          the engine against the slides, against random graphs, and the bank
```

Every picture of a run is a replay of the first k events, which is why every
chapter can step backwards as freely as forwards.

## Neighbour order

BFS layers do not depend on the order neighbours are looked at, but trees,
DFS order and which source the sort takes first all do. The order here is fixed
once: **neighbours in the order the graph lists its nodes.** For the 8-node graph
that is increasing order, as on the DFS slide. For the ARPANET the node list is
chosen so that BFS from MIT reproduces the slide's tree, dashed edges and all.

## Checked, not trusted

The slides do not print their clicker answers. Every one the page states is
worked out in `tests/lecture.test.ts` from the engine, alongside the slides'
figures: the ARPANET layers from MIT, its five non-tree edges, the DFS tree on
the 8-node graph, the line counts from the running-time slide, the order
M132, C187, C220, C240, C250, C311, C383.

`tests/properties.test.ts` checks the lectures' theorems on 300 random graphs
each, against slow definitions that cannot share a bug with the fast code:
layers against distances found by repeated relaxation, the bipartite test
against trying every colouring, the sort against counting every order.

`tests/questions.test.ts` checks the bank. Questions with a computable answer
store only the graph and the start; the page runs the engine to mark them.
Written options that make a claim about a particular graph are recomputed.

## Imports carry `.ts`

Everything in `src/core` and `src/content` imports with the `.ts` extension
(`allowImportingTsExtensions`, `erasableSyntaxOnly`). That lets Node 22.18+ load
those files directly with the types stripped, which is how
`../worksheets/graphs.mjs` builds the printable workbook: its answer key comes
from this engine and this bank, not from a copy.
