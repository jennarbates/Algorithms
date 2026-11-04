import { describe, expect, it } from 'vitest';
import { bfs } from '../src/core/bfs.ts';
import { colour } from '../src/core/bipartite.ts';
import { dfs, isAncestor, isConnected, timestamps } from '../src/core/dfs.ts';
import {
  byFinishing,
  checkOrder,
  countOrders,
  inDegrees,
  sources,
  topoSort,
} from '../src/core/directed.ts';
import { adjacency, hasEdge, without } from '../src/core/graph.ts';
import type { Graph, NodeId } from '../src/core/graph.ts';
import { classifyWalk } from '../src/core/paths.ts';
import { traverse } from '../src/core/traverse.ts';
import type { Discipline } from '../src/core/traverse.ts';
import {
  drawnById,
  APPLICATIONS,
  ARPANET,
  BOWTIE,
  COURSES,
  CUBE,
  EIGHT,
  PASTA,
  SCATTER,
  TOWN,
} from '../src/content/graphs.ts';
import { QUESTIONS, TIERS, questionsIn } from '../src/content/questions.ts';
import type { Question } from '../src/content/questions.ts';

/**
 * The bank, checked rather than trusted.
 *
 * Computed questions can only go wrong by asking something the engine cannot
 * answer, so those are checked for being well formed and for not being
 * trivial. Written options can go wrong by saying something false about a
 * graph, so every such claim is recomputed here.
 */

const byId = (id: string): Question => {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`no question ${id}`);
  return q;
};

describe('shape', () => {
  it('the right option moves around, so it cannot be found by position', () => {
    for (const t of TIERS) {
      const places = questionsIn(t)
        .filter((q) => q.kind === 'choice')
        .map((q) => (q.kind === 'choice' ? q.options.findIndex((o) => o.ok) : -1));
      if (places.length > 1) expect(new Set(places).size, `tier ${t}`).toBeGreaterThan(1);
    }
  });

  it('ids are unique and every tier has questions', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const t of TIERS) expect(questionsIn(t).length).toBeGreaterThanOrEqual(5);
  });

  it('every graph a question names exists', () => {
    for (const q of QUESTIONS) {
      if (q.graphId) expect(() => drawnById(q.graphId as string)).not.toThrow();
      if (q.kind === 'colour')
        for (const id of q.graphIds) expect(() => drawnById(id)).not.toThrow();
    }
  });

  it('choice questions have exactly one right option, multi at least one', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'choice') expect(q.options.filter((o) => o.ok)).toHaveLength(1);
      if (q.kind === 'multi') expect(q.options.some((o) => o.ok)).toBe(true);
    }
  });

  it('number questions: the near misses are all wrong and all different', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'number') continue;
      expect(Number.isInteger(q.answer)).toBe(true);
      const vs = q.near.map((n) => n.v);
      expect(vs).not.toContain(q.answer);
      expect(new Set(vs).size).toBe(vs.length);
    }
  });

  it('no computed question is practised on a graph its chapter animates', () => {
    // Chapter 1 animates the 1970 Internet from MIT only; the others animate their own.
    for (const q of QUESTIONS) {
      if (q.kind === 'layers' || q.kind === 'edges') {
        expect(`${q.graphId}:${q.start}`).not.toBe('arpanet:MIT');
        expect(q.graphId).not.toBe('eight');
      }
    }
  });
});

