import { bfs } from './bfs.ts';
import { edgeKey, reversed } from './graph.ts';
import type { Edge, Graph, NodeId } from './graph.ts';

/**
 * Directed graphs: reachability, DAGs and topological order, from lecture 6.
 *
 * BFS on a directed graph is the same code following only the edges that leave
 * a node, so reachability is `bfs` unchanged. Who can reach t is the same
 * search on the graph with every edge turned around.
 *
 * The topological sort is the lecture's, not the DFS finishing-time one:
 * repeatedly find a node nothing points into, put it next, and delete it with
 * the edges leaving it. When more than one node qualifies, any of them is
 * right, and the page lets the reader choose. When none qualifies the graph has
 * a cycle among what is left, and `cycleAmong` finds it, because "stuck" is a
 * claim and a cycle is the evidence.
 */

export const reachableFrom = (g: Graph, s: NodeId): NodeId[] => bfs(g, s).layers.flat();

export const canReach = (g: Graph, t: NodeId): NodeId[] => bfs(reversed(g), t).layers.flat();

/** In-degree of every node still standing, counting only edges from nodes still standing. */
export function inDegrees(g: Graph, removed: ReadonlySet<NodeId> = new Set()): Map<NodeId, number> {
  const deg = new Map<NodeId, number>(g.nodes.filter((n) => !removed.has(n)).map((n) => [n, 0]));
  for (const [u, v] of g.edges) {
    if (removed.has(u) || removed.has(v)) continue;
    deg.set(v, (deg.get(v) ?? 0) + 1);
  }
  return deg;
}

/** The nodes nothing still standing points into, in node order. */
export function sources(g: Graph, removed: ReadonlySet<NodeId> = new Set()): NodeId[] {
  const deg = inDegrees(g, removed);
  return g.nodes.filter((n) => deg.get(n) === 0);
}

export type TopoResult =
  | { readonly ok: true; readonly order: readonly NodeId[] }
  | {
      readonly ok: false;
      /** Placed before the sort got stuck. */
      readonly order: readonly NodeId[];
      /** A directed cycle among the nodes left, first node repeated at the end. */
      readonly cycle: readonly NodeId[];
    };

/**
 * The sort, always taking the first source in node order unless told otherwise.
 * `pick` gets the sources available and returns the one to place.
 */
export function topoSort(
  g: Graph,
  pick: (available: readonly NodeId[]) => NodeId = (a) => a[0] as NodeId,
): TopoResult {
  const removed = new Set<NodeId>();
  const order: NodeId[] = [];
  while (removed.size < g.nodes.length) {
    const available = sources(g, removed);
    if (available.length === 0) {
      const left = g.nodes.filter((n) => !removed.has(n));
      return { ok: false, order, cycle: cycleAmong(g, left) };
    }
    const next = pick(available);
    if (!available.includes(next)) throw new Error(`${next} is not a source`);
    order.push(next);
    removed.add(next);
  }
  return { ok: true, order };
}

export const isDag = (g: Graph): boolean => topoSort(g).ok;

/**
 * A directed cycle among `nodes`, all of which have an edge coming in from
 * inside the set. Walk backwards along incoming edges: every node has one, so
 * the walk never stops, and in a finite set it has to come back round.
 */
export function cycleAmong(g: Graph, nodes: readonly NodeId[]): NodeId[] {
  const inside = new Set(nodes);
  const into = new Map<NodeId, NodeId>();
  for (const [u, v] of g.edges) if (inside.has(u) && inside.has(v) && !into.has(v)) into.set(v, u);
  const start = nodes[0];
  if (start === undefined) return [];
  const seenAt = new Map<NodeId, number>();
  const walk: NodeId[] = [];
  let x: NodeId | undefined = start;
  while (x !== undefined && !seenAt.has(x)) {
    seenAt.set(x, walk.length);
    walk.push(x);
    x = into.get(x);
  }
  if (x === undefined) throw new Error('cycleAmong: some node has no edge in from the set');
  // walk runs backwards along edges; the loop is from x's first visit on.
  const loop = walk.slice(seenAt.get(x)).reverse();
  return [...loop, loop[0] as NodeId];
}

export type OrderCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'not-every-node'; readonly missing: readonly NodeId[] }
  | { readonly ok: false; readonly reason: 'backward'; readonly edge: Edge };

/** Is this a topological order: every node once, every edge pointing forward? */
export function checkOrder(g: Graph, order: readonly NodeId[]): OrderCheck {
  const at = new Map(order.map((n, i) => [n, i]));
  const missing = g.nodes.filter((n) => !at.has(n));
  if (missing.length > 0 || at.size !== order.length || order.length !== g.nodes.length) {
    return { ok: false, reason: 'not-every-node', missing };
  }
  const bad = g.edges.find(([u, v]) => (at.get(u) ?? 0) > (at.get(v) ?? 0));
  return bad ? { ok: false, reason: 'backward', edge: bad } : { ok: true };
}

/** How many different topological orders the graph has. Brute force, for small graphs and tests. */
export function countOrders(g: Graph): number {
  const memo = new Map<string, number>();
  const go = (removed: Set<NodeId>): number => {
    if (removed.size === g.nodes.length) return 1;
    const key = [...removed].sort().join(',');
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let total = 0;
    for (const s of sources(g, removed)) total += go(new Set([...removed, s]));
    memo.set(key, total);
    return total;
  };
  return go(new Set());
}

/** Strongly connected components, by the plain two-search definition. Fine for the sizes here. */
export function strongComponents(g: Graph): NodeId[][] {
  const reach = new Map(g.nodes.map((n) => [n, new Set(reachableFrom(g, n))]));
  const out: NodeId[][] = [];
  const placed = new Set<NodeId>();
  for (const n of g.nodes) {
    if (placed.has(n)) continue;
    const comp = g.nodes.filter((m) => reach.get(n)?.has(m) && reach.get(m)?.has(n));
    comp.forEach((m) => placed.add(m));
    out.push(comp);
  }
  return out;
}

/** The graph whose nodes are the strong components, named by their first member. */
export function condensation(g: Graph): Graph {
  const comps = strongComponents(g);
  const name = new Map<NodeId, NodeId>();
  for (const c of comps) for (const n of c) name.set(n, c[0] as NodeId);
  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const [u, v] of g.edges) {
    const a = name.get(u) as NodeId;
    const b = name.get(v) as NodeId;
    if (a === b || seen.has(edgeKey(a, b, true))) continue;
    seen.add(edgeKey(a, b, true));
    edges.push([a, b]);
  }
  return {
    id: `${g.id}-condensed`,
    nodes: comps.map((c) => c[0] as NodeId),
    edges,
    directed: true,
  };
}

/**
 * The most times a search can be started, restarting from any unexplored node
 * until everything is explored, where each search explores whatever it reaches
 * that is not explored yet. Tried every way, so small graphs only.
 */
export function maxRestarts(g: Graph): number {
  const reach = new Map(g.nodes.map((n) => [n, reachableFrom(g, n)]));
  const memo = new Map<string, number>();
  const go = (explored: ReadonlySet<NodeId>): number => {
    if (explored.size === g.nodes.length) return 0;
    const key = [...explored].sort().join(',');
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let best = 0;
    for (const s of g.nodes) {
      if (explored.has(s)) continue;
      const next = new Set(explored);
      for (const n of reach.get(s) ?? []) next.add(n);
      best = Math.max(best, 1 + go(next));
    }
    memo.set(key, best);
    return best;
  };
  return go(new Set());
}
