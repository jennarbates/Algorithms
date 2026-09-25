import { adjacency, edgeKey } from './graph.ts';
import type { Edge, Graph, NeighbourOrder, NodeId } from './graph.ts';

/**
 * Breadth-first search, exactly as the lecture writes it: layer by layer, not
 * with a queue. The queue version comes in chapter 2, where the point is that
 * the two are the same algorithm.
 *
 *   BFS(s)
 *     mark s discovered; L[0] = {s}; i = 0
 *     while L[i] is not empty
 *       L[i+1] = empty list
 *       for each node v in L[i]
 *         for each edge (v, w)
 *           if w is not discovered
 *             mark w discovered; add w to L[i+1]; add (v, w) to T
 *       i = i + 1
 *
 * The run is recorded as a list of events, one per thing a person tracing it
 * by hand would write down, and every picture of the run is a replay of a
 * prefix of that list. That is what lets the page step backwards freely: there
 * is no state to undo, only a shorter prefix to replay.
 */

export type BfsEvent =
  | { readonly k: 'start'; readonly s: NodeId }
  | { readonly k: 'layer'; readonly i: number }
  | { readonly k: 'visit'; readonly v: NodeId; readonly i: number }
  | { readonly k: 'edge'; readonly v: NodeId; readonly w: NodeId; readonly found: boolean }
  | { readonly k: 'done'; readonly layers: number };

export interface BfsResult {
  readonly events: readonly BfsEvent[];
  readonly layers: readonly (readonly NodeId[])[];
  /** Layer number of every node reached. Unreached nodes are absent. */
  readonly layerOf: ReadonlyMap<NodeId, number>;
  readonly parent: ReadonlyMap<NodeId, NodeId>;
  readonly tree: readonly Edge[];
  /** Edges between reached nodes that the tree does not use. */
  readonly nonTree: readonly Edge[];
}

export function bfs(g: Graph, s: NodeId, order: NeighbourOrder = 'listed'): BfsResult {
  const adj = adjacency(g, order);
  const events: BfsEvent[] = [{ k: 'start', s }];
  const layerOf = new Map<NodeId, number>([[s, 0]]);
  const parent = new Map<NodeId, NodeId>();
  const tree: Edge[] = [];
  const layers: NodeId[][] = [[s]];

  for (let i = 0; (layers[i]?.length ?? 0) > 0; i++) {
    events.push({ k: 'layer', i });
    const next: NodeId[] = [];
    for (const v of layers[i] ?? []) {
      events.push({ k: 'visit', v, i });
      for (const w of adj.get(v) ?? []) {
        const found = !layerOf.has(w);
        if (found) {
          layerOf.set(w, i + 1);
          parent.set(w, v);
          tree.push([v, w]);
          next.push(w);
        }
        events.push({ k: 'edge', v, w, found });
      }
    }
    layers.push(next);
  }
  layers.pop();
  events.push({ k: 'done', layers: layers.length });

  const treeKeys = new Set(tree.map(([u, v]) => edgeKey(u, v, g.directed)));
  const nonTree = g.edges.filter(
    ([u, v]) => layerOf.has(u) && layerOf.has(v) && !treeKeys.has(edgeKey(u, v, g.directed)),
  );
  return { events, layers, layerOf, parent, tree, nonTree };
}

/** Everything a picture of the run needs, as of some step. */
export interface BfsState {
  readonly layerOf: ReadonlyMap<NodeId, number>;
  readonly layers: readonly (readonly NodeId[])[];
  readonly parent: ReadonlyMap<NodeId, NodeId>;
  /** The layer being worked through, or null before the first and after the last. */
  readonly layer: number | null;
  readonly visiting: NodeId | null;
  /** Nodes whose edges have all been looked at. */
  readonly explored: ReadonlySet<NodeId>;
  readonly edge: { readonly v: NodeId; readonly w: NodeId; readonly found: boolean } | null;
  readonly done: boolean;
  /** How many times each line of the pseudocode has run, by line number (2 to 9). */
  readonly lines: Readonly<Record<number, number>>;
  /** Every edge looked at so far, by edge key. */
  readonly looked: ReadonlySet<string>;
}

/** The lines of the pseudocode above, numbered the way the page prints them. */
export const BFS_LINES: readonly { readonly n: number; readonly text: string }[] = [
  { n: 1, text: 'BFS(s)' },
  { n: 2, text: '  mark s discovered; L[0] = {s}; i = 0' },
  { n: 3, text: '  while L[i] is not empty' },
  { n: 4, text: '    L[i+1] = empty list' },
  { n: 5, text: '    for each node v in L[i]' },
  { n: 6, text: '      for each edge (v, w)' },
  { n: 7, text: '        if w is not discovered' },
  { n: 8, text: '          mark w; add w to L[i+1]; add (v, w) to T' },
  { n: 9, text: '    i = i + 1' },
];

export function bfsStateAt(events: readonly BfsEvent[], step: number, directed = false): BfsState {
  const looked = new Set<string>();
  const layerOf = new Map<NodeId, number>();
  const layers: NodeId[][] = [];
  const parent = new Map<NodeId, NodeId>();
  const explored = new Set<NodeId>();
  const lines: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let layer: number | null = null;
  let visiting: NodeId | null = null;
  let edge: BfsState['edge'] = null;
  let done = false;
  const bump = (n: number) => (lines[n] = (lines[n] ?? 0) + 1);

  for (const e of events.slice(0, step + 1)) {
    edge = null;
    if (e.k === 'start') {
      layerOf.set(e.s, 0);
      layers.push([e.s]);
      bump(2);
    } else if (e.k === 'layer') {
      if (visiting) explored.add(visiting);
      visiting = null;
      if (e.i > 0) bump(9);
      layer = e.i;
      layers[e.i + 1] = [];
      bump(3);
      bump(4);
    } else if (e.k === 'visit') {
      if (visiting) explored.add(visiting);
      visiting = e.v;
      bump(5);
    } else if (e.k === 'edge') {
      edge = { v: e.v, w: e.w, found: e.found };
      looked.add(edgeKey(e.v, e.w, directed));
      bump(6);
      bump(7);
      if (e.found) {
        layerOf.set(e.w, (layerOf.get(e.v) ?? 0) + 1);
        parent.set(e.w, e.v);
        (layers[(layerOf.get(e.v) ?? 0) + 1] ??= []).push(e.w);
        bump(8);
      }
    } else {
      if (visiting) explored.add(visiting);
      visiting = null;
      layer = null;
      // The last pass: i moves on to the empty layer, and the loop test fails.
      bump(9);
      bump(3);
      done = true;
    }
  }
  while (layers.length > 0 && (layers[layers.length - 1]?.length ?? 0) === 0 && done) layers.pop();
  return { layerOf, layers, parent, layer, visiting, explored, edge, done, lines, looked };
}

/** The layer each end of every edge ended up in. The lecture's claim is that these differ by at most one. */
export function edgeSpans(
  g: Graph,
  layerOf: ReadonlyMap<NodeId, number>,
): { readonly edge: Edge; readonly span: number }[] {
  return g.edges
    .filter(([u, v]) => layerOf.has(u) && layerOf.has(v))
    .map((edge) => ({
      edge,
      span: Math.abs((layerOf.get(edge[0]) ?? 0) - (layerOf.get(edge[1]) ?? 0)),
    }));
}

/** Number of edges on a shortest path, or null if there is none. */
export function distance(g: Graph, u: NodeId, v: NodeId): number | null {
  return bfs(g, u).layerOf.get(v) ?? null;
}