describe('computed questions are not trivial', () => {
  it('walks: every label is used at least once', () => {
    const q = byId('bowtie-walks');
    if (q.kind !== 'walks') throw new Error();
    const g = drawnById(q.graphId).graph;
    const labels = new Set(q.walks.map((w) => classifyWalk(g, w)));
    expect(labels).toEqual(new Set(['not-a-path', 'path', 'simple-path', 'cycle']));
  });

  it('colour: some ticked and some not', () => {
    const q = byId('which-bipartite');
    if (q.kind !== 'colour') throw new Error();
    const verdicts = q.graphIds.map((id) => colour(drawnById(id).graph).ok);
    expect(verdicts).toContain(true);
    expect(verdicts).toContain(false);
  });

  it('orders: some valid and some not', () => {
    const q = byId('courses-orders');
    if (q.kind !== 'orders') throw new Error();
    const g = drawnById(q.graphId).graph;
    const oks = q.candidates.map((c) => checkOrder(g, c).ok);
    expect(oks).toEqual([true, true, false, true]);
  });

  it('town BFS has at least four layers, so it is more than one step', () => {
    expect(bfs(TOWN.graph, 'A').layers.length).toBeGreaterThanOrEqual(4);
  });

  it('town DFS tree differs from its BFS tree', () => {
    const a = dfs(TOWN.graph, ['A']).tree.map((e) => [...e].sort().join());
    const b = bfs(TOWN.graph, 'A').tree.map((e) => [...e].sort().join());
    expect(a.sort()).not.toEqual(b.sort());
  });
});

describe('written claims about particular graphs', () => {
  const g = ARPANET.graph;

  it('arpanet-false: the examples the options give', () => {
    expect(
      isConnected(
        without(g, {
          edges: [
            ['SRI', 'UCSB'],
            ['SRI', 'STAN'],
          ],
        }),
      ),
    ).toBe(true);
    expect(isConnected(without(g, { edges: [['UTAH', 'MIT']] }))).toBe(true);
    expect(isConnected(without(g, { nodes: ['MIT', 'BBN'] }))).toBe(false);
    expect(isConnected(without(g, { nodes: ['UCSB', 'STAN'] }))).toBe(true);
  });

  it('arpanet-layer-2 and its near misses', () => {
    const run = bfs(g, 'MIT');
    expect(run.layers[1]).toHaveLength(3);
    expect(run.layerOf.get('UCLA')).toBe(3);
    expect(run.layerOf.get('SDC')).toBe(run.layerOf.get('RAND'));
  });

  it('arpanet-non-tree: 12 tree edges and 5 others from SRI too', () => {
    const run = bfs(g, 'SRI');
    expect(run.tree).toHaveLength(12);
    expect(run.nonTree).toHaveLength(5);
  });

  it('scatter-pieces: the four components the explanation lists', () => {
    expect(dfs(SCATTER.graph).components.map((c) => [...c].sort().join(''))).toEqual([
      '159',
      '236',
      '48',
      '7',
    ]);
  });

  it('pasta-count: five orders, as the explanation counts them', () => {
    expect(countOrders(PASTA.graph)).toBe(5);
  });

  it('why-colouring-works: the cube has cycles and is still bipartite', () => {
    expect(colour(CUBE.graph).ok).toBe(true);
    expect(CUBE.graph.edges.length).toBeGreaterThan(CUBE.graph.nodes.length - 1);
  });

  it('matching-bipartite: the applications graph splits students from colleges', () => {
    expect(colour(APPLICATIONS.graph).ok).toBe(true);
  });

  it('matrix-bfs: 13 x 13 matrix entries against 2m list entries', () => {
    const lists = [...adjacency(g).values()].reduce((t, l) => t + l.length, 0);
    expect(lists).toBe(2 * g.edges.length);
    expect(g.nodes.length ** 2).toBeGreaterThan(lists);
  });
});

/**
 * The traversal from `eager-stack`, written out separately so it cannot share
 * code with the page's: mark w when it goes in, and only put in unmarked nodes.
 */
function eagerTraverse(g: Graph, s: NodeId, d: Discipline) {
  const adj = adjacency(g);
  const marked = new Set([s]);
  const A = [s];
  const order: NodeId[] = [];
  const parent = new Map<NodeId, NodeId>();
  while (A.length > 0) {
    const v = (d === 'queue' ? A.shift() : A.pop()) as NodeId;
    order.push(v);
    for (const w of adj.get(v) ?? []) {
      if (marked.has(w)) continue;
      marked.add(w);
      parent.set(w, v);
      A.push(w);
    }
  }
  return { order, parent };
}

