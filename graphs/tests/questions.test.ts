import { describe, expect, it } from 'vitest';
import { bfs } from '../src/core/bfs.ts';
import { colour } from '../src/core/bipartite.ts';
import { dfs, isConnected } from '../src/core/dfs.ts';
import { checkOrder, countOrders } from '../src/core/directed.ts';
import { without } from '../src/core/graph.ts';
import { classifyWalk } from '../src/core/paths.ts';
import {
  drawnById,
  APPLICATIONS,
  ARPANET,
  CUBE,
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
});
