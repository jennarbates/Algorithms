import { describe, expect, it } from 'vitest';
import { bfs, bfsStateAt, edgeSpans } from '../src/core/bfs.ts';
import { colour } from '../src/core/bipartite.ts';
import { dfs, dfsStateAt, isAncestor } from '../src/core/dfs.ts';
import { checkOrder, countOrders, isDag, topoSort } from '../src/core/directed.ts';
import { graph, hasEdge } from '../src/core/graph.ts';
import type { Edge, Graph } from '../src/core/graph.ts';
import { traverse } from '../src/core/traverse.ts';

/**
 * The lectures' claims, on graphs nobody drew.
 *
 * The lecture tests pin the engine to the slides. These check the theorems the
 * slides prove, on a few hundred random graphs each, against slow definitions
 * that cannot share a bug with the fast code: distance by repeated relaxation,
 * two-colourability by trying every colouring, acyclicity by trying every order.
 */

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function randomGraph(seed: number, directed = false, dagOnly = false): Graph {
  const r = rng(seed);
  const n = 2 + Math.floor(r() * 7);
  const nodes = [...Array(n).keys()].map((i) => `n${i}`);
  const p = 0.15 + r() * 0.5;
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j || (!directed && j < i) || (dagOnly && j < i)) continue;
      if (r() < p) edges.push([nodes[i] as string, nodes[j] as string]);
    }
  }
  return graph(`r${seed}`, nodes, edges, directed);
}

const SEEDS = [...Array(300).keys()].map((i) => i * 7919 + 13);

/** All-pairs distance by relaxing every edge until nothing changes. */
function slowDistances(g: Graph, s: string): Map<string, number> {
  const d = new Map([[s, 0]]);
  for (let changed = true; changed;) {
    changed = false;
    for (const [u, v] of g.edges) {
      for (const [a, b] of g.directed
        ? [[u, v]]
        : [
            [u, v],
            [v, u],
          ]) {
        const da = d.get(a as string);
        if (da !== undefined && (d.get(b as string) ?? Infinity) > da + 1) {
          d.set(b as string, da + 1);
          changed = true;
        }
      }
    }
  }
  return d;
}

describe('BFS', () => {
  it('layer i is exactly the nodes at distance i', () => {
    for (const seed of SEEDS) {
      for (const directed of [false, true]) {
        const g = randomGraph(seed, directed);
        const s = g.nodes[0] as string;
        expect(bfs(g, s).layerOf).toEqual(slowDistances(g, s));
      }
    }
  });

  it('ends of an undirected edge are never more than one layer apart', () => {
    for (const seed of SEEDS) {
      const g = randomGraph(seed);
      for (const { span } of edgeSpans(g, bfs(g, g.nodes[0] as string).layerOf)) {
        expect(span).toBeLessThanOrEqual(1);
      }
    }
  });

  it('replaying every event gives back the result', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const g = randomGraph(seed);
      const run = bfs(g, g.nodes[0] as string);
      const end = bfsStateAt(run.events, run.events.length - 1);
      expect(end.layers).toEqual(run.layers);
      expect(end.parent).toEqual(run.parent);
    }
  });
});

describe('DFS', () => {
  it('every non-tree edge joins a node to one of its ancestors', () => {
    for (const seed of SEEDS) {
      const g = randomGraph(seed);
      const run = dfs(g);
      for (const [x, y] of run.nonTree) {
        expect(isAncestor(run.parent, x, y) || isAncestor(run.parent, y, x)).toBe(true);
      }
    }
  });

  it('the replay marks each non-tree edge once, ancestor first', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const g = randomGraph(seed);
      const run = dfs(g);
      const end = dfsStateAt(g, run.events, run.events.length - 1);
      expect(end.back.size).toBe(run.nonTree.length);
      for (const [a, b] of end.back.values()) expect(isAncestor(run.parent, a, b)).toBe(true);
      expect(end.stack).toEqual([]);
    }
  });

  it('components partition the nodes, and no edge crosses between them', () => {
    for (const seed of SEEDS) {
      const g = randomGraph(seed);
      const run = dfs(g);
      expect(run.components.flat().sort()).toEqual([...g.nodes].sort());
      for (const [u, v] of g.edges) expect(run.component.get(u)).toBe(run.component.get(v));
    }
  });
});

describe('the generic traversal', () => {
  it('queue or stack, it explores exactly what BFS reaches, each node once', () => {
    for (const seed of SEEDS) {
      const g = randomGraph(seed);
      const s = g.nodes[0] as string;
      const reach = [...bfs(g, s).layerOf.keys()].sort();
      for (const d of ['queue', 'stack'] as const) {
        const run = traverse(g, s, d);
        expect([...run.order].sort()).toEqual(reach);
        for (const [u, v] of run.tree) expect(hasEdge(g, u, v)).toBe(true);
      }
    }
  });
});

describe('two colours', () => {
  function slowBipartite(g: Graph): boolean {
    const n = g.nodes.length;
    for (let mask = 0; mask < 1 << n; mask++) {
      const side = (x: string) => (mask >> g.nodes.indexOf(x)) & 1;
      if (g.edges.every(([u, v]) => side(u) !== side(v))) return true;
    }
    return false;
  }

  it('agrees with trying every colouring, and its odd cycles are real', () => {
    for (const seed of SEEDS) {
      const g = randomGraph(seed);
      const c = colour(g);
      expect(c.ok).toBe(slowBipartite(g));
      if (c.ok) {
        for (const [u, v] of g.edges) expect(c.side.get(u)).not.toBe(c.side.get(v));
      } else {
        const len = c.cycle.length - 1;
        expect(len % 2).toBe(1);
        expect(new Set(c.cycle.slice(0, -1)).size).toBe(len);
        for (let i = 1; i < c.cycle.length; i++) {
          expect(hasEdge(g, c.cycle[i - 1] as string, c.cycle[i] as string)).toBe(true);
        }
      }
    }
  });
});

describe('topological order', () => {
  it('orders every DAG, and every order it gives is valid', () => {
    for (const seed of SEEDS) {
      const g = randomGraph(seed, true, true);
      const r = topoSort(g);
      expect(r.ok).toBe(true);
      expect(checkOrder(g, r.order)).toEqual({ ok: true });
      expect(countOrders(g)).toBeGreaterThan(0);
    }
  });

  it('is stuck exactly when there is a directed cycle', () => {
    for (const seed of SEEDS) {
      const g = randomGraph(seed, true);
      const r = topoSort(g);
      expect(r.ok).toBe(countOrders(g) > 0);
      if (!r.ok) {
        for (let i = 1; i < r.cycle.length; i++) {
          const u = r.cycle[i - 1] as string;
          const v = r.cycle[i] as string;
          expect(g.edges.some(([a, b]) => a === u && b === v)).toBe(true);
        }
      }
    }
  });

  it('whichever source it takes, the result is valid', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const g = randomGraph(seed, true, true);
      const r = rng(seed);
      const run = topoSort(g, (a) => a[Math.floor(r() * a.length)] as string);
      expect(isDag(g)).toBe(true);
      expect(checkOrder(g, run.order)).toEqual({ ok: true });
    }
  });
});
