/* The simulators. Each one is a function W.name(host, conf, caption). The engines
   in core.js produce a list of snapshots; these only draw them. */
const C = window.Core;
const W = {};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  });
  kids.flat().forEach((c) => c !== null && c !== undefined && n.append(c));
  return n;
}
function frame(host, title) {
  host.innerHTML = '';
  const ctl = el('div', { class: 'w__ctl' });
  const body = el('div', { class: 'w__body' });
  host.append(el('div', { class: 'w__head' }, el('div', { class: 'w__title', html: title }), ctl), body);
  return { ctl, body };
}
function select(options, value, onchange, label) {
  const s = el('select', { class: 'select', 'aria-label': label, onchange: () => onchange(s.value) });
  options.forEach(([v, t]) => s.append(el('option', { value: v }, t)));
  s.value = value;
  return s;
}
function seg(options, value, onchange, label) {
  const box = el('div', { class: 'seg', role: 'group', 'aria-label': label });
  const set = (v) => box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === v));
  options.forEach(([v, t]) => box.append(el('button', { type: 'button', 'data-v': v, onclick: () => { set(v); onchange(v); } }, t)));
  set(value);
  box.set = set;
  return box;
}
const chips = (items, cls = '') => `<div class="chips">${items.length ? items.map((x) => `<span class="chip ${cls}">${esc(x)}</span>`).join('') : '<span class="note" style="color:var(--ink-faint)">empty</span>'}</div>`;

/* --- the step controls shared by every simulator ------------------------- */
function stepper(parent) {
  let steps = [];
  let render = () => {};
  let i = 0;
  let quiz = false;
  let timer = null;
  let cleared = new Set();
  const text = el('div', { class: 'step__text', 'aria-live': 'polite' });
  const ask = el('div', { class: 'ask', hidden: true });
  const back = el('button', { class: 'btn', type: 'button', onclick: () => { stop(); go(i - 1); } }, 'Back');
  const next = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => { stop(); advance(); } }, 'Next');
  const play = el('button', { class: 'btn', type: 'button', onclick: () => (timer ? stop() : start()) }, 'Play');
  const reset = el('button', { class: 'btn btn--quiet', type: 'button', onclick: () => { stop(); cleared = new Set(); go(0); } }, 'Reset');
  const range = el('input', { class: 'step__range', type: 'range', min: 0, value: 0, 'aria-label': 'Step', oninput: () => { stop(); go(+range.value); } });
  const n = el('span', { class: 'step__n' });
  const qbox = el('input', { type: 'checkbox', onchange: () => { quiz = qbox.checked; hideAsk(); } });
  const wrap = el(
    'div',
    { class: 'step', tabindex: -1, onkeydown: (e) => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); advance(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(i - 1); }
    } },
    text, ask,
    el('div', { class: 'step__row' }, back, next, play, reset, range, n, el('label', { class: 'step__quiz', title: 'Predict each step before you see it' }, qbox, 'Quiz me')),
  );
  parent.append(wrap);
  function hideAsk() { ask.hidden = true; ask.innerHTML = ''; }
  function stop() { clearInterval(timer); timer = null; play.textContent = 'Play'; }
  function start() {
    if (i >= steps.length - 1) go(0);
    play.textContent = 'Pause';
    timer = setInterval(() => { if (i >= steps.length - 1) stop(); else go(i + 1); }, 1300);
  }
  function go(k) {
    i = Math.max(0, Math.min(steps.length - 1, k));
    hideAsk();
    render(steps[i], i);
    text.textContent = steps[i].text || '';
    range.value = i;
    n.textContent = `Step ${i} of ${steps.length - 1}`;
    back.disabled = i === 0;
    next.disabled = i === steps.length - 1;
  }
  function advance() {
    const s = steps[i + 1];
    if (!s) return;
    if (!quiz || !s.ask || s.ask.correct < 0 || cleared.has(i + 1)) return go(i + 1);
    if (!ask.hidden) return;
    const target = i + 1;
    ask.hidden = false;
    ask.innerHTML = '';
    const fb = el('div', { class: 'ask__fb', 'aria-live': 'polite' });
    const opts = el('div', { class: 'ask__opts' });
    s.ask.options.forEach((o, idx) => {
      const b = el('button', { class: 'btn', type: 'button', onclick: () => {
        if (idx === s.ask.correct) { cleared.add(target); go(target); text.textContent = `Correct. ${s.text}`; }
        else { b.disabled = true; fb.textContent = `Not that one. ${s.ask.hint || ''}`; }
      } }, String(o));
      opts.append(b);
    });
    ask.append(el('div', {}, s.ask.prompt), opts, fb);
  }
  return {
    load(st, r) { stop(); steps = st; render = r; cleared = new Set(); range.max = steps.length - 1; go(0); },
    goto: go,
    end() { go(steps.length - 1); },
  };
}

