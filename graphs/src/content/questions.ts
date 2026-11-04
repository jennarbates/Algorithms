import { bfs } from '../core/bfs.ts';
import { dfs, timestamps } from '../core/dfs.ts';
import { byFinishing, countOrders, inDegrees, maxRestarts, topoSort } from '../core/directed.ts';
import type { NodeId } from '../core/graph.ts';
import { ARPANET, BOWTIE, CHAIN, COURSES, PASTA, SCATTER, TOWN, nameOf } from './graphs.ts';

/**
 * The practice questions, one tier per chapter.
 *
 * Same two rules as `../gale-shapley`'s bank.
 *
 * **Nothing that can be computed is written down.** A question about a run
 * stores the graph and the start and nothing else; the page runs the engine
 * to mark it. The numeric answers are computed here, at load, from the same
 * engine, so `answer: 5` never appears as a literal. Where a question is about
 * an idea rather than a graph, its options carry fixed `ok` flags, and the
 * ones that make a claim about a particular graph are checked against that
 * graph in `tests/questions.test.ts`.
 *
 * **Every option carries its reason**, the wrong ones included, and each wrong
 * one is an answer somebody actually gives: counting an edge once instead of
 * twice, reading "layer" as "number of steps the search took", thinking the
 * stack changes which nodes get found.
 *
 * The lecture clicker questions are here, word for word where the wording is
 * the point, marked `clicker` with the slide they come from. The slides do not
 * print their answers; the answers here are worked out and then checked.
 *
 * Some questions are lifted from the exercises of CLRS (third edition) chapter
 * 22, and some closes name where CLRS says the same thing differently. Each
 * one says which exercise or theorem it is, and the README lists them.
 *
 * `../worksheets/graphs.mjs` imports this file directly (Node runs it with the
 * types stripped), so the printable workbook asks exactly these questions.
 */

export type Tier = 1 | 2 | 3 | 4;

export interface Option {
  readonly t: string;
  readonly ok?: true;
  readonly why: string;
}

interface Common {
  readonly id: string;
  readonly tier: Tier;
  /** The skill the question checks, shown above the prompt. */
  readonly tests: string;
  readonly prompt: string;
  /** The graph printed with the question, if it is about one. */
  readonly graphId?: string;
  /** Monospaced block under the prompt. */
  readonly quote?: string;
  /** Where a lecture question comes from, e.g. "Lecture 4, slide 22". */
  readonly clicker?: string;
  /** What the question was really about, shown once it is answered. */
  readonly close: string;
}

/** Put every node in its BFS layer. Marked by running BFS. */
export interface LayersQuestion extends Common {
  readonly kind: 'layers';
  readonly graphId: string;
  readonly start: NodeId;
}

/** Tick edges of a kind. Marked by running the search. */
export interface EdgesQuestion extends Common {
  readonly kind: 'edges';
  readonly graphId: string;
  readonly start: NodeId;
  readonly pick: 'bfs-non-tree' | 'dfs-tree';
}

/** Name each sequence: not a path, path, simple path, cycle. Marked by `classifyWalk`. */
export interface WalksQuestion extends Common {
  readonly kind: 'walks';
  readonly graphId: string;
  readonly walks: readonly (readonly NodeId[])[];
}

/** Tick the graphs that are bipartite. Marked by `colour`. */
export interface ColourQuestion extends Common {
  readonly kind: 'colour';
  readonly graphIds: readonly string[];
}

/** Build a topological order. Any valid one is right; marked by `checkOrder`. */
export interface OrderQuestion extends Common {
  readonly kind: 'order';
  readonly graphId: string;
}

/** Tick the candidate orders that are topological. Marked by `checkOrder`. */
export interface OrdersQuestion extends Common {
  readonly kind: 'orders';
  readonly graphId: string;
  readonly candidates: readonly (readonly NodeId[])[];
}

/** One number. The answer is computed from the engine when this file loads. */
export interface NumberQuestion extends Common {
  readonly kind: 'number';
  /** The label in front of the box. */
  readonly unit: string;
  readonly answer: number;
  readonly why: string;
  /** Wrong answers people give, and what each one means. */
  readonly near: readonly { readonly v: number; readonly why: string }[];
}

export interface ChoiceQuestion extends Common {
  readonly kind: 'choice';
  readonly options: readonly Option[];
}

export interface MultiQuestion extends Common {
  readonly kind: 'multi';
  readonly options: readonly Option[];
}

export type Question =
  | LayersQuestion
  | EdgesQuestion
  | WalksQuestion
  | ColourQuestion
  | OrderQuestion
  | OrdersQuestion
  | NumberQuestion
  | ChoiceQuestion
  | MultiQuestion;

export const TIERS: readonly Tier[] = [1, 2, 3, 4];

export const TIER_LABELS: Readonly<Record<Tier, string>> = {
  1: 'The expanding wave',
  2: 'Queue or stack',
  3: 'Two colours',
  4: 'All edges forward',
};

const arpanetLayer2 = bfs(ARPANET.graph, 'MIT').layers[2]?.length ?? 0;
const townM = TOWN.graph.edges.length;
const scatterPieces = dfs(SCATTER.graph).components.length;
const pastaOrders = countOrders(PASTA.graph);
const chainRestarts = maxRestarts(CHAIN.graph);
const dagEdges = (n: number) => (n * (n - 1)) / 2;

const arpanetN = ARPANET.graph.nodes.length;
const arpanetM = ARPANET.graph.edges.length;

