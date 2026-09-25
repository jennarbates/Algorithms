import { isConnected } from './dfs.ts';
import { choose, edgeKey, hasEdge, without } from './graph.ts';
import type { Edge, Graph, NodeId } from './graph.ts';

/**
 * The vocabulary from lecture 4, as functions, so that every "is this a path?"
 * question on the page is answered by code rather than by whoever wrote it.
 *
 * - A **path** is a sequence of nodes where each one after the first has an edge
 *   from the one before. Nodes may repeat.
 * - A **simple path** is a path whose nodes are all different.
 * - A **cycle** is a path that ends where it starts, with its first k - 1 nodes
 *   all different, no edge used twice, and k > 3, so at least three different
 *   nodes go round.
 *
 * The four answers are exclusive and the most specific one wins: a simple path
 * is reported as "simple path", not as "path".
 */

export type WalkKind = 'not-a-path' | 'path' | 'simple-path' | 'cycle';

export const WALK_LABELS: Readonly<Record<WalkKind, string>> = {
  'not-a-path': 'Not a path',
  path: 'Path, not simple',
  'simple-path': 'Simple path',
  cycle: 'Cycle',
};

export function classifyWalk(g: Graph, seq: readonly NodeId[]): WalkKind {
  if (seq.length === 0) return 'not-a-path';
  for (let i = 1; i < seq.length; i++) {
    if (!hasEdge(g, seq[i - 1] as NodeId, seq[i] as NodeId)) return 'not-a-path';
  }
  if (new Set(seq).size === seq.length) return 'simple-path';

  const k = seq.length;
  if (k > 3 && seq[0] === seq[k - 1]) {
    const firsts = seq.slice(0, k - 1);
    const edges = firsts.map((u, i) => edgeKey(u, seq[i + 1] as NodeId, g.directed));
    if (new Set(firsts).size === k - 1 && new Set(edges).size === edges.length) return 'cycle';
  }
  return 'path';
}

/** Edges whose deletion on its own disconnects the graph. */
export function bridges(g: Graph): Edge[] {
  return g.edges.filter((e) => !isConnected(without(g, { edges: [e] })));
}

/** Nodes whose deletion (with their edges) on its own disconnects the graph. */
export function cutNodes(g: Graph): NodeId[] {
  return g.nodes.filter((n) => !isConnected(without(g, { nodes: [n] })));
}

/** Every set of k edges whose deletion disconnects the graph. */
export function edgeCuts(g: Graph, k: number): Edge[][] {
  return choose(g.edges, k).filter((es) => !isConnected(without(g, { edges: es })));
}

/** Every set of k nodes whose deletion disconnects what is left. */
export function nodeCuts(g: Graph, k: number): NodeId[][] {
  return choose(g.nodes, k).filter((ns) => !isConnected(without(g, { nodes: ns })));
}
