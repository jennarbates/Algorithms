import type { NodeId } from '../core/graph';
import type { Drawn } from '../content/graphs';

/**
 * Alternative places to put a graph's nodes.
 *
 * The map positions show the graph as the slides draw it. These show it the way
 * an algorithm sees it: in rows, one per BFS layer or DFS depth, or in one line,
 * in topological order. They use the same box as the map, so switching between
 * the two moves nodes without rescaling anything.
 */

type Pos = Record<NodeId, readonly [number, number]>;

/**
 * One row per group, top to bottom, each row spread across the width. Nodes in
 * none of the rows go in a last row of their own, the ones not reached yet.
 */
export function rows(d: Drawn, groups: readonly (readonly NodeId[])[]): Pos {
  const placed = new Set(groups.flat());
  const rest = d.graph.nodes.filter((n) => !placed.has(n));
  const all = rest.length > 0 ? [...groups, rest] : groups;
  const top = 40;
  const bottom = d.height - 40;
  const gap = all.length > 1 ? (bottom - top) / (all.length - 1) : 0;
  const pos: Pos = {};
  all.forEach((row, r) => {
    const y = all.length > 1 ? top + r * gap : d.height / 2;
    const slot = (d.width - 80) / row.length;
    row.forEach((n, i) => {
      pos[n] = [40 + slot * (i + 0.5), y];
    });
  });
  return pos;
}

/** Every node on one line, low in the box so the arcs have room above. */
export function line(d: Drawn, order: readonly NodeId[]): Pos {
  const placed = new Set(order);
  const all = [...order, ...d.graph.nodes.filter((n) => !placed.has(n))];
  const slot = (d.width - 60) / all.length;
  const pos: Pos = {};
  all.forEach((n, i) => {
    pos[n] = [30 + slot * (i + 0.5), d.height - 50];
  });
  return pos;
}

/**
 * Tree rows for a parent map: each node's depth, children in the order they
 * were reached. Nodes with no parent start a row-0 root of their own.
 */
export function treeRows(
  order: readonly NodeId[],
  parent: ReadonlyMap<NodeId, NodeId>,
): NodeId[][] {
  const depth = new Map<NodeId, number>();
  const out: NodeId[][] = [];
  for (const n of order) {
    const p = parent.get(n);
    const dpt = p === undefined ? 0 : (depth.get(p) ?? 0) + 1;
    depth.set(n, dpt);
    (out[dpt] ??= []).push(n);
  }
  return out;
}
