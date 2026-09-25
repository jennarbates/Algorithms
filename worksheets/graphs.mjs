// The graphs workbook: lectures 4 to 6 on paper.
//
// Unlike the other two workbooks, nothing here is lifted out of the site by
// slicing source text. graphs/src/core and graphs/src/content import with .ts
// extensions and use only erasable TypeScript, so Node loads them as they are,
// and this file asks the site's own questions and marks them with the site's
// own engine. Every answer in the key is computed, not written down.

import { renderQ, renderKey, doc, esc, writeLines, L } from './lib.mjs';
import { bfs, bfsStateAt, BFS_LINES } from '../graphs/src/core/bfs.ts';
import { colour, colourRun } from '../graphs/src/core/bipartite.ts';
import { dfs } from '../graphs/src/core/dfs.ts';
import { checkOrder, countOrders, topoSort } from '../graphs/src/core/directed.ts';
import { edgeKey, hasEdge } from '../graphs/src/core/graph.ts';
import { WALK_LABELS, classifyWalk } from '../graphs/src/core/paths.ts';
import { traverse } from '../graphs/src/core/traverse.ts';
import {
  ARPANET, COURSES, COURSES_LOOP, CUBE, EIGHT, drawnById, nameOf,
} from '../graphs/src/content/graphs.ts';
import { QUESTIONS, TIER_LABELS } from '../graphs/src/content/questions.ts';

const TIER_NAMES = TIER_LABELS;
const ordinal = (k) => `${k}${['th', 'st', 'nd', 'rd'][k] ?? 'th'}`;

// ---------------------------------------------------------------------------
// Drawing a graph for print
// ---------------------------------------------------------------------------

const courseLabel = (d) => (d.graph.id.startsWith('courses') ? (n) => nameOf(d, n) : (n) => n);

/**
 * A graph as print SVG. `fill`, `badge` and `stroke` let a worked example mark
 * layers, colours and tree edges; left alone it is a blank graph to work on.
 */