describe('the CLRS questions', () => {
  it('bowtie-stamps: the walk the explanation and near misses describe', () => {
    const run = dfs(BOWTIE.graph, ['R']);
    const { d, f } = timestamps(run);
    expect(run.order.slice(0, 4)).toEqual(['R', 'P', 'Q', 'S']);
    expect([...run.parent.values()]).not.toContain('Q');
    expect(run.parent.get('S')).toBe('R');
    expect(d.get('S')).toBe((f.get('P') ?? 0) + 1);
    const stamps = [...d.values(), ...f.values()].sort((a, b) => a - b);
    expect(stamps).toEqual([...Array(2 * BOWTIE.graph.nodes.length).keys()].map((i) => i + 1));
    const inside = (a: NodeId, b: NodeId) =>
      (d.get(b) ?? 0) < (d.get(a) ?? 0) && (f.get(a) ?? 0) < (f.get(b) ?? 0);
    for (const n of ['T', 'U', 'V']) expect(inside(n, 'S')).toBe(true);
    expect((f.get('P') ?? 0) < (d.get('S') ?? 0)).toBe(true);
  });

  it('eager-stack: marking on the way in breaks the depth-first tree', () => {
    const g = EIGHT.graph;
    const eager = eagerTraverse(g, '1', 'stack');
    expect(eager.parent.get('2')).toBe('1');
    expect(eager.parent.get('3')).toBe('1');
    expect(hasEdge(g, '2', '3')).toBe(true);
    expect(isAncestor(eager.parent, '2', '3') || isAncestor(eager.parent, '3', '2')).toBe(false);
    // It explores exactly what the page's version does...
    expect([...eager.order].sort()).toEqual([...traverse(g, '1', 'stack').order].sort());
    // ...and with a queue it is BFS, tree and all.
    expect(eagerTraverse(g, '1', 'queue').parent).toEqual(bfs(g, '1').parent);
    // The page's stack version has no such edge: every edge is tree or ancestor-descendant.
    const page = traverse(g, '1', 'stack');
    for (const [u, v] of g.edges) {
      expect(isAncestor(page.parent, u, v) || isAncestor(page.parent, v, u)).toBe(true);
    }
  });

  it('dfs-topo: CLRS order is valid, differs from the page, and its options say true things', () => {
    const g = COURSES.graph;
    const clrs = byFinishing(g);
    // The README quotes this order.
    expect(clrs).toEqual(['C187', 'C220', 'M132', 'C250', 'C311', 'C240', 'C383']);
    expect(checkOrder(g, clrs)).toEqual({ ok: true });
    expect(clrs).not.toEqual(topoSort(g).order);
    expect(checkOrder(g, [...clrs].reverse()).ok).toBe(false);
    const { d, f } = timestamps(dfs(g));
    expect((f.get('M132') ?? 0) < (d.get('C187') ?? 0)).toBe(true);
    const firstDone = clrs[clrs.length - 1] as NodeId;
    expect(g.edges.some(([u]) => u === firstDone)).toBe(false);
    expect(sources(g)).toHaveLength(2);
    expect(countOrders(g)).toBeGreaterThan(1);
  });

  it('linear-sort: sorting by starting in-degree puts CS 311 before CS 250', () => {
    const g = COURSES.graph;
    const deg = inDegrees(g);
    expect(deg.get('C311')).toBe(1);
    expect(deg.get('C250')).toBe(2);
    expect(g.edges.some(([u, v]) => u === 'C250' && v === 'C311')).toBe(true);
    const bySortedDegree = [...g.nodes].sort((a, b) => (deg.get(a) ?? 0) - (deg.get(b) ?? 0));
    expect(checkOrder(g, bySortedDegree).ok).toBe(false);
  });
});
