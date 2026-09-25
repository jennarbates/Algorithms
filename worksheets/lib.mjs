// Shared pieces for the printable worksheets: loading the question banks straight
// out of the repo, a small Gale-Shapley engine for the answer keys, and the HTML
// renderers for every question format.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const repo = join(here, '..');

// ---------------------------------------------------------------------------
// Sources. Read from the same files the site reads, so nothing is retyped.
// ---------------------------------------------------------------------------

export function loadBigO() {
  const html = readFileSync(join(repo, 'big-o', 'index.html'), 'utf8');
  const open = html.indexOf('const BANK = [');
  const close = html.indexOf('\n  ];', open);
  if (open < 0 || close < 0) throw new Error('could not find the Big-O bank');
  return new Function(`return ${html.slice(open + 'const BANK = '.length, close + 4)};`)();
}

export function loadGS() {
  const q = readFileSync(join(repo, 'gale-shapley', 'src', 'content', 'questions.ts'), 'utf8');
  const a = q.indexOf('export const FORMAL_TERMS');
  const b = q.indexOf('export function questionsIn');
  const body = q.slice(a, b).replace(/export const/g, 'const').replace(/: readonly \w+\[\]/g, '');
  const bank = new Function(`${body}; return { FORMAL_TERMS, STATEMENT, QUESTIONS };`)();

  const p = readFileSync(join(repo, 'gale-shapley', 'src', 'content', 'presets.ts'), 'utf8');
  const s = p.indexOf('const opener');
  const e = p.indexOf('export const PRESETS');
  const specs = new Function(
    'buildInstance',
    `${p.slice(s, e)}; return [opener, headOn, everyoneAgrees, cascade, nothingChanges, worksheet, noMutualFirst, goodAndBad, lectureExample, lectureClicker, homework];`,
  )((x) => x);
  const presets = Object.fromEntries(specs.map((sp) => [sp.id, toInstance(sp)]));
  return { ...bank, presets };
}