/* --- graph drawing ------------------------------------------------------- */
const hw = (label) => Math.max(17, 7 + String(label).length * 4.2);
function bendFor(a, b, pos) {
  const A = pos[a];
  const B = pos[b];
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const L2 = dx * dx + dy * dy || 1;
  const hit = Object.entries(pos).some(([id, p]) => {
    if (id === a || id === b) return false;
    const t = Math.max(0, Math.min(1, ((p.x - A.x) * dx + (p.y - A.y) * dy) / L2));
    return Math.hypot(p.x - A.x - t * dx, p.y - A.y - t * dy) < 24;
  });
  if (!hit) return 0;
  const L = Math.sqrt(L2);
  /* Try both sides and take the one that clears every other node. */
  const clear = (sign) => {
    const b2 = sign * (26 + L * 0.13);
    const cx = (A.x + B.x) / 2 - (dy / L) * b2;
    const cy = (A.y + B.y) / 2 + (dx / L) * b2;
    let worst = 1e9;
    for (let t = 0.1; t < 0.95; t += 0.1) {
      const x = (1 - t) * (1 - t) * A.x + 2 * t * (1 - t) * cx + t * t * B.x;
      const y = (1 - t) * (1 - t) * A.y + 2 * t * (1 - t) * cy + t * t * B.y;
      Object.entries(pos).forEach(([id, p]) => { if (id !== a && id !== b) worst = Math.min(worst, Math.hypot(p.x - x, p.y - y)); });
    }
    return { b2, worst };
  };
  const u = clear(-1);
  const v = clear(1);
  return (u.worst >= v.worst ? u : v).b2;
}
function draw({ w, h, nodes, edges, extra = '', free = false }) {
  const pos = {};
  nodes.forEach((n) => (pos[n.id] = n));
  let out = '';
  edges.forEach((e) => {
    const A = pos[e.a];
    const B = pos[e.b];
    const bend = e.bend !== undefined ? e.bend : bendFor(e.a, e.b, pos);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const L = Math.hypot(dx, dy) || 1;
    const cx = (A.x + B.x) / 2 - (dy / L) * bend;
    const cy = (A.y + B.y) / 2 + (dx / L) * bend;
    const trim = (P, Q, label, extraGap) => {
      const ddx = Q.x - P.x;
      const ddy = Q.y - P.y;
      const d = Math.hypot(ddx, ddy) || 1;
      const c = ddx / d;
      const s = ddy / d;
      const r = 1 / Math.hypot(c / hw(label), s / 15) + extraGap;
      return [P.x + c * r, P.y + s * r, c, s];
    };
    const [x1, y1] = trim(A, { x: cx, y: cy }, A.label ?? A.id, 0);
    const [x2, y2, c2, s2] = trim(B, { x: cx, y: cy }, B.label ?? B.id, e.arrow ? 7 : 0);
    out += `<path class="g-edge ${e.cls || ''}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
    if (e.arrow) {
      const tx = x2 - c2 * 7;
      const ty = y2 - s2 * 7;
      const hc = (e.cls || '').split(' ').filter((k) => ['tree', 'active', 'flag', 'nontree'].includes(k)).join(' ');
      /* The head sits on the node side, so aim it from the curve toward the node. */
      out += `<polygon class="g-head ${hc}" ${(e.cls || '').includes('gone') ? 'opacity=".22"' : ''} points="${(x2 - c2 * 7 + c2 * -0).toFixed(1)},${(y2 - s2 * 7).toFixed(1)} ${(x2 - s2 * 4.5).toFixed(1)},${(y2 + c2 * 4.5).toFixed(1)} ${(x2 + s2 * 4.5).toFixed(1)},${(y2 - c2 * 4.5).toFixed(1)}"/>`;
      void tx; void ty;
    }
    if (e.w !== undefined) {
      const mx = 0.25 * A.x + 0.5 * cx + 0.25 * B.x;
      const my = 0.25 * A.y + 0.5 * cy + 0.25 * B.y;
      out += `<text class="g-w ${(e.cls || '').includes('gone') ? 'dim' : ''}" x="${mx.toFixed(1)}" y="${my.toFixed(1)}">${esc(e.w)}</text>`;
    }
  });
  nodes.forEach((n) => {
    const label = n.label ?? n.id;
    const rx = hw(label);
    out += `<g class="g-node ${n.cls || ''}" ${n.click ? `data-click="1" tabindex="0" role="button" aria-label="${esc(label)}"` : ''} data-node="${esc(n.id)}"><rect x="${(n.x - rx).toFixed(1)}" y="${n.y - 15}" width="${(rx * 2).toFixed(1)}" height="30" rx="15"/><text x="${n.x}" y="${n.y}">${esc(label)}</text></g>`;
    if (n.sub !== undefined) out += `<text class="g-sub" x="${n.x}" y="${n.y + 29}">${esc(n.sub)}</text>`;
  });
  return `<div class="w__draw ${free ? 'w__draw--free' : ''}"><svg viewBox="0 0 ${w} ${h}" role="img" style="max-width:${Math.round(w * 1.12)}px;margin-inline:auto">${extra}${out}</svg></div>`;
}
/* Rows by depth, children under their parent: the sketching method from Lesson 3. */
function treeLayout(g, tree, root, rowLabel) {
  const longest = Math.max(...g.nodes.map((n) => String(n).length));
  const gapX = Math.max(62, longest * 9 + 22);
  const rowH = 70;
  const left = rowLabel ? 46 : 26;
  const kids = {};
  tree.forEach(([a, b]) => (kids[a] = kids[a] || []).push(b));
  const pos = {};
  let leaf = 0;
  let maxD = 0;
  const place = (v, d) => {
    maxD = Math.max(maxD, d);
    const ch = kids[v] || [];
    let x;
    if (!ch.length) x = leaf++ * gapX;
    else {
      ch.forEach((c) => place(c, d + 1));
      x = (pos[ch[0]].x + pos[ch[ch.length - 1]].x) / 2;
    }
    pos[v] = { x, y: d };
  };
  place(root, 0);
  const rest = g.nodes.filter((n) => !pos[n]);
  rest.forEach((n, i) => (pos[n] = { x: i * gapX, y: maxD + 1 }));
  const rows = maxD + (rest.length ? 2 : 1);
  const maxX = Math.max(...Object.values(pos).map((p) => p.x));
  const w = maxX + left + gapX / 2 + 26;
  Object.values(pos).forEach((p) => { p.x = Math.round(p.x + left + gapX / 2 - 10); p.y = 34 + p.y * rowH; });
  const h = 34 + (rows - 1) * rowH + 34;
  const extra = rowLabel ? Array.from({ length: maxD + 1 }, (_, i) => `<text class="g-row" x="6" y="${34 + i * rowH + 4}">${rowLabel}${i}</text>`).join('') : '';
  return { pos, w: Math.max(w, 300), h, extra };
}

/* The graph picker most simulators share, including typing your own edges. */
const GRAPH_LABELS = {
  internet: '1970 Internet (13 nodes)', G: 'Graph G (Lesson 3 practice)', dfs8: 'Lesson 4 example (8 nodes)', practice: 'Format 1 graph (8 nodes)', r10: 'R10.1 graph (7 nodes)',
  cycle5: '5-cycle', GplusBC: 'G plus edge B-C', triangle: 'Triangle', square: '4-cycle', sq: 'Square (R3.2)', tri4: 'Triangle with a tail (R3.3)', diag: 'R3.1 edges', comps: 'R4.2 (3 components)',
};
function graphPicker(ctl, keys, conf, onChange) {
  let key = conf.graph;
  let g = C.GRAPHS[key]();
  let start = conf.start;
  const sel = select([...keys.map((k) => [k, GRAPH_LABELS[k]]), ['own', 'Your own edges']], key, (v) => {
    key = v;
    own.hidden = v !== 'own';
    if (v === 'own') { apply(); return; }
    g = C.GRAPHS[v]();
    start = conf.graph === v ? conf.start : g.nodes[0];
    fill();
    onChange();
  }, 'Graph');
  const startSel = select([], start, (v) => { start = v; onChange(); }, 'Start node');
  const input = el('input', { value: 'A-B B-C C-D D-A A-C', 'aria-label': 'Edges', spellcheck: 'false', placeholder: 'A-B B-C C-A' });
  const err = el('span', { class: 'err' });
  const apply = () => {
    try {
      g = C.graph(input.value);
      if (!g.nodes.length) throw new Error('Type at least one edge, such as A-B.');
      err.textContent = '';
      start = g.nodes[0];
      fill();
      onChange();
    } catch (e) { err.textContent = e.message; }
  };
  const own = el('div', { class: 'own__row', hidden: true, style: 'width:100%' }, input, el('button', { class: 'btn', type: 'button', onclick: apply }, 'Use these edges'), err);
  const fill = () => {
    startSel.innerHTML = '';
    g.nodes.forEach((n) => startSel.append(el('option', { value: n }, n)));
    startSel.value = start;
  };
  fill();
  ctl.append(sel, el('label', {}, 'start ', startSel), own);
  return { get g() { return g; }, get start() { return start; } };
}

/* --- Lesson 1: Gale-Shapley ---------------------------------------------- */
const GS = {
  worked: { label: 'Worked example', P: { a: [1, 2, 3], b: [2, 1, 3], c: [1, 3, 2] }, R: { 1: ['c', 'a', 'b'], 2: ['a', 'b', 'c'], 3: ['a', 'b', 'c'] } },
  A: { label: 'Example A (everyone agrees)', P: { a: [1, 2], b: [1, 2] }, R: { 1: ['a', 'b'], 2: ['a', 'b'] } },
  B: { label: 'Example B (opposite tastes)', P: { a: [1, 2], b: [2, 1] }, R: { 1: ['b', 'a'], 2: ['a', 'b'] } },
  check: { label: 'Check yourself 1', P: { a: [1, 2, 3], b: [2, 1, 3], c: [1, 2, 3] }, R: { 1: ['b', 'a', 'c'], 2: ['a', 'b', 'c'], 3: ['a', 'b', 'c'] } },
  p11: { label: 'P1.1 (solve it first)', P: { a: [2, 1, 3], b: [1, 2, 3], c: [1, 3, 2] }, R: { 1: ['a', 'c', 'b'], 2: ['b', 'a', 'c'], 3: ['a', 'b', 'c'] } },
};
const strs = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k), v.map(String)]));
function parsePrefs(text) {
  const out = {};
  text.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((line) => {
    const m = line.match(/^([^:]+):\s*(.+)$/);
    if (!m) throw new Error(`Could not read "${line}". Write lines like a: 1 2 3.`);
    out[m[1].trim()] = m[2].split(/[\s,]+/).filter(Boolean);
  });
  return out;
}
function checkPrefs(P, R) {
  const pk = Object.keys(P).sort(C.cmp).join();
  const rk = Object.keys(R).sort(C.cmp).join();
  Object.entries(P).forEach(([k, v]) => { if ([...v].sort(C.cmp).join() !== rk) throw new Error(`${k}'s list must rank each of: ${rk}.`); });
  Object.entries(R).forEach(([k, v]) => { if ([...v].sort(C.cmp).join() !== pk) throw new Error(`${k}'s list must rank each of: ${pk}.`); });
}
W.gs = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Gale-Shapley, one offer at a time');
  let inst = GS[conf.preset];
  let side = 'c';
  const stage = el('div');
  const st0 = el('div', { class: 'w__foot' });
  body.append(stage, st0);
  const stp = stepper(body);
  const pref = el('textarea', { rows: 3, spellcheck: 'false', 'aria-label': 'College preferences' }, 'a: 1 2\nb: 2 1');
  const pref2 = el('textarea', { rows: 3, spellcheck: 'false', 'aria-label': 'Student preferences' }, '1: b a\n2: a b');
  const err = el('span', { class: 'err' });
  body.append(el('details', { class: 'own' }, el('summary', {}, 'Run your own instance'), el('div', { class: 'own__row' }, pref, pref2, el('button', { class: 'btn', type: 'button', onclick: () => {
    try {
      const P = parsePrefs(pref.value);
      const R = parsePrefs(pref2.value);
      checkPrefs(P, R);
      err.textContent = '';
      inst = { P, R };
      rebuild();
    } catch (e) { err.textContent = e.message; }
  } }, 'Run it'), err)));
  ctl.append(
    select(Object.entries(GS).map(([k, v]) => [k, v.label]), conf.preset, (v) => { inst = GS[v]; rebuild(); }, 'Instance'),
    seg([['c', 'Colleges propose'], ['s', 'Students propose']], side, (v) => { side = v; rebuild(); }, 'Who proposes'),
  );
  function rebuild() {
    const Pc = strs(inst.P);
    const Rc = strs(inst.R);
    const P = side === 'c' ? Pc : Rc;
    const R = side === 'c' ? Rc : Pc;
    const run = C.galeShapley(P, R);
    const pk = Object.keys(P).sort(C.cmp);
    const rk = Object.keys(R).sort(C.cmp);
    const rowH = 54;
    const H = 34 + Math.max(pk.length, rk.length) * rowH;
    const W_ = 600;
    const xL = 214;
    const xR = 386;
    const yL = (i) => 36 + i * rowH;
    stp.load(run.steps, (s) => {
      let svg = `<text class="t" x="${xL}" y="14" text-anchor="middle">${side === 'c' ? 'colleges propose' : 'students propose'}</text><text class="t" x="${xR}" y="14" text-anchor="middle">${side === 'c' ? 'students receive' : 'colleges receive'}</text>`;
      const holdingNow = new Set(Object.entries(s.holds).map(([r, p]) => `${p}|${r}`));
      const yP = (p) => yL(pk.indexOf(p));
      const yR = (r) => yL(rk.indexOf(r));
      const line = (o, cls) => `<line class="ln ${cls}" x1="${xL + 18}" y1="${yP(o.p)}" x2="${xR - 18}" y2="${yR(o.r)}"/>`;
      /* Standing offers on top, so the matching stays readable as lines pile up. */
      const order = [...s.offers].sort((a, b) => holdingNow.has(`${a.p}|${a.r}`) - holdingNow.has(`${b.p}|${b.r}`));
      order.forEach((o) => {
        const live = s.current && s.current.p === o.p && s.current.r === o.r && o.n === s.offers.length;
        const cls = live ? 'live' : holdingNow.has(`${o.p}|${o.r}`) ? 'hold' : o.result === 'rejected' ? 'reject' : 'dropped';
        svg += line(o, cls);
      });
      s.offers.forEach((o) => {
        const t = 0.26;
        const x = xL + 18 + (xR - xL - 36) * t;
        const y = yP(o.p) + (yR(o.r) - yP(o.p)) * t;
        svg += `<text class="ln-n" x="${x}" y="${y}">${o.n}</text>`;
      });
      const prefRow = (items, x, y, anchor, clsOf) => `<text x="${x}" y="${y + 4}" text-anchor="${anchor}" class="t-mono">${items.map((it, i) => `<tspan class="${clsOf(it, i)}">${esc(it)}</tspan>`).join('  ')}</text>`;
      pk.forEach((p) => {
        const y = yP(p);
        const free = s.free.includes(p);
        const isCur = s.current && s.current.p === p;
        svg += `<g class="g-node ${isCur ? 'current' : free ? 'frontier' : 'explored'}"><rect x="${xL - 17}" y="${y - 15}" width="34" height="30" rx="15"/><text x="${xL}" y="${y}">${esc(p)}</text></g>`;
        svg += prefRow(P[p], xL - 30, y, 'end', (it, i) => (i < s.next[p] ? 'pf-off' : i === s.next[p] ? 'pf-next' : ''));
      });
      rk.forEach((r) => {
        const y = yR(r);
        const held = s.holds[r];
        const isCur = s.current && s.current.r === r;
        svg += `<g class="g-node ${isCur ? 'current' : held !== undefined ? 'explored' : ''}"><rect x="${xR - 17}" y="${y - 15}" width="34" height="30" rx="15"/><text x="${xR}" y="${y}">${esc(r)}</text></g>`;
        const hi = held === undefined ? -1 : R[r].indexOf(held);
        svg += prefRow(R[r], xR + 30, y, 'start', (it, i) => (hi < 0 ? '' : i === hi ? 'pf-hold' : i < hi ? 'pf-up' : 'pf-reject'));
      });
      stage.innerHTML = `<div class="w__draw"><svg viewBox="0 0 ${W_} ${H}" role="img" aria-label="Offers between the two sides">${svg}</svg></div>`;
      st0.innerHTML = `Free right now: <b>${s.free.length ? esc(s.free.join(', ')) : 'nobody'}</b>. Bold names are next on a proposer's list. On a receiver's list, green is the current partner; anything to its left would win a trade, anything to its right is rejected.`;
    });
  }
  rebuild();
};

/* Lesson 1: pick any matching and see every pair judged. */
W.matching = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Find the unstable pairs');
  let inst;
  let M;
  const stage = el('div');
  const verdict = el('div');
  body.append(stage, verdict);
  const pick = (k) => {
    inst = { P: strs(GS[k].P), R: strs(GS[k].R) };
    M = {};
    Object.keys(inst.P).sort(C.cmp).forEach((p, i) => (M[p] = Object.keys(inst.R).sort(C.cmp)[i]));
    show();
  };
  const show = () => {
    const pk = Object.keys(inst.P).sort(C.cmp);
    const rk = Object.keys(inst.R).sort(C.cmp);
    const rows = C.pairTable(M, inst.P, inst.R);
    const at = (p, r) => rows.find((x) => x.p === p && x.r === r);
    const head = `<tr><th></th>${rk.map((r) => `<th>${esc(r)}<div style="font-weight:400;font-family:var(--mono);font-size:11px">${inst.R[r].map(esc).join(' ')}</div></th>`).join('')}</tr>`;
    const lines = pk.map((p) => `<tr><th>${esc(p)}<div style="font-weight:400;font-family:var(--mono);font-size:11px">${inst.P[p].map(esc).join(' ')}</div></th>${rk.map((r) => {
      const c = at(p, r);
      const cls = c.matched ? 'is-match' : c.unstable ? 'is-unstable' : c.pWants || c.rWants ? 'is-one' : '';
      const tx = c.matched ? 'matched' : c.unstable ? 'unstable' : c.pWants ? `only ${esc(p)} wants it` : c.rWants ? `only ${esc(r)} wants it` : 'nobody wants it';
      return `<td><button type="button" class="mcell ${cls}" data-p="${esc(p)}" data-r="${esc(r)}">${tx}</button></td>`;
    }).join('')}</tr>`).join('');
    stage.innerHTML = `<div class="tablewrap"><table class="mgrid"><thead>${head}</thead><tbody>${lines}</tbody></table></div>`;
    const bad = rows.filter((x) => x.unstable);
    verdict.innerHTML = `<div class="note">${bad.length ? `<span class="pill pill--bad">Not stable</span> Unstable: ${bad.map((b) => `(${esc(b.p)}, ${esc(b.r)})`).join(', ')}. Both sides of each pair would rather be together.` : '<span class="pill pill--good">Stable</span> No pair has both sides preferring each other.'} Click any cell to match that pair; the two partners it displaces get each other.</div>`;
  };
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('.mcell');
    if (!b) return;
    const { p, r } = b.dataset;
    const other = Object.keys(M).find((x) => M[x] === r);
    if (other === p) return;
    M[other] = M[p];
    M[p] = r;
    show();
  });
  ctl.append(select(Object.entries(GS).map(([k, v]) => [k, v.label]), conf.preset, pick, 'Instance'));
  pick(conf.preset);
};

