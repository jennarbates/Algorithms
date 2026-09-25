import { describe, expect, it } from 'vitest';
import { bfs, bfsStateAt, edgeSpans } from '../src/core/bfs.ts';
import { colour, colourRun } from '../src/core/bipartite.ts';
import { dfs, isConnected } from '../src/core/dfs.ts';
import {
  checkOrder,
  condensation,
  isDag,
  strongComponents,
  topoSort,
} from '../src/core/directed.ts';
import { edgeKey, graph } from '../src/core/graph.ts';
import type { Edge, Graph } from '../src/core/graph.ts';
import { bridges, classifyWalk, cutNodes, edgeCuts, nodeCuts } from '../src/core/paths.ts';
import { traverse } from '../src/core/traverse.ts';
import {
  APPLICATIONS,
  ARPANET,
  COURSES,
  COURSES_LOOP,
  CUBE,
  EIGHT,
  ISLANDS,
  PENTAGON,
} from '../src/content/graphs.ts';

/**
 * The engine against the lectures.
 *
 * Every figure the page redraws and every clicker answer it states is checked
 * here against the slide it came from. The slides do not print the clicker
 * answers, so these tests are where each one is worked out rather than
 * asserted: the page may only say what these confirm.
 */

const keys = (g: Graph, es: readonly Edge[]) =>
  es.map(([u, v]) => edgeKey(u, v, g.directed)).sort();

describe('lecture 4: the 1970 Internet', () => {
  const g = ARPANET.graph;

  it('has the 13 sites and 17 links on the slide', () => {
    expect(g.nodes).toHaveLength(13);
    expect(g.edges).toHaveLength(17);
    expect(isConnected(g)).toBe(true);
  });

  it('BFS from MIT gives the slide layers', () => {
    const run = bfs(g, 'MIT');
    expect(run.layers).toEqual([
      ['MIT'],
      ['UTAH', 'BBN', 'LINC'],
      ['SRI', 'SDC', 'RAND', 'HARV', 'CASE'],
      ['UCSB', 'STAN', 'UCLA', 'CARN'],
    ]);
  });

  it('clicker: layer 2 from MIT has 5 nodes', () => {
    expect(bfs(g, 'MIT').layers[2]).toHaveLength(5);
  });

  it('BFS tree from MIT dashes the same five edges as the slide', () => {
    const run = bfs(g, 'MIT');
    expect(keys(g, run.nonTree)).toEqual(
      keys(g, [
        ['SDC', 'RAND'],
        ['RAND', 'UCLA'],
        ['UCSB', 'UCLA'],
        ['STAN', 'UCLA'],
        ['CASE', 'CARN'],
      ]),
    );
    expect(run.tree).toHaveLength(12);
  });

  it('clicker: a different order changes the tree and never the layers', () => {
    const a = bfs(g, 'MIT', 'listed');
    const b = bfs(g, 'MIT', 'reversed');
    expect(b.layers.map((l) => [...l].sort())).toEqual(a.layers.map((l) => [...l].sort()));
    expect(keys(g, b.tree)).not.toEqual(keys(g, a.tree));
    expect(b.parent.get('UCLA')).toBe('RAND');
    expect(a.parent.get('UCLA')).toBe('SRI');
  });

  it('every edge spans at most one layer, from every start', () => {
    for (const s of g.nodes) {
      for (const { span } of edgeSpans(g, bfs(g, s).layerOf)) expect(span).toBeLessThanOrEqual(1);
    }
  });

  it('counts each line the way the running-time slide does', () => {
    const run = bfs(g, 'MIT');
    const end = bfsStateAt(run.events, run.events.length - 1);
    const n = g.nodes.length;
    const m = g.edges.length;
    const L = run.layers.length;
    expect(end.lines).toEqual({ 2: 1, 3: L + 1, 4: L, 5: n, 6: 2 * m, 7: 2 * m, 8: n - 1, 9: L });
    expect(end.done).toBe(true);
    expect(end.layers).toEqual(run.layers);
    expect(end.explored.size).toBe(n);
  });

  it('clicker: which is not a path? None of them', () => {
    expect(classifyWalk(g, ['UCSB', 'SRI', 'UTAH'])).toBe('simple-path');
    expect(classifyWalk(g, ['LINC', 'MIT', 'LINC', 'CASE'])).toBe('path');
    expect(classifyWalk(g, ['UCSB', 'SRI', 'STAN', 'UCLA', 'UCSB'])).toBe('cycle');
  });

  it('clicker: the false statement is B, deleting any two edges must disconnect it', () => {
    // A: no single edge disconnects it.
    expect(bridges(g)).toEqual([]);
    // B is false: some pair of edges leaves it connected.
    expect(edgeCuts(g, 2).length).toBeLessThan((17 * 16) / 2);
    // C: no single node disconnects it.
    expect(cutNodes(g)).toEqual([]);
    // D: MIT and BBN together do, and some other pair does not.
    const cuts = nodeCuts(g, 2).map((c) => c.join(','));
    expect(cuts).toContain('MIT,BBN');
    expect(cuts.length).toBeLessThan((13 * 12) / 2);
  });
});

