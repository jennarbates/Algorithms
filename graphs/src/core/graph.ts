/**
 * Graphs, as the lectures define them.
 *
 * A graph is a list of nodes and a list of edges. Undirected unless it says
 * otherwise, because that is the lectures' default too. Nothing here knows how
 * a graph is drawn; positions live with the content, next to the graph they
 * belong to.
 *
 * **Neighbour order is part of the input.** BFS finds the same layers whatever
 * order it looks at neighbours in, but the tree it builds, the order DFS walks,
 * and which source a topological sort peels first all depend on it. So the
 * order is fixed and stated once: a node's neighbours are visited in the order
 * the nodes are listed in `nodes`. For the 8-node graph that is increasing
 * order, which is what the DFS slide uses, and for the 1970 Internet it is the
 * order that reproduces the BFS tree on the slide. Every other order a page
 * wants to show off is asked for explicitly, with `NeighbourOrder`.
 *
 * Every import in `src/core` and `src/content` carries its `.ts` extension. That
 * is so Node can load these files as they are, with no build, which is how the
 * printable workbook in `../worksheets` computes its answer key: from this
 * engine, not from a copy of it.
 */

export type NodeId = string;
export type Edge = readonly [NodeId, NodeId];

export interface Graph {
  readonly id: string;
  readonly nodes: readonly NodeId[];
  readonly edges: readonly Edge[];
  readonly directed: boolean;
}

/** As listed, or back to front: the one alternative order the pages need. */
export type NeighbourOrder = 'listed' | 'reversed';

export function graph(
  id: string,
  nodes: readonly NodeId[],
  edges: readonly Edge[],
  directed = false,
): Graph {
  const known = new Set(nodes);
  if (known.size !== nodes.length) throw new Error(`${id}: a node is listed twice`);
  const seen = new Set<string>();
  for (const [u, v] of edges) {
    if (!known.has(u) || !known.has(v)) throw new Error(`${id}: edge ${u}-${v} names a stranger`);
    if (u === v) throw new Error(`${id}: ${u} has an edge to itself`);
    const key = edgeKey(u, v, directed);
    if (seen.has(key)) throw new Error(`${id}: edge ${u}-${v} is listed twice`);
    seen.add(key);
  }
  return { id, nodes, edges, directed };
}

/** One name per edge, the same whichever end an undirected edge is read from. */
export function edgeKey(u: NodeId, v: NodeId, directed: boolean): string {
  if (directed) return `${u}>${v}`;
  return u < v ? `${u}|${v}` : `${v}|${u}`;
}

export const keyOf = (g: Graph, e: Edge): string => edgeKey(e[0], e[1], g.directed);

/**
 * The adjacency list: for each node, the nodes its edges lead to, in node
 * order. For a directed graph, only the edges leaving it.
 */
export function adjacency(g: Graph, order: NeighbourOrder = 'listed'): Map<NodeId, NodeId[]> {
  const rank = new Map(g.nodes.map((n, i) => [n, i]));
  const adj = new Map<NodeId, NodeId[]>(g.nodes.map((n) => [n, []]));
  for (const [u, v] of g.edges) {
    adj.get(u)?.push(v);
    if (!g.directed) adj.get(v)?.push(u);
  }
  for (const list of adj.values()) {
    list.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    if (order === 'reversed') list.reverse();
  }
  return adj;
}

/** The same graph with every edge turned around. */
export function reversed(g: Graph): Graph {
  return { ...g, id: `${g.id}-reversed`, edges: g.edges.map(([u, v]) => [v, u] as const) };
}

export function hasEdge(g: Graph, u: NodeId, v: NodeId): boolean {
  const key = edgeKey(u, v, g.directed);
  return g.edges.some((e) => keyOf(g, e) === key);
}

export function degree(g: Graph, n: NodeId): number {
  return g.edges.filter(([u, v]) => u === n || v === n).length;
}

/** The graph left after deleting some nodes (with their edges) and some edges. */
export function without(
  g: Graph,
  cut: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly Edge[] },
): Graph {
  const goneNodes = new Set(cut.nodes ?? []);
  const goneEdges = new Set((cut.edges ?? []).map((e) => keyOf(g, e)));
  return {
    ...g,
    nodes: g.nodes.filter((n) => !goneNodes.has(n)),
    edges: g.edges.filter(
      (e) => !goneNodes.has(e[0]) && !goneNodes.has(e[1]) && !goneEdges.has(keyOf(g, e)),
    ),
  };
}

/** Every way to choose k items from a list, in order. For small brute-force checks. */
export function choose<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of choose(items.slice(i + 1), k - 1)) out.push([item, ...rest]);
  });
  return out;
}