/* --- Lesson 2: the definition, on a chart -------------------------------- */
const BIGO = [
  { t: '2n² + n + 2', f: 'n²', T: (n) => 2 * n * n + n + 2, F: (n) => n * n, kind: 'O', c: 5, n0: 1, cMax: 8, nMax: 30, xmax: 30, step: 0.5 },
  { t: '3n² - 5n + 10', f: 'n²', T: (n) => 3 * n * n - 5 * n + 10, F: (n) => n * n, kind: 'O', c: 13, n0: 1, cMax: 16, nMax: 30, xmax: 30, step: 0.5, note: 'Smaller constants also work once n0 is larger. The proof only needs one pair.' },
  { t: '4n + 10', f: 'n', T: (n) => 4 * n + 10, F: (n) => n, kind: 'O', c: 14, n0: 1, cMax: 20, nMax: 30, xmax: 30, step: 0.5 },
  { t: 'n - 10', f: 'n', T: (n) => n - 10, F: (n) => n, kind: 'Ω', c: 0.5, n0: 20, cMax: 2, nMax: 60, xmax: 80, step: 0.05, note: 'Any c below 1 works with a large enough n0. c = 1 or more never does.' },
  { t: '7n² - 3n', f: 'n²', T: (n) => 7 * n * n - 3 * n, F: (n) => n * n, kind: 'Ω', c: 4, n0: 1, cMax: 8, nMax: 20, xmax: 20, step: 0.5 },
  { t: 'n²', f: 'n', T: (n) => n * n, F: (n) => n, kind: 'O', c: null, n0: 1, cMax: 50, nMax: 40, xmax: 60, step: 1, note: 'No c works. Raise it and the failure moves right, but it never goes away: past n = c the curve is above the ceiling.' },
];
W.bigo = (host, conf, cap) => {
  const { ctl, body } = frame(host, (cap || 'Set c and n0 yourself').replace('n0', 'n<sub>0</sub>'));
  let p = BIGO[0];
  let c = 1;
  let n0 = 1;
  const stage = el('div');
  const status = el('div', { class: 'note' });
  const cIn = el('input', { type: 'range', id: 'bigo-c', 'aria-label': 'c', oninput: () => { c = +cIn.value; show(); } });
  const nIn = el('input', { type: 'range', id: 'bigo-n0', 'aria-label': 'n0', oninput: () => { n0 = +nIn.value; show(); } });
  const cOut = el('output');
  const nOut = el('output');
  const use = el('button', { class: 'btn', type: 'button', onclick: () => { c = p.c; n0 = p.n0; cIn.value = c; nIn.value = n0; show(); } }, "Use the guide's constants");
  body.append(stage, el('div', { class: 'range' }, 'c', cIn, cOut), el('div', { class: 'range', html: '' }, el('span', { html: 'n<sub>0</sub>' }), nIn, nOut), status, el('div', {}, use));
  const pick = (i) => {
    p = BIGO[+i];
    c = p.kind === 'Ω' ? p.step * 2 : 1;
    n0 = 1;
    cIn.min = p.step; cIn.max = p.cMax; cIn.step = p.step; cIn.value = c;
    nIn.min = 1; nIn.max = p.nMax; nIn.step = 1; nIn.value = n0;
    use.hidden = p.c === null;
    show();
  };
  const holds = (n) => (p.kind === 'O' ? p.T(n) <= c * p.F(n) + 1e-9 : p.T(n) >= c * p.F(n) - 1e-9);
  const show = () => {
    cOut.textContent = c;
    nOut.textContent = n0;
    const W_ = 640; const H = 280; const l = 44; const r = 12; const t = 12; const b = 30;
    const xmax = p.xmax;
    const ys = [];
    for (let n = 1; n <= xmax; n++) ys.push(p.T(n), c * p.F(n));
    const ymax = Math.max(...ys);
    const ymin = Math.min(0, ...ys);
    const X = (n) => l + ((n - 0) / xmax) * (W_ - l - r);
    const Y = (v) => H - b - ((v - ymin) / (ymax - ymin || 1)) * (H - t - b);
    const path = (fn) => { let d = ''; for (let n = 1; n <= xmax; n += xmax > 40 ? 1 : 0.5) d += `${d ? 'L' : 'M'}${X(n).toFixed(1)} ${Y(fn(n)).toFixed(1)}`; return d; };
    let viol = '';
    const bad = [];
    for (let n = Math.max(1, n0); n <= xmax; n++) if (!holds(n)) { bad.push(n); viol += `<rect class="viol" x="${X(n - 0.5).toFixed(1)}" y="${t}" width="${(X(1) - X(0)).toFixed(1)}" height="${H - t - b}"/>`; }
    let beyond = null;
    if (!bad.length) { for (let n = xmax; n <= 200000; n = Math.ceil(n * 1.3)) if (!holds(n)) { beyond = n; break; } }
    const grid = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = ymin + ((ymax - ymin) * i) / steps;
      grid.push(`<line class="g-rule" x1="${l}" x2="${W_ - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="tick" x="${l - 6}" y="${(Y(v) + 4).toFixed(1)}" style="text-anchor:end">${Math.round(v)}</text>`);
    }
    for (let i = 0; i <= 5; i++) { const n = Math.round((xmax * i) / 5); grid.push(`<text class="tick" x="${X(n).toFixed(1)}" y="${H - 10}">${n}</text>`); }
    const lastT = Y(p.T(xmax));
    const lastF = Y(c * p.F(xmax));
    const lx = W_ - r - 4;
    const tAbove = lastT <= lastF;
    stage.innerHTML = `<div class="w__draw"><svg viewBox="0 0 ${W_} ${H}" role="img" aria-label="T of n against c times f of n">${grid.join('')}${viol}<line class="n0" x1="${X(n0).toFixed(1)}" x2="${X(n0).toFixed(1)}" y1="${t}" y2="${H - b}"/><text class="tick" x="${(X(n0) + 4).toFixed(1)}" y="${t + 10}" style="text-anchor:start">n0 = ${n0}</text><path class="curve curve--t" d="${path(p.T)}"/><path class="curve curve--f" d="${path((n) => c * p.F(n))}"/><text class="t-ink" style="fill:var(--side1)" x="${lx}" y="${Math.max(t + 12, lastT + (tAbove ? -6 : 16)).toFixed(1)}" text-anchor="end">T(n) = ${esc(p.t)}</text><text class="t-ink" style="fill:var(--accent)" x="${lx}" y="${Math.max(t + 12, Math.min(H - b - 4, lastF + (tAbove ? 16 : -6))).toFixed(1)}" text-anchor="end">${c} × ${esc(p.f)}</text></svg></div>`;
    const word = p.kind === 'O' ? 'ceiling' : 'floor';
    let msg;
    if (bad.length) msg = `<span class="pill pill--bad">Fails</span> T(n) breaks the ${word} at n = ${bad[0]}${bad.length > 1 ? ` and ${bad.length - 1} more shown` : ''}. Change c or move n<sub>0</sub> past it.`;
    else if (beyond) msg = `<span class="pill pill--bad">Fails further out</span> Fine on this chart, but it breaks by n = ${beyond}.`;
    else msg = `<span class="pill pill--good">Holds</span> T(n) ${p.kind === 'O' ? '≤' : '≥'} ${c} × ${esc(p.f)} at every n checked from ${n0} to 200,000. Checking cannot replace the proof, but it tells you which constants to try.`;
    status.innerHTML = msg + (p.note ? ` ${p.note}` : '');
  };
  ctl.append(select(BIGO.map((b, i) => [i, `${b.t} is ${b.kind}(${b.f})${b.c === null ? '?' : ''}`]), 0, pick, 'Claim'));
  pick(0);
};
function log10fact(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log10(i); return s; }
W.growth = (host, conf, cap) => {
  const { body } = frame(host, cap || 'Growth rates');
  const FN = [
    ['log n', (k) => Math.log10(Math.max(k, 1))],
    ['(log n)³', (k) => 3 * Math.log10(Math.max(k, 1))],
    ['√n', (k) => (k / 2) * Math.log10(2)],
    ['n', (k) => k * Math.log10(2)],
    ['n log n', (k) => k * Math.log10(2) + Math.log10(Math.max(k, 1))],
    ['n^1.5', (k) => 1.5 * k * Math.log10(2)],
    ['n²', (k) => 2 * k * Math.log10(2)],
    ['2ⁿ', (k) => 2 ** k * Math.log10(2)],
    ['n!', (k) => (k <= 16 ? log10fact(2 ** k) : 2 ** k * (k * Math.log10(2) - Math.log10(Math.E)))],
  ];
  const slider = el('input', { type: 'range', id: 'growth-k', min: 1, max: 40, value: 10, 'aria-label': 'n as a power of two', oninput: () => show() });
  const out = el('output');
  const rows = el('div', { class: 'gr' });
  const note = el('div', { class: 'w__foot' });
  body.append(el('div', { class: 'range' }, 'n', slider, out), el('div', { class: 'gr', html: '<span class="lbl">Grows like</span><span class="lbl">Operations (log scale)</span><span class="lbl" style="text-align:right">At 1 billion ops/s</span>' }), rows, note);
  const fmtV = (lg) => (lg < 6 ? Math.round(10 ** lg).toLocaleString('en-US') : lg < 1e6 ? `10^${Math.round(lg)}` : `10^(${lg.toExponential(1)})`);
  const fmtT = (lg) => {
    const s = lg - 9;
    if (s < -6) return 'under 1 µs';
    if (s < -3) return `${Math.round(10 ** (s + 6))} µs`;
    if (s < 0) return `${Math.round(10 ** (s + 3))} ms`;
    if (s < Math.log10(60)) return `${(10 ** s).toFixed(1)} s`;
    if (s < Math.log10(3600)) return `${Math.round(10 ** s / 60)} min`;
    if (s < Math.log10(86400)) return `${Math.round(10 ** s / 3600)} hours`;
    if (s < Math.log10(31557600)) return `${Math.round(10 ** s / 86400)} days`;
    if (s < 12) return `${Math.round(10 ** s / 31557600).toLocaleString('en-US')} years`;
    return 'longer than the universe';
  };
  const show = () => {
    const k = +slider.value;
    out.innerHTML = `2<sup>${k}</sup>${k <= 30 ? ` = ${(2 ** k).toLocaleString('en-US')}` : ''}`;
    rows.innerHTML = FN.map(([name, fn]) => {
      const lg = fn(k);
      const pct = Math.min(100, (Math.max(lg, 0) / 20) * 100);
      return `<span class="gr__n">${name}</span><div class="gr__track" title="${fmtV(lg)} operations"><div class="gr__fill ${lg > 12 ? 'slow' : ''}" style="width:${pct.toFixed(1)}%"></div></div><span class="gr__v">${fmtT(lg)}</span>`;
    }).join('');
    const cube = k ** 3;
    const root = 2 ** (k / 2);
    note.innerHTML = cube > root ? `Right now (log n)³ = ${cube.toLocaleString('en-US')} is still bigger than √n = ${Math.round(root).toLocaleString('en-US')}. Slide n past 2<sup>30</sup> to see the hierarchy take over: "logs lose to polynomials" only promises eventually.` : `(log n)³ = ${cube.toLocaleString('en-US')} is now below √n = ${Math.round(root).toLocaleString('en-US')}. Before about n = 2<sup>30</sup> it was the other way round, which is why the definition has an n<sub>0</sub>.`;
  };
  show();
};
W.loops = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Count the loops');
  const SN = [
    { n: 'Nested, independent', code: 'for i = 1 to n\n    for j = 1 to n\n        body', run: (n) => { let c = 0; for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) c++; return c; }, bound: 'n²', b: (n) => n * n, why: 'Independent loops multiply.' },
    { n: 'Dependent', code: 'for i = 1 to n\n    for j = i to n\n        body', run: (n) => { let c = 0; for (let i = 1; i <= n; i++) for (let j = i; j <= n; j++) c++; return c; }, bound: 'n²', b: (n) => n * n, why: 'The count is n(n + 1)/2, so the ratio settles near 1/2.' },
    { n: 'The easy lower bound', code: 'for i = 1 to n/2\n    for j = n/2 to n\n        body', run: (n) => { let c = 0; for (let i = 1; i <= n / 2; i++) for (let j = n / 2; j <= n; j++) c++; return c; }, bound: 'n²', b: (n) => n * n, why: 'Keeping only these iterations of the dependent loop still gives about n²/4, so the full loop is Ω(n²).' },
    { n: 'Runs under a condition', code: 'for i = 1 to n\n    print "X"\n    if i == 1\n        for j = 1 to n: print "Y"', run: (n) => { let c = 0; for (let i = 1; i <= n; i++) { c++; if (i === 1) for (let j = 1; j <= n; j++) c++; } return c; }, bound: 'n', b: (n) => n, why: 'The inner loop runs once in total, not n times. That is 2n characters, Θ(n).' },
    { n: 'A variable that doubles', code: 'j = 1\nwhile j < n\n    j = 2 * j', run: (n) => { let c = 0; for (let j = 1; j < n; j *= 2) c++; return c; }, bound: 'log n', b: (n) => Math.log2(n), why: 'After k doublings j = 2^k, so the loop stops once k reaches log n.' },
  ];
  const stage = el('div');
  body.append(stage);
  const pick = (i) => {
    const s = SN[+i];
    const rows = [8, 32, 128, 512, 2048].map((n) => { const c = s.run(n); return `<tr><td class="num">${n.toLocaleString('en-US')}</td><td class="num">${c.toLocaleString('en-US')}</td><td class="num">${(c / s.b(n)).toFixed(3)}</td></tr>`; }).join('');
    stage.innerHTML = `<div class="w__split"><pre><code>${esc(s.code)}</code></pre><div class="tablewrap"><table class="mini"><thead><tr><th class="num">n</th><th class="num">Body runs</th><th class="num">Runs / ${s.bound}</th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="w__foot" style="margin-top:8px">${s.why} The counts come from actually running the loop. A ratio that settles at a constant means the bound is tight.</div>`;
  };
  ctl.append(select(SN.map((s, i) => [i, s.n]), 0, pick, 'Loop'));
  pick(0);
};