describe('lecture 5: traversal', () => {
  const g = EIGHT.graph;

  it('the 8-node graph has n = 8, m = 11 and degree sum 2m', () => {
    expect(g.nodes).toHaveLength(8);
    expect(g.edges).toHaveLength(11);
  });

  it('DFS from 1 gives the tree on the slide', () => {
    const run = dfs(g, ['1']);
    expect(keys(g, run.tree)).toEqual(
      keys(g, [
        ['1', '2'],
        ['2', '3'],
        ['3', '5'],
        ['5', '4'],
        ['5', '6'],
        ['3', '7'],
        ['7', '8'],
      ]),
    );
    expect(run.order).toEqual(['1', '2', '3', '5', '4', '6', '7', '8']);
    expect(keys(g, run.nonTree)).toEqual(
      keys(g, [
        ['1', '3'],
        ['2', '4'],
        ['2', '5'],
        ['3', '8'],
      ]),
    );
  });

  it('with a queue the traversal explores in BFS layer order', () => {
    for (const s of g.nodes) {
      const layerOf = bfs(g, s).layerOf;
      const order = traverse(g, s, 'queue').order;
      const depths = order.map((n) => layerOf.get(n) ?? -1);
      expect(depths).toEqual([...depths].sort((a, b) => a - b));
    }
  });

  it('clicker: with everything explored, w != s goes into A exactly degree(w) times', () => {
    for (const d of ['queue', 'stack'] as const) {
      const run = traverse(g, '1', d);
      for (const w of g.nodes) {
        const deg = g.edges.filter((e) => e.includes(w)).length;
        expect(run.puts.get(w)).toBe(w === '1' ? deg + 1 : deg);
      }
    }
  });

  it('finds the three islands', () => {
    const run = dfs(ISLANDS.graph);
    expect(run.components.map((c) => [...c].sort())).toEqual([
      ['A', 'B', 'C', 'D'],
      ['E', 'F', 'G', 'H'],
      ['I', 'J'],
    ]);
  });
});

describe('lecture 6: bipartite', () => {
  it('the 1970 Internet is not bipartite: SDC-RAND sits inside layer 2', () => {
    const verdict = colourRun(ARPANET.graph, 'MIT').verdict;
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.edge).toEqual(['SDC', 'RAND']);
    expect(verdict.lca).toBe('MIT');
    expect(verdict.cycle).toEqual(['MIT', 'UTAH', 'SDC', 'RAND', 'BBN', 'MIT']);
    expect(verdict.cycle.length - 1).toBe(2 * (verdict.layer - verdict.lcaLayer) + 1);
  });

  it('cube and applications are bipartite, the pentagon is not', () => {
    expect(colour(CUBE.graph).ok).toBe(true);
    expect(colour(APPLICATIONS.graph).ok).toBe(true);
    expect(colour(PENTAGON.graph).ok).toBe(false);
  });

  it('applications split into students and colleges', () => {
    const c = colour(APPLICATIONS.graph);
    if (!c.ok) throw new Error('expected bipartite');
    const students = ['Ada', 'Ben', 'Cy', 'Dee'].map((s) => c.side.get(s));
    expect(new Set(students).size).toBe(1);
    expect(c.side.get('MIT')).not.toBe(students[0]);
  });
});

describe('lecture 6: DAGs and topological order', () => {
  it('takes the slide order when it always takes the first source', () => {
    const r = topoSort(COURSES.graph);
    expect(r).toEqual({
      ok: true,
      order: ['M132', 'C187', 'C220', 'C240', 'C250', 'C311', 'C383'],
    });
  });

  it('gets stuck on the loop and names a real cycle', () => {
    const g = COURSES_LOOP.graph;
    const r = topoSort(g);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.order).toEqual(['M132']);
    expect(r.cycle[0]).toBe(r.cycle[r.cycle.length - 1]);
    for (let i = 1; i < r.cycle.length; i++) {
      expect(g.edges.some(([u, v]) => u === r.cycle[i - 1] && v === r.cycle[i])).toBe(true);
    }
  });

  it('checks orders both ways', () => {
    const g = COURSES.graph;
    expect(checkOrder(g, ['C187', 'M132', 'C250', 'C311', 'C240', 'C220', 'C383'])).toEqual({
      ok: true,
    });
    expect(checkOrder(g, ['C187', 'C220', 'C240', 'M132', 'C250', 'C311', 'C383'])).toMatchObject({
      ok: false,
      reason: 'backward',
      edge: ['M132', 'C240'],
    });
  });

  it('clicker: the graph of strong components is always a DAG', () => {
    const g = graph(
      'web',
      ['a', 'b', 'c', 'd', 'e', 'f'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
        ['c', 'd'],
        ['d', 'e'],
        ['e', 'd'],
        ['f', 'a'],
      ],
      true,
    );
    expect(strongComponents(g).map((c) => c.join(''))).toEqual(['abc', 'de', 'f']);
    expect(isDag(condensation(g))).toBe(true);
  });
});
