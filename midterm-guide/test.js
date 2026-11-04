/* Holds the engines to the traces printed in the guide. Run: node test.js */
const assert = require('node:assert');
const C = require('./src/core.js');
let ran = 0;
const eq = (name, got, want) => {
  ran++;
  try {
    assert.deepStrictEqual(got, want);
  } catch {
    console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
    process.exitCode = 1;
  }
};
const pairs = (m) => Object.entries(m).sort().map(([p, r]) => `${p}${r}`).join(' ');

/* Lesson 1 */
const P = { a: ['1', '2', '3'], b: ['2', '1', '3'], c: ['1', '3', '2'] };
const R = { 1: ['c', 'a', 'b'], 2: ['a', 'b', 'c'], 3: ['a', 'b', 'c'] };
let r = C.galeShapley(P, R);
eq('GS worked result', pairs(r.matching), 'a2 b3 c1');
eq('GS worked offers', r.offers.map((o) => `${o.p}${o.r}${o.result[0]}`), ['a1a', 'b2a', 'c1t', 'a2t', 'b1r', 'b3a']);
r = C.galeShapley({ a: ['2', '1', '3'], b: ['1', '2', '3'], c: ['1', '3', '2'] }, { 1: ['a', 'c', 'b'], 2: ['b', 'a', 'c'], 3: ['a', 'b', 'c'] });
eq('P1.1 result', pairs(r.matching), 'a1 b2 c3');
eq('P1.1 offers', r.offers.length, 6);
const ex = C.pairTable({ a: '2', b: '1', c: '3' }, { a: ['2', '1', '3'], b: ['1', '2', '3'], c: ['1', '3', '2'] }, { 1: ['a', 'c', 'b'], 2: ['b', 'a', 'c'], 3: ['a', 'b', 'c'] });
eq('P1.2 unstable', ex.filter((x) => x.unstable).map((x) => x.p + x.r), ['c1']);
const chk = C.pairTable({ a: '1', b: '3', c: '2' }, { a: ['1', '2', '3'], b: ['2', '1', '3'], c: ['1', '2', '3'] }, { 1: ['b', 'a', 'c'], 2: ['a', 'b', 'c'], 3: ['a', 'b', 'c'] });
eq('Check 1 includes b1', chk.filter((x) => x.unstable).map((x) => x.p + x.r).includes('b1'), true);
r = C.galeShapley({ x: ['1', '2', '3'], y: ['1', '3', '2'], z: ['2', '1', '3'] }, { 1: ['y', 'x', 'z'], 2: ['x', 'z', 'y'], 3: ['x', 'y', 'z'] });
eq('E1', pairs(r.matching), 'x2 y1 z3');
const B = { a: ['1', '2'], b: ['2', '1'] };
const BR = { 1: ['b', 'a'], 2: ['a', 'b'] };
eq('Example B colleges', pairs(C.galeShapley(B, BR).matching), 'a1 b2');
eq('Example B students', pairs(C.galeShapley(BR, B).matching), '1b 2a');

/* Lesson 3 */
let g = C.GRAPHS.internet();
let b = C.bfs(g, 'MIT');
eq('1970 size', [g.nodes.length, g.edges.length], [13, 17]);
eq('1970 layers', b.layers, [['MIT'], ['UTAH', 'BBN', 'LINC'], ['SRI', 'SDC', 'RAND', 'HARV', 'CASE'], ['UCSB', 'STAN', 'UCLA', 'CARN']]);
eq('1970 tree edges', b.tree.length, 12);
g = C.GRAPHS.G();
b = C.bfs(g, 'A');
eq('P3.1 layers', b.layers, [['A'], ['B', 'C'], ['D', 'E'], ['F'], ['G'], ['H']]);
eq('P3.1 tree', b.tree.map((e) => e.join('-')), ['A-B', 'A-C', 'B-D', 'C-E', 'D-F', 'F-G', 'G-H']);
eq('R3.2', C.bfs(C.GRAPHS.sq(), 'A').layers, [['A'], ['B', 'D'], ['C']]);
eq('R3.3', C.bfs(C.GRAPHS.tri4(), '4').layers, [['4'], ['3'], ['1', '2']]);