/* --- Lesson 3: sketching a graph from an edge list ----------------------- */
W.sketch = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Sketch a graph from its edge list');
  const stage = el('div', { class: 'w__split' });
  const draw_ = el('div');
  const side = el('div', { class: 'w__side' });
  stage.append(draw_, side);
  body.append(stage);
  const stp = stepper(body);
  const pk = graphPicker(ctl, ['G', 'diag', 'internet', 'practice'], conf, build);
  function build() {
    const g = pk.g;
    const s0 = pk.start;
    const b = C.bfs(g, s0);
    const n = g.nodes.length;
    const m = g.edges.length;
    const deg = Object.fromEntries(g.nodes.map((v) => [v, g.adj[v].length]));
    const lay = treeLayout(g, b.tree, s0, 'row ');
    const steps = [{ tally: false, rows: -1, pass: 0, text: `The list has ${m} edges: ${g.edges.map((e) => `${e.a}-${e.b}`).join(', ')}. Nothing is drawn yet.` }];
    const sum = 2 * m;
    steps.push({ tally: true, rows: -1, pass: 0, text: `Tally degrees: one mark per endpoint. The tally sums to ${sum} = 2 × ${m}, so the list was read correctly.`, ask: { prompt: `The list has ${m} edges. What must the degree tally sum to?`, options: [String(m), String(sum), String(n + m)], correct: 1, hint: 'Each edge adds a mark at both of its ends.' } });
    steps.push({ tally: true, rows: 0, pass: 0, text: `Draw the start node ${s0} at the top. That is row 0.` });
    b.layers.forEach((L, i) => {
      if (!i) return;
      const by = b.layers[i - 1].map((p) => { const ch = L.filter((c) => b.parent[c] === p); return ch.length ? `${p} adds ${ch.join(', ')}` : null; }).filter(Boolean);
      const opts = [0, 1, 2, 3, 4, 5].filter((x) => x <= Math.max(3, L.length));
      steps.push({ tally: true, rows: i, pass: 0, text: `Row ${i}: ${by.join('; ')}. Each child goes under its parent, which is what prevents crossings.`, ask: { prompt: `Row ${i - 1} holds ${b.layers[i - 1].join(', ')}. How many new nodes go in row ${i}?`, options: opts.map(String), correct: opts.indexOf(L.length), hint: 'List the neighbors of that row and drop anything already drawn.' } });
    });
    steps.push({ tally: true, rows: 99, pass: 1, text: `First pass: draw each of the ${b.tree.length} parent-to-child edges, straight down.` });
    const treeKeys = new Set(b.tree.map(([x, y]) => C.ekey(x, y)));
    const left = g.edges.filter((e) => !treeKeys.has(C.ekey(e.a, e.b)));
    steps.push({ tally: true, rows: 99, pass: 2, done: true, text: left.length ? `Second pass: the ${left.length} leftover edge${left.length > 1 ? 's' : ''} (${left.map((e) => `${e.a}-${e.b}`).join(', ')}) each join the same row or neighboring rows, never farther apart. Ticks = ${m} = m, so nothing is missing.` : `There are no leftover edges: this graph is a tree. Ticks = ${m} = m.` });
    stp.load(steps, (s) => {
      const nodes = g.nodes.filter((v) => b.depth[v] !== undefined && b.depth[v] <= s.rows).map((v) => ({ id: v, x: lay.pos[v].x, y: lay.pos[v].y, cls: v === s0 ? 'current' : 'explored' }));
      const present = new Set(nodes.map((x) => x.id));
      const edges = [];
      if (s.pass >= 1) b.tree.forEach(([x, y]) => edges.push({ a: x, b: y, cls: 'tree' }));
      if (s.pass >= 2) left.forEach((e) => present.has(e.a) && present.has(e.b) && edges.push({ a: e.a, b: e.b, cls: 'nontree' }));
      const ghost = g.nodes.filter((v) => !present.has(v)).map((v) => ({ id: v, x: lay.pos[v].x, y: lay.pos[v].y, label: '', cls: '' }));
      void ghost;
      draw_.innerHTML = draw({ w: lay.w, h: lay.h, nodes, edges, extra: lay.extra });
      side.innerHTML = `<div><div class="lbl">Edge list</div><div class="note" style="font-family:var(--mono);font-size:12.5px">${g.edges.map((e) => `${esc(e.a)}-${esc(e.b)}`).join(' ')}</div></div>` +
        (s.tally ? `<div><div class="lbl">Degree tally</div><div class="chips">${g.nodes.map((v) => `<span class="chip">${esc(v)} ${deg[v]}</span>`).join('')}</div><div class="note">Sum ${sum} = 2m</div></div>` : '');
    });
  }
  build();
};

