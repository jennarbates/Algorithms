/* Pure algorithm engines. No DOM here, so test.js can run them under Node and
   hold every simulator to the traces printed in the guide. */
(function (root) {
  const cmp = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const list = (a) => a.join(', ');

  /* --- graphs ------------------------------------------------------------- */
  function graph(edgeText, opts = {}) {
    const edges = [];
    const nodes = new Set(opts.nodes || []);
    String(edgeText)
      .split(/[\s,;]+/)
      .filter(Boolean)
      .forEach((tok) => {
        const m = tok.match(/^([^-:>]+)(->|-|>)([^-:>]+?)(?::(-?\d+(?:\.\d+)?))?$/);
        if (!m) throw new Error(`Could not read "${tok}". Write edges like A-B or A-B:4.`);
        const e = { a: m[1], b: m[3] };
        if (m[4] !== undefined) e.w = Number(m[4]);
        edges.push(e);
        nodes.add(e.a);
        nodes.add(e.b);
      });
    const ids = [...nodes].sort(cmp);
    const adj = {};
    ids.forEach((n) => (adj[n] = []));
    edges.forEach((e) => {
      adj[e.a].push(e.b);
      if (!opts.directed) adj[e.b].push(e.a);
    });
    ids.forEach((n) => adj[n].sort(cmp));
    if (opts.adj) Object.assign(adj, opts.adj);
    return { nodes: ids, edges, adj, directed: !!opts.directed };
  }
  const ekey = (a, b) => (cmp(a, b) <= 0 ? `${a}|${b}` : `${b}|${a}`);

  const GRAPHS = {
    G: () => graph('A-B A-C B-D C-D C-E D-F E-F F-G G-H'),
    internet: () =>
      graph(
        'SRI-UTAH SRI-UCSB SRI-STAN SRI-UCLA UCSB-UCLA STAN-UCLA UCLA-RAND UTAH-SDC UTAH-MIT SDC-RAND RAND-BBN MIT-BBN MIT-LINC LINC-CASE CASE-CARN CARN-HARV HARV-BBN',
        {
          /* The order the guide's trace uses, so the simulator reproduces it. */
          adj: {
            MIT: ['UTAH', 'BBN', 'LINC'],
            UTAH: ['SRI', 'SDC', 'MIT'],
            BBN: ['RAND', 'HARV', 'MIT'],
            LINC: ['CASE', 'MIT'],
            SRI: ['UCSB', 'STAN', 'UCLA', 'UTAH'],
            SDC: ['RAND', 'UTAH'],
            RAND: ['UCLA', 'SDC', 'BBN'],
            HARV: ['CARN', 'BBN'],
            CASE: ['CARN', 'LINC'],
            UCSB: ['UCLA', 'SRI'],
            STAN: ['UCLA', 'SRI'],
            UCLA: ['SRI', 'UCSB', 'STAN', 'RAND'],
            CARN: ['CASE', 'HARV'],
          },
        },
      ),
    dfs8: () => graph('1-2 1-3 2-3 2-4 2-5 3-5 3-7 3-8 4-5 5-6 7-8'),
    practice: () => graph('p-q p-s q-r q-t q-u r-s s-v t-u v-w'),
    r10: () => graph('a-b b-c c-a c-d d-e e-f f-d f-g'),
    cycle5: () => graph('a-b b-c c-d d-e e-a', { adj: { a: ['b', 'e'], b: ['a', 'c'], c: ['b', 'd'], d: ['c', 'e'], e: ['a', 'd'] } }),
    GplusBC: () => graph('A-B A-C B-C B-D C-D C-E D-F E-F F-G G-H'),
    triangle: () => graph('1-2 2-3 3-1'),
    square: () => graph('1-2 2-3 3-4 4-1'),
    tri4: () => graph('1-2 2-3 3-1 3-4'),
    sq: () => graph('A-B B-C C-D D-A'),
    diag: () => graph('P-Q Q-R R-S S-P P-R'),
    comps: () => graph('1-2 3-4 4-5', { nodes: ['1', '2', '3', '4', '5', '6'] }),
  };

  /* --- Gale-Shapley ------------------------------------------------------- */
  function galeShapley(P, R) {
    const ps = Object.keys(P).sort(cmp);
    const next = {};
    ps.forEach((p) => (next[p] = 0));
    const holds = {};
    const offers = [];
    const snap = (extra) =>
      clone({
        free: ps.filter((p) => !Object.values(holds).includes(p)),
        next,
        holds,
        offers,
        current: null,
        ...extra,
      });
    const steps = [snap({ text: 'Everyone starts free. Each side keeps its preference list, and each proposer points at its first choice.' })];
    for (;;) {
      const p = ps.find((x) => !Object.values(holds).includes(x) && next[x] < P[x].length);
      if (!p) break;
      const r = P[p][next[p]];
      next[p]++;
      const cur = holds[r];
      let result, text, correct;
      if (cur === undefined) {
        holds[r] = p;
        result = 'accepted';
        text = `${p} offers to ${r}. ${r} is free: match (${p}, ${r}).`;
        correct = 0;
      } else if (R[r].indexOf(p) < R[r].indexOf(cur)) {
        holds[r] = p;
        result = 'traded';
        text = `${p} offers to ${r}. ${r} ranks ${p} above ${cur}, so ${r} trades up: (${p}, ${r}). Now ${cur} is free.`;
        correct = 1;
      } else {
        result = 'rejected';
        text = `${p} offers to ${r}. ${r} holds ${cur} and ranks ${cur} above ${p}: rejected.`;
        correct = 2;
      }
      offers.push({ n: offers.length + 1, p, r, result, dropped: result === 'traded' ? cur : null });
      steps.push(
        snap({
          current: { p, r },
          text,
          ask: {
            prompt: `${p} offers to ${r}${cur === undefined ? `, who holds nobody` : `, who holds ${cur}`}. What does ${r} do?`,
            options: ['Accepts', `Trades up to ${p}`, `Rejects ${p}`],
            correct,
            hint: `Look at ${r}'s list: ${R[r].join(', ')}.`,
          },
        }),
      );
    }
    const matching = {};
    Object.entries(holds).forEach(([r, p]) => (matching[p] = r));
    steps.push(snap({ text: `Done after ${offers.length} offers. Result: {${ps.map((p) => `(${p}, ${matching[p]})`).join(', ')}}.`, done: true }));
    return { steps, matching, offers };
  }

  /* Every (p, r) not matched, with whether each side would prefer the switch. */
  function pairTable(M, P, R) {
    const inv = {};
    Object.entries(M).forEach(([p, r]) => (inv[r] = p));
    const rows = [];
    Object.keys(P).forEach((p) =>
      Object.keys(R).forEach((r) => {
        const matched = M[p] === r;
        const pWants = !matched && P[p].indexOf(r) < P[p].indexOf(M[p]);
        const rWants = !matched && R[r].indexOf(p) < R[r].indexOf(inv[r]);
        rows.push({ p, r, matched, pWants, rWants, unstable: pWants && rWants });
      }),
    );
    return rows;
  }

  /* --- traversal ---------------------------------------------------------- */
  function bfs(g, s) {
    const disc = { [s]: true };
    const layers = [[s]];
    const parent = {};
    const depth = { [s]: 0 };
    const order = [];
    const scanned = new Set();
    const tree = [];
    const snapshot = (extra) => ({
      layers: clone(layers),
      disc: clone(disc),
      explored: [...order],
      tree: clone(tree),
      scanned: [...scanned],
      ...extra,
    });
    const steps = [snapshot({ current: null, text: `L0 = {${s}}. Nothing explored yet.`, queue: [s] })];
    for (let i = 0; layers[i] && layers[i].length; i++) {
      const nextL = [];
      for (let k = 0; k < layers[i].length; k++) {
        const v = layers[i][k];
        const found = [];
        g.adj[v].forEach((w) => {
          scanned.add(ekey(v, w));
          if (!disc[w]) {
            disc[w] = true;
            parent[w] = v;
            depth[w] = i + 1;
            found.push(w);
            nextL.push(w);
            tree.push([v, w]);
          }
        });
        order.push(v);
        if (!layers[i + 1]) layers.push([]);
        layers[i + 1] = [...nextL];
        const count = found.length;
        const rest = layers[i].slice(k + 1).concat(nextL);
        const opts = Array.from({ length: Math.max(3, count) + 1 }, (_, n) => n);
        steps.push(
          snapshot({
            current: v,
            found,
            queue: rest,
            text: found.length
              ? `Explore ${v}: discover ${list(found)}. They join L${i + 1}.`
              : `Explore ${v}: every neighbor is already discovered, so nothing new.`,
            ask: {
              prompt: `BFS explores ${v} next. How many new nodes does it discover?`,
              options: opts.map(String),
              correct: opts.indexOf(count),
              hint: `${v}'s neighbors: ${list(g.adj[v])}. Count the ones not discovered yet.`,
            },
          }),
        );
      }
      if (!nextL.length) {
        layers.pop();
        break;
      }
    }
    steps.push(
      snapshot({
        current: null,
        queue: [],
        done: true,
        text: `L${layers.length} would be empty, so BFS stops. ${layers.length} layers, ${tree.length} tree edges. ${layers.map((l, i) => `L${i} = {${list(l)}}`).join(', ')}.`,
      }),
    );
    return { steps, layers, parent, depth, tree, order };
  }

  function dfs(g, s) {
    const explored = [];
    const seen = {};
    const parent = {};
    const depth = { [s]: 0 };
    const tree = [];
    const scanned = new Set();
    const ptr = {};
    const callStack = [];
    const snapshot = (extra) => ({ explored: [...explored], tree: clone(tree), scanned: [...scanned], stack: [...callStack], ...extra });
    const steps = [snapshot({ current: null, text: `Call DFS(${s}). The call stack is empty so far.` })];
    const enter = (v) => {
      seen[v] = true;
      explored.push(v);
      ptr[v] = 0;
      callStack.push(v);
    };
    enter(s);
    let resumed = false;
    while (callStack.length) {
      const u = callStack[callStack.length - 1];
      const skipped = [];
      let found = null;
      while (ptr[u] < g.adj[u].length) {
        const w = g.adj[u][ptr[u]++];
        scanned.add(ekey(u, w));
        if (!seen[w]) {
          found = w;
          break;
        }
        skipped.push(w);
      }
      const lead = resumed ? `Back in DFS(${u})` : `DFS(${u})`;
      const sk = skipped.length ? `${list(skipped)} ${skipped.length > 1 ? 'are' : 'is'} explored, ` : '';
      const remaining = g.adj[u].filter((w) => !seen[w]);
      const options = [...new Set(g.adj[u].filter((w) => !seen[w]))].slice(0, 3).map((w) => `Call DFS(${w})`);
      if (found) {
        const prompt = `${lead}: where does it go next?`;
        parent[found] = u;
        depth[found] = depth[u] + 1;
        tree.push([u, found]);
        enter(found);
        const ask = { prompt, options: [...options, `Return from DFS(${u})`], correct: options.indexOf(`Call DFS(${found})`), hint: `Take the first unexplored node on ${u}'s list: ${list(g.adj[u])}.` };
        steps.push(snapshot({ current: found, text: `${lead}: ${sk}${found} is new, recurse.`, ask }));
        resumed = false;
      } else {
        callStack.pop();
        const ask = { prompt: `${lead}: where does it go next?`, options: [...g.adj[u].slice(0, 2).map((w) => `Call DFS(${w})`), `Return from DFS(${u})`], correct: Math.min(g.adj[u].length, 2), hint: `Everything on ${u}'s list is explored already.` };
        steps.push(snapshot({ current: callStack[callStack.length - 1] ?? null, returned: u, text: `${lead}: ${sk}nothing new, so it returns.`, ask }));
        resumed = true;
      }
      void remaining;
    }
    steps.push(
      snapshot({ current: null, done: true, text: `Finished. Explored order: ${list(explored)}. ${tree.length} tree edges, ${g.edges.length - tree.length} non-tree edges.` }),
    );
    return { steps, order: explored, parent, depth, tree };
  }

  function generic(g, s, kind) {
    const A = [{ node: s, from: null }];
    const explored = [];
    const seen = {};
    const parent = {};
    const depth = { [s]: 0 };
    const tree = [];
    const scanned = new Set();
    const snapshot = (extra) => ({ A: clone(A), explored: [...explored], tree: clone(tree), scanned: [...scanned], ...extra });
    const steps = [snapshot({ current: null, text: `Put ${s} in A. A is a ${kind}.` })];
    while (A.length) {
      const opts = [...new Set(A.map((x) => x.node))].slice(0, 4);
      const e = kind === 'queue' ? A.shift() : A.pop();
      const ask = opts.length > 1 ? { prompt: `A is a ${kind}. Which node comes out next?`, options: opts, correct: opts.indexOf(e.node), hint: kind === 'queue' ? 'A queue gives back the oldest entry.' : 'A stack gives back the newest entry.' } : null;
      if (seen[e.node]) {
        steps.push(snapshot({ current: null, took: e.node, text: `Take ${e.node} from A. It is already explored, so skip it.`, ask }));
        continue;
      }
      seen[e.node] = true;
      explored.push(e.node);
      if (e.from !== null) {
        parent[e.node] = e.from;
        depth[e.node] = depth[e.from] + 1;
        tree.push([e.from, e.node]);
      }
      g.adj[e.node].forEach((w) => {
        scanned.add(ekey(e.node, w));
        A.push({ node: w, from: e.node });
      });
      steps.push(snapshot({ current: e.node, took: e.node, text: `Take ${e.node} from A and mark it explored. Put its neighbors in A: ${list(g.adj[e.node]) || 'none'}.`, ask }));
    }
    steps.push(snapshot({ current: null, done: true, text: `A is empty. Explored order: ${list(explored)}.` }));
    return { steps, order: explored, parent, depth, tree };
  }

  /* --- bipartite test ----------------------------------------------------- */
  function bipartite(g, s) {
    const b = bfs(g, s);
    const color = {};
    const treeSet = new Set(b.tree.map(([x, y]) => ekey(x, y)));
    const steps = [];
    const known = {};
    b.layers.forEach((L, i) => L.forEach((v) => (color[v] = i % 2)));
    b.steps.forEach((st) => {
      const out = clone(st);
      out.colors = {};
      Object.keys(st.disc).forEach((v) => (out.colors[v] = color[v]));
      steps.push(out);
    });
    void known;
    steps.pop();
    const base = clone(b.steps[b.steps.length - 1]);
    base.colors = clone(color);
    base.ask = undefined;
    const bad = [];
    const seen = new Set();
    g.nodes.forEach((v) =>
      g.adj[v].forEach((w) => {
        const k = ekey(v, w);
        if (seen.has(k)) return;
        seen.add(k);
        if (b.depth[v] === b.depth[w] && b.depth[v] !== undefined) bad.push([v, w]);
      }),
    );
    const nonTree = [...seen].filter((k) => !treeSet.has(k));
    steps.push({
      ...clone(base),
      done: false,
      flag: bad,
      text: `BFS is finished. Check every non-tree edge (${nonTree.length ? nonTree.map((k) => k.replace('|', '-')).join(', ') : 'there are none'}) for one joining two nodes in the same layer.`,
      ask: {
        prompt: 'Does any edge join two nodes in the same layer?',
        options: ['Yes', 'No'],
        correct: bad.length ? 0 : 1,
        hint: 'Compare each dashed edge with the row its two ends sit in.',
      },
    });
    let cycle = null;
    if (!bad.length) {
      const X = b.layers.filter((_, i) => i % 2 === 0).flat();
      const Y = b.layers.filter((_, i) => i % 2 === 1).flat();
      steps.push({ ...clone(base), done: true, verdict: true, text: `No same-layer edge, so every edge joins an even layer to an odd one. Bipartite: X = {${list(X)}}, Y = {${list(Y)}}.` });
      return { steps, bipartite: true, X, Y, layers: b.layers };
    }
    const [x, y] = bad[0];
    const up = (v) => {
      const path = [v];
      while (b.parent[path[path.length - 1]] !== undefined) path.push(b.parent[path[path.length - 1]]);
      return path;
    };
    const px = up(x);
    const py = up(y);
    const z = px.find((v) => py.includes(v));
    const armX = px.slice(0, px.indexOf(z) + 1).reverse();
    const armY = py.slice(0, py.indexOf(z));
    cycle = [...armX, ...armY, z];
    const j = b.depth[x];
    const i = b.depth[z];
    steps.push({ ...clone(base), flag: [[x, y]], lca: z, text: `Edge ${x}-${y} lies inside L${j}, so the answer is "not bipartite". Walk ${x} and ${y} up the tree: they meet first at ${z}, in L${i}. That is the least common ancestor.` });
    steps.push({ ...clone(base), flag: [[x, y]], lca: z, cycle, done: true, verdict: false, text: `The cycle ${list(cycle)} has length 2(j - i) + 1 = 2(${j} - ${i}) + 1 = ${2 * (j - i) + 1}. It is odd, so no 2-coloring exists.` });
    return { steps, bipartite: false, flagged: [x, y], lca: z, cycle, layers: b.layers };
  }

  /* --- topological sort --------------------------------------------------- */
  function topoState(g, order) {
    const placed = new Set(order);
    const count = {};
    g.nodes.forEach((n) => (count[n] = 0));
    g.edges.forEach((e) => {
      if (!placed.has(e.a)) count[e.b]++;
    });
    const sources = g.nodes.filter((n) => !placed.has(n) && count[n] === 0).sort(cmp);
    return { count, sources, done: order.length === g.nodes.length, stuck: order.length < g.nodes.length && !sources.length };
  }
  function topoAuto(g) {
    const order = [];
    const log = [];
    for (;;) {
      const st = topoState(g, order);
      if (!st.sources.length) return { order, log, stuck: st.stuck };
      log.push({ sources: st.sources, take: st.sources[0] });
      order.push(st.sources[0]);
    }
  }
  function topoCount(g, cap = 5000) {
    const out = [];
    let total = 0;
    const go = (order) => {
      if (total >= cap) return;
      const st = topoState(g, order);
      if (st.done) {
        total++;
        if (out.length < 24) out.push([...order]);
        return;
      }
      st.sources.forEach((s) => go([...order, s]));
    };
    go([]);
    return { total, sample: out, capped: total >= cap };
  }
  function findCycle(g, among) {
    const inSet = new Set(among);
    const start = among[0];
    let v = start;
    const walk = [];
    const seen = {};
    while (seen[v] === undefined) {
      seen[v] = walk.length;
      walk.push(v);
      const e = g.edges.find((x) => x.b === v && inSet.has(x.a));
      if (!e) return null;
      v = e.a;
    }
    return walk.slice(seen[v]).reverse().concat();
  }

  /* --- intervals ---------------------------------------------------------- */
  const overlap = (a, b) => a.s < b.f && b.s < a.f;
  const RULES = {
    finish: { name: 'Earliest finish', key: (x) => x.f },
    start: { name: 'Earliest start', key: (x) => x.s },
    shortest: { name: 'Shortest length', key: (x) => x.f - x.s },
    conflicts: { name: 'Fewest conflicts', key: (x, all) => all.filter((y) => y !== x && overlap(x, y)).length },
  };
  function intervalRun(shows, rule) {
    const R = RULES[rule];
    const sorted = shows
      .map((x, i) => ({ x, i, k: R.key(x, shows) }))
      .sort((a, b) => a.k - b.k || a.i - b.i)
      .map((o) => ({ ...o.x, key: o.k }));
    const taken = [];
    const skipped = [];
    let end = 0;
    const steps = [{ taken: [], skipped: [], current: null, end: 0, text: `Sort by ${R.name.toLowerCase()}. Then take each show that is compatible with everything already taken.` }];
    sorted.forEach((x) => {
      const clash = taken.find((id) => overlap(shows.find((y) => y.id === id), x));
      const ok = clash === undefined;
      const txt = rule === 'finish'
        ? ok
          ? `Show ${x.id} starts at ${x.s} >= ${end}: take it, end = ${x.f}.`
          : `Show ${x.id} starts at ${x.s} < ${end}: skip.`
        : ok
          ? `Show ${x.id} [${x.s}, ${x.f}] overlaps nothing taken: take it.`
          : `Show ${x.id} [${x.s}, ${x.f}] overlaps show ${clash}: skip.`;
      const ask = { prompt: `Show ${x.id} is [${x.s}, ${x.f}]. Take it or skip it?`, options: ['Take', 'Skip'], correct: ok ? 0 : 1, hint: 'Touching at one instant is fine. Sharing a stretch of time is not.' };
      if (ok) {
        taken.push(x.id);
        end = Math.max(end, x.f);
      } else skipped.push(x.id);
      steps.push({ taken: [...taken], skipped: [...skipped], current: x.id, end, text: txt, ask });
    });
    steps.push({ taken: [...taken], skipped: [...skipped], current: null, end, done: true, text: `Result: {${list(taken)}}, ${taken.length} show${taken.length === 1 ? '' : 's'}.` });
    return { sorted, taken, steps };
  }

  /* --- lateness ----------------------------------------------------------- */
  function schedule(jobs, order) {
    let t = 0;
    const rows = order.map((id) => {
      const j = jobs.find((x) => x.id === id);
      const s = t;
      t += j.t;
      return { ...j, s, f: t, late: Math.max(0, t - j.d) };
    });
    return { rows, L: Math.max(0, ...rows.map((r) => r.late)), total: rows.reduce((a, r) => a + r.late, 0) };
  }
  const LATE_RULES = {
    edf: { name: 'Earliest deadline', key: (j) => j.d },
    shortest: { name: 'Shortest length', key: (j) => j.t },
    slack: { name: 'Smallest slack', key: (j) => j.d - j.t },
  };
  const lateOrder = (jobs, rule) =>
    jobs
      .map((j, i) => ({ j, i, k: LATE_RULES[rule].key(j) }))
      .sort((a, b) => a.k - b.k || a.i - b.i)
      .map((o) => o.j.id);
  function inversions(jobs, order) {
    const d = (id) => jobs.find((x) => x.id === id).d;
    const out = [];
    for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) if (d(order[j]) < d(order[i])) out.push([order[i], order[j]]);
    return out;
  }
  function bestL(jobs) {
    let best = Infinity;
    const go = (rest, order) => {
      if (!rest.length) {
        best = Math.min(best, schedule(jobs, order).L);
        return;
      }
      rest.forEach((id) => go(rest.filter((x) => x !== id), [...order, id]));
    };
    go(jobs.map((j) => j.id), []);
    return best;
  }

  /* --- Dijkstra ----------------------------------------------------------- */
  function dijkstra(g, s) {
    const dp = {};
    const d = {};
    const prev = {};
    g.nodes.forEach((n) => (dp[n] = null));
    dp[s] = 0;
    const A = new Set(g.nodes);
    const out = (v) => g.edges.filter((e) => e.a === v);
    const snap = (extra) => clone({ dp, d, prev, settled: Object.keys(d), ...extra });
    const fmt = (x) => (x === null ? 'infinity' : x);
    const steps = [snap({ current: null, updates: [], text: `Set d'(${s}) = 0 and every other d' to infinity. Nothing is settled.` })];
    const trace = [];
    while (A.size) {
      const options = [...A].filter((n) => dp[n] !== null).sort((a, b) => dp[a] - dp[b] || cmp(a, b));
      if (!options.length) break;
      const v = options[0];
      const before = clone(dp);
      A.delete(v);
      d[v] = dp[v];
      const updates = [];
      const notes = [];
      out(v).forEach((e) => {
        if (!A.has(e.b)) return;
        const alt = d[v] + e.w;
        if (dp[e.b] === null || alt < dp[e.b]) {
          updates.push({ w: e.b, from: dp[e.b], to: alt });
          dp[e.b] = alt;
          prev[e.b] = v;
        } else notes.push(`${e.b}: ${d[v]} + ${e.w} = ${alt}, not smaller`);
      });
      trace.push({ v, d: d[v], updates: clone(updates) });
      const u = updates.map((x) => `${x.w}: ${fmt(x.from)} to ${x.to}`);
      const opts = options.slice(0, 4).sort(cmp);
      steps.push(
        snap({
          current: v,
          updates,
          text: `Extract ${v} with d = ${d[v]}. ${[...u, ...notes].join('; ') || 'No edges lead to unsettled nodes'}.`,
          ask: { prompt: "Which node does Dijkstra extract next?", options: opts, correct: opts.indexOf(v), hint: `Compare d' among the unsettled nodes: ${options.map((n) => `${n} ${before[n]}`).join(', ')}.` },
        }),
      );
    }
    steps.push(snap({ current: null, updates: [], done: true, text: `Every reachable node is settled. The prev edges form a tree rooted at ${s}. Click a node to see its shortest path.` }));
    return { steps, d, prev, trace };
  }
  /* The true distances, for showing where negative edges break Dijkstra. */
  function bellmanFord(g, s) {
    const d = {};
    g.nodes.forEach((n) => (d[n] = Infinity));
    d[s] = 0;
    for (let i = 0; i < g.nodes.length; i++) g.edges.forEach((e) => { if (d[e.a] + e.w < d[e.b]) d[e.b] = d[e.a] + e.w; });
    return d;
  }

  /* --- union-find and MST ------------------------------------------------- */
  function UF(nodes) {
    const parent = {};
    const size = {};
    nodes.forEach((n) => { parent[n] = n; size[n] = 1; });
    const find = (v) => { while (parent[v] !== v) v = parent[v]; return v; };
    /* Smaller set renamed; a tie points the first representative at the second. */
    const union = (a, b) => {
      let ra = find(a);
      let rb = find(b);
      if (size[ra] > size[rb]) [ra, rb] = [rb, ra];
      parent[ra] = rb;
      size[rb] += size[ra];
      return { from: ra, to: rb };
    };
    const depthOf = (v) => { let k = 0; while (parent[v] !== v) { v = parent[v]; k++; } return k; };
    return { parent, size, find, union, depthOf, maxDepth: () => Math.max(...nodes.map(depthOf)) };
  }
  function sortEdges(g) { return [...g.edges].sort((x, y) => x.w - y.w); }
  function kruskal(g) {
    const uf = UF(g.nodes);
    const added = [];
    const skipped = [];
    let cost = 0;
    const snap = (extra) => clone({ added, skipped, cost, parent: uf.parent, size: uf.size, ...extra });
    const steps = [snap({ current: null, text: `Sort the ${g.edges.length} edges by cost. Every node starts as its own component.` })];
    const need = g.nodes.length - 1;
    for (const e of sortEdges(g)) {
      if (added.length === need) break;
      const same = uf.find(e.a) === uf.find(e.b);
      const ask = { prompt: `Edge ${e.a}-${e.b} (${e.w}) is next. Add it or skip it?`, options: ['Add', 'Skip'], correct: same ? 1 : 0, hint: `Are ${e.a} and ${e.b} already joined by chosen edges?` };
      if (same) {
        skipped.push(`${e.a}-${e.b}`);
        steps.push(snap({ current: `${e.a}-${e.b}`, ask, text: `${e.a}-${e.b} (${e.w}): skip. ${e.a} and ${e.b} are already connected, so it would close a cycle.` }));
      } else {
        const u = uf.union(e.a, e.b);
        added.push(`${e.a}-${e.b}`);
        cost += e.w;
        steps.push(snap({ current: `${e.a}-${e.b}`, ask, pointer: u, text: `${e.a}-${e.b} (${e.w}): add. It joins two components. Running cost ${cost}.` + (added.length === need ? ` That is ${need} edges = n - 1, so stop.` : '') }));
      }
    }
    steps.push(snap({ current: null, done: true, text: `MST cost ${added.map((k) => g.edges.find((e) => `${e.a}-${e.b}` === k).w).join(' + ')} = ${cost}.` }));
    return { steps, added, skipped, cost, depth: uf.maxDepth(), parent: { ...uf.parent } };
  }
  function prim(g, s) {
    const tree = [s];
    const added = [];
    let cost = 0;
    const snap = (extra) => clone({ tree, added, cost, ...extra });
    const steps = [snap({ crossing: [], current: null, text: `Tree {${s}}. Grow it by always taking the cheapest edge that leaves it.` })];
    while (tree.length < g.nodes.length) {
      const crossing = g.edges.filter((e) => tree.includes(e.a) !== tree.includes(e.b)).sort((x, y) => x.w - y.w);
      if (!crossing.length) break;
      const e = crossing[0];
      const k = `${e.a}-${e.b}`;
      const shown = crossing.map((c) => `${c.a}-${c.b} ${c.w}`);
      const before = [...tree];
      const opts = crossing.slice(0, 4).map((c) => `${c.a}-${c.b} (${c.w})`);
      tree.push(tree.includes(e.a) ? e.b : e.a);
      added.push(k);
      cost += e.w;
      steps.push(snap({ crossing: crossing.map((c) => `${c.a}-${c.b}`), current: k, ask: { prompt: `Tree {${list(before)}}. Which edge does Prim add?`, options: opts, correct: 0, hint: 'Only edges with exactly one end in the tree count. Take the cheapest.' }, text: `Tree {${list(before)}}: crossing edges ${shown.join(', ')}. Pick ${k} (${e.w}).` }));
    }
    steps.push(snap({ crossing: [], current: null, done: true, text: `Same ${added.length} edges as Kruskal: ${list(added)}. Cost ${cost}.` }));
    return { steps, added, cost };
  }
  /* Cheapest crossing edge plus a spanning tree that misses it, as in the proof. */
  function cutInfo(g, S) {
    const inS = new Set(S);
    const crossing = g.edges.filter((e) => inS.has(e.a) !== inS.has(e.b)).sort((x, y) => x.w - y.w);
    return { crossing, cheapest: crossing[0] || null };
  }
  function cutRepair(g, S) {
    const { cheapest: e } = cutInfo(g, S);
    if (!e) return null;
    const ek = `${e.a}-${e.b}`;
    const mst = kruskal(g).added;
    const rest = mst.filter((k) => k !== ek);
    const comp = reach(g.nodes, rest, e.a);
    const f = g.edges.filter((x) => `${x.a}-${x.b}` !== ek && comp.has(x.a) !== comp.has(x.b)).sort((x, y) => x.w - y.w)[0];
    if (!f) return { bridge: true, e };
    const T = [...rest, `${f.a}-${f.b}`];
    const path = treePath(T, e.a, e.b);
    const inS = new Set(S);
    let drop = null;
    for (let i = 0; i + 1 < path.length; i++) {
      if (inS.has(path[i]) !== inS.has(path[i + 1])) {
        drop = T.find((k) => { const [a, b] = k.split('-'); return (a === path[i] && b === path[i + 1]) || (b === path[i] && a === path[i + 1]); });
        break;
      }
    }
    const w = (k) => g.edges.find((x) => `${x.a}-${x.b}` === k).w;
    const cost = T.reduce((a, k) => a + w(k), 0);
    const T2 = [...T.filter((k) => k !== drop), ek];
    return { e, ek, T, path, drop, T2, cost, cost2: cost - w(drop) + e.w, w };
  }
  function reach(nodes, edgeKeys, s) {
    const seen = new Set([s]);
    let grew = true;
    while (grew) {
      grew = false;
      edgeKeys.forEach((k) => {
        const [a, b] = k.split('-');
        if (seen.has(a) !== seen.has(b)) { seen.add(a); seen.add(b); grew = true; }
      });
    }
    return seen;
  }
  function treePath(edgeKeys, from, to) {
    const adj = {};
    edgeKeys.forEach((k) => {
      const [a, b] = k.split('-');
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    });
    const go = (v, prev) => {
      if (v === to) return [v];
      for (const w of adj[v] || []) {
        if (w === prev) continue;
        const r = go(w, v);
        if (r) return [v, ...r];
      }
      return null;
    };
    return go(from, null);
  }
  function ufTrace(nodes, ops) {
    const uf = UF(nodes);
    const snap = (extra) => clone({ parent: uf.parent, size: uf.size, depth: uf.maxDepth(), ...extra });
    const steps = [snap({ text: `Start with singletons: ${list(nodes)}, each pointing to itself.` })];
    ops.forEach(([a, b]) => {
      const ra = uf.find(a);
      const rb = uf.find(b);
      if (ra === rb) {
        steps.push(snap({ text: `Edge ${a}-${b}: find(${a}) = ${ra} and find(${b}) = ${rb}. Same set, so skip it.`, skip: true, ask: { prompt: `find(${a}) = ${ra}, find(${b}) = ${rb}. What happens?`, options: ['Skip: same set', 'Union'], correct: 0, hint: 'The two representatives are the same.' } }));
        return;
      }
      const sa = uf.size[ra];
      const sb = uf.size[rb];
      const u = uf.union(a, b);
      const why = sa === sb ? `Sizes tie at ${sa}, so ${u.from} points to ${u.to}.` : `The set of ${Math.min(sa, sb)} is smaller, so ${u.from} points to ${u.to}.`;
      steps.push(snap({ moved: u, text: `Union(${a}, ${b}): find(${a}) = ${ra}, find(${b}) = ${rb}. ${why} Deepest node is now at depth ${uf.maxDepth()}.`, ask: { prompt: `find(${a}) = ${ra} (size ${sa}), find(${b}) = ${rb} (size ${sb}). Which representative gets a new pointer?`, options: [ra, rb], correct: u.from === ra ? 0 : 1, hint: 'The smaller set changes its name. On a tie the first points at the second.' } }));
    });
    return { steps, depth: uf.maxDepth(), parent: { ...uf.parent } };
  }

  /* --- one graph, many short answers (Lesson 10, Format 1) ----------------- */
  function isConnected(nodes, adj, removedNode) {
    const live = nodes.filter((n) => n !== removedNode);
    if (live.length < 2) return true;
    const seen = new Set([live[0]]);
    const st = [live[0]];
    while (st.length) {
      const v = st.pop();
      adj[v].forEach((w) => { if (w !== removedNode && !seen.has(w)) { seen.add(w); st.push(w); } });
    }
    return seen.size === live.length;
  }
  function analyze(g, s) {
    const b = bfs(g, s);
    const d = dfs(g, s);
    const n = g.nodes.length;
    const m = g.edges.length;
    const connected = isConnected(g.nodes, g.adj);
    const cutVertices = g.nodes.filter((v) => !isConnected(g.nodes, g.adj, v));
    const bridges = connected
      ? g.edges.filter((e) => {
          const adj = {};
          g.nodes.forEach((v) => (adj[v] = g.adj[v].filter((w) => !((v === e.a && w === e.b) || (v === e.b && w === e.a)))));
          return !isConnected(g.nodes, adj);
        }).map((e) => `${e.a}-${e.b}`)
      : [];
    const bip = bipartite(g, s);
    return { n, m, connected, layers: b.layers, dfsOrder: d.order, toTree: connected ? m - (n - 1) : null, cutVertices, bridges, minDisconnect: connected ? minCut(g) : 0, bipartite: bip };
  }
  /* Stoer-Wagner, so "fewest edges to disconnect" is exact on any input. */
  function minCut(g) {
    const ids = [...g.nodes];
    const w = {};
    ids.forEach((a) => { w[a] = {}; ids.forEach((b) => (w[a][b] = 0)); });
    g.edges.forEach((e) => { w[e.a][e.b]++; w[e.b][e.a]++; });
    let best = Infinity;
    let live = [...ids];
    while (live.length > 1) {
      const added = [];
      const score = {};
      live.forEach((v) => (score[v] = 0));
      let prev = null;
      let last = null;
      for (let i = 0; i < live.length; i++) {
        const v = live.filter((x) => !added.includes(x)).sort((a, b) => score[b] - score[a])[0];
        added.push(v);
        prev = last;
        last = v;
        live.forEach((x) => { if (!added.includes(x)) score[x] += w[v][x]; });
      }
      best = Math.min(best, score[last]);
      live.forEach((x) => { if (x !== prev && x !== last) { w[prev][x] += w[last][x]; w[x][prev] = w[prev][x]; } });
      live = live.filter((x) => x !== last);
    }
    return best;
  }

  const api = { cmp, clone, graph, ekey, GRAPHS, galeShapley, pairTable, bfs, dfs, generic, bipartite, topoState, topoAuto, topoCount, findCycle, overlap, RULES, intervalRun, schedule, LATE_RULES, lateOrder, inversions, bestL, dijkstra, bellmanFord, UF, kruskal, prim, cutInfo, cutRepair, reach, treePath, ufTrace, analyze, minCut };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
