import { adjacency } from './graph.ts';
import type { Edge, Graph, NodeId } from './graph.ts';

/**
 * The lecture's generic traversal, with A the collection of discovered nodes:
 *
 *   Traverse(s)
 *     put s in A
 *     while A is not empty
 *       take a node v from A
 *       if v is not marked explored
 *         mark v explored
 *         for each edge (v, w)
 *           put w in A
 *
 * Nothing in it says which node "take" takes. Make A a queue and this is BFS;
 * make it a stack and it is DFS. That one word is the whole difference, and the
 * page lets the reader flip it and watch.
 *
 * Every neighbour goes into A, explored or not, exactly as written. That is why
 * a node can sit in A more than once, and why a node other than s goes in
 * exactly degree(w) times when the run explores everything: once for each
 * neighbour that gets explored. Both are questions on the lecture's clicker.
 *
 * Each entry remembers who put it there, and the tree edge for a node is the
 * one from whoever put in the copy that was taken first. With a stack that
 * reproduces a depth-first tree, though not always the one the recursive
 * version builds, since the stack takes neighbours back in reverse.
 */

export type Discipline = 'queue' | 'stack';

export interface Entry {
  readonly node: NodeId;
  readonly by: NodeId | null;
}

export type TraverseEvent =
  | { readonly k: 'put'; readonly entry: Entry }
  | { readonly k: 'take'; readonly entry: Entry; readonly fresh: boolean }
  | { readonly k: 'done' };

export interface TraverseResult {
  readonly events: readonly TraverseEvent[];
  readonly order: readonly NodeId[];
  readonly parent: ReadonlyMap<NodeId, NodeId>;
  readonly tree: readonly Edge[];
  /** How many times each node went into A. */
  readonly puts: ReadonlyMap<NodeId, number>;
}

export function traverse(g: Graph, s: NodeId, discipline: Discipline): TraverseResult {
  const adj = adjacency(g);
  const events: TraverseEvent[] = [];
  const A: Entry[] = [];
  const explored = new Set<NodeId>();
  const order: NodeId[] = [];
  const parent = new Map<NodeId, NodeId>();
  const tree: Edge[] = [];
  const puts = new Map<NodeId, number>();

  const put = (entry: Entry) => {
    A.push(entry);
    puts.set(entry.node, (puts.get(entry.node) ?? 0) + 1);
    events.push({ k: 'put', entry });
  };

  put({ node: s, by: null });
  while (A.length > 0) {
    const entry = (discipline === 'queue' ? A.shift() : A.pop()) as Entry;
    const fresh = !explored.has(entry.node);
    events.push({ k: 'take', entry, fresh });
    if (!fresh) continue;
    explored.add(entry.node);
    order.push(entry.node);
    if (entry.by !== null) {
      parent.set(entry.node, entry.by);
      tree.push([entry.by, entry.node]);
    }
    for (const w of adj.get(entry.node) ?? []) put({ node: w, by: entry.node });
  }
  events.push({ k: 'done' });
  return { events, order, parent, tree, puts };
}

export interface TraverseState {
  /** A as it stands, in the order things went in. The queue takes from the front, the stack from the back. */
  readonly A: readonly Entry[];
  readonly explored: ReadonlySet<NodeId>;
  readonly order: readonly NodeId[];
  readonly parent: ReadonlyMap<NodeId, NodeId>;
  readonly last: TraverseEvent | null;
  readonly done: boolean;
  /** How many times each node has gone into A so far. */
  readonly puts: ReadonlyMap<NodeId, number>;
}

export function traverseStateAt(
  events: readonly TraverseEvent[],
  discipline: Discipline,
  step: number,
): TraverseState {
  const A: Entry[] = [];
  const explored = new Set<NodeId>();
  const order: NodeId[] = [];
  const parent = new Map<NodeId, NodeId>();
  const puts = new Map<NodeId, number>();
  let last: TraverseEvent | null = null;
  let done = false;

  for (const e of events.slice(0, step + 1)) {
    last = e;
    if (e.k === 'put') {
      A.push(e.entry);
      puts.set(e.entry.node, (puts.get(e.entry.node) ?? 0) + 1);
    } else if (e.k === 'take') {
      if (discipline === 'queue') A.shift();
      else A.pop();
      if (e.fresh) {
        explored.add(e.entry.node);
        order.push(e.entry.node);
        if (e.entry.by !== null) parent.set(e.entry.node, e.entry.by);
      }
    } else done = true;
  }
  return { A, explored, order, parent, last, done, puts };
}