/* --- Lessons 3 and 4: BFS, DFS, generic traversal ------------------------ */
W.traverse = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Traversal');
  let mode = conf.mode;
  const stage = el('div', { class: 'w__split' });
  const draw_ = el('div');
  const side = el('div', { class: 'w__side' });
  stage.append(draw_, side);
  body.append(stage);
  const stp = stepper(body);
  const NAMES = { bfs: 'BFS layers', dfs: 'Recursive DFS', queue: 'A is a queue', stack: 'A is a stack' };
  if (conf.modes.length > 1) ctl.append(seg(conf.modes.map((m) => [m, NAMES[m]]), mode, (v) => { mode = v; build(); }, 'Data structure'));
  const keys = ['internet', 'G', 'dfs8', 'practice', 'sq', 'tri4', 'comps'];
  const pk = graphPicker(ctl, keys, conf, build);
  function build() {
    const g = pk.g;
    const s0 = pk.start;
    const run = mode === 'bfs' ? C.bfs(g, s0) : mode === 'dfs' ? C.dfs(g, s0) : C.generic(g, s0, mode);
    const lay = treeLayout(g, run.tree, s0, mode === 'bfs' ? 'L' : 'd');
    stp.load(run.steps, (s) => {
      const treeSet = new Set(s.tree.map(([a, b]) => C.ekey(a, b)));
      const scanned = new Set(s.scanned);
      const inA = new Set((s.A || []).map((x) => x.node));
      const exp = new Set(s.explored);
      const nodes = g.nodes.map((v) => {
        let cls = '';
        if (mode === 'bfs') cls = v === s.current ? 'current' : exp.has(v) ? 'explored' : s.disc[v] ? 'frontier' : '';
        else if (mode === 'dfs') cls = v === s.current ? 'current' : s.stack.includes(v) ? 'onstack' : exp.has(v) ? 'explored' : '';
        else cls = v === s.current ? 'current' : exp.has(v) ? 'explored' : inA.has(v) ? 'frontier' : '';
        return { id: v, x: lay.pos[v].x, y: lay.pos[v].y, cls };
      });
      const edges = g.edges.map((e) => {
        const k = C.ekey(e.a, e.b);
        const cls = treeSet.has(k) ? 'tree' : scanned.has(k) ? 'nontree' : 'faint';
        return { a: e.a, b: e.b, cls };
      });
      draw_.innerHTML = draw({ w: lay.w, h: lay.h, nodes, edges, extra: lay.extra });
      let html = '';
      if (mode === 'bfs') {
        html += `<div><div class="lbl">Layers</div>${s.layers.filter((l) => l.length).map((l, i) => `<div class="chips" style="margin-bottom:3px"><span class="note" style="width:26px;font-family:var(--mono);font-size:12px">L${i}</span>${l.map((v) => `<span class="chip ${v === s.current ? 'chip--on' : exp.has(v) ? '' : 'chip--live'}">${esc(v)}</span>`).join('')}</div>`).join('')}</div>`;
        html += `<div><div class="lbl">Queue, front first</div>${chips(s.queue, 'chip--live')}</div>`;
      } else if (mode === 'dfs') {
        html += `<div><div class="lbl">Call stack, newest last</div>${chips(s.stack.map((v) => `DFS(${v})`), 'chip--on')}</div>`;
        html += `<div><div class="lbl">Explored order</div>${chips(s.explored)}</div>`;
      } else {
        html += `<div><div class="lbl">A (${mode === 'queue' ? 'out at the front, left' : 'out at the top, right'})</div>${chips(s.A.map((x) => x.node), 'chip--live')}</div>`;
        html += `<div><div class="lbl">Explored order</div>${chips(s.explored)}</div>`;
      }
      if (s.done) {
        const nt = g.edges.filter((e) => !treeSet.has(C.ekey(e.a, e.b)) && run.depth[e.a] !== undefined);
        const fact = mode === 'bfs' ? 'Each joins the same row or the next one.' : mode === 'dfs' ? 'Each runs straight up a branch to an ancestor.' : '';
        html += `<div><div class="lbl">Non-tree edges</div>${chips(nt.map((e) => `${e.a}-${e.b}`))}<div class="note">${fact}</div></div>`;
      }
      side.innerHTML = html;
    });
  }
  build();
};

/* --- Lesson 5: bipartite test -------------------------------------------- */
W.bipartite = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Bipartite test');
  const stage = el('div', { class: 'w__split' });
  const draw_ = el('div');
  const side = el('div', { class: 'w__side' });
  stage.append(draw_, side);
  body.append(stage);
  const stp = stepper(body);
  const pk = graphPicker(ctl, ['cycle5', 'G', 'GplusBC', 'triangle', 'square', 'tri4', 'r10'], conf, build);
  function build() {
    const g = pk.g;
    const s0 = pk.start;
    const run = C.bipartite(g, s0);
    const tree = C.bfs(g, s0).tree;
    const lay = treeLayout(g, tree, s0, 'L');
    stp.load(run.steps, (s) => {
      const treeSet = new Set(s.tree.map(([a, b]) => C.ekey(a, b)));
      const scanned = new Set(s.scanned);
      const flag = new Set((s.flag || []).map(([a, b]) => C.ekey(a, b)));
      const cyc = new Set();
      if (s.cycle) for (let i = 0; i + 1 < s.cycle.length; i++) cyc.add(C.ekey(s.cycle[i], s.cycle[i + 1]));
      const nodes = g.nodes.map((v) => {
        const col = s.colors[v];
        return { id: v, x: lay.pos[v].x, y: lay.pos[v].y, cls: `${col === 0 ? 'side0' : col === 1 ? 'side1' : ''} ${v === s.lca ? 'ring' : ''} ${v === s.current ? 'ring' : ''}` };
      });
      const edges = g.edges.map((e) => {
        const k = C.ekey(e.a, e.b);
        const cls = flag.has(k) ? 'flag' : cyc.has(k) ? 'active' : treeSet.has(k) ? 'tree' : scanned.has(k) ? 'nontree' : 'faint';
        return { a: e.a, b: e.b, cls };
      });
      draw_.innerHTML = draw({ w: lay.w, h: lay.h, nodes, edges, extra: lay.extra });
      const X = Object.entries(s.colors).filter(([, c]) => c === 0).map(([v]) => v);
      const Y = Object.entries(s.colors).filter(([, c]) => c === 1).map(([v]) => v);
      side.innerHTML = `<div><div class="lbl">Even layers (X)</div>${chips(X)}</div><div><div class="lbl">Odd layers (Y)</div>${chips(Y)}</div>` +
        (s.verdict === true ? '<div><span class="pill pill--good">Bipartite</span></div>' : s.verdict === false ? `<div><span class="pill pill--bad">Not bipartite</span></div><div><div class="lbl">Odd cycle</div><div class="note" style="font-family:var(--mono)">${esc(s.cycle.join(', '))}</div></div>` : '');
    });
  }
  build();
};

/* --- Lesson 5 and Lesson 10: topological sort, by hand -------------------- */
const DAGS = {
  prereq: { label: 'Prerequisite DAG', e: 'M132>C240 M132>C250 C187>C220 C187>C240 C187>C250 C220>C311 C250>C311 C240>C383 C311>C383' },
  H: { label: 'Graph H (P5.3)', e: 'S>U S>V T>V U>W V>W V>X W>X' },
  H2: { label: 'H plus X to S (P5.4)', e: 'S>U S>V T>V U>W V>W V>X W>X X>S' },
  format3: { label: 'Two chains (Format 3)', e: 's>x x>y y>t s>z z>t' },
  r54: { label: 'R5.4', e: 'a>b a>c b>c' },
  r103: { label: 'R10.3', e: 's>x s>y s>z x>t y>t z>t' },
};
W.topo = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Topological sort');
  let key = conf.preset;
  let g;
  let order;
  let place;
  let countShown;
  const draw_ = el('div');
  const say = el('div', { class: 'step__text', 'aria-live': 'polite' });
  const panel = el('div', { class: 'w__side' });
  const auto = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => { const st = C.topoState(g, order); if (st.sources.length) take(st.sources[0]); } }, 'Take first alphabetically');
  const undo = el('button', { class: 'btn', type: 'button', onclick: () => { order.pop(); show(order.length ? `Undid that choice.` : 'Back to the start.'); } }, 'Undo');
  const reset = el('button', { class: 'btn btn--quiet', type: 'button', onclick: () => init() }, 'Reset');
  const cnt = el('button', { class: 'btn', type: 'button', onclick: () => { countShown = true; show(); } }, 'How many orderings are there?');
  body.append(draw_, say, el('div', { class: 'step__row' }, auto, undo, reset, cnt), panel);
  function take(v) {
    const before = C.topoState(g, order);
    order.push(v);
    const after = C.topoState(g, order);
    const freed = after.sources.filter((x) => !before.sources.includes(x));
    const srcs = before.sources.join(', ');
    let msg = `Sources {${srcs}}: take ${v}.${freed.length ? ` ${freed.join(' and ')} ${freed.length > 1 ? 'become' : 'becomes'} free.` : ''}`;
    if (after.done) msg += ` Order: ${order.join(', ')}. Every edge points forward.`;
    show(msg);
  }
  function init() {
    g = C.graph(DAGS[key].e, { directed: true });
    order = [];
    countShown = false;
    const a = C.topoAuto(g);
    place = [...a.order, ...g.nodes.filter((n) => !a.order.includes(n))];
    show('Nodes are placed left to right in one valid order, so forward edges arc over the top. Click a highlighted source, or take the first alphabetically.');
  }
  function show(msg) {
    if (msg) say.textContent = msg;
    const st = C.topoState(g, order);
    const gap = 102;
    const W_ = 44 + gap * (place.length - 1) + 44;
    const y = 130;
    const pos = Object.fromEntries(place.map((n, i) => [n, 44 + i * gap]));
    const done = new Set(order);
    let cycle = null;
    if (st.stuck) cycle = C.findCycle(g, g.nodes.filter((n) => !done.has(n)));
    const cy = new Set();
    if (cycle) cycle.forEach((v, i) => cy.add(`${v}|${cycle[(i + 1) % cycle.length]}`));
    const nodes = place.map((n) => ({ id: n, x: pos[n], y, cls: done.has(n) ? 'placed' : st.sources.includes(n) ? 'source' : '', click: st.sources.includes(n), sub: done.has(n) ? `#${order.indexOf(n) + 1}` : `in: ${st.count[n]}` }));
    const edges = g.edges.map((e) => {
      const dist = Math.abs(place.indexOf(e.a) - place.indexOf(e.b));
      const forward = place.indexOf(e.a) < place.indexOf(e.b);
      const b = dist === 1 && forward ? 0 : -(18 + dist * gap * 0.2);
      return { a: e.a, b: e.b, arrow: true, bend: b, cls: done.has(e.a) ? 'gone' : cy.has(`${e.a}|${e.b}`) ? 'flag' : forward ? '' : 'flag' };
    });
    draw_.innerHTML = draw({ w: W_, h: 250, nodes, edges });
    draw_.querySelectorAll('[data-click]').forEach((n) => {
      const fire = () => take(n.dataset.node);
      n.addEventListener('click', fire);
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
    });
    auto.disabled = !st.sources.length;
    undo.disabled = !order.length;
    let html = `<div class="w__split" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><div><div class="lbl">Sources (count 0)</div>${chips(st.sources, 'chip--live')}</div><div><div class="lbl">Order so far</div>${chips(order, 'chip--on')}</div></div>`;
    if (st.stuck) {
      html += `<div><span class="pill pill--bad">Stuck</span> <span class="note">Every remaining node has an incoming edge, so no source exists. The cause is the directed cycle ${esc(cycle.join(', '))}, ${esc(cycle[0])}.</span></div>`;
    }
    if (countShown) {
      const c = C.topoCount(g);
      if (!c.total) html += '<div class="note">There are no topological orderings: the graph has a cycle.</div>';
      else html += `<div><div class="lbl">${c.capped ? 'At least ' : ''}${c.total.toLocaleString('en-US')} valid ordering${c.total === 1 ? '' : 's'}</div><div class="note" style="font-family:var(--mono);font-size:12.5px">${c.sample.map((o) => esc(o.join(' '))).join('<br>')}${c.total > c.sample.length ? '<br>and more' : ''}</div></div>`;
    }
    panel.innerHTML = html;
  }
  ctl.append(select(Object.entries(DAGS).map(([k, v]) => [k, v.label]), key, (v) => { key = v; init(); }, 'Graph'));
  init();
};

