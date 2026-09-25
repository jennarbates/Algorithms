import { bfs } from './bfs.ts';
import type { BfsEvent, BfsResult } from './bfs.ts';
import type { Edge, Graph, NodeId } from './graph.ts';

/**
 * The two-colour test from lecture 6.
 *
 * Run BFS, colour the even layers one colour and the odd layers the other,
 * then look at every edge. BFS already guarantees an edge's ends are at most
 * one layer apart, so an edge either joins neighbouring layers, which have
 * different colours and are fine, or it joins two nodes in the same layer.
 * One such edge is enough to say "not bipartite", and the proof builds the
 * evidence: walk both ends up the BFS tree until they meet at z, their lowest
 * common ancestor, and the two tree paths plus the edge make a cycle of length
 * 2(j - i) + 1, where j is the edges' layer and i is z's. Odd, whatever j and i
 * are, and an odd cycle cannot be two-coloured.
 *
 * On a graph in pieces the test runs once per piece, each from its first node.
 */

export type Colouring =
  | { readonly ok: true; readonly side: ReadonlyMap<NodeId, 0 | 1> }
  | {
      readonly ok: false;
      /** The first same-layer edge found. */
      readonly edge: Edge;
      readonly layer: number;
      readonly lca: NodeId;
      readonly lcaLayer: number;
      /** The odd cycle, starting and ending at the lowest common ancestor. */
      readonly cycle: readonly NodeId[];
    };

export function pathUp(parent: ReadonlyMap<NodeId, NodeId>, from: NodeId): NodeId[] {
  const path = [from];
  for (let x = parent.get(from); x !== undefined; x = parent.get(x)) path.push(x);
  return path;
}

/** The odd cycle through a same-layer edge (x, y), by way of their lowest common ancestor. */
export function oddCycle(
  run: BfsResult,
  [x, y]: Edge,
): { lca: NodeId; lcaLayer: number; cycle: NodeId[] } {
  const upX = pathUp(run.parent, x);
  const upY = pathUp(run.parent, y);
  const onY = new Set(upY);
  const lca = upX.find((n) => onY.has(n));
  if (lca === undefined) throw new Error(`${x} and ${y} are not in the same BFS tree`);
  const toLcaX = upX.slice(0, upX.indexOf(lca) + 1); // x ... z
  const toLcaY = upY.slice(0, upY.indexOf(lca)); // y ... just below z
  // z down to x, across to y, up to just below z, and back to z.
  const cycle = [...toLcaX.reverse(), ...toLcaY, lca];
  return { lca, lcaLayer: run.layerOf.get(lca) ?? 0, cycle };
}

export function colour(g: Graph): Colouring {
  const side = new Map<NodeId, 0 | 1>();
  for (const s of g.nodes) {
    if (side.has(s)) continue;
    const run = bfs(g, s);
    for (const [n, layer] of run.layerOf) side.set(n, layer % 2 === 0 ? 0 : 1);
    const clash = sameLayerEdges(g, run)[0];
    if (clash) {
      return {
        ok: false,
        edge: clash,
        layer: run.layerOf.get(clash[0]) ?? 0,
        ...oddCycle(run, clash),
      };
    }
  }
  return { ok: true, side };
}

export function sameLayerEdges(g: Graph, run: BfsResult): Edge[] {
  return g.edges.filter(([u, v]) => {
    const a = run.layerOf.get(u);
    return a !== undefined && a === run.layerOf.get(v);
  });
}

export const isBipartite = (g: Graph): boolean => colour(g).ok;

/**
 * The run the page animates, on a connected graph: the BFS, then one look at
 * each edge, stopping at the first one whose ends share a colour.
 */
export type ColourEvent =
  BfsEvent | { readonly k: 'check'; readonly edge: Edge; readonly same: boolean };

export function colourRun(
  g: Graph,
  s: NodeId,
): { run: BfsResult; events: ColourEvent[]; verdict: Colouring } {
  const run = bfs(g, s);
  const events: ColourEvent[] = [...run.events];
  let verdict: Colouring | null = null;
  for (const edge of g.edges) {
    const same = run.layerOf.get(edge[0]) === run.layerOf.get(edge[1]);
    events.push({ k: 'check', edge, same });
    if (same) {
      verdict = {
        ok: false,
        edge,
        layer: run.layerOf.get(edge[0]) ?? 0,
        ...oddCycle(run, edge),
      };
      break;
    }
  }
  if (!verdict) {
    const side = new Map<NodeId, 0 | 1>();
    for (const [n, layer] of run.layerOf) side.set(n, layer % 2 === 0 ? 0 : 1);
    verdict = { ok: true, side };
  }
  return { run, events, verdict };
}