function svgGraph(d, { w = 440, fill, badge, stroke, label } = {}) {
  const g = d.graph;
  const s = w / d.width;
  const h = Math.round(d.height * s);
  const say = label ?? courseLabel(d);
  const P = (n) => [d.pos[n][0] * s, d.pos[n][1] * s];
  const pill = (n) => Math.max(20, 9 + say(n).length * 6.3);
  const id = `a${Math.random().toString(36).slice(2, 8)}`;
  const edges = g.edges.map((e) => {
    const [x1, y1] = P(e[0]);
    let [x2, y2] = P(e[1]);
    const bend = d.bends?.[edgeKey(e[0], e[1], g.directed)];
    const c = bend ? [bend[0] * s, bend[1] * s] : null;
    if (g.directed) {
      const [fx, fy] = c ?? [x1, y1];
      const dx = x2 - fx;
      const dy = y2 - fy;
      const t = Math.min(Math.abs(dx) > 0.01 ? (pill(e[1]) / 2 + 2) / Math.abs(dx) : Infinity, Math.abs(dy) > 0.01 ? 11 / Math.abs(dy) : Infinity, 0.95);
      x2 -= dx * t;
      y2 -= dy * t;
    }
    const st = stroke?.(e) ?? { c: '#666', w: 1.5, dash: '' };
    const dpath = c ? `M${x1} ${y1} Q${c[0]} ${c[1]} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
    return `<path d="${dpath}" fill="none" stroke="${st.c}" stroke-width="${st.w}" ${st.dash ? `stroke-dasharray="${st.dash}"` : ''} ${g.directed ? `marker-end="url(#${id})"` : ''}/>`;
  }).join('');
  const nodes = g.nodes.map((n) => {
    const [x, y] = P(n);
    const wd = pill(n);
    const f = fill?.(n) ?? '#fff';
    const b = badge?.(n);
    const dark = f === '#1b1b1b' || f === '#3567ad';
    return `<g transform="translate(${x} ${y})"><rect x="${-wd / 2}" y="-9" width="${wd}" height="18" rx="9" fill="${f}" stroke="#1b1b1b" stroke-width="1.2"/>`
      + `<text text-anchor="middle" dy="3.5" font-size="10" font-weight="700" fill="${dark ? '#fff' : '#1b1b1b'}">${esc(say(n))}</text>`
      + (b !== undefined && b !== null ? `<g transform="translate(${wd / 2} -9)"><circle r="6.5" fill="#1b1b1b"/><text text-anchor="middle" dy="3" font-size="8" font-weight="700" fill="#fff">${esc(b)}</text></g>` : '')
      + '</g>';
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="-8 -12 ${w + 16} ${h + 22}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="${id}" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#444"/></marker></defs>${edges}${nodes}</svg>`;
}

const figure = (svg, caption) => `<div class="fig">${svg}${caption ? `<div class="small muted">${caption}</div>` : ''}</div>`;

const TREE = { c: '#1b1b1b', w: 3, dash: '' };
const NON = { c: '#888', w: 1.3, dash: '4 3' };
const treeStroke = (parent) => ([u, v]) => (parent.get(v) === u || parent.get(u) === v ? TREE : NON);

function layersTable(run) {
  return `<table><tr>${run.layers.map((_, i) => `<th>L<sub>${i}</sub></th>`).join('')}</tr><tr>${run.layers.map((l) => `<td class="mono">${l.join(' ')}</td>`).join('')}</tr></table>`;
}

/** A node row and an empty layer row to fill in; more than nine nodes wrap onto a second table. */
function blankLayers(g, start) {
  const rows = [];
  for (let i = 0; i < g.nodes.length; i += 9) rows.push(g.nodes.slice(i, i + 9));
  return rows.map((ns) => `<table class="blank wide"><tr><th style="width:44pt">node</th>${ns.map((n) => `<th>${esc(n)}</th>`).join('')}</tr><tr><th>layer</th>${ns.map((n) => `<td>${n === start ? '0' : ''}</td>`).join('')}</tr></table>`).join('');
}

// ---------------------------------------------------------------------------
// The new question kinds: worksheet side and key side
// ---------------------------------------------------------------------------

function walkReason(g, w, kind) {
  if (kind === 'not-a-path') {
    const i = w.findIndex((_, j) => j > 0 && !hasEdge(g, w[j - 1], w[j]));
    return `${w[i - 1]}–${w[i]} is not an edge.`;
  }
  if (kind === 'simple-path') return 'Every step is an edge and no node repeats.';
  if (kind === 'cycle') return `Back to ${w[0]}, and nothing else repeats.`;
  const seen = new Set();
  const again = w.find((n) => (seen.has(n) ? true : (seen.add(n), false)));
  return `${again} comes up twice${w[0] === w[w.length - 1] ? ', and not just as the start and end' : ''}.`;
}

function questionBody(q) {
  const d = q.graphId ? drawnById(q.graphId) : null;
  switch (q.kind) {
    case 'layers':
      return figure(svgGraph(d, { w: 300 })) + blankLayers(d.graph, q.start);
    case 'edges':
      return figure(svgGraph(d, { w: q.graphId === 'arpanet' ? 560 : 300 }))
        + `<div class="hint">Tick each edge that belongs.</div><div class="edgeboxes">${d.graph.edges.map((e) => `<span><span class="box sq"></span>${esc(e[0])}–${esc(e[1])}</span>`).join('')}</div>`;
    case 'walks':
      return figure(svgGraph(d, { w: 380 }))
        + `<table class="wide"><tr><th class="l">sequence</th>${Object.values(WALK_LABELS).map((t) => `<th>${esc(t)}</th>`).join('')}</tr>${q.walks.map((w) => `<tr><td class="l mono">${esc(w.join(' – '))}</td>${Object.keys(WALK_LABELS).map(() => '<td><span class="box" style="display:inline-block"></span></td>').join('')}</tr>`).join('')}</table>`;
    case 'colour':
      return `<div class="minis">${q.graphIds.map((id, i) => {
        const m = drawnById(id);
        return `<div class="mini"><b>${L(i)}. ${esc(m.title)}</b>${svgGraph(m, { w: 190 })}<div class="small"><span class="box sq" style="display:inline-block"></span> bipartite &nbsp; <span class="box sq" style="display:inline-block"></span> not</div><div class="small muted">Evidence (a colouring, or an odd cycle):</div>${writeLines(1)}</div>`;
      }).join('')}</div>`;
    case 'order':
      return figure(svgGraph(d, { w: 440 }))
        + `<div class="slots">${d.graph.nodes.map((_, i) => `<span class="slot wide"><i>${i + 1}</i></span>`).join('')}</div>`;
    case 'orders':
      return figure(svgGraph(d, { w: 380 }))
        + q.candidates.map((c, i) => `<div class="cand"><b>${L(i)}</b><div><span class="box sq" style="display:inline-block;vertical-align:middle"></span> valid &nbsp; <span class="seats">${esc(c.map((n) => nameOf(d, n)).join(', '))}</span></div><div class="blk">If not, which arrow points backward? <span></span></div></div>`).join('');
    default:
      return '';
  }
}

function keyBody(q) {
  const d = q.graphId ? drawnById(q.graphId) : null;
  switch (q.kind) {
    case 'layers': {
      const run = bfs(d.graph, q.start);
      return `<p class="ans">Layers from ${esc(q.start)}:</p>${layersTable(run)}${figure(svgGraph(d, { w: 240, badge: (n) => run.layerOf.get(n), stroke: treeStroke(run.parent) }), 'Solid: one BFS tree. Any node’s layer is its distance, so check each by finding a shortest path.')}`;
    }
    case 'edges': {
      const es = q.pick === 'bfs-non-tree' ? bfs(d.graph, q.start).nonTree : dfs(d.graph, [q.start]).tree;
      const parent = q.pick === 'bfs-non-tree' ? bfs(d.graph, q.start).parent : dfs(d.graph, [q.start]).parent;
      return `<p class="ans">${q.pick === 'bfs-non-tree' ? 'Not in the tree' : 'Tree edges'}: <b>${es.map((e) => `${e[0]}–${e[1]}`).join(', ')}</b></p>${figure(svgGraph(d, { w: q.graphId === 'arpanet' ? 420 : 220, stroke: treeStroke(parent) }), 'Solid: tree edges. Dashed: the rest.')}`;
    }
    case 'walks':
      return `<ul class="whys">${q.walks.map((w) => {
        const k = classifyWalk(d.graph, w);
        return `<li><b>${esc(w.join(' – '))}</b>: ${esc(WALK_LABELS[k])}. ${esc(walkReason(d.graph, w, k))}</li>`;
      }).join('')}</ul>`;
    case 'colour':
      return `<ul class="whys">${q.graphIds.map((id, i) => {
        const m = drawnById(id);
        const c = colour(m.graph);
        return `<li class="${c.ok ? 'ok' : 'no'}"><b>${L(i)}. ${esc(m.title)}</b>: ${c.ok
          ? `bipartite. One side: ${m.graph.nodes.filter((n) => c.side.get(n) === 0).join(', ')}; the other: ${m.graph.nodes.filter((n) => c.side.get(n) === 1).join(', ')}.`
          : `not bipartite. Odd cycle of length ${c.cycle.length - 1}: ${c.cycle.join(' – ')}.`}</li>`;
      }).join('')}</ul>`;
    case 'order': {
      const r = topoSort(d.graph);
      return `<p class="ans">Any valid order is right: there are <b>${countOrders(d.graph)}</b>. One of them: ${esc(r.order.map((n) => nameOf(d, n)).join(', '))}.</p><p>To mark yours, check every arrow: ${d.graph.edges.map(([u, v]) => `${nameOf(d, u)} before ${nameOf(d, v)}`).join('; ')}.</p>`;
    }
    case 'orders': {
      const rs = q.candidates.map((c) => checkOrder(d.graph, c));
      return `<p class="ans">Valid: <b>${rs.map((r, i) => (r.ok ? L(i) : null)).filter(Boolean).join(', ')}</b></p><ul class="whys">${rs.map((r, i) => `<li class="${r.ok ? 'ok' : 'no'}"><b>${L(i)}</b> ${r.ok ? '✓ every arrow points forward.' : `✗ ${nameOf(d, r.edge[0])} → ${nameOf(d, r.edge[1])} points backward.`}</li>`).join('')}</ul>`;
    }
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Learn pages and activities
// ---------------------------------------------------------------------------

function part1(keys) {
  const g = ARPANET.graph;
  const run = bfs(g, 'MIT');
  const end = bfsStateAt(run.events, run.events.length - 1);
  const w1 = bfs(g, 'SRI');
  keys.push(`<section class="k"><div class="khead">W1 · BFS from SRI</div>${layersTable(w1)}<p>Tree edges: ${w1.tree.map((e) => `${e[0]}–${e[1]}`).join(', ')}. Not in the tree: ${w1.nonTree.map((e) => `${e[0]}–${e[1]}`).join(', ')}.</p><p>Same graph as the worked example, different start, so different layers: every layer is a distance <i>from the start</i>. Still 12 tree edges and 5 others.</p></section>`);
  const lines = end.lines;
  keys.push(`<section class="k"><div class="khead">W1b · counting lines</div><table><tr><th class="l">line</th><th>runs</th></tr>${BFS_LINES.slice(1).map((l) => `<tr><td class="l mono">${esc(l.text.trim())}</td><td>${lines[l.n]}</td></tr>`).join('')}</table><p>n = ${g.nodes.length}, m = ${g.edges.length}. The two inner lines run 2m = ${2 * g.edges.length} times; every other line at most n times. Total O(m + n).</p></section>`);

  return `<div class="page"><span class="tag">Part 1 · Learn</span><h2>The expanding wave</h2>
<p>A <b>graph</b> G = (V, E) is a set of nodes and a set of edges, each edge a pair of nodes. We write n = |V| and m = |E|. Unless it says otherwise, edges have no direction.</p>
<div class="defn"><b>Words for moving around a graph</b><ul style="margin:4pt 0 0">
<li>A <b>path</b> is a sequence of nodes where each one after the first is joined by an edge to the one before. Nodes may repeat.</li>
<li>A <b>simple path</b> repeats no node. A <b>cycle</b> ends where it starts, repeats no other node and no edge, and goes round at least three nodes.</li>
<li>The <b>distance</b> from u to v is the fewest edges on any path from u to v.</li>
<li>A graph is <b>connected</b> if there is a path between every pair of nodes. A <b>connected component</b> is a largest set of nodes with a path between every pair.</li></ul></div>
<h3>Breadth-first search, layer by layer</h3>
<pre>${BFS_LINES.map((l) => esc(l.text)).join('\n')}</pre>
<p><b>Layer i is exactly the nodes at distance i from s.</b> So there is a path from s to t exactly when t is in some layer. The order you look at neighbours in can change which edges end up in the tree, but never the layers.</p>
<h3>Worked example: the Internet in 1970, from MIT</h3>
<p class="small muted">Neighbours are looked at in this order throughout: ${g.nodes.join(', ')}.</p>
${figure(svgGraph(ARPANET, { w: 600, badge: (n) => run.layerOf.get(n), stroke: treeStroke(run.parent) }), 'Badges: layer. Solid: BFS tree edges. Dashed: edges BFS looked at and did not need.')}
${layersTable(run)}
<p>Five edges are dashed: SDC–RAND, UCSB–UCLA and STAN–UCLA join two nodes in the <i>same</i> layer, and RAND–UCLA and CASE–CARN join neighbouring layers. None skips a layer, and none ever can: when x is explored, every undiscovered neighbour of x goes into the next layer.</p>
</div>
<div class="flow"><span class="tag">Part 1 · Try it</span><h2>Run it yourself</h2>
<div class="try"><span class="tag">Warm-up W1 · the same graph, from SRI</span>
${figure(svgGraph(ARPANET, { w: 560 }))}
${blankLayers(g, 'SRI')}
<p class="small">Now draw the BFS tree on the picture: for each node, the edge it was first found along. Which edges are left over? ${writeLines(1)}</p></div>
<div class="try"><span class="tag">Warm-up W1b · what it costs</span>
<p>For the worked example (BFS from MIT), how many times does each line run? Use n = ${g.nodes.length} and m = ${g.edges.length}.</p>
<table class="blank wide"><tr><th class="l">line</th><th style="width:70pt">runs</th></tr>${BFS_LINES.slice(1).map((l) => `<tr><td class="l mono">${esc(l.text.trim())}</td><td></td></tr>`).join('')}</table>
<p class="small">Which lines run 2m times, and why twice? ${writeLines(1)}</p></div></div>`;
}

function part2(keys) {
  const g = EIGHT.graph;
  const run = dfs(g, ['1']);
  const q = traverse(g, '1', 'queue');
  const s = traverse(g, '1', 'stack');
  keys.push(`<section class="k"><div class="khead">W2 · the generic traversal from 1</div><p><b>A = queue:</b> explored in the order ${q.order.join(', ')}. Tree: ${q.tree.map((e) => `${e[0]}–${e[1]}`).join(', ')}. That is BFS order: 1, then its neighbours, then theirs.</p><p><b>A = stack:</b> explored in the order ${s.order.join(', ')}. Tree: ${s.tree.map((e) => `${e[0]}–${e[1]}`).join(', ')}. Depth first, though not the same tree as recursive DFS: the stack hands neighbours back newest first.</p><p><b>Times each node went into A</b> (same either way): ${g.nodes.map((n) => `${n}: ${q.puts.get(n)}`).join(', ')}. Every node except 1 goes in exactly degree-many times; 1 once more, at the start.</p></section>`);

  return `<div class="page"><span class="tag">Part 2 · Learn</span><h2>Queue or stack</h2>
<h3>Depth-first search</h3>
<pre>DFS(u)
  mark u explored
  for each edge (u, v)
    if v is not explored
      add (u, v) to T
      DFS(v)</pre>
<p>DFS goes as deep as it can before backing up: a call only returns when every edge out of its node has been looked at. It is O(m + n) over all the calls together.</p>
<h3>Worked example: the 8-node graph, from 1</h3>
${figure(svgGraph(EIGHT, { w: 260, badge: (n) => run.order.indexOf(n) + 1, stroke: treeStroke(run.parent) }), 'Badges: the order DFS explores nodes in (neighbours in increasing order). Solid: DFS tree. Dashed: non-tree edges.')}
<p>Order: ${run.order.join(', ')}. The non-tree edges are ${run.nonTree.map((e) => `${e[0]}–${e[1]}`).join(', ')}, and every one joins a node to one of its <b>ancestors</b>. That always happens: if x is explored first, DFS(x) looks along the edge (x, y) before it returns, so y is found inside DFS(x) and ends up below x.</p>
<h3>One algorithm, one word apart</h3>
<pre>put s in A
while A is not empty
  take a node v from A
  if v is not marked explored
    mark v explored
    for each edge (v, w)
      put w in A</pre>
<p>If A is a <b>queue</b> (first in, first out) this is BFS. If A is a <b>stack</b> (last in, first out) it is DFS. Either way it explores exactly what s can reach.</p>
<h3>Every component</h3>
<p>While some node is unexplored, start a search there. Each search finds one connected component, and the total is still O(m + n), because each search only pays for its own piece.</p></div>
<div class="flow"><span class="tag">Part 2 · Try it</span><h2>Run the one-word difference</h2>
<div class="try"><span class="tag">Warm-up W2 · queue, then stack</span>
<p>Run the generic traversal on the 8-node graph from 1, putting neighbours into A in increasing order. Do it once with A a queue and once with A a stack. Write down the order nodes are <b>explored</b> in, skipping any copy of a node that is already explored.</p>
${figure(svgGraph(EIGHT, { w: 220 }))}
<table class="blank wide"><tr><th style="width:60pt">A is a</th>${g.nodes.map((_, i) => `<th>${ordinal(i + 1)}</th>`).join('')}</tr><tr><td>queue</td>${g.nodes.map(() => '<td></td>').join('')}</tr><tr><td>stack</td>${g.nodes.map(() => '<td></td>').join('')}</tr></table>
<p class="small">Count how many times node 5 went into A. Compare with its degree. ${writeLines(1)}</p></div></div>`;
}

function part3(keys) {
  const { verdict } = colourRun(ARPANET.graph, 'MIT');
  const cube = colour(CUBE.graph);
  keys.push(`<section class="k"><div class="khead">W3 · the cube</div><p>Bipartite. One side: ${CUBE.graph.nodes.filter((n) => cube.side.get(n) === 0).join(', ')}. Other side: ${CUBE.graph.nodes.filter((n) => cube.side.get(n) === 1).join(', ')}. BFS from a: layers ${bfs(CUBE.graph, 'a').layers.map((l) => `{${l.join(', ')}}`).join(', ')}, and no edge joins two nodes in one layer. It has plenty of cycles, of length 4, 6 and 8, and every one is even.</p></section>`);
  const cyc = verdict.ok ? [] : verdict.cycle;
  const onCycle = new Set();
  for (let i = 1; i < cyc.length; i++) onCycle.add(edgeKey(cyc[i - 1], cyc[i], false));
  const layerOf = bfs(ARPANET.graph, 'MIT').layerOf;

  return `<div class="page"><span class="tag">Part 3 · Learn</span><h2>Two colours</h2>
<p>A graph is <b>bipartite</b> if its nodes can be split into two sides, X and Y, with every edge joining X to Y. Colour one side blue and the other orange: no edge joins two nodes of the same colour. Students and colleges are the standard example; every application joins one of each.</p>
<div class="defn"><b>The test</b><ol style="margin:4pt 0 0"><li>Run BFS from any node.</li><li>Colour even layers blue and odd layers orange.</li><li>Look at every edge. If one joins two nodes in the same layer, say "not bipartite". Otherwise say "bipartite", with X the even layers and Y the odd ones.</li></ol></div>
<p><b>Why it is right.</b> BFS never lets an edge skip a layer. So an edge joins neighbouring layers (different colours, fine) or one layer. If the answer is "bipartite", every edge is the first kind. If it is "not bipartite", take the edge (x, y) inside layer j and walk x and y up the BFS tree until they meet at z, in layer i. The two tree paths plus the edge are a cycle of length 2(j − i) + 1: odd. And an odd cycle cannot be two-coloured, since colours alternate all the way round.</p>
<p><b>So: a graph is bipartite exactly when it has no odd cycle.</b></p>
<h3>Worked example: the Internet in 1970</h3>
${figure(svgGraph(ARPANET, { w: 560, badge: (n) => layerOf.get(n), fill: (n) => (layerOf.get(n) % 2 === 0 ? '#3567ad' : '#f3c9a8'), stroke: ([u, v]) => (onCycle.has(edgeKey(u, v, false)) ? { c: '#1b1b1b', w: 3.2, dash: '' } : { c: '#999', w: 1.2, dash: '' }) }), 'Dark: even layers. Light: odd layers. Heavy: the odd cycle.')}
${verdict.ok ? '' : `<p>${verdict.edge[0]} and ${verdict.edge[1]} are both in layer ${verdict.layer}. They meet going up at z = ${verdict.lca}, in layer ${verdict.lcaLayer}: the cycle ${verdict.cycle.join(' → ')} has 2(${verdict.layer} − ${verdict.lcaLayer}) + 1 = ${verdict.cycle.length - 1} edges. Not bipartite.</p>`}
<div class="try"><span class="tag">Warm-up W3 · the cube</span>
${figure(svgGraph(CUBE, { w: 220 }))}
<p>Run the test from a. Write each node's layer beside it and colour it. Is the cube bipartite? If yes, list the two sides; if no, give an odd cycle. ${writeLines(2)}</p></div></div>`;
}

function part4(keys) {
  const r = topoSort(COURSES.graph);
  const loop = topoSort(COURSES_LOOP.graph);
  const nm = (n) => nameOf(COURSES, n);
  keys.push(`<section class="k"><div class="khead">W4 · the bad rule</div><p>Only ${loop.order.map(nm).join(', ')} can be placed. After that every course left has an arrow pointing in from another course left, so there is no source and the sort is stuck. The cycle: ${loop.ok ? '' : loop.cycle.map(nm).join(' → ')}. No order can put each of these before the next, since the last has to come before the first.</p></section>`);

  return `<div class="page"><span class="tag">Part 4 · Learn</span><h2>All edges forward</h2>
<p>In a <b>directed</b> graph each edge (u, v) points from u to v. A path has to follow the arrows, so v can be reachable from u without u being reachable from v. BFS works unchanged, following only edges that leave a node. To find everything that can reach t, run BFS on the graph with every edge turned round.</p>
<p>A <b>DAG</b> is a directed graph with no directed cycle. A <b>topological order</b> lists the nodes so that every edge points forward, from earlier to later.</p>
<div class="defn"><b>The sort</b><ol style="margin:4pt 0 0"><li>Find a node with no incoming edges (a source).</li><li>Put it next in the order.</li><li>Delete it and its outgoing edges. Repeat until nothing is left.</li></ol></div>
<p><b>Why it works.</b> Every DAG has a source: walk backwards along incoming edges, and without a source the walk would go on for ever and repeat a node, which is a cycle. Deleting a source leaves a smaller DAG, so by induction the sort never gets stuck on a DAG. And a graph with a cycle has no topological order at all, since a cycle has to come back. <b>So G has a topological order exactly when it is a DAG.</b></p>
<h3>Worked example: course prerequisites</h3>
${figure(svgGraph(COURSES, { w: 380 }))}
<p>Always taking the first source available gives ${r.order.map(nm).join(', ')}. Choosing differently when there is a choice gives other orders, and all ${countOrders(COURSES.graph)} of them are right.</p>
<p class="small"><b>Beyond DAGs.</b> A <b>strongly connected component</b> is a largest set of nodes that can all reach each other. Squash each to one node and what is left is always a DAG. Tarjan (1972) finds them in O(m + n).</p>
<div class="try"><span class="tag">Warm-up W4 · one bad rule</span>
${figure(svgGraph(COURSES_LOOP, { w: 380 }))}
<p>Someone adds the rule "CS 383 before CS 187". Run the sort. Where does it get stuck, and what is the cycle that stops it? ${writeLines(2)}</p></div></div>`;
}

function summary() {
  return `<div class="page summary"><span class="tag">Keep this page</span><h2>One-page summary</h2><div class="two"><div>
<h3>Words</h3><ul><li>Path: every step an edge. Simple: no repeated node. Cycle: back to the start, nothing else repeated, at least 3 nodes.</li><li>Distance: fewest edges on a path. Connected component: largest set with paths between all pairs.</li><li>Tree: connected, no cycles; n − 1 edges.</li></ul>
<h3>BFS</h3><ul><li>Layer i = nodes at distance i. Order changes the tree, never the layers.</li><li>An edge joins the same layer or neighbouring layers, never further.</li><li>O(m + n): inner lines run 2m times, the rest at most n.</li></ul>
<h3>DFS</h3><ul><li>Recursive; returns only when all its node's edges are looked at.</li><li>Non-tree edges join a node to an ancestor.</li><li>O(m + n) over all calls.</li></ul>
<h3>Generic traversal</h3><ul><li>A queue → BFS. A stack → DFS.</li><li>Every neighbour goes into A; w ≠ s goes in deg(w) times when all is explored.</li><li>Loop over unexplored nodes → one search per component, O(m + n) total.</li></ul>
</div><div>
<h3>Bipartite</h3><ul><li>Two sides, every edge across. Bipartite ⇔ no odd cycle.</li><li>Test: BFS, colour by layer parity, look for a same-layer edge.</li><li>Same-layer edge in layer j, lowest common ancestor in layer i → odd cycle of length 2(j − i) + 1.</li></ul>
<h3>Directed graphs</h3><ul><li>Reachability is one-way. Who can reach t: BFS on the reversed graph.</li><li>DAG: no directed cycle. Topological order: every edge forward.</li><li>Has a topological order ⇔ is a DAG.</li><li>Sort: take a source, delete it, repeat. Any source is fine. Stuck ⇔ cycle.</li><li>A DAG on n nodes has at most n(n − 1)/2 edges.</li><li>Strong components squash to a DAG.</li></ul>
<h3>Proof moves</h3><ul><li>Count how often each line runs.</li><li>"Whichever end is discovered first."</li><li>Take the least common ancestor.</li><li>Walk backwards until something repeats.</li></ul>
</div></div></div>`;
}

// ---------------------------------------------------------------------------

export function buildGraphs() {
  const byTier = {};
  for (const q of QUESTIONS) (byTier[q.tier] ??= []).push(q);
  const keys = [];
  const actKeys = [];

  let body = `<div class="cover"><span class="tag">Algorithms · printable workbook</span>
<h1>How to Walk a Graph</h1><div class="sub">Graphs, breadth-first and depth-first search, the two-colour test and topological order (COMPSCI 311, lectures 4 to 6), on paper: worked examples on the lectures' own graphs, warm-ups, and ${QUESTIONS.length} questions in four tiers, with an answer key worked out by the same code the website runs.</div>
<h3>How to use this packet</h3><ol>
<li>Work in order. Each part starts with a <b>Learn</b> page and a worked example, then a warm-up you do yourself, then the questions.</li>
<li>Where a run depends on the order neighbours are looked at, the packet says the order. Otherwise any order gives the same answer.</li>
<li>Questions marked <b>clicker</b> are the lecture's own, with their original wording.</li>
<li>The <b>answer key</b> is at the back. Where more than one answer is right (a topological order, say), the key says how to check yours instead of asking you to match.</li></ol>
<table class="toc" style="margin-top:14pt">${[1, 2, 3, 4].map((t) => `<tr><td><b>Part ${t}</b></td><td>${TIER_NAMES[t]}</td><td>${byTier[t].length} questions</td></tr>`).join('')}
<tr><td><b>Summary</b></td><td>One page to keep</td><td></td></tr><tr><td><b>Key</b></td><td>Warm-ups and every question</td><td></td></tr></table></div>`;

  const questionPages = (t) => {
    let s = `<div class="flow"><span class="tag">Part ${t} · Questions</span><h2>Tier ${t}: ${TIER_NAMES[t]}</h2>`;
    byTier[t].forEach((q, i) => {
      const num = `${t}.${i + 1}`;
      const clicker = q.clicker ? `<div class="small muted">Clicker · ${esc(q.clicker)}</div>` : '';
      const own = questionBody(q);
      const pre = clicker + (!own && q.graphId ? figure(svgGraph(drawnById(q.graphId), { w: q.graphId === 'arpanet' ? 480 : 300 })) : '');
      // lib.mjs has its own 'order' kind (ranking cards), so the graph kinds
      // travel under a prefix and never fall into a branch meant for another bank.
      const shared = ['choice', 'multi', 'number'].includes(q.kind) ? q : { ...q, kind: `graph-${q.kind}` };
      s += renderQ(num, shared, { pre, body: own || undefined });
      keys.push(renderKey(num, shared, { body: keyBody(q) }));
    });
    return s + '</div>';
  };

  body += part1(actKeys);
  body += questionPages(1);
  body += part2(actKeys);
  body += questionPages(2);
  body += part3(actKeys);
  body += questionPages(3);
  body += part4(actKeys);
  body += questionPages(4);
  body += summary();
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: warm-ups</h2><p class="keyintro">Try everything before you look.</p>${actKeys.join('')}</div>`;
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: questions</h2>${keys.join('')}</div>`;

  const extraCss = `<style>
.fig { margin: 6pt 0 8pt; break-inside: avoid; }
.edgeboxes { display: flex; flex-wrap: wrap; gap: 4pt 12pt; font-family: Menlo, monospace; font-size: 9.5pt; margin: 4pt 0 6pt; }
.edgeboxes > span { display: inline-flex; align-items: center; gap: 4pt; }
.minis { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt 14pt; }
.mini { border: 1px solid #bbb; padding: 5pt 7pt; break-inside: avoid; }
.slot.wide { width: 58pt; }
</style>`;
  return doc('How to Walk a Graph: printable workbook', body).replace('</head>', `${extraCss}</head>`);
}