/* --- Lesson 6: interval scheduling --------------------------------------- */
const mkShows = (a) => a.map(([id, s, f]) => ({ id, s, f }));
const SHOWS = {
  worked: { label: 'Worked example (7 shows)', x: mkShows([[1, 0, 5], [2, 1, 4], [3, 3, 5], [4, 4, 7], [5, 6, 8], [6, 7, 8], [7, 7, 9]]) },
  start: { label: 'Breaks earliest start', x: mkShows([['A', 0, 10], ['B', 1, 2], ['C', 3, 4]]) },
  short: { label: 'Breaks shortest length', x: mkShows([['A', 0, 5], ['B', 4, 7], ['C', 6, 10]]) },
  conf: { label: 'Breaks fewest conflicts', x: mkShows([['T1', 0, 3], ['T2', 4, 7], ['T3', 8, 11], ['T4', 12, 15], ['L1', 2, 5], ['L2', 2, 5], ['L3', 2, 5], ['R1', 10, 13], ['R2', 10, 13], ['R3', 10, 13], ['M', 6, 9]]) },
  p61: { label: 'P6.1 (solve it first)', x: mkShows([[1, 0, 6], [2, 1, 3], [3, 2, 5], [4, 4, 7], [5, 5, 9], [6, 6, 8], [7, 8, 11], [8, 9, 10]]) },
};
W.intervals = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Interval scheduling');
  let key = conf.preset;
  let rule = 'finish';
  const draw_ = el('div');
  const cmpRow = el('div', { class: 'chips' });
  body.append(draw_, el('div', {}, el('div', { class: 'lbl' }, 'Shows each rule gets on this instance'), cmpRow));
  const stp = stepper(body);
  const ruleSeg = seg(Object.entries(C.RULES).map(([k, v]) => [k, v.name]), rule, (v) => { rule = v; build(); }, 'Greedy rule');
  ctl.append(select(Object.entries(SHOWS).map(([k, v]) => [k, v.label]), key, (v) => { key = v; build(); }, 'Instance'), ruleSeg);
  function build() {
    const shows = SHOWS[key].x;
    const run = C.intervalRun(shows, rule);
    const opt = C.intervalRun(shows, 'finish').taken.length;
    cmpRow.innerHTML = Object.entries(C.RULES).map(([k, v]) => { const n = C.intervalRun(shows, k).taken.length; return `<span class="chip ${n === opt ? 'chip--good' : 'chip--bad'}">${v.name}: ${n}</span>`; }).join('') + `<span class="note" style="margin-left:6px">Optimum: ${opt}</span>`;
    const maxT = Math.max(...shows.map((s) => s.f));
    const rowH = 25;
    const l = 92;
    const r = 18;
    const WW = 640;
    const X = (t) => l + (t / maxT) * (WW - l - r);
    const H = 12 + run.sorted.length * rowH + 28;
    stp.load(run.steps, (s) => {
      let svg = '';
      for (let t = 0; t <= maxT; t++) svg += `<line class="g-rule" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="6" y2="${H - 26}"/><text class="tick" x="${X(t).toFixed(1)}" y="${H - 10}">${t}</text>`;
      run.sorted.forEach((x, i) => {
        const y = 10 + i * rowH;
        const cls = s.current === x.id ? 'current' : s.taken.includes(x.id) ? 'taken' : s.skipped.includes(x.id) ? 'skipped' : '';
        svg += `<text class="t-mono" x="${l - 8}" y="${y + 14}" text-anchor="end">${esc(x.id)} [${x.s}, ${x.f}]</text><rect class="bar ${cls}" x="${X(x.s).toFixed(1)}" y="${y + 2}" width="${(X(x.f) - X(x.s)).toFixed(1)}" height="${rowH - 7}" rx="4"/>`;
      });
      if (rule === 'finish' && !s.done && s.end > 0) svg += `<line class="endline" x1="${X(s.end).toFixed(1)}" x2="${X(s.end).toFixed(1)}" y1="4" y2="${H - 26}"/>`;
      draw_.innerHTML = `<div class="w__draw"><svg viewBox="0 0 ${WW} ${H}" role="img" aria-label="Shows on a time line, in sorted order">${svg}</svg></div>`;
    });
  }
  build();
};

/* --- Lesson 7: lateness and the exchange argument ------------------------ */
const mkJobs = (a) => a.map(([id, t, d]) => ({ id, t, d }));
const JOBS = {
  worked: { label: 'Worked example (4 jobs)', x: mkJobs([[1, 1, 2], [2, 2, 5], [3, 3, 6], [4, 2, 7]]), start: [4, 3, 2, 1] },
  swap: { label: 'One exchange step', x: mkJobs([['i', 3, 6], ['j', 2, 4]]), start: ['i', 'j'] },
  tie: { label: 'Tied case: swap changes nothing', x: mkJobs([['i', 3, 4], ['j', 2, 4]]), start: ['i', 'j'] },
  short: { label: 'Breaks shortest length', x: mkJobs([['A', 1, 100], ['B', 10, 10]]), start: ['A', 'B'] },
  slack: { label: 'Breaks smallest slack', x: mkJobs([['short', 1, 2], ['long', 10, 10]]), start: ['long', 'short'] },
  p7: { label: 'P7 jobs (solve them first)', x: mkJobs([[1, 3, 4], [2, 2, 6], [3, 1, 3], [4, 4, 9], [5, 2, 8]]), start: [1, 2, 3, 4, 5] },
  p73: { label: 'P7.3: EDF on total lateness', x: mkJobs([['X', 10, 1], ['Y', 1, 2], ['Z', 1, 3]]), start: ['Y', 'Z', 'X'] },
};
W.lateness = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Minimizing lateness');
  let key = conf.preset;
  let order;
  let log = [];
  const stage = el('div', { class: 'w__split' });
  const draw_ = el('div');
  const side = el('div', { class: 'w__side' });
  stage.append(draw_, side);
  const swapBtn = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => swapFirst() }, 'Swap a consecutive inversion');
  const resetBtn = el('button', { class: 'btn btn--quiet', type: 'button', onclick: () => init() }, 'Reset');
  const ruleSeg = el('div', { class: 'w__ctl' }, 'Apply a rule:', ...Object.entries(C.LATE_RULES).map(([k, v]) => el('button', { class: 'btn', type: 'button', onclick: () => { const a = C.schedule(jobs(), order).L; order = C.lateOrder(jobs(), k); const s = C.schedule(jobs(), order); log.unshift(`${v.name} first: order ${order.join(', ')}, L goes ${a} to ${s.L}.`); show(); } }, v.name)));
  const logEl = el('div', { class: 'note', 'aria-live': 'polite' });
  body.append(stage, el('div', { class: 'step__row' }, swapBtn, resetBtn), ruleSeg, logEl);
  const jobs = () => JOBS[key].x;
  function swapFirst() {
    const d = (id) => jobs().find((x) => x.id === id).d;
    for (let i = 0; i + 1 < order.length; i++) {
      if (d(order[i + 1]) < d(order[i])) { doSwap(i); return; }
    }
  }
  function doSwap(i) {
    const before = C.schedule(jobs(), order);
    const inv0 = C.inversions(jobs(), order).length;
    const a = order[i];
    const b = order[i + 1];
    order = [...order];
    [order[i], order[i + 1]] = [b, a];
    const after = C.schedule(jobs(), order);
    const inv1 = C.inversions(jobs(), order).length;
    const w = after.L < before.L ? 'better' : after.L === before.L ? 'no worse' : 'worse';
    log.unshift(`Swap ${a} and ${b}: max lateness ${before.L} to ${after.L} (${w}), inversions ${inv0} to ${inv1}.`);
    show();
  }
  function init() { order = [...JOBS[key].start]; log = []; show(); }
  function show() {
    const sc = C.schedule(jobs(), order);
    const inv = C.inversions(jobs(), order);
    const maxT = Math.max(sc.rows[sc.rows.length - 1].f, ...jobs().map((j) => Math.min(j.d, sc.rows[sc.rows.length - 1].f + 6)));
    const l = 64; const r = 54; const WW = 560; const rowH = 34;
    const X = (t) => l + (t / maxT) * (WW - l - r);
    const H = 12 + sc.rows.length * rowH + 28;
    let svg = '';
    const tickEvery = maxT > 24 ? 5 : maxT > 12 ? 2 : 1;
    for (let t = 0; t <= maxT; t += tickEvery) svg += `<line class="g-rule" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="6" y2="${H - 26}"/><text class="tick" x="${X(t).toFixed(1)}" y="${H - 10}">${t}</text>`;
    sc.rows.forEach((row, i) => {
      const y = 10 + i * rowH;
      svg += `<text class="t-mono" x="${l - 8}" y="${y + 17}" text-anchor="end">${esc(row.id)}</text><rect class="bar ${row.late ? 'late' : 'ontime'}" x="${X(row.s).toFixed(1)}" y="${y + 3}" width="${(X(row.f) - X(row.s)).toFixed(1)}" height="${rowH - 10}" rx="4"/>`;
      if (row.d <= maxT) svg += `<line class="deadline" x1="${X(row.d).toFixed(1)}" x2="${X(row.d).toFixed(1)}" y1="${y}" y2="${y + rowH - 4}"/>`;
      svg += `<text class="t-mono" x="${(X(row.f) + 6).toFixed(1)}" y="${y + 17}">${row.late ? `+${row.late}` : ''}</text>`;
    });
    draw_.innerHTML = `<div class="w__draw"><svg viewBox="0 0 ${WW} ${H}" role="img" aria-label="Jobs run back to back, with each deadline marked">${svg}</svg></div><div class="w__foot">The red tick on each row is that job's deadline. +k means k late.</div>`;
    const best = C.bestL(jobs());
    side.innerHTML = '';
    const stats = el('div', { html: `<div class="chips"><span class="chip ${sc.L === best ? 'chip--good' : 'chip--bad'}">Max lateness L = ${sc.L}</span><span class="chip">Total ${sc.total}</span><span class="chip">Inversions ${inv.length}</span></div><div class="note" style="margin-top:4px">Best L over every possible order: ${best}.</div>` });
    const list_ = el('div', { class: 'tablewrap' });
    const tb = el('table', { class: 'mini' });
    tb.innerHTML = '<thead><tr><th>Job</th><th class="num">t</th><th class="num">d</th><th class="num">Finish</th><th>Move</th></tr></thead>';
    const tbody = el('tbody');
    sc.rows.forEach((row, i) => {
      const tr = el('tr', { html: `<td>${esc(row.id)}</td><td class="num">${row.t}</td><td class="num">${row.d}</td><td class="num">${row.f}</td>` });
      const td = el('td');
      const mv = (lab, at, name) => el('button', { class: 'btn', style: 'padding:2px 8px', type: 'button', 'aria-label': name, disabled: at < 0 || at + 1 >= order.length, onclick: () => doSwap(at) }, lab);
      td.append(mv('↑', i - 1, `Move ${row.id} earlier`), ' ', mv('↓', i, `Move ${row.id} later`));
      tr.append(td);
      tbody.append(tr);
    });
    tb.append(tbody);
    list_.append(tb);
    side.append(stats, list_);
    swapBtn.disabled = !inv.length;
    logEl.innerHTML = log.length ? log.slice(0, 4).map((x) => `<div>${esc(x)}</div>`).join('') : (inv.length ? `${inv.length} inversion${inv.length > 1 ? 's' : ''}: a job running before one with an earlier deadline. Swap them and watch L.` : 'No inversions: this is an earliest-deadline-first order.');
  }
  ctl.append(select(Object.entries(JOBS).map(([k, v]) => [k, v.label]), key, (v) => { key = v; init(); }, 'Instance'));
  init();
};

