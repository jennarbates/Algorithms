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

## Practice

Four tiers, one per chapter, 32 questions in all, stored in the order they are
read.

| Tier                   | Questions | What it asks                                                                                                                                                                                          |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · The expanding wave | 9         | Layers by hand, path and cycle vocabulary, which edges the tree leaves out, the running-time count, what an adjacency matrix does to it, what the search order can change, cuts.                      |
| 2 · Queue or stack     | 8         | Recursive DFS by hand, CLRS's discovery and finishing times, the degree sum, the traversal read exactly, components, what the stack changes, where the mark has to go, DFS non-tree edges.            |
| 3 · Two colours        | 6         | Which graphs are bipartite, the odd-cycle theorem both ways, the cycle the proof builds, why the colouring works, and two problems that are the test in disguise.                                     |
| 4 · All edges forward  | 9         | Building and checking orders, how many there are, CLRS's finishing-time sort, the most edges a DAG can have, one-way reachability, strong components, the proof's key step, the O(m + n) bookkeeping. |

## CLRS

The lectures follow Kleinberg and Tardos chapter 3, and the page keeps their
words and their algorithms. It lines up with CLRS (third edition) chapter 22,
sections 22.1 to 22.4, with a nod to 22.5, and with the definitions in
Appendix B.4 (graphs) and B.5 (trees). Six questions are lifted from CLRS and
several closes name the CLRS lemma or theorem that says the same thing.

**Where the two agree.** Path, simple path, connected component, bipartite,
DAG and tree are defined the same way (B.4, B.5; Theorem B.2 includes "a tree
on n nodes has n - 1 edges"). CLRS writes V and E for the sets of nodes and edges,
and inside O or Θ it writes V for |V| and E for |E|, so its O(V + E) is
O(m + n) here. CLRS §22.2 builds the same layers: its v.d is the layer of v,
Theorem 22.5 is "layer i is exactly the nodes at distance i", Lemma 22.1
(δ(s, v) ≤ δ(s, u) + 1 for every edge) is "no edge skips a layer", and
Exercise 22.2-5 asks what the lecture's clicker about search order asks. CLRS's DFS
(§22.3) is the page's recursive one, and it always runs the loop over
unexplored nodes, as the page does, so Exercise 22.3-12 is "one search per
component". Theorem 22.10 (in an undirected graph every edge is a tree edge or
a back edge) is "DFS non-tree edges join a node to an ancestor". Lemma 22.13 is
the strong-components question's argument.

**Lifted from CLRS.** `matrix-bfs` is Exercise 22.2-4 with the space bounds of
§22.1. `bowtie-stamps` introduces CLRS's discovery and finishing times and the
parenthesis theorem (Theorem 22.7). `eager-stack` is about Exercise 22.3-7 (DFS
with a stack) and Theorem 22.10. `wrestlers` is Exercise 22.2-7, the babyfaces
and heels. `dfs-topo` is TOPOLOGICAL-SORT (§22.4, Lemma 22.11, Theorem 22.12),
and `linear-sort` is Exercise 22.4-5. `tests/properties.test.ts` checks Theorem
22.7, Lemma 22.11 and Theorem 22.12 on random graphs.

**Where the conventions differ**, and what moves:

- **Colours.** CLRS paints every node white, gray or black while it searches:
  not yet found, found but not finished, finished. The page says undiscovered,
  discovered and explored for BFS, and unexplored, on the call stack and
  finished for DFS. Nothing moves; the chapters name the match. Chapter 3's
  blue and orange are the two sides of a bipartite graph, a different thing,
  and that chapter says so. CLRS Exercises 22.2-3 and 22.3-4 show one bit per
  node is enough, which is the single mark the lectures use.
- **When a node is marked.** CLRS's BFS grays a node as it goes into the queue,
  so each node goes in once. The lecture's traversal marks a node as it comes
  out, so a node can go into A many times. That moves one answer: in the
  lecture 5 clicker (`generic-false`) "a single node could be put into A more
  than once" is true here and would be false of CLRS's BFS, and its close says
  so. Marking on the way out is also what makes the stack version a real DFS:
  it is exactly recursive DFS with every neighbour list read back to front,
  which the property tests check. Marking on the way in, with a stack, does not
  give a depth-first tree at all (`eager-stack`).
- **DFS order.** The page's recursive DFS visits nodes in CLRS's order for the
  same neighbour lists. The stack version does not: it finds a depth-first
  tree, but the one for the reversed lists. The lecture starts DFS at a chosen
  s; CLRS's DFS(G) starts at the first node. The page starts at the chosen node
  and then takes the rest in node order.
- **Topological sort.** The page sorts by repeatedly taking a node nothing
  points into, as the lectures do. That is only CLRS Exercise 22.4-5. CLRS's
  own TOPOLOGICAL-SORT runs DFS and lists nodes in decreasing finishing time.
  Both are right and both are O(m + n), but they can land on different orders:
  on the courses CLRS's gives C187, C220, M132, C250, C311, C240, C383 where
  the page's first-source rule gives the slide's M132, C187, C220, C240, C250,
  C311, C383. Chapter 4 names the alternative and `dfs-topo` asks it.
- **Self-loops.** CLRS lets a directed graph have an edge from a node to
  itself, and counts it as a cycle of length 1 and a back edge. The page's
  graphs never have one, and `graph` refuses them. No answer moves: either way
  a DAG has none, so `dag-max-edges` is n(n - 1)/2 under both.
- **Cycles.** CLRS's "cycle" in an undirected graph needs only distinct edges
  and may pass through a node twice; what the page calls a cycle is CLRS's
  "simple cycle". In a directed graph CLRS counts u → v → u as a cycle, and so
  does the page's sort. The `bowtie-walks` answers do not move: the two
  triangles are joined by a single edge, so no closed walk there repeats a node without
  repeating an edge.
- **Words.** CLRS says vertex where the lectures say node, and keeps "node" for
  rooted trees (B.5).

**Not in CLRS.** CLRS 3e defines bipartite graphs and leaves the test as
Exercise 22.2-7. That a graph is bipartite exactly when it has no odd cycle is
set as Problem B-1(b) (pages 1180 to 1181), not proved in the text, and CLRS
never builds the odd cycle through the lowest common ancestor. That is Kleinberg and Tardos §3.4, and chapter 3 follows them. The
layer-by-layer BFS (L0, L1, ...) is Kleinberg and Tardos's too: CLRS has only
the queue version. The cut questions on the 1970 Internet and the directed-path
restart count have no CLRS counterpart. For strong components the page names
Tarjan (1972); CLRS §22.5 uses two depth-first searches instead.

## Imports carry `.ts`

Everything in `src/core` and `src/content` imports with the `.ts` extension
(`allowImportingTsExtensions`, `erasableSyntaxOnly`). That lets Node 22.18+ load
those files directly with the types stripped, which is how
`../worksheets/graphs.mjs` builds the printable workbook: its answer key comes
from this engine and this bank, not from a copy.