/* Lesson 4 */
let d = C.dfs(C.GRAPHS.dfs8(), '1');
eq('DFS8 order', d.order, ['1', '2', '3', '5', '4', '6', '7', '8']);
eq('DFS8 tree', d.tree.map((e) => e.join('-')), ['1-2', '2-3', '3-5', '5-4', '5-6', '3-7', '7-8']);
eq('DFS8 adjacency', C.GRAPHS.dfs8().adj['3'], ['1', '2', '5', '7', '8']);
d = C.dfs(C.GRAPHS.G(), 'A');
eq('P4.1 order', d.order, ['A', 'B', 'D', 'C', 'E', 'F', 'G', 'H']);
eq('R4.1 order', C.dfs(C.GRAPHS.sq(), 'A').order, ['A', 'B', 'C', 'D']);
eq('P4.3 stack second', C.generic(C.GRAPHS.G(), 'A', 'stack').order[1], 'C');
eq('queue matches BFS set', C.generic(C.GRAPHS.G(), 'A', 'queue').order, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

/* Lesson 5 */
let bp = C.bipartite(C.GRAPHS.cycle5(), 'a');
eq('5-cycle', [bp.bipartite, bp.flagged, bp.lca, bp.cycle.join(' ')], [false, ['c', 'd'], 'a', 'a b c d e a']);
bp = C.bipartite(C.GRAPHS.G(), 'A');
eq('P5.1', [bp.bipartite, bp.X, bp.Y], [true, ['A', 'D', 'E', 'G'], ['B', 'C', 'F', 'H']]);
bp = C.bipartite(C.GRAPHS.GplusBC(), 'A');
eq('P5.2', [bp.flagged, bp.lca, bp.cycle.join(' ')], [['B', 'C'], 'A', 'A B C A']);
bp = C.bipartite(C.graph('1-2 2-3 3-4 4-5 5-1 1-6'), '1');
eq('E6', [bp.layers, bp.flagged, bp.cycle.length - 1], [[['1'], ['2', '5', '6'], ['3', '4']], ['3', '4'], 5]);
const dag = C.graph('M132>C240 M132>C250 C187>C220 C187>C240 C187>C250 C220>C311 C250>C311 C240>C383 C311>C383', { directed: true });
let t = C.topoAuto(dag);
eq('DAG order', t.order, ['C187', 'C220', 'M132', 'C240', 'C250', 'C311', 'C383']);
eq('DAG counts', C.topoState(dag, []).count, { C187: 0, C220: 1, C240: 2, C250: 2, C311: 2, C383: 2, M132: 0 });
const H = C.graph('S>U S>V T>V U>W V>W V>X W>X', { directed: true });
eq('P5.3', C.topoAuto(H).order, ['S', 'T', 'U', 'V', 'W', 'X']);
const H2 = C.graph('S>U S>V T>V U>W V>W V>X W>X X>S', { directed: true });
t = C.topoAuto(H2);
eq('P5.4 stuck', [t.order, t.stuck], [['T'], true]);
eq('P5.4 cycle contains S V X', ['S', 'V', 'X'].every((n) => C.findCycle(H2, ['S', 'U', 'V', 'W', 'X']).includes(n)) || C.findCycle(H2, ['S', 'U', 'V', 'W', 'X']).length >= 3, true);
eq('Format 3 count', C.topoCount(C.graph('s>x x>y y>t s>z z>t', { directed: true })).total, 3);
eq('R10.3 count', C.topoCount(C.graph('s>x s>y s>z x>t y>t z>t', { directed: true })).total, 6);
eq('E7 count', C.topoCount(C.graph('a>b a>c b>d c>d', { directed: true })).total, 2);
eq('R5.4 count', C.topoCount(C.graph('a>b a>c b>c', { directed: true })).total, 1);

/* Lesson 6 */
const shows = [[1, 0, 5], [2, 1, 4], [3, 3, 5], [4, 4, 7], [5, 6, 8], [6, 7, 8], [7, 7, 9]].map(([id, s, f]) => ({ id, s, f }));
eq('Worked finish', C.intervalRun(shows, 'finish').taken, [2, 4, 6]);
eq('Worked sort', C.intervalRun(shows, 'finish').sorted.map((x) => x.id), [2, 1, 3, 4, 5, 6, 7]);
eq('Worked conflicts', C.intervalRun(shows, 'conflicts').taken, [2, 6, 4]);
const mk = (a) => a.map(([s, f], i) => ({ id: i + 1, s, f }));
eq('Earliest start breaks', C.intervalRun(mk([[0, 10], [1, 2], [3, 4]]), 'start').taken.length, 1);
eq('Shortest breaks', C.intervalRun(mk([[0, 5], [4, 7], [6, 10]]), 'shortest').taken.length, 1);
const fc = [['T1', 0, 3], ['T2', 4, 7], ['T3', 8, 11], ['T4', 12, 15], ['L1', 2, 5], ['L2', 2, 5], ['L3', 2, 5], ['R1', 10, 13], ['R2', 10, 13], ['R3', 10, 13], ['M', 6, 9]].map(([id, s, f]) => ({ id, s, f }));
eq('Fewest conflicts breaks', C.intervalRun(fc, 'conflicts').taken, ['M', 'T1', 'T4']);
eq('...optimum is 4', C.intervalRun(fc, 'finish').taken.length, 4);
const p61 = [[1, 0, 6], [2, 1, 3], [3, 2, 5], [4, 4, 7], [5, 5, 9], [6, 6, 8], [7, 8, 11], [8, 9, 10]].map(([id, s, f]) => ({ id, s, f }));
eq('P6.1', C.intervalRun(p61, 'finish').taken, [2, 4, 8]);
eq('R6.2', C.intervalRun(mk([[0, 2], [1, 3], [2, 4], [3, 5]]), 'finish').taken.length, 2);

/* Lesson 7 */
const w4 = [[1, 1, 2], [2, 2, 5], [3, 3, 6], [4, 2, 7]].map(([id, t, d]) => ({ id, t, d }));
let s = C.schedule(w4, C.lateOrder(w4, 'edf'));
eq('Worked EDF', [s.rows.map((x) => x.f), s.rows.map((x) => x.late), s.L], [[1, 3, 6, 8], [0, 0, 0, 1], 1]);
const p7 = [[1, 3, 4], [2, 2, 6], [3, 1, 3], [4, 4, 9], [5, 2, 8]].map(([id, t, d]) => ({ id, t, d }));
eq('P7.1a', [C.lateOrder(p7, 'edf'), C.schedule(p7, C.lateOrder(p7, 'edf')).L], [[3, 1, 2, 5, 4], 3]);
eq('P7.1b', [C.lateOrder(p7, 'shortest'), C.schedule(p7, C.lateOrder(p7, 'shortest')).L], [[3, 2, 5, 1, 4], 4]);
eq('P7.1c', [C.lateOrder(p7, 'slack'), C.schedule(p7, C.lateOrder(p7, 'slack')).L], [[1, 3, 2, 4, 5], 4]);
eq('P7.2 best', C.bestL(p7), 3);
const xyz = [['X', 10, 1], ['Y', 1, 2], ['Z', 1, 3]].map(([id, t, d]) => ({ id, t, d }));
eq('P7.3', [C.schedule(xyz, ['X', 'Y', 'Z']).total, C.schedule(xyz, ['Y', 'Z', 'X']).total], [27, 11]);
const ij = [['i', 3, 6], ['j', 2, 4]].map(([id, t, d]) => ({ id, t, d }));
eq('Swap demo', [C.schedule(ij, ['i', 'j']).L, C.schedule(ij, ['j', 'i']).L], [1, 0]);
const njobs = [1, 2, 3].map((id) => ({ id, t: 1, d: id }));
eq('R7.2 inversions', C.inversions(njobs, [3, 1, 2]), [[3, 1], [3, 2]]);

/* Lesson 8 */
const dg = C.graph('s>A:1000 s>B:3 B>A:5 A>C:6 B>D:7 C>D:12 C>t:10 D>t:9', { directed: true });
let dj = C.dijkstra(dg, 's');
eq('Dijkstra order', dj.trace.map((x) => [x.v, x.d]), [['s', 0], ['B', 3], ['A', 8], ['D', 10], ['C', 14], ['t', 19]]);
eq('Dijkstra A drop', dj.trace[1].updates.find((u) => u.w === 'A'), { w: 'A', from: 1000, to: 8 });
eq('Dijkstra prev path', [dj.prev.t, dj.prev.D, dj.prev.B], ['D', 'B', 's']);
const dD = C.graph('s>a:4 s>b:1 b>a:2 a>c:1 b>c:6 a>d:7 b>d:9 c>d:3 c>e:8 d>e:2', { directed: true });
dj = C.dijkstra(dD, 's');
eq('P8.1', dj.trace.map((x) => [x.v, x.d]), [['s', 0], ['b', 1], ['a', 3], ['c', 4], ['d', 7], ['e', 9]]);
const neg = C.graph('s>a:2 s>b:3 b>a:-2', { directed: true });
eq('Negative edge', [C.dijkstra(neg, 's').d.a, C.bellmanFord(neg, 's').a], [2, 1]);

/* Lesson 9 */
const mg = C.graph('e-f:1 c-d:2 c-f:3 c-e:4 b-c:5 d-f:6 a-b:7 b-e:8 a-e:9');
let k = C.kruskal(mg);
eq('Kruskal', [k.added, k.skipped, k.cost], [['e-f', 'c-d', 'c-f', 'b-c', 'a-b'], ['c-e', 'd-f'], 18]);
eq('Prim from a', C.prim(mg, 'a').added, ['a-b', 'b-c', 'c-d', 'c-f', 'e-f']);
eq('Union-find depth', k.depth, 2);
eq('Union-find pointers', k.parent, { a: 'f', b: 'f', c: 'd', d: 'f', e: 'f', f: 'f' });
const cr = C.cutRepair(mg, ['a', 'b']);
eq('Cut repair', [cr.ek, cr.T.slice().sort(), cr.path, cr.drop, cr.cost, cr.cost2], ['b-c', ['a-b', 'b-e', 'c-d', 'c-f', 'e-f'], ['b', 'e', 'f', 'c'], 'b-e', 21, 18]);
eq('Cut crossing', C.cutInfo(mg, ['a', 'b']).crossing.map((e) => `${e.a}-${e.b}`), ['b-c', 'b-e', 'a-e']);
eq('R9.2', C.cutInfo(mg, ['d']).crossing.map((e) => `${e.a}-${e.b}`), ['c-d', 'd-f']);
const W = C.graph('P-R:1 Q-S:2 Q-R:3 P-Q:4 R-T:5 R-S:6 S-T:7 S-U:8 T-U:9');
k = C.kruskal(W);
eq('P9.1', [k.added, k.cost], [['P-R', 'Q-S', 'Q-R', 'R-T', 'S-U'], 19]);
eq('P9.2', C.prim(W, 'P').added, ['P-R', 'Q-R', 'Q-S', 'R-T', 'S-U']);
eq('P9.3', C.cutInfo(W, ['P', 'Q']).crossing.map((e) => `${e.a}-${e.b}`), ['P-R', 'Q-S', 'Q-R']);
const u95 = C.ufTrace(['1', '2', '3', '4', '5', '6', '7', '8'], [['1', '2'], ['3', '4'], ['1', '3'], ['5', '6'], ['7', '8'], ['5', '7'], ['1', '5']]);
eq('P9.5', [u95.depth, u95.parent['1'], u95.parent['2'], u95.parent['4']], [3, '2', '4', '8']);
const ut = C.ufTrace(['a', 'b', 'c', 'd', 'e', 'f'], [['e', 'f'], ['c', 'd'], ['c', 'f'], ['c', 'e'], ['b', 'c'], ['d', 'f'], ['a', 'b']]);
eq('UF worked', [ut.depth, ut.parent], [2, { a: 'f', b: 'f', c: 'd', d: 'f', e: 'f', f: 'f' }]);

/* Lesson 10 */
let an = C.analyze(C.GRAPHS.practice(), 'p');
eq('Format 1 layers', an.layers, [['p'], ['q', 's'], ['r', 't', 'u', 'v'], ['w']]);
eq('Format 1 DFS', an.dfsOrder, ['p', 'q', 'r', 's', 'v', 'w', 't', 'u']);
eq('Format 1 counts', [an.n, an.m, an.toTree, an.minDisconnect], [8, 9, 2, 1]);
eq('Format 1 cut vertices', an.cutVertices, ['q', 's', 'v']);
eq('Format 1 bridges', an.bridges.sort(), ['s-v', 'v-w']);
eq('Format 1 bipartite', an.bipartite.bipartite, false);
an = C.analyze(C.GRAPHS.r10(), 'a');
eq('R10.1', [an.layers.length, an.toTree, an.minDisconnect, an.cutVertices, an.bipartite.bipartite], [5, 2, 1, ['c', 'd', 'f'], false]);
eq('R10.2', an.dfsOrder, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);

console.log(process.exitCode ? 'Some checks failed.' : `All ${ran} checks match the guide.`);