/* --- Lesson 8: Dijkstra -------------------------------------------------- */
const DJ = {
  worked: { label: 'Worked example', e: 's>A:1000 s>B:3 B>A:5 A>C:6 B>D:7 C>D:12 C>t:10 D>t:9', s: 's', w: 620, h: 300, pos: { s: [50, 150], A: [210, 50], B: [210, 250], C: [400, 50], D: [400, 250], t: [570, 150] } },
  D: { label: 'Graph D (solve P8.1 first)', e: 's>a:4 s>b:1 b>a:2 a>c:1 b>c:6 a>d:7 b>d:9 c>d:3 c>e:8 d>e:2', s: 's', w: 620, h: 300, pos: { s: [50, 150], a: [190, 50], b: [190, 250], c: [330, 120], d: [440, 250], e: [570, 120] } },
  neg: { label: 'A negative edge breaks it', e: 's>a:2 s>b:3 b>a:-2', s: 's', w: 460, h: 240, pos: { s: [50, 120], a: [390, 50], b: [240, 190] } },
};
W.dijkstra = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Dijkstra');
  let key = conf.preset;
  let pathTo = null;
  const stage = el('div', { class: 'w__split' });
  const draw_ = el('div');
  const side = el('div', { class: 'w__side' });
  stage.append(draw_, side);
  body.append(stage);
  const stp = stepper(body);
  let cur = null;
  let g; let spec;
  draw_.addEventListener('click', (e) => {
    const n = e.target.closest('[data-click]');
    if (!n || !cur || !cur.done) return;
    pathTo = n.dataset.node;
    paint(cur);
  });
  function paint(s) {
    cur = s;
    const P = (k) => spec.pos[k];
    const path = new Set();
    let txt = '';
    if (s.done && pathTo && s.d[pathTo] !== undefined) {
      const seq = [pathTo];
      while (s.prev[seq[0]] !== undefined) seq.unshift(s.prev[seq[0]]);
      for (let i = 0; i + 1 < seq.length; i++) path.add(`${seq[i]}>${seq[i + 1]}`);
      txt = `Shortest path to ${pathTo}: ${seq.join(', ')}, length ${s.d[pathTo]}.`;
    }
    const nodes = g.nodes.map((v) => ({
      id: v, x: P(v)[0], y: P(v)[1],
      cls: v === s.current ? 'current' : s.settled.includes(v) ? 'explored' : s.dp[v] !== null ? 'frontier' : '',
      click: !!s.done,
      sub: s.dp[v] === null ? '∞' : String(s.dp[v]),
    }));
    const edges = g.edges.map((e) => {
      const isPrev = s.prev[e.b] === e.a;
      const upd = (s.updates || []).some((u) => u.w === e.b) && s.current === e.a;
      const onPath = path.has(`${e.a}>${e.b}`);
      return { a: e.a, b: e.b, w: e.w, arrow: true, cls: onPath ? 'flag' : upd ? 'active' : isPrev ? 'tree' : 'faint' };
    });
    draw_.innerHTML = draw({ w: spec.w, h: spec.h, nodes, edges });
    const rows = g.nodes.slice().sort((a, b) => (s.dp[a] ?? Infinity) - (s.dp[b] ?? Infinity) || C.cmp(a, b)).map((v) => {
      const settled = s.settled.includes(v);
      return `<tr class="${v === s.current ? 'is-on' : settled ? 'is-done' : ''}"><td>${esc(v)}</td><td class="num">${s.dp[v] === null ? '∞' : s.dp[v]}</td><td>${s.prev[v] ?? ''}</td><td>${settled ? 'settled' : ''}</td></tr>`;
    }).join('');
    let extra = '';
    if (s.done && key === 'neg') {
      const bf = C.bellmanFord(g, spec.s);
      extra = `<div class="note"><span class="pill pill--bad">Wrong</span> Dijkstra finalized a at ${s.d.a}, but the true distance is ${bf.a}, through s, b, a. It settled a before b's negative edge could lower it.</div>`;
    }
    side.innerHTML = `<div class="tablewrap"><table class="mini"><thead><tr><th>Node</th><th class="num">d'</th><th>prev</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${extra}${txt ? `<div class="note">${esc(txt)}</div>` : ''}`;
  }
  function build() {
    spec = DJ[key];
    g = C.graph(spec.e, { directed: true });
    pathTo = null;
    stp.load(C.dijkstra(g, spec.s).steps, paint);
  }
  ctl.append(select(Object.entries(DJ).map(([k, v]) => [k, v.label]), key, (v) => { key = v; build(); }, 'Graph'));
  build();
};