const bowtieRun = dfs(BOWTIE.graph, ['R']);
const bowtie = timestamps(bowtieRun);
const stamp = (n: NodeId) => `${bowtie.d.get(n) ?? 0}/${bowtie.f.get(n) ?? 0}`;
const bowtieSd = bowtie.d.get('S') ?? 0;

const course = (n: NodeId) => nameOf(COURSES, n);
const coursesPage = topoSort(COURSES.graph).order;
const coursesClrs = byFinishing(COURSES.graph);
const coursesFirstDone = coursesClrs[coursesClrs.length - 1] as NodeId;
const coursesIn = inDegrees(COURSES.graph);

export const QUESTIONS: readonly Question[] = [
  // --- Tier 1: the expanding wave ----------------------------------------------
  {
    id: 'town-layers',
    tier: 1,
    kind: 'layers',
    tests: 'running BFS by hand on a graph the page never animated',
    prompt: 'Run BFS from A. Put every corner in its layer.',
    graphId: 'town',
    start: 'A',
    close:
      'A layer is a distance, nothing more: layer i is every node whose shortest path from A has exactly i edges. You can check any answer without running anything, by finding a shortest path.',
  },
  {
    id: 'arpanet-layer-2',
    tier: 1,
    kind: 'number',
    clicker: 'Lecture 4, slide 22',
    tests: 'reading layers off a real graph',
    prompt: 'Run BFS on the 1970 Internet starting from MIT. How many nodes are in layer 2?',
    graphId: 'arpanet',
    unit: 'Nodes in layer 2 =',
    answer: arpanetLayer2,
    why: 'Layer 1 is MIT’s neighbours: UTAH, BBN and LINC. Layer 2 is everything new next to those: SRI and SDC from UTAH, RAND and HARV from BBN, and CASE from LINC.',
    near: [
      {
        v: 4,
        why: 'CASE is missing. LINC is in layer 1 as much as UTAH and BBN are, and CASE is new when LINC is explored.',
      },
      {
        v: 3,
        why: 'That is layer 1: the nodes one edge from MIT. Layer 2 is two edges away.',
      },
      {
        v: 6,
        why: 'Something is counted twice or too early. SDC and RAND are next to each other but each is in layer 2 only once, and UCLA is not two edges from MIT.',
      },
    ],
    close:
      'Layer 2 is exactly the nodes at distance 2. RAND is next to SDC, another layer-2 node, and that edge changes nothing: an edge inside a layer is allowed, it is just not a tree edge.',
  },
  {
    id: 'bowtie-walks',
    tier: 1,
    kind: 'walks',
    tests: 'the vocabulary: path, simple path, cycle',
    prompt: 'Name each sequence of nodes.',
    graphId: 'bowtie',
    walks: [
      ['P', 'Q', 'R', 'S'],
      ['S', 'T', 'U', 'S'],
      ['R', 'S', 'R', 'P'],
      ['Q', 'R', 'S', 'U', 'V'],
      ['P', 'R', 'T'],
      ['P', 'Q', 'R', 'P'],
      ['U', 'S', 'T', 'U', 'V'],
    ],
    close:
      'A path only needs every step to be an edge. Simple forbids repeating a node. A cycle ends where it began and repeats nothing else. Those are three different checks, in that order.',
  },
  {
    id: 'arpanet-non-tree',
    tier: 1,
    kind: 'edges',
    tests: 'which edges the BFS tree does not use',
    prompt:
      'Run BFS on the 1970 Internet from SRI, looking at each node’s neighbours in the order MIT, UTAH, BBN, LINC, SRI, SDC, RAND, HARV, CASE, UCSB, STAN, UCLA, CARN. Tick every edge that is not in the BFS tree.',
    graphId: 'arpanet',
    start: 'SRI',
    pick: 'bfs-non-tree',
    close:
      'A tree on n nodes has n - 1 edges, so 12 of the 17 are tree edges and exactly 5 are not, whatever the start. Which 5 it is depends on the start and on the order neighbours are looked at.',
  },
  {
    id: 'town-line-7',
    tier: 1,
    kind: 'number',
    tests: 'counting how often a line runs, the running-time argument',
    prompt:
      'Run BFS on the small town from A. How many times does the line "if w is not discovered" run?',
    graphId: 'town',
    unit: 'Times it runs =',
    answer: 2 * townM,
    why: `It runs once for every (v, w) pair looked at, and every edge is looked at from both ends: ${townM} edges, twice each. That is where the 2m in O(m + n) comes from.`,
    near: [
      {
        v: townM,
        why: 'That is m. Each edge is looked at twice, once when each end is explored.',
      },
      {
        v: TOWN.graph.nodes.length - 1,
        why: 'That is how often the test succeeds, once for every node except A. The test runs whether it succeeds or not.',
      },
      {
        v: TOWN.graph.nodes.length,
        why: 'That is n, how often "for each node v in L[i]" runs.',
      },
    ],
    close:
      'The running-time proof is exactly this count, done in general: each line runs at most n times or at most 2m times, so the whole thing is O(m + n).',
  },
  {
    id: 'matrix-bfs',
    tier: 1,
    kind: 'choice',
    tests: 'what the O(m + n) bound assumes about how the graph is stored',
    prompt:
      'Store the graph as an adjacency matrix instead of adjacency lists: an n × n table with a 1 in row v, column w when (v, w) is an edge. Now BFS can only find the neighbours of v by reading all of row v. What is its running time?',
    options: [
      {
        t: 'O(m + n), as before.',
        why: 'The 2m in that bound counts neighbours handed over one at a time by a list. A row has n entries whatever the degree of v, and every one has to be read.',
      },
      {
        t: 'O(n²)',
        ok: true,
        why: `Each node’s row is read once, when that node is explored: n rows of n entries. On the 1970 Internet that is ${arpanetN * arpanetN} entries read, against ${2 * arpanetM} entries in all the adjacency lists put together.`,
      },
      {
        t: 'O(nm)',
        why: 'That would be reading a whole row once per edge. Each row is read once, when its node is explored.',
      },
      {
        t: 'O(n)',
        why: 'That is one row. BFS reads a row for every node it explores.',
      },
    ],
    close:
      'This is CLRS Exercise 22.2-4. CLRS §22.1 makes the same trade for storage: lists take Θ(m + n) space and a matrix Θ(n²) whatever m is. (CLRS writes Θ(V + E) and Θ(V²), with V and E standing for n and m.) On a sparse graph like the 1970 Internet the lists win. On a dense one m is close to n² and the two come to the same.',
  },
  {
    id: 'layer-order',
    tier: 1,
    kind: 'choice',
    clicker: 'Lecture 4, slide 30',
    tests: 'what the search order can and cannot change',
    prompt:
      'Suppose BFS explores the nodes within each layer in a different order. What can change?',
    options: [
      {
        t: 'The layers',
        why: 'Layer i is the set of nodes at distance i from s. Distance does not depend on anybody’s order.',
      },
      {
        t: 'The BFS tree',
        ok: true,
        why: 'A node with two neighbours in the layer above gets whichever is explored first as its parent. On the 1970 Internet UCLA can hang from SRI or from RAND.',
      },
      {
        t: 'Both',
        why: 'The tree can change, but the layers cannot: they are distances.',
      },
      {
        t: 'Neither',
        why: 'The layers stay put, but a node can be found from a different parent. Try it on the page with the order reversed.',
      },
    ],
    close:
      'Layers are a property of the graph. The tree is a property of the run. Anything you prove about BFS layers holds however the run is ordered. CLRS Exercise 22.2-5 asks for exactly this: the distances BFS finds do not depend on the order, and the tree can.',
  },
  {
    id: 'no-skip',
    tier: 1,
    kind: 'choice',
    tests: 'the proof that an edge spans at most one layer',
    prompt:
      'Edge (x, y), with x discovered first, in layer i. Why can y not end up in layer i + 2 or later?',
    options: [
      {
        t: 'When x is explored, every undiscovered neighbour of x goes into layer i + 1, and y is a neighbour of x.',
        ok: true,
        why: 'That is the proof. Either y was already discovered, in layer i or i + 1, or it is discovered right then, into i + 1.',
      },
      {
        t: 'Because BFS explores layer i before layer i + 1.',
        why: 'True, but it says nothing about y in particular. The argument has to use the edge between x and y.',
      },
      {
        t: 'Because the graph is connected.',
        why: 'Connectivity is not used. The claim holds for any edge in any graph, as long as BFS reaches it.',
      },
      {
        t: 'Because y was discovered first.',
        why: 'The setup says x was discovered first. Choosing which end to call x is the "without loss of generality" step.',
      },
    ],
    close:
      'This fact does real work later: the bipartite test in chapter 3 rests on it. An edge joins the same layer or neighbouring layers, and nothing else. CLRS states it as Lemma 22.1, δ(s, v) ≤ δ(s, u) + 1 for every edge (u, v), and in an undirected graph that holds both ways round.',
  },
  {
    id: 'arpanet-false',
    tier: 1,
    kind: 'choice',
    clicker: 'Lecture 4, slide 16',
    tests: 'connectivity: what deleting edges and nodes does',
    prompt: 'Which statement about the 1970 Internet is false?',
    graphId: 'arpanet',
    options: [
      {
        t: 'Deleting any one edge of the graph must keep it connected.',
        why: 'True. Every edge is on a cycle, so there is always another way round. Even UTAH–MIT has the route through RAND and BBN.',
      },
      {
        t: 'Deleting any two edges of the graph must disconnect it.',
        ok: true,
        why: 'False, so this is the answer. Deleting SRI–UCSB and SRI–STAN, for one, leaves everything connected.',
      },
      {
        t: 'Deleting any one node (with its edges) keeps it connected.',
        why: 'True. No single site is the only way between two others.',
      },
      {
        t: 'There is a way to delete two nodes (with their edges) and disconnect it, but there is another way to keep it connected.',
        why: 'True. Deleting MIT and BBN cuts the west coast off from the east. Deleting UCSB and STAN leaves it connected.',
      },
    ],
    close:
      '"Must" claims fall to one counterexample, "there is a way" claims to one example. Most of the work is noticing which kind a statement is.',
  },

  // --- Tier 2: queue or stack --------------------------------------------------
  {
    id: 'town-dfs-tree',
    tier: 2,
    kind: 'edges',
    tests: 'running recursive DFS by hand',
    prompt:
      'Run recursive DFS on the small town from A, looking at neighbours in alphabetical order. Tick every edge in the DFS tree.',
    graphId: 'town',
    start: 'A',
    pick: 'dfs-tree',
    close:
      'DFS goes as deep as it can before it backs up, so its tree is long and thin where BFS’s is short and wide. Both have n - 1 edges on a connected graph.',
  },
  {
    id: 'bowtie-stamps',
    tier: 2,
    kind: 'number',
    tests: 'CLRS’s discovery and finishing times',
    prompt:
      'CLRS runs DFS with a clock that ticks once when a call starts and once when it returns. Node u is stamped u.d when DFS(u) starts and u.f when it returns, so the stamps run from 1 to 2n. Run recursive DFS on the two triangles from R, neighbours in alphabetical order. What is S.d?',
    graphId: 'bowtie',
    unit: 'S.d =',
    answer: bowtieSd,
    why: `R starts at ${bowtie.d.get('R')} and calls P at ${bowtie.d.get('P')}, which calls Q at ${bowtie.d.get('Q')}. Q finds nothing new and returns at ${bowtie.f.get('Q')}, P returns at ${bowtie.f.get('P')}, and only then does the loop in DFS(R) reach S, at ${bowtieSd}.`,
    near: [
      {
        v: bowtieRun.order.indexOf('S') + 1,
        why: 'That is the place of S in the order DFS explores nodes: R, P, Q, S. The clock also ticks when a call returns, and DFS(Q) and DFS(P) both return before DFS(S) starts.',
      },
      {
        v: bowtie.f.get('S') ?? 0,
        why: 'That is S.f, when DFS(S) returns, after T, U and V have each been started and finished inside it.',
      },
      {
        v: bowtie.f.get('P') ?? 0,
        why: 'That is P.f, when DFS(P) returns. S starts on the next tick.',
      },
    ],
    close: `A node’s two stamps bracket the stamps of everything below it: S is ${stamp('S')}, and T, U and V all fall inside. P is ${stamp('P')}, and P and S never overlap, since neither is below the other. That is CLRS’s parenthesis theorem (Theorem 22.7): two intervals are nested or apart, never half overlapping. The lectures do not timestamp, but CLRS builds its topological sort on u.f.`,
  },
  {
    id: 'degree-sum',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 5, slide 10',
    tests: 'the degree sum, which the running time rests on',
    prompt:
      'Let q be the sum of the degrees of all the nodes in the graph. Which one of the following is false?',
    options: [
      {
        t: 'q is twice the number of edges',
        why: 'True. Every edge adds one to the degree of each of its two ends.',
      },
      {
        t: 'q is n times the average degree',
        why: 'True. That is what "average" means: the sum divided by n.',
      },
      {
        t: 'q is Θ(m + n) if m ≥ n',
        why: 'True. q = 2m, and when m ≥ n, m ≤ m + n ≤ 2m, so 2m is Θ(m + n).',
      },
      {
        t: 'None of the above',
        ok: true,
        why: 'All three are true, so none is false.',
      },
    ],
    close:
      'This is why "for each edge (v, w)" costs O(m) over a whole search, not O(n) per node: the total is the degree sum, 2m, and the adjacency list delivers each neighbour in constant time.',
  },
  {
    id: 'generic-false',
    tier: 2,
    kind: 'choice',
    clicker: 'Lecture 5, slide 23',
    tests: 'reading the generic traversal exactly',
    prompt:
      'Suppose we run the traversal code and every node is marked explored before it terminates. Which of the following is false?',
    quote:
      'put s in A\nwhile A is not empty\n  take a node v from A\n  if v is not marked "explored"\n    mark v "explored"\n    for each edge (v, w) incident to v\n      put w in A',
    options: [
      {
        t: 'Every node is marked "explored" exactly once.',
        why: 'True. A node is only marked when it is not yet marked, and the question says every node gets marked.',
      },
      {
        t: 'A single node could be put into A more than once.',
        why: 'True. Every neighbour goes into A, explored or not, so a node with three neighbours can go in three times.',
      },
      {
        t: 'If w ≠ s, the number of times that node w is put into A is degree(w).',
        why: 'True. w goes in once each time one of its neighbours is explored, and every node is explored exactly once. (s goes in one extra time, at the start.)',
      },
      {
        t: 'It is possible that there exist nodes x and y with no path from x to y.',
        ok: true,
        why: 'False. Everything explored was reached from s, so every node has a path to s, and x to y goes via s.',
      },
    ],
    close:
      'The page’s traversal counts every put. Run it on the 8-node graph and check C: each node other than the start goes in exactly as many times as it has edges. CLRS’s BFS (§22.2) marks a node gray as it goes into the queue instead, so there nothing goes in twice and B would be false. The code here marks on the way out, which is what lets the same code be DFS with a stack.',
  },
  {
    id: 'scatter-pieces',
    tier: 2,
    kind: 'number',
    tests: 'connected components, and how many searches finding them takes',
    prompt:
      'The loop "while some node is unexplored, run a search from it" runs on this graph. How many searches does it start?',
    graphId: 'scatter',
    unit: 'Searches started =',
    answer: scatterPieces,
    why: 'One search per connected component, since a search explores its whole component and nothing else. The pieces are {1, 5, 9}, {2, 3, 6}, {4, 8} and {7} on its own.',
    near: [
      {
        v: 3,
        why: '7 is missing. A node with no edges is a component by itself, and the loop has to start a search there too.',
      },
      {
        v: 9,
        why: 'That is one per node. A search explores a whole component, so the nodes it reaches are never started from.',
      },
      {
        v: 1,
        why: 'The graph is not connected: no edge joins 1, 5 or 9 to anything else.',
      },
    ],
    close:
      'Finding every component is still O(m + n) in total. Each search costs time for its own component’s nodes and edges, and the components share none. CLRS’s DFS always runs this loop, and its Exercise 22.3-12 is this question: the depth-first forest has one tree per component.',
  },
  {
    id: 'stack-swap',
    tier: 2,
    kind: 'choice',
    tests: 'what the one-word difference between BFS and DFS changes',
    prompt: 'In the generic traversal, A is changed from a queue to a stack. What changes?',
    options: [
      {
        t: 'Which nodes get explored.',
        why: 'No. Either way the search explores exactly what is reachable from s.',
      },
      {
        t: 'The order nodes are explored in, and so the tree.',
        ok: true,
        why: 'A queue finishes a layer before starting the next. A stack follows the newest node first and goes deep.',
      },
      {
        t: 'The running time, from O(m + n) to O(n²).',
        why: 'Each put and take is O(1) for a queue and for a stack, and the count of puts is the same 2m + 1.',
      },
      {
        t: 'Nothing, since the pseudocode is the same.',
        why: 'The pseudocode leaves open which node "take" takes. That choice is the difference.',
      },
    ],
    close:
      'The whole difference between breadth first and depth first is which end of A you take from.',
  },
  {
    id: 'eager-stack',
    tier: 2,
    kind: 'choice',
    tests: 'why the stack version marks a node when it comes out, not when it goes in',
    prompt:
      'A common rewrite of the traversal marks w as soon as it is put in A, and never puts in a node that is already marked, so nothing goes in twice. With A a queue that is still BFS. Make A a stack and run it on the 8-node graph from 1, neighbours in increasing order. Is the tree it builds a depth-first tree?',
    graphId: 'eight',
    quote:
      'mark s; put s in A\nwhile A is not empty\n  take a node v from A\n  for each edge (v, w)\n    if w is not marked\n      mark w; put w in A; add (v, w) to T',
    options: [
      {
        t: 'Yes. It is the page’s stack version with the duplicates left out.',
        why: 'Leaving out the duplicates changes who gets to be a parent. The page’s version lets the newest copy of a node win. This one fixes the parent at the first put, which is the oldest.',
      },
      {
        t: 'No, because it explores different nodes.',
        why: 'It explores exactly what 1 can reach, like every version. What goes wrong is the shape of the tree.',
      },
      {
        t: 'No. Taking 1 marks both 2 and 3 and puts them in, so both hang from 1, and the edge 2–3 then joins two nodes neither of which is an ancestor of the other.',
        ok: true,
        why: 'In a depth-first tree that cannot happen: whichever of 2 and 3 is explored first would find the other inside its own call. CLRS Theorem 22.10 says a DFS of an undirected graph has only tree edges and back edges, and 2–3 is neither.',
      },
      {
        t: 'Yes, since any search that uses a stack is depth first.',
        why: 'The stack only decides which node is taken next. Marking on the way in fixes each parent too early, before the search has gone deep.',
      },
    ],
    close:
      'Where the mark goes matters. CLRS’s BFS marks a node gray as it joins the queue, and for a queue that is fine. CLRS Exercise 22.3-7 asks for DFS with a stack instead of recursion, and the safe way is the page’s: mark a node when it comes out. The page’s stack version is then recursive DFS with every neighbour list read back to front.',
  },
  {
    id: 'dfs-non-tree',
    tier: 2,
    kind: 'choice',
    tests: 'the DFS non-tree edge claim',
    prompt: 'In a DFS tree of an undirected graph, what can a non-tree edge (x, y) join?',
    options: [
      {
        t: 'A node and one of its ancestors in the tree.',
        ok: true,
        why: 'Say x is explored first. DFS(x) looks at the edge (x, y). If y were still unexplored it would become x’s child, so y was explored during DFS(x), which makes it a descendant of x.',
      },
      {
        t: 'Two nodes in different branches of the tree.',
        why: 'That happens with BFS, where UCSB–UCLA joins two children of SRI. In DFS it cannot: whichever is explored first finds the other before its call returns.',
      },
      {
        t: 'Two nodes at the same depth.',
        why: 'Only possible if they were in different branches, and they cannot be.',
      },
      {
        t: 'Anything. Non-tree edges have no structure.',
        why: 'They have exactly the structure in the first option, and that is what makes DFS useful for finding cycles.',
      },
    ],
    close:
      'BFS non-tree edges run sideways, within a layer or to the next one. DFS non-tree edges run up and down one branch. Same graph, opposite shapes. CLRS calls these back edges, and its Theorem 22.10 is this claim: in a DFS of an undirected graph every edge is a tree edge or a back edge.',
  },

  // --- Tier 3: two colours ---------------------------------------------------------
  {
    id: 'which-bipartite',
    tier: 3,
    kind: 'colour',
    tests: 'spotting bipartite graphs, or the odd cycle that rules one out',
    prompt: 'Which of these graphs are bipartite? Answer for each one.',
    graphIds: ['town', 'bowtie', 'scatter', 'eight'],
    close:
      'To show a graph is bipartite, give the colouring. To show it is not, give an odd cycle. Either one is short enough to check by eye, which is what makes this a good certificate.',
  },
  {
    id: 'odd-cycle-iff',
    tier: 3,
    kind: 'choice',
    clicker: 'Lecture 6, slide 8',
    tests: 'bipartite and odd cycles, both directions',
    prompt: 'Which of the following is true?',
    options: [
      {
        t: 'If G is bipartite, then G does not have an odd cycle',
        why: 'True, but so is B. Going round a cycle switches colour at every step, so getting back to the start takes an even number of steps.',
      },
      {
        t: 'If G does not have an odd cycle, then G is bipartite',
        why: 'True, but so is A. This is the hard direction, and the BFS test proves it: if the test says "not bipartite", it has found an odd cycle.',
      },
      { t: 'Both A and B', ok: true, why: 'Bipartite exactly when there is no odd cycle.' },
      {
        t: 'Neither A nor B',
        why: 'Both are true. A is the easy claim, B is what the algorithm proves.',
      },
    ],
    close:
      'The algorithm proves the theorem. When BFS finds a same-layer edge, the odd cycle through the lowest common ancestor is the proof that no colouring exists.',
  },
  {
    id: 'cycle-length',
    tier: 3,
    kind: 'number',
    tests: 'the odd cycle the proof builds',
    prompt:
      'The BFS test finds an edge (x, y) with both ends in layer 5. Their lowest common ancestor in the BFS tree is in layer 2. How many edges does the cycle it builds have?',
    unit: 'Edges in the cycle =',
    answer: 2 * (5 - 2) + 1,
    why: 'From the ancestor down to x is 5 - 2 = 3 edges, the same again down to y, and 1 more for the edge (x, y): 2(j - i) + 1 = 7.',
    near: [
      { v: 6, why: 'That leaves out the edge (x, y) itself, which closes the cycle.' },
      {
        v: 11,
        why: 'That goes all the way up to the root. The two paths meet at layer 2, not layer 0.',
      },
      { v: 3, why: 'That is one tree path. There are two, one to x and one to y.' },
    ],
    close:
      'Whatever j and i are, 2(j - i) + 1 is odd. That one line is why a single same-layer edge settles the question.',
  },
  {
    id: 'why-colouring-works',
    tier: 3,
    kind: 'choice',
    tests: 'the other half of the correctness proof',
    prompt:
      'The test finds no edge with both ends in the same layer, and colours even layers blue and odd layers orange. Why is that a valid colouring?',
    options: [
      {
        t: 'Every edge joins layers that differ by exactly one, and neighbouring layers have different colours.',
        ok: true,
        why: 'BFS allows a difference of 0 or 1, and the test ruled out 0.',
      },
      {
        t: 'BFS tree edges always join different layers.',
        why: 'True, but the colouring has to work for every edge, including the non-tree ones.',
      },
      {
        t: 'Because the graph has no cycles.',
        why: 'It can have plenty of cycles, as long as they are even. The cube does.',
      },
      {
        t: 'Because there are only two colours.',
        why: 'Two colours is the goal, not the reason it succeeds.',
      },
    ],
    close:
      'Both halves of the proof lean on the lecture 5 fact: an edge joins the same layer or neighbouring ones. Same layer means an odd cycle, neighbouring layers means different colours.',
  },
  {
    id: 'matching-bipartite',
    tier: 3,
    kind: 'choice',
    tests: 'recognising bipartite structure in a problem',
    prompt:
      'Draw a node for every student and every college, and an edge for every application. Why is this graph always bipartite?',
    options: [
      {
        t: 'Every edge joins a student to a college, so students one colour and colleges the other is a colouring.',
        ok: true,
        why: 'The two kinds of thing are the two sides. No edge ever joins two students or two colleges.',
      },
      {
        t: 'Because every student applies to the same number of colleges.',
        why: 'Numbers do not matter. What matters is that no edge joins two things of the same kind.',
      },
      {
        t: 'Because stable matchings always exist.',
        why: 'That is a fact about preferences. Bipartiteness is about which pairs an edge can join.',
      },
      {
        t: 'It is not always bipartite.',
        why: 'It always is, for the reason in the first option.',
      },
    ],
    close:
      'Plenty of problems come with the two sides built in: students and colleges, clients and servers, jobs and machines. Then the colouring is free.',
  },
  {
    id: 'wrestlers',
    tier: 3,
    kind: 'choice',
    tests: 'recognising the two-colour test in a problem that does not say "graph"',
    prompt:
      'There are n professional wrestlers and a list of r pairs of them who are rivals. Can each wrestler be made a "babyface" (good guy) or a "heel" (bad guy) so that every rivalry is between a babyface and a heel? Which of these answers it, and gives the split, in O(n + r) time?',
    options: [
      {
        t: 'Run the BFS two-colour test once, from any wrestler.',
        why: 'Nothing says every wrestler is linked to every other through rivalries. One search only colours its own piece, and wrestlers in the other pieces are never reached.',
      },
      {
        t: 'Make a node for each wrestler and an edge for each rivalry. While some wrestler has no colour, run the BFS two-colour test from them. Blue are babyfaces, orange are heels.',
        ok: true,
        why: 'The question is exactly "is this graph bipartite", on n nodes and r edges. Each search pays only for its own piece, so together they are O(n + r), and a same-layer edge in any piece means the answer is no.',
      },
      {
        t: 'Try every way of splitting them, 2ⁿ in all.',
        why: 'Correct, but exponential. The test never guesses: once one wrestler in a piece is fixed, every rival’s side is forced.',
      },
      {
        t: 'Run Gale–Shapley, with babyfaces proposing to heels.',
        why: 'Who is a babyface is what has to be found, not something given, and nobody has preferences. This is a colouring problem, not a matching one.',
      },
    ],
    close:
      'This is CLRS Exercise 22.2-7. The two sides are not handed over, the way students and colleges were. The test finds them, or finds an odd cycle of feuds (three wrestlers who all feud with one another, say), and no split can satisfy that.',
  },

  // --- Tier 4: all edges forward --------------------------------------------------
  {
    id: 'pasta-order',
    tier: 4,
    kind: 'order',
    tests: 'producing a topological order',
    prompt: 'Put the jobs in an order where every job comes after everything it waits for.',
    graphId: 'pasta',
    close:
      'Always take something nothing is waiting on. It exists as long as what is left has no cycle, and taking it can never block anything else.',
  },
  {
    id: 'pasta-count',
    tier: 4,
    kind: 'number',
    tests: 'how much freedom a topological order has',
    prompt: 'How many different valid orders are there for dinner?',
    graphId: 'pasta',
    unit: 'Valid orders =',
    answer: pastaOrders,
    why: 'Everything except the sauce is one fixed chain: fill, boil, cook, drain, toss, serve. The sauce only has to come before tossing, so it can go before any of the first five jobs in the chain.',
    near: [
      {
        v: 1,
        why: 'The sauce is free to move. Nothing points into it, and it only has to beat "toss together".',
      },
      { v: 7, why: 'The sauce cannot come after tossing or serving, since tossing needs it.' },
      {
        v: 6,
        why: 'Count the gaps before "toss together": before fill, boil, cook and drain, and just before toss. That is 5.',
      },
    ],
    close:
      'A DAG usually has many topological orders. The algorithm finds one, and any of them is right. So the question to ask of an answer is "is it valid", never "is it the one".',
  },
  {
    id: 'courses-orders',
    tier: 4,
    kind: 'orders',
    tests: 'checking an order against every edge',
    prompt: 'Which of these course orders are topological? Tick every valid one.',
    graphId: 'courses',
    candidates: [
      ['M132', 'C187', 'C220', 'C240', 'C250', 'C311', 'C383'],
      ['C187', 'C220', 'M132', 'C250', 'C311', 'C240', 'C383'],
      ['C187', 'C220', 'C383', 'M132', 'C240', 'C250', 'C311'],
      ['M132', 'C187', 'C250', 'C311', 'C240', 'C220', 'C383'],
    ],
    close:
      'To check an order, look at every edge and make sure it points forward. One edge pointing back is enough to rule it out, and naming that edge is the whole explanation.',
  },
  {
    id: 'dfs-topo',
    tier: 4,
    kind: 'choice',
    tests: 'CLRS’s topological sort, by finishing time',
    prompt: `CLRS sorts a DAG another way: run DFS over the whole graph, starting a new search at each unexplored node in turn, and as each call returns put its node at the front of a list. Run it on the courses, taking nodes and neighbours in the order ${COURSES.graph.nodes.map(course).join(', ')}. What comes out?`,
    graphId: 'courses',
    options: [
      {
        t: `${coursesPage.map(course).join(', ')}, the same as the page’s sort, since a DAG has only one right order.`,
        why: `These courses have ${countOrders(COURSES.graph)} valid orders, and the two methods need not land on the same one. Math 132 is started first, but its call returns before CS 187 is even started.`,
      },
      {
        t: `${coursesClrs.map(course).join(', ')}: a different order from the page’s, and just as valid.`,
        ok: true,
        why: 'When DFS looks along an edge (u, v), v is either new, so it finishes inside the call for u, or finished already. It cannot still be running, since that would make a cycle. So every course finishes before anything that leads to it, and the last to finish goes first.',
      },
      {
        t: `${[...coursesClrs].reverse().map(course).join(', ')}: the courses in the order their calls return.`,
        why: `That is backwards. ${course(coursesFirstDone)} finishes first because no arrow leaves it, so it belongs at the end. Each finished course goes on the front of the list, and the last one to finish ends up first.`,
      },
      {
        t: 'Nothing: DFS needs a single start, and two courses have no prerequisites.',
        why: 'CLRS’s DFS loops over every node and starts a new tree at any it has not reached, the same loop that finds every component in chapter 2.',
      },
    ],
    close:
      'This is CLRS’s TOPOLOGICAL-SORT (§22.4, Theorem 22.12). It rests on Lemma 22.11: a directed graph is a DAG exactly when DFS finds no back edge, no edge into a call that is still running. The page’s sort, always taking a node nothing points into, is the lectures’ own and CLRS Exercise 22.4-5. Both are O(m + n), and both are right.',
  },
  {
    id: 'dag-max-edges',
    tier: 4,
    kind: 'number',
    clicker: 'Lecture 6, slide 22',
    tests: 'what a topological order says about the number of edges',
    prompt: 'What is the maximum number of edges in a DAG with 6 nodes?',
    unit: 'Most edges =',
    answer: dagEdges(6),
    why: 'Put the nodes in topological order. Every edge points from an earlier node to a later one, so there is at most one per pair: 6 × 5 / 2 = 15. Having every forward edge reaches that.',
    near: [
      {
        v: 30,
        why: 'That is every ordered pair, n(n - 1). Both u → v and v → u would make a 2-cycle.',
      },
      {
        v: 5,
        why: 'That is a single path. A DAG can have far more, like 1 → 3 as well as 1 → 2 → 3.',
      },
      {
        v: 36,
        why: 'That is n². A DAG has no edges from a node to itself and no pair in both directions.',
      },
    ],
    close:
      'In general n(n - 1)/2, which is Θ(n²). So on a DAG m can be as big as n², and O(m + n) can mean O(n²).',
  },
  {
    id: 'chain-restarts',
    tier: 4,
    kind: 'number',
    clicker: 'Lecture 6, slide 14',
    tests: 'directed reachability, and why direction matters',
    prompt:
      'G is a directed path on 5 vertices. BFS is called repeatedly, starting from any unexplored vertex, until all nodes are explored. What is the maximum number of times BFS may be called?',
    graphId: 'chain',
    unit: 'Calls, at most =',
    answer: chainRestarts,
    why: 'Start at the far end, v5: it reaches nothing new. Then v4 reaches only v5, which is already explored, and so on back to v1. Every call explores one node.',
    near: [
      { v: 1, why: 'That is the fewest, starting at v1. The question asks for the most.' },
      {
        v: 4,
        why: 'That is n - 1, the number of edges. Every call explores at least one node, and a bad order makes it exactly one.',
      },
    ],
    close:
      'In an undirected graph the number of searches is the number of components, whatever the order. In a directed graph it depends on where you start, because reaching is one-way.',
  },
  {
    id: 'scc-dag',
    tier: 4,
    kind: 'choice',
    clicker: 'Lecture 6, slide 24',
    tests: 'strong components, and the DAG they make',
    prompt:
      'Consider the graph G′ whose nodes are the strong components, with an edge from C to D if any node in C has an edge to any node in D. Which of the following is always true?',
    options: [
      {
        t: 'G′ is strongly connected',
        why: 'Only when there is one component. A one-way edge between two components cannot be walked back.',
      },
      {
        t: 'G′ has a cycle',
        why: 'The opposite. A cycle through C and D would let every node in C reach every node in D and back, so they would be one component.',
      },
      {
        t: 'G′ has at least n/2 nodes',
        why: 'A strongly connected graph has one component, however big n is.',
      },
      {
        t: 'G′ is a DAG',
        ok: true,
        why: 'Any cycle in G′ would merge the components on it into one, which contradicts their being maximal.',
      },
    ],
    close:
      'Every directed graph is a DAG of strongly connected pieces. Knowing that shape is often most of an algorithm. CLRS Lemma 22.13 is the same argument, and CLRS §22.5 finds the pieces with two depth-first searches, one on G and one on G with every edge turned round.',
  },
  {
    id: 'source-exists',
    tier: 4,
    kind: 'choice',
    tests: 'the step the topological sort proof needs',
    prompt: 'Why does every DAG have a node with no incoming edges?',
    options: [
      {
        t: 'Walk backwards along incoming edges. If none of those nodes were a source the walk would never stop, and with only n nodes it would repeat one, which gives a cycle.',
        ok: true,
        why: 'That is the proof. A finite graph plus "keep going forever" means a repeat, and a repeat means a cycle.',
      },
      {
        t: 'Because a DAG has fewer than n(n - 1)/2 edges.',
        why: 'The edge count does not rule anything out: a DAG can have exactly n(n - 1)/2 edges.',
      },
      {
        t: 'Because the first node in the topological order is a source.',
        why: 'That assumes an order exists, which is what this fact is used to prove. Circular.',
      },
      {
        t: 'Because every node has at least one outgoing edge.',
        why: 'Not true of DAGs: the last node in any order has none.',
      },
    ],
    close:
      'With this fact the sort cannot get stuck on a DAG. Take a source, delete it, and what is left is still a DAG, so it has a source too. That is the induction.',
  },
  {
    id: 'linear-sort',
    tier: 4,
    kind: 'choice',
    tests: 'making the source-removal sort O(m + n)',
    prompt:
      'CLRS Exercise 22.4-5 asks for the page’s sort, repeatedly taking a node with no incoming edges and deleting it, in O(m + n) time. What makes it that fast?',
    options: [
      {
        t: 'Before each step, scan every node left for one with no incoming edges.',
        why: 'Each scan has to count incoming edges again, up to O(m + n) a time, and there are n steps.',
      },
      {
        t: 'Sort the nodes once by how many incoming edges they start with, and place them in that order.',
        why: `The counts change as nodes are deleted, so the starting ones mislead. CS 311 starts with ${coursesIn.get('C311')} incoming edge and CS 250 with ${coursesIn.get('C250')}, so CS 311 would go first, but CS 250 → CS 311 says it comes after.`,
      },
      {
        t: 'Nothing can: just finding a source takes O(n), so n steps cost O(n²).',
        why: 'Finding a source is O(1) if sources are kept in a list as they appear. The work then goes into keeping the counts up to date, and that is one subtraction per edge.',
      },
      {
        t: 'Count each node’s incoming edges once. Keep the nodes whose count is 0 in a list. Placing a node subtracts one from the count of each node it points to, and any count that reaches 0 joins the list.',
        ok: true,
        why: 'Counting is O(m + n). Each edge is subtracted once, when the node it leaves is placed, and each node joins and leaves the list once. O(m + n) in all.',
      },
    ],
    close:
      'If there is a cycle, the list runs dry while nodes are left, which is "stuck" in chapter 4, and the nodes left over contain the cycle. CLRS asks about that case in the same exercise. The page’s own code just rescans, since its graphs are small.',
  },
];

export const questionsIn = (tier: Tier): Question[] => QUESTIONS.filter((q) => q.tier === tier);
