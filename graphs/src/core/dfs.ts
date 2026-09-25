import { adjacency, edgeKey } from './graph.ts';
import type { Edge, Graph, NeighbourOrder, NodeId } from './graph.ts';

/**
 * Depth-first search, the recursive version from the lecture:
 *
 *   DFS(u)
 *     mark u explored
 *     for each edge (u, v)
 *       if v is not explored
 *         add (u, v) to T
 *         DFS(v)
 *
 * wrapped in the loop that finds every connected component: while some node is
 * unexplored, start DFS there. On a connected graph the loop runs once and is
 * invisible, and on a graph in pieces it is the whole point, so it is always on.
 *
 * Like BFS, the run is a list of events and every picture is a replay.
 */

export type DfsEvent =
  | { readonly k: 'root'; readonly s: NodeId; readonly component: number }
  | { readonly k: 'enter'; readonly u: NodeId; readonly from: NodeId | null }
  | {
      readonly k: 'edge';
      readonly u: NodeId;
      readonly v: NodeId;
      /**
       * `tree`: v was new, so the search goes down to it.
       * `parent`: the tree edge u came in on, seen again from below.
       * `ancestor`: v is further up the current call stack. A non-tree edge.
       * `descendant`: v was finished inside this very call. The same non-tree edge, seen from the top.
       */
      readonly kind: 'tree' | 'parent' | 'ancestor' | 'descendant';
    }
  | { readonly k: 'exit'; readonly u: NodeId }
  | { readonly k: 'done'; readonly components: number };

export interface DfsResult {
  readonly events: readonly DfsEvent[];
  readonly order: readonly NodeId[];
  readonly parent: ReadonlyMap<NodeId, NodeId>;
  readonly tree: readonly Edge[];
  readonly nonTree: readonly Edge[];
  /** Component number of every node, counting from 0. */
  readonly component: ReadonlyMap<NodeId, number>;
  readonly components: readonly (readonly NodeId[])[];
}

export function dfs(
  g: Graph,
  starts: readonly NodeId[] = g.nodes,
  order: NeighbourOrder = 'listed',
): DfsResult {
  const adj = adjacency(g, order);
  const events: DfsEvent[] = [];
  const explored = new Set<NodeId>();
  const onStack = new Set<NodeId>();
  const parent = new Map<NodeId, NodeId>();
  const component = new Map<NodeId, number>();
  const components: NodeId[][] = [];
  const order_: NodeId[] = [];
  const tree: Edge[] = [];

  const visit = (u: NodeId, from: NodeId | null, c: number) => {
    explored.add(u);
    onStack.add(u);
    order_.push(u);
    component.set(u, c);
    components[c]?.push(u);
    events.push({ k: 'enter', u, from });
    for (const v of adj.get(u) ?? []) {
      if (!explored.has(v)) {
        events.push({ k: 'edge', u, v, kind: 'tree' });
        parent.set(v, u);
        tree.push([u, v]);
        visit(v, u, c);
      } else if (!g.directed && parent.get(u) === v) {
        events.push({ k: 'edge', u, v, kind: 'parent' });
      } else {
        events.push({ k: 'edge', u, v, kind: onStack.has(v) ? 'ancestor' : 'descendant' });
      }
    }
    onStack.delete(u);
    events.push({ k: 'exit', u });
  };

  // Every start named first, then anything they did not reach, in node order.
  for (const s of [...starts, ...g.nodes]) {
    if (explored.has(s)) continue;
    const c = components.length;
    components.push([]);
    events.push({ k: 'root', s, component: c });
    visit(s, null, c);
  }
  events.push({ k: 'done', components: components.length });

  const treeKeys = new Set(tree.map(([u, v]) => edgeKey(u, v, g.directed)));
  const nonTree = g.edges.filter(([u, v]) => !treeKeys.has(edgeKey(u, v, g.directed)));
  return { events, order: order_, parent, tree, nonTree, component, components };
}

export interface DfsState {
  readonly explored: ReadonlySet<NodeId>;
  /** Finished: every edge looked at and the call returned. */
  readonly finished: ReadonlySet<NodeId>;
  /** The recursion, outermost call first. */
  readonly stack: readonly NodeId[];
  readonly parent: ReadonlyMap<NodeId, NodeId>;
  readonly component: ReadonlyMap<NodeId, number>;
  readonly edge: Extract<DfsEvent, { k: 'edge' }> | null;
  /** Non-tree edges met so far, by edge key, with the ancestor end first. */
  readonly back: ReadonlyMap<string, Edge>;
  readonly done: boolean;
}

export function dfsStateAt(g: Graph, events: readonly DfsEvent[], step: number): DfsState {
  const explored = new Set<NodeId>();
  const finished = new Set<NodeId>();
  const stack: NodeId[] = [];
  const parent = new Map<NodeId, NodeId>();
  const component = new Map<NodeId, number>();
  const back = new Map<string, Edge>();
  let edge: DfsState['edge'] = null;
  let current = 0;
  let done = false;

  for (const e of events.slice(0, step + 1)) {
    edge = null;
    if (e.k === 'root') current = e.component;
    else if (e.k === 'enter') {
      explored.add(e.u);
      component.set(e.u, current);
      if (e.from !== null) parent.set(e.u, e.from);
      stack.push(e.u);
    } else if (e.k === 'edge') {
      edge = e;
      if (e.kind === 'ancestor') back.set(edgeKey(e.u, e.v, g.directed), [e.v, e.u]);
    } else if (e.k === 'exit') {
      stack.pop();
      finished.add(e.u);
    } else done = true;
  }
  return { explored, finished, stack, parent, component, edge, back, done };
}

/** True if a is b or an ancestor of b in the tree given by `parent`. */
export function isAncestor(parent: ReadonlyMap<NodeId, NodeId>, a: NodeId, b: NodeId): boolean {
  for (let x: NodeId | undefined = b; x !== undefined; x = parent.get(x)) if (x === a) return true;
  return false;
}

/** The connected components, each in the order DFS reached it. */
export function components(g: Graph): readonly (readonly NodeId[])[] {
  return dfs(g).components;
}

export function isConnected(g: Graph): boolean {
  return g.nodes.length === 0 || components(g).length === 1;
}