/* --- Lesson 9: MST, cut property, union-find ----------------------------- */
const MG = {
  worked: { label: 'Worked example', e: 'e-f:1 c-d:2 c-f:3 c-e:4 b-c:5 d-f:6 a-b:7 b-e:8 a-e:9', s: 'a', pos: { a: [60, 140], b: [210, 50], e: [210, 230], c: [380, 50], f: [380, 230], d: [530, 140] } },
  W: { label: 'Graph W (solve P9.1 first)', e: 'P-R:1 Q-S:2 Q-R:3 P-Q:4 R-T:5 R-S:6 S-T:7 S-U:8 T-U:9', s: 'P', pos: { P: [60, 140], Q: [210, 50], R: [210, 230], S: [380, 50], T: [380, 230], U: [530, 140] } },
};
W.mst = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Minimum spanning tree');
  let key = conf.preset;
  let algo = 'kruskal';
  const stage = el('div', { class: 'w__split' });
  const draw_ = el('div');
  const side = el('div', { class: 'w__side' });
  stage.append(draw_, side);
  body.append(stage);
  const stp = stepper(body);
  function build() {
    const spec = MG[key];
    const g = C.graph(spec.e);
    const run = algo === 'kruskal' ? C.kruskal(g) : C.prim(g, spec.s);
    const sorted = [...g.edges].sort((a, b) => a.w - b.w);
    stp.load(run.steps, (s) => {
      const added = new Set(s.added);
      const skipped = new Set(s.skipped || []);
      const cross = new Set(s.crossing || []);
      const touched = new Set(s.tree || [...added].flatMap((k) => k.split('-')));
      const nodes = g.nodes.map((v) => ({ id: v, x: spec.pos[v][0], y: spec.pos[v][1], cls: touched.has(v) ? 'explored' : '' }));
      const edges = g.edges.map((e) => {
        const k = `${e.a}-${e.b}`;
        const cls = k === s.current ? 'active' : added.has(k) ? 'tree' : skipped.has(k) ? 'skip' : cross.has(k) ? 'cross' : 'faint';
        return { a: e.a, b: e.b, w: e.w, cls };
      });
      draw_.innerHTML = draw({ w: 590, h: 280, nodes, edges });
      const rows = sorted.map((e) => {
        const k = `${e.a}-${e.b}`;
        const st = added.has(k) ? 'added' : skipped.has(k) ? 'skipped' : cross.has(k) ? 'crossing' : '';
        return `<tr class="${k === s.current ? 'is-on' : ''}"><td>${k}</td><td class="num">${e.w}</td><td>${st}</td></tr>`;
      }).join('');
      side.innerHTML = `<div class="tablewrap"><table class="mini"><thead><tr><th>Edge</th><th class="num">Cost</th><th>Decision</th></tr></thead><tbody>${rows}</tbody></table></div><div class="note">Running cost: <b>${s.cost}</b></div>`;
    });
  }
  ctl.append(
    select(Object.entries(MG).map(([k, v]) => [k, v.label]), key, (v) => { key = v; build(); }, 'Graph'),
    seg([['kruskal', 'Kruskal'], ['prim', 'Prim']], algo, (v) => { algo = v; build(); }, 'Algorithm'),
  );
  build();
};
W.cut = (host, conf, cap) => {
  const { body } = frame(host, cap || 'The cut property');
  const spec = MG.worked;
  const g = C.graph(spec.e);
  let S = ['a', 'b'];
  const stage = el('div', { class: 'w__split' });
  const draw_ = el('div');
  const side = el('div', { class: 'w__side' });
  stage.append(draw_, side);
  body.append(stage);
  const stp = stepper(body);
  let cutInfo;
  function paintBase(s) {
    const inS = new Set(S);
    const cross = new Set(cutInfo.crossing.map((e) => `${e.a}-${e.b}`));
    const cheap = cutInfo.cheapest ? `${cutInfo.cheapest.a}-${cutInfo.cheapest.b}` : null;
    const T = new Set(s.T || []);
    const pathSet = new Set();
    if (s.path) for (let i = 0; i + 1 < s.path.length; i++) pathSet.add(C.ekey(s.path[i], s.path[i + 1]));
    const nodes = g.nodes.map((v) => ({ id: v, x: spec.pos[v][0], y: spec.pos[v][1], cls: inS.has(v) ? 'inS' : '', click: true }));
    const edges = g.edges.map((e) => {
      const k = `${e.a}-${e.b}`;
      let cls = 'faint';
      if (s.T) {
        cls = k === s.drop ? 'flag' : k === s.add ? 'active' : T.has(k) ? 'tree' : 'faint';
        if (!s.drop && pathSet.has(C.ekey(e.a, e.b))) cls = 'active';
      } else cls = k === cheap ? 'active' : cross.has(k) ? 'cross' : 'faint';
      return { a: e.a, b: e.b, w: e.w, cls };
    });
    draw_.innerHTML = draw({ w: 590, h: 280, nodes, edges });
    side.innerHTML = cutInfo.cheapest
      ? `<div><div class="lbl">S (blue, click nodes to change it)</div>${chips(S.slice().sort(C.cmp))}</div><div><div class="lbl">Cutset, cheapest first</div>${chips(cutInfo.crossing.map((e) => `${e.a}-${e.b} ${e.w}`))}</div><div class="note">The cheapest crossing edge, <b>${cheap}</b>, is in every MST.${s.cost !== undefined ? ` Tree cost now: <b>${s.cost}</b>.` : ''}</div>`
      : `<div class="note">A cut needs two nonempty sides. Click a node so that both sides have at least one.</div>`;
  }
  function build() {
    cutInfo = C.cutInfo(g, S);
    const steps = [{ text: 'Click nodes to choose S. The orange edges cross the cut; the gold one is the cheapest. Press Next to run the repair from the proof.' }];
    if (cutInfo.cheapest) {
      const r = C.cutRepair(g, S);
      if (r.bridge) steps.push({ text: `Every spanning tree must use ${r.e.a}-${r.e.b}, because it is the only way across. There is no tree to repair.` });
      else {
        const list_ = (a) => a.join(', ');
        steps.push({ T: r.T, cost: r.cost, text: `Pick a spanning tree without ${r.ek}: {${list_(r.T)}}. It reaches all 6 nodes and costs ${r.cost}.` });
        steps.push({ T: r.T, path: r.path, cost: r.cost, text: `Find the tree path between ${r.ek}'s endpoints: ${list_(r.path)}.` });
        steps.push({ T: r.T, path: r.path, drop: r.drop, cost: r.cost, text: `The first edge on that path to cross the cut is e' = ${r.drop}. That is the one to remove, not just any crossing edge.`, ask: { prompt: 'Which edge does the proof remove?', options: [r.drop, ...r.T.filter((k) => k !== r.drop).slice(0, 2)], correct: 0, hint: 'It has to be on the tree path between the endpoints, and it has to cross the cut.' } });
        steps.push({ T: r.T2, add: r.ek, cost: r.cost2, done: true, text: `Swap: T' = T + ${r.ek} - ${r.drop}. It is still a spanning tree, and it costs ${r.cost} - ${r.w(r.drop)} + ${r.w(r.ek)} = ${r.cost2}. Cheaper, so T was not minimum.` });
      }
    }
    stp.load(steps, paintBase);
  }
  draw_.addEventListener('click', (e) => {
    const n = e.target.closest('[data-click]');
    if (!n) return;
    const v = n.dataset.node;
    S = S.includes(v) ? S.filter((x) => x !== v) : [...S, v];
    build();
  });
  build();
};
const UFP = {
  kruskal: { label: 'Kruskal on the example', nodes: 'abcdef'.split(''), ops: [['e', 'f'], ['c', 'd'], ['c', 'f'], ['c', 'e'], ['b', 'c'], ['d', 'f'], ['a', 'b']] },
  p95: { label: 'P9.5 (solve it first)', nodes: '12345678'.split(''), ops: [['1', '2'], ['3', '4'], ['1', '3'], ['5', '6'], ['7', '8'], ['5', '7'], ['1', '5']] },
};
W.uf = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'Union-find');
  let key = conf.preset;
  const draw_ = el('div');
  const info = el('div', { class: 'w__foot' });
  body.append(draw_, info);
  const stp = stepper(body);
  function build() {
    const spec = UFP[key];
    stp.load(C.ufTrace(spec.nodes, spec.ops).steps, (s) => {
      const kids = {};
      const roots = [];
      spec.nodes.forEach((n) => { if (s.parent[n] === n) roots.push(n); else (kids[s.parent[n]] = kids[s.parent[n]] || []).push(n); });
      const pos = {};
      let leaf = 0;
      const gap = 62;
      const rowH = 66;
      let maxD = 0;
      const place = (v, d) => {
        maxD = Math.max(maxD, d);
        const ch = kids[v] || [];
        if (!ch.length) pos[v] = { x: leaf++ * gap + 34, y: 30 + d * rowH };
        else { ch.forEach((c) => place(c, d + 1)); pos[v] = { x: (pos[ch[0]].x + pos[ch[ch.length - 1]].x) / 2, y: 30 + d * rowH }; }
      };
      roots.forEach((r) => place(r, 0));
      const nodes = spec.nodes.map((v) => ({ id: v, x: pos[v].x, y: pos[v].y, cls: s.parent[v] === v ? 'explored' : '' }));
      const edges = spec.nodes.filter((v) => s.parent[v] !== v).map((v) => ({ a: v, b: s.parent[v], arrow: true, bend: 0, cls: s.moved && s.moved.from === v ? 'active' : 'tree' }));
      draw_.innerHTML = draw({ w: Math.max(420, leaf * gap + 34), h: 60 + Math.max(maxD, 2) * rowH, nodes, edges, free: true });
      const largest = Math.max(...roots.map((r) => s.size[r]));
      info.innerHTML = `${roots.length} set${roots.length > 1 ? 's' : ''}. Deepest node at depth <b>${s.depth}</b>. Largest set has k = ${largest}, and the bound says depth is at most log<sub>2</sub> k = ${Math.log2(largest).toFixed(2)}. Representatives are filled in; arrows point toward them.`;
    });
  }
  ctl.append(select(Object.entries(UFP).map(([k, v]) => [k, v.label]), key, (v) => { key = v; build(); }, 'Sequence'));
  build();
};

/* --- Lesson 10 --------------------------------------------------------- */
W.analyze = (host, conf, cap) => {
  const { ctl, body } = frame(host, cap || 'One graph, many short answers');
  const stage = el('div');
  body.append(stage);
  const pk = graphPicker(ctl, ['practice', 'r10', 'G', 'internet', 'dfs8'], conf, build);
  function build() {
    const g = pk.g;
    const s0 = pk.start;
    const a = C.analyze(g, s0);
    const tree = C.bfs(g, s0).tree;
    const lay = treeLayout(g, tree, s0, 'L');
    const treeSet = new Set(tree.map(([x, y]) => C.ekey(x, y)));
    const nodes = g.nodes.map((v) => ({ id: v, x: lay.pos[v].x, y: lay.pos[v].y, cls: v === s0 ? 'current' : a.cutVertices.includes(v) ? '' : '' }));
    const edges = g.edges.map((e) => ({ a: e.a, b: e.b, cls: treeSet.has(C.ekey(e.a, e.b)) ? '' : 'nontree' }));
    const bip = a.bipartite;
    const rows = [
      [`How many BFS layers from ${s0}?`, `${a.layers.length}: ${a.layers.map((l, i) => `L${i} = {${l.join(', ')}}`).join(', ')}`],
      ['DFS visit order (neighbors in order)', a.dfsOrder.join(', ')],
      ['Fewest edges to delete so it becomes a tree', a.connected ? `m - (n - 1) = ${a.m} - ${a.n - 1} = ${a.toTree}` : 'The graph is not connected, so no deletion makes it a tree.'],
      ['Fewest edges to delete so it becomes disconnected', a.connected ? `${a.minDisconnect}${a.bridges.length ? `. Bridges: ${a.bridges.join(', ')}` : '. It has no bridges.'}` : 'Already disconnected: 0'],
      ['Which nodes are cut vertices?', a.cutVertices.length ? a.cutVertices.join(', ') : 'None'],
      ['Is it bipartite?', bip.bipartite ? `Yes. X = {${bip.X.join(', ')}}, Y = {${bip.Y.join(', ')}}` : `No. BFS flags ${bip.flagged.join('-')}, giving the odd cycle ${bip.cycle.join(', ')}.`],
    ];
    stage.innerHTML = `${draw({ w: lay.w, h: lay.h, nodes, edges, extra: lay.extra })}<div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>Question</th><th>Answer</th></tr></thead><tbody>${rows.map(([q, x], i) => `<tr><td>${esc(q)}</td><td><button class="btn btn--quiet" type="button" data-rev="${i}" style="padding:3px 9px">Show</button><span data-ans="${i}" hidden>${esc(x)}</span></td></tr>`).join('')}</tbody></table></div><div class="w__foot" style="margin-top:6px">n = ${a.n}, m = ${a.m}. Work each one out from the picture before you reveal it. Pick "Your own edges" to check a homework graph.</div>`;
  }
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rev]');
    if (!b) return;
    stage.querySelector(`[data-ans="${b.dataset.rev}"]`).hidden = false;
    b.hidden = true;
  });
  build();
};
W.twotrees = (host, conf, cap) => {
  const { body } = frame(host, cap || 'Two traversal trees');
  const lay = (id, x0, list_) => list_.map(([n, x, y]) => ({ id: `${id}${n}`, label: n, x: x0 + x, y }));
  const c = lay('c', 60, [['r', 60, 40], ['x', 60, 105], ['y', 60, 170], ['z', 60, 235]]);
  const d = lay('d', 330, [['r', 80, 40], ['x', 30, 125], ['y', 130, 125], ['z', 30, 210]]);
  const edges = [
    { a: 'cr', b: 'cx', cls: 'tree' }, { a: 'cx', b: 'cy', cls: 'tree' }, { a: 'cy', b: 'cz', cls: 'tree' }, { a: 'cr', b: 'cz', cls: 'nontree', bend: 52 },
    { a: 'dr', b: 'dx', cls: 'tree' }, { a: 'dr', b: 'dy', cls: 'tree' }, { a: 'dx', b: 'dz', cls: 'tree' }, { a: 'dx', b: 'dy', cls: 'nontree', bend: 0 },
  ];
  const extra = '<text class="t-ink" x="20" y="24">(c)</text><text class="t-ink" x="330" y="24">(d)</text><text class="t" x="20" y="272">Dashed edge skips 3 levels</text><text class="t" x="330" y="272">Dashed edge joins two siblings</text>';
  body.append(el('div', { html: draw({ w: 560, h: 284, nodes: [...c, ...d], edges, extra, free: true }) }));
};

window.mountWidget = (host) => {
  const conf = JSON.parse(host.dataset.conf);
  try {
    W[conf.w](host, conf, host.dataset.caption);
  } catch (e) {
    host.innerHTML = `<div class="w__body"><div class="err">This simulator could not start: ${esc(e.message)}</div></div>`;
    console.error(e);
  }
};