const SCHOOL_NAMES = {
  mit: 'MIT', umass: 'UMass Amherst', nyu: 'NYU', berkeley: 'Berkeley', michigan: 'Michigan',
  northeastern: 'Northeastern',
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function toInstance(sp) {
  const S = sp.studentIds.map(cap);
  const C = sp.schoolIds.map((id) => SCHOOL_NAMES[id] ?? id);
  return {
    id: sp.id, title: sp.title, teaches: sp.teaches, S, C,
    sIds: sp.studentIds, cIds: sp.schoolIds,
    sp: sp.studentPrefs, cp: sp.schoolPrefs,
    reasons: sp.reasons ?? {}, notes: sp.notes ?? {},
  };
}

// ---------------------------------------------------------------------------
// Gale-Shapley, for the keys. Queue order differs from the site's; endings do not.
// ---------------------------------------------------------------------------

export function run(inst, studentsAsk) {
  const A = studentsAsk ? inst.S : inst.C;
  const B = studentsAsk ? inst.C : inst.S;
  const ap = studentsAsk ? inst.sp : inst.cp;
  const bp = studentsAsk ? inst.cp : inst.sp;
  const n = A.length;
  const next = Array(n).fill(0);
  const held = Array(n).fill(-1);
  const rank = bp.map((l) => { const r = []; l.forEach((a, i) => (r[a] = i)); return r; });
  const log = [];
  const free = [...Array(n).keys()];
  while (free.length) {
    const a = free.shift();
    const b = ap[a][next[a]++];
    if (held[b] < 0) {
      held[b] = a;
      log.push({ a: A[a], b: B[b], what: `${B[b]} was holding nobody, so holds ${A[a]}.` });
    } else if (rank[b][a] < rank[b][held[b]]) {
      const lost = A[held[b]];
      log.push({ a: A[a], b: B[b], what: `${B[b]} likes ${A[a]} better than ${lost}: holds ${A[a]}, <b>lets ${lost} go</b>.` });
      free.unshift(held[b]);
      held[b] = a;
    } else {
      log.push({ a: A[a], b: B[b], what: `Turned away: ${B[b]} is holding ${A[held[b]]} and likes them better.` });
      free.unshift(a);
    }
  }
  // result keyed by student name
  const seat = {};
  held.forEach((a, b) => {
    if (studentsAsk) seat[A[a]] = B[b];
    else seat[B[b]] = A[a];
  });
  return { log, seat };
}

/** Blocking pairs of a matching given as { studentName: schoolName }. */
export function blocking(inst, seat) {
  const out = [];
  const sOf = Object.fromEntries(Object.entries(seat).map(([s, c]) => [c, s]));
  inst.S.forEach((s, i) => {
    const mine = inst.C.indexOf(seat[s]);
    for (const j of inst.sp[i]) {
      if (j === mine) break; // only schools above my seat
      const c = inst.C[j];
      const holder = inst.S.indexOf(sOf[c]);
      const list = inst.cp[j];
      if (list.indexOf(i) < list.indexOf(holder)) {
        out.push({ s, c, has: seat[s], holder: sOf[c] });
      }
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const L = (i) => 'ABCDEFGHIJ'[i];

const lines = (k) => `<div class="lines">${'<div></div>'.repeat(k)}</div>`;
export const writeLines = lines;

function head(num, q) {
  return `<div class="qhead"><span class="qnum">${num}</span><span class="qtests">Skill: ${esc(q.tests)}</span></div>`;
}
function givenBlock(q) {
  let s = '';
  if (q.given) s += `<div class="given">${esc(q.given)}</div>`;
  if (q.quote) s += `<pre class="quote">${esc(q.quote)}</pre>`;
  if (q.code) s += `<pre class="code">${esc(q.code)}</pre>`;
  return s;
}

// deterministic shuffle so ordering items are never shown already in order
function shuffled(n, seed) {
  const idx = [...Array(n).keys()];
  let x = seed * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let tries = 0; tries < 20; tries++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (idx.some((v, i) => v !== i) && idx[0] !== 0) break;
  }
  return idx;
}

/** Worksheet side of a question. `extra` lets a caller append instance tables etc. */
export function renderQ(num, q, opts = {}) {
  const pre = opts.pre ?? '';
  let body = '';
  const k = q.kind;
  if (k === 'choice') {
    body = `<ol class="opts">${q.options.map((o, i) =>
      `<li><span class="box"></span><b>${L(i)}.</b> ${esc(o.t)}</li>`).join('')}</ol>
      <div class="why-label">Why not the others? Pick the one you almost chose and say what is wrong with it.</div>${lines(2)}`;
  } else if (k === 'multi') {
    body = `<div class="hint">Tick every one that is true. Partly right counts as wrong.</div>
      <ol class="opts">${q.options.map((o, i) =>
      `<li><span class="box sq"></span><b>${L(i)}.</b> ${esc(o.t)}</li>`).join('')}</ol>`;
  } else if (k === 'number') {
    body = `<div class="numans"><span>${esc(q.unit)}</span><span class="numbox"></span></div>
      <div class="why-label">Working:</div>${lines(3)}`;
  } else if (k === 'witness') {
    body = `<div class="numans"><span>c =</span><span class="numbox"></span><span>n₀ =</span><span class="numbox"></span></div>
      <div class="why-label">Check your pair. Show that the inequality holds at every n ≥ n₀ (a table of a few values is evidence, not proof: say why it keeps holding).</div>${lines(4)}`;
  } else if (k === 'order') {
    const idx = shuffled(q.items.length, num.length * 7 + q.items.length * 13 + q.prompt.length);
    q._shown = idx;
    body = `<div class="cards">${idx.map((j, p) => `<span class="card"><b>${L(p)}</b> ${esc(q.items[j].t)}</span>`).join('')}</div>
      <div class="slots">${q.items.map((_, i) => `<span class="slot"><i>${i + 1}</i></span>`).join('<span class="lt">&lt;</span>')}</div>
      <div class="hint">Write the letters in the boxes, slowest-growing / smallest first. For each neighbouring pair, can you say where they cross?</div>`;
  } else if (k === 'proof') {
    body = q.steps.map((st, si) => `<div class="pstep"><div class="plead">Line ${si + 1} · ${esc(st.lead)}</div>
      <ol class="opts">${st.options.map((o, i) => `<li><span class="box"></span><b>${L(i)}.</b> ${esc(o.t)}</li>`).join('')}</ol></div>`).join('')
      + `<div class="hint">One line per step. The proof counts only if every line is right.</div>`;
  } else if (k === 'pairing' || k === 'run') {
    body = opts.body;
  } else if (k === 'arrangements') {
    body = opts.body;
  } else if (opts.body) {
    // Any other kind (the graph workbook's layers, edges, walks...) brings its own body.
    body = opts.body;
  }
  return `<section class="q">${head(num, q)}${pre}${givenBlock(q)}<p class="prompt">${esc(q.prompt)}</p>${body}</section>`;
}

/** Answer-key side. */
export function renderKey(num, q, opts = {}) {
  const k = q.kind;
  let s = '';
  if (k === 'choice') {
    const i = q.options.findIndex((o) => o.ok);
    s = `<p class="ans">Answer: <b>${L(i)}</b></p><ul class="whys">${q.options.map((o, j) =>
      `<li class="${o.ok ? 'ok' : 'no'}"><b>${L(j)}</b> ${o.ok ? '✓' : '✗'} ${esc(o.why)}</li>`).join('')}</ul>`;
  } else if (k === 'multi') {
    const ok = q.options.map((o, i) => (o.ok ? L(i) : null)).filter(Boolean);
    s = `<p class="ans">True: <b>${ok.join(', ')}</b> &nbsp;·&nbsp; False: ${q.options.map((o, i) => (o.ok ? null : L(i))).filter(Boolean).join(', ')}</p>
      <ul class="whys">${q.options.map((o, j) => `<li class="${o.ok ? 'ok' : 'no'}"><b>${L(j)}</b> ${o.ok ? '✓' : '✗'} ${esc(o.why)}</li>`).join('')}</ul>`;
  } else if (k === 'number') {
    s = `<p class="ans">Answer: <b>${esc(q.unit)} ${q.answer}</b></p><p>${esc(q.why)}</p>
      <ul class="whys">${q.near.map((n) => `<li class="no"><b>If you wrote ${n.v}:</b> ${esc(n.why)}</li>`).join('')}</ul>`;
  } else if (k === 'witness') {
    const labels = opts.witnessLabels ?? [];
    s = `<p class="ans">Any pair that really holds is correct. There is nothing to match against.</p><p>${esc(q.why)}</p>
      <ul class="whys">${q.near.map((n, i) => `<li><b>${esc(labels[i] ?? 'Note')}:</b> ${esc(n.why)}</li>`).join('')}</ul>`;
  } else if (k === 'order') {
    const shown = q._shown;
    const letterOf = (j) => L(shown.indexOf(j));
    s = `<p class="ans">Order: <b>${q.items.map((_, j) => letterOf(j)).join(' &lt; ')}</b></p>
      <ol class="whys ordered">${q.items.map((it, j) => `<li><b>${letterOf(j)} · ${esc(it.t)}</b> — ${esc(it.why)}</li>`).join('')}</ol>`;
  } else if (k === 'proof') {
    s = `<p class="ans">Lines: <b>${q.steps.map((st, i) => `${i + 1}${L(st.options.findIndex((o) => o.ok))}`).join(' · ')}</b></p>`
      + q.steps.map((st, si) => `<div class="kstep"><div class="plead">Line ${si + 1} · ${esc(st.lead)}</div><ul class="whys">${st.options.map((o, j) =>
        `<li class="${o.ok ? 'ok' : 'no'}"><b>${L(j)}</b> ${o.ok ? '✓' : '✗'} ${esc(o.why)}</li>`).join('')}</ul></div>`).join('');
  } else {
    s = opts.body ?? '';
  }
  return `<section class="k"><div class="khead">${num}</div>${s}${q.close ? `<p class="close"><b>Takeaway.</b> ${esc(q.close)}</p>` : ''}</section>`;
}

// ---------------------------------------------------------------------------
// Page chrome
// ---------------------------------------------------------------------------

export const CSS = `
@page { size: Letter; margin: 0.55in 0.6in 0.6in; @bottom-center { content: counter(page); font: 9pt Helvetica, Arial, sans-serif; color: #777; } }
:root { --ink:#1b1b1b; --soft:#555; --rule:#bbb; --tint:#f1f1ee; --accent:#1f5f8b; --green:#2e7d32; --red:#b23a3a; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: var(--ink); background: #fff; font: 10.5pt/1.42 Georgia, 'Times New Roman', serif; }
h1, h2, h3, h4, .qhead, .khead, .tag, .plead, th { font-family: Helvetica, Arial, sans-serif; }
h1 { font-size: 26pt; margin: 0 0 6pt; letter-spacing: -0.5px; }
h2 { font-size: 16pt; margin: 0 0 8pt; padding-bottom: 4pt; border-bottom: 2px solid var(--ink); }
h3 { font-size: 12pt; margin: 14pt 0 5pt; }
h4 { font-size: 10.5pt; margin: 10pt 0 3pt; }
p { margin: 0 0 7pt; }
.page { break-before: page; }
.flow { margin-top: 14pt; }
h2, .flow > p { break-after: avoid; }
sub { font-size: 0.7em; vertical-align: -0.25em; line-height: 0; }
.cover { height: 9.6in; display: flex; flex-direction: column; justify-content: center; }
.cover .sub { font-size: 13pt; color: var(--soft); margin-bottom: 26pt; }
.cover ol li { margin-bottom: 5pt; }
.tag { display: block; break-after: avoid; font-size: 8pt; text-transform: uppercase; letter-spacing: 1.2px; color: var(--accent); margin-bottom: 4pt; font-weight: 700; }
.defn { border: 2px solid var(--ink); padding: 8pt 11pt; margin: 8pt 0 10pt; background: var(--tint); }
.defn .big { font: 13pt/1.5 'Courier New', monospace; text-align: center; margin: 3pt 0 6pt; }
.note { border-left: 4px solid var(--accent); padding: 4pt 10pt; margin: 8pt 0; background: #f5f8fb; }
.warn { border-left: 4px solid var(--red); padding: 4pt 10pt; margin: 8pt 0; background: #fbf5f5; }
.try { border: 1.5px dashed var(--ink); padding: 8pt 11pt; margin: 10pt 0; break-inside: avoid; }
.try > .tag { color: var(--ink); }
table { border-collapse: collapse; margin: 6pt 0 9pt; font-size: 10pt; }
th, td { border: 1px solid #999; padding: 3pt 7pt; text-align: center; vertical-align: middle; }
th { background: var(--tint); font-size: 9pt; }
td.l, th.l { text-align: left; }
table.blank td { height: 21pt; min-width: 44pt; }
table.wide { width: 100%; }
.mono, pre, .given, .card, .cut { font-family: Menlo, 'DejaVu Sans Mono', monospace !important; font-size: 0.9em; }
pre { white-space: pre-wrap; margin: 5pt 0 8pt; padding: 6pt 9pt; background: var(--tint); font-size: 9.5pt; line-height: 1.35; border-left: 3px solid var(--rule); }
.given { font-family: 'Courier New', monospace; font-size: 10pt; background: var(--tint); padding: 4pt 9pt; margin: 4pt 0 6pt; border-left: 3px solid var(--accent); }
.q { break-inside: avoid; padding: 8pt 0 10pt; border-top: 1px solid var(--rule); }
.q:first-of-type { border-top: 0; }
.qhead { display: flex; gap: 10pt; align-items: baseline; margin-bottom: 3pt; }
.qnum { font-weight: 700; font-size: 11pt; background: var(--ink); color: #fff; padding: 1pt 6pt; border-radius: 3px; }
.qtests { font-size: 8.5pt; color: var(--soft); font-style: italic; }
.prompt { font-weight: 600; margin: 4pt 0 5pt; }
ol.opts { list-style: none; padding: 0; margin: 3pt 0 6pt; }
ol.opts li { display: flex; gap: 6pt; align-items: flex-start; margin: 0 0 4pt; }
ol.opts li b { flex: 0 0 auto; }
.box { flex: 0 0 auto; width: 10pt; height: 10pt; border: 1.3px solid var(--ink); border-radius: 50%; margin-top: 2.5pt; }
.box.sq { border-radius: 1px; }
.hint, .why-label { font-size: 8.8pt; color: var(--soft); font-style: italic; margin: 3pt 0; }
.lines div { border-bottom: 1px solid #c8c8c8; height: 19pt; }
.numans { display: flex; gap: 8pt; align-items: center; margin: 6pt 0; font-family: Helvetica, Arial, sans-serif; font-weight: 700; }
.numbox { display: inline-block; width: 70pt; height: 24pt; border: 1.5px solid var(--ink); margin-right: 14pt; }
.cards { display: flex; flex-wrap: wrap; gap: 6pt; margin: 6pt 0; }
.card { border: 1.3px solid var(--ink); padding: 3pt 8pt; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 10.5pt; }
.card b { font-family: Helvetica, Arial, sans-serif; margin-right: 4pt; }
.slots { display: flex; flex-wrap: wrap; align-items: center; gap: 3pt; margin: 8pt 0 3pt; }
.slot { width: 32pt; height: 26pt; border: 1.5px solid var(--ink); position: relative; }
.slot i { position: absolute; top: 1pt; left: 2pt; font-size: 6.5pt; color: #999; font-style: normal; font-family: Helvetica, Arial, sans-serif; }
.lt { font-family: Helvetica, Arial, sans-serif; color: var(--soft); }
.pstep { margin: 5pt 0 3pt; padding-left: 8pt; border-left: 3px solid var(--rule); }
.plead { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--accent); margin-bottom: 2pt; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; }
.three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }
.small { font-size: 9pt; }
.muted { color: var(--soft); }
.seatrow { display: flex; flex-wrap: wrap; gap: 8pt 18pt; margin: 6pt 0; font-family: Helvetica, Arial, sans-serif; font-size: 10pt; }
.seatrow span.fill { display: inline-block; width: 90pt; border-bottom: 1.3px solid var(--ink); height: 14pt; vertical-align: bottom; }
.pref td { min-width: 60pt; }
.pref td.who { font-weight: 700; text-align: left; font-family: Helvetica, Arial, sans-serif; }
.pref td.why { text-align: left; font-size: 8.5pt; font-style: italic; color: var(--soft); max-width: 190pt; }
.cand { display: grid; grid-template-columns: auto 1fr; gap: 3pt 10pt; align-items: center; margin: 4pt 0 6pt; padding: 5pt 7pt; border: 1px solid var(--rule); break-inside: avoid; }
.cand .seats { font-family: 'Courier New', monospace; font-size: 9.5pt; }
.cand .blk { grid-column: 2; font-size: 8.8pt; color: var(--soft); }
.cand .blk span { display: inline-block; width: 150pt; border-bottom: 1px solid #aaa; }
/* answer key */
.keyintro { font-style: italic; color: var(--soft); }
.k { break-inside: auto; padding: 6pt 0 8pt; border-top: 1px solid var(--rule); font-size: 9.6pt; line-height: 1.36; }
.khead { font-weight: 700; font-size: 10.5pt; margin-bottom: 2pt; }
.ans { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; margin-bottom: 4pt; }
ul.whys, ol.whys { margin: 2pt 0 5pt; padding-left: 14pt; }
ul.whys li, ol.whys li { margin-bottom: 3pt; }
ul.whys li.ok { color: #184d1b; }
.close { background: var(--tint); padding: 4pt 8pt; margin-top: 4pt; }
.kstep { margin-top: 4pt; }
.keycols { column-count: 1; }
svg text { font-family: Helvetica, Arial, sans-serif; }
.cut { border: 1.5px dashed #888; display: inline-block; padding: 10pt 12pt; margin: 4pt; font: 12pt 'Courier New', monospace; min-width: 110pt; text-align: center; }
.summary { font-size: 9.6pt; line-height: 1.34; }
.summary h3 { margin-top: 8pt; }
.summary ul { margin: 2pt 0 4pt; padding-left: 14pt; }
.toc td { text-align: left; border: 0; border-bottom: 1px dotted #aaa; padding: 3pt 6pt; }
`;

export function doc(title, body) {
  const b = body.replace(/(<svg[\s\S]*?<\/svg>)|([₀₁₂])/g, (m, svg, d) => svg ?? `<sub>${'₀₁₂'.indexOf(d)}</sub>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${b}</body></html>`;
}

/** A blank grid for plotting points by hand. */
export function plotGrid({ xs, yMin, yMax, yStep, w = 470, h = 300, xLabel = 'n', yLabel = '', points = [], lines: poly = [] }) {
  const pad = { l: 40, r: 12, t: 24, b: 30 };
  const X = (x) => pad.l + ((x - xs[0]) / (xs[xs.length - 1] - xs[0])) * (w - pad.l - pad.r);
  const Y = (y) => pad.t + ((yMax - y) / (yMax - yMin)) * (h - pad.t - pad.b);
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  for (let y = yMin; y <= yMax; y += yStep / 5) {
    const major = Math.abs((y - yMin) % yStep) < 1e-9 || Math.abs(((y - yMin) % yStep) - yStep) < 1e-9;
    s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(y)}" y2="${Y(y)}" stroke="${y === 0 ? '#000' : major ? '#aaa' : '#e2e2e2'}" stroke-width="${y === 0 ? 1.4 : 0.6}"/>`;
    if (major) s += `<text x="${pad.l - 5}" y="${Y(y) + 3}" font-size="8.5" text-anchor="end" fill="#444">${y}</text>`;
  }
  for (const x of xs) {
    s += `<line y1="${pad.t}" y2="${h - pad.b}" x1="${X(x)}" x2="${X(x)}" stroke="#bbb" stroke-width="0.6"/>`;
    s += `<text x="${X(x)}" y="${h - pad.b + 13}" font-size="9" text-anchor="middle" fill="#444">${x}</text>`;
  }
  s += `<text x="${w - pad.r}" y="${h - 4}" font-size="9.5" text-anchor="end" font-weight="700">${xLabel}</text>`;
  if (yLabel) s += `<text x="4" y="12" font-size="9.5" font-weight="700">${esc(yLabel)}</text>`;
  for (const pl of poly) {
    s += `<polyline fill="none" stroke="${pl.color ?? '#1f5f8b'}" stroke-width="1.6" points="${pl.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}"/>`;
  }
  for (const [x, y, c] of points) s += `<circle cx="${X(x)}" cy="${Y(y)}" r="3.2" fill="${c ?? '#1b1b1b'}"/>`;
  return s + '</svg>';
}
