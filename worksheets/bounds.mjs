// The bounds workbook: lecture 3 on paper.
//
// Built like graphs.mjs: bounds/src/core and bounds/src/content import with .ts
// extensions and use only erasable TypeScript, so Node loads them as they are.
// The questions are the site's own, and every number in the key is computed
// by the site's engine: the exact-fraction bound checker, the programs run
// for real, the growth classes.

import { renderQ, renderKey, doc, esc, writeLines } from './lib.mjs';
import { bestN0, check } from '../bounds/src/core/bounds.ts';
import { SLIDE_16, isPolynomial, showGrowth, factorial } from '../bounds/src/core/growth.ts';
import { evalQ, parseQ, poly, polyScale, showPoly, showQ } from '../bounds/src/core/poly.ts';
import { PRINT1, PRINT2, SUM_PRODUCT, TRIANGLES, DEEPER, POWERS_SLOW, POWERS_FAST, TIMES_TABLE, boxSize, countOf, inSquare, squareCount, written } from '../bounds/src/core/programs.ts';
import { QUESTIONS, TIER_LABELS } from '../bounds/src/content/questions.ts';

const Q = (s) => parseQ(s);
const n1 = poly(0, 1);
const n2 = poly(0, 0, 1);

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** A table of T(n) against c·f(n) at the given n, computed exactly. */
function valuesTable(T, f, c, ns, rel) {
  const cf = polyScale(f, Q(c));
  return `<table><tr><th>n</th><th>T(n) = ${esc(showPoly(T))}</th><th>${esc(c)}·${esc(showPoly(f))}</th><th>${rel === 'Ω' ? 'T(n) ≥ c·f(n)?' : 'T(n) ≤ c·f(n)?'}</th></tr>${ns.map((n) => {
    const t = evalQ(T, n);
    const v = evalQ(cf, n);
    const diff = Number(t.n) / Number(t.d) - Number(v.n) / Number(v.d);
    const ok = rel === 'Ω' ? diff >= 0 : diff <= 0;
    return `<tr><td>${n}</td><td>${esc(showQ(t))}</td><td>${esc(showQ(v))}</td><td>${ok ? '✓' : '✗'}</td></tr>`;
  }).join('')}</table>`;
}

function blankValues(T, f, c, ns, rel) {
  return `<table class="blank wide"><tr><th>n</th><th>T(n) = ${esc(showPoly(T))}</th><th>${esc(c)}·${esc(showPoly(f))}</th><th>${rel === 'Ω' ? '≥ ?' : '≤ ?'}</th></tr>${ns.map((n) => `<tr><td>${n}</td><td></td><td></td><td></td></tr>`).join('')}</table>`;
}

/** The n × n grid of (i, j), with the triangle j ≥ i and, optionally, the easy-way square. */
function gridSvg(n, { square = false, filled = true } = {}) {
  const s = 22;
  const w = s * (n + 1);
  let out = `<svg width="${w}" height="${w}" viewBox="0 0 ${w} ${w}" xmlns="http://www.w3.org/2000/svg">`;
  for (let k = 1; k <= n; k++) {
    out += `<text x="${s * k + s / 2}" y="${s * 0.7}" font-size="9" text-anchor="middle">${k}</text>`;
    out += `<text x="${s / 2}" y="${s * k + s * 0.65}" font-size="9" text-anchor="middle">${k}</text>`;
  }
  out += `<text x="${s / 2}" y="${s * 0.7}" font-size="8" text-anchor="middle">i\\j</text>`;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      const runs = j >= i;
      const sq = square && inSquare(n, i, j);
      const fill = filled && runs ? (sq ? '#9bb9e0' : '#cfe3da') : '#fff';
      out += `<rect x="${s * j + 1}" y="${s * i + 1}" width="${s - 2}" height="${s - 2}" fill="${fill}" stroke="${sq ? '#1f4f8f' : runs ? '#555' : '#ccc'}" stroke-width="${sq ? 1.8 : 0.8}"/>`;
    }
  }
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// Question kinds lib.mjs does not know: the witness
// ---------------------------------------------------------------------------

function witnessBody(q) {
  const boxes = [];
  if (q.rel !== 'O') boxes.push(q.rel === 'Θ' ? 'c₁ (floor) =' : 'c =');
  if (q.rel !== 'Ω') boxes.push(q.rel === 'Θ' ? 'c₂ (ceiling) =' : 'c =');
  boxes.push('n₀ =');
  return `<div class="given">T(n) = ${esc(showPoly(q.T))} &nbsp;&nbsp; f(n) = ${esc(showPoly(q.f))}</div>
<div class="numans">${boxes.map((b) => `<span>${esc(b)}</span><span class="numbox"></span>`).join('')}</div>
<div class="why-label">Show it holds at every n ≥ n₀, not just at a few: the argument, not a table.</div>${writeLines(4)}`;
}

function witnessKey(q) {
  const ex = q.example;
  const w = { n0: ex.n0, ...(ex.lower ? { lower: Q(ex.lower) } : {}), ...(ex.upper ? { upper: Q(ex.upper) } : {}) };
  const v = check(q.T, q.f, q.rel, w);
  const pair = [ex.lower && `${q.rel === 'Θ' ? 'c₁' : 'c'} = ${ex.lower}`, ex.upper && `${q.rel === 'Θ' ? 'c₂' : 'c'} = ${ex.upper}`, `n₀ = ${ex.n0}`].filter(Boolean).join(', ');
  return `<p class="ans">Any constants and n₀ that really hold are right. One that does: <b>${esc(pair)}</b>${v.ok ? ' (checked exactly at every whole n from n₀ on)' : ''}.</p><p>${esc(q.why)}</p>`;
}

// ---------------------------------------------------------------------------
// Learn pages
// ---------------------------------------------------------------------------

function part1(keys) {
  const T = poly(-10, 1);
  const T2 = poly(1, 17, 32);
  const b33 = bestN0(T2, n2, 'O', { upper: Q('33') });
  keys.push(`<section class="k"><div class="khead">W1 · 4n + 10 against 5n</div>${valuesTable(poly(10, 4), n1, '5', [0, 5, 9, 10, 11, 20], 'O')}
<p>c = 5 is a <b>ceiling</b> from n = ${bestN0(poly(10, 4), n1, 'O', { upper: Q('5') })}: 4n + 10 ≤ 5n once n ≥ 10. As a floor it fails from n = 11 on, for good: 5 is above the leading coefficient 4. So 4n + 10 = O(n) with c = 5, n₀ = 10, and 4n + 10 = Ω(n) needs c ≤ 4.</p></section>`);

  return `<div class="page"><span class="tag">Part 1 · Learn</span><h2>Floors and ceilings</h2>
<p>Big-O only ever gives a ceiling, and a ceiling can be as loose as you like: 10 log n is O(log n), and also O(n), O(n²) and so on. To say how fast something really grows you need a floor as well.</p>
<div class="defn"><b>Three definitions, one shape</b> (c, c₁, c₂ &gt; 0 and n₀ ≥ 0 are numbers you choose)
<table class="wide" style="margin-top:4pt"><tr><th>Claim</th><th class="l">Means</th><th class="l">Picture</th></tr>
<tr><td>T(n) = O(f(n))</td><td class="l mono small">T(n) ≤ c·f(n) for all n ≥ n₀</td><td class="l">ceiling</td></tr>
<tr><td>T(n) = Ω(f(n))</td><td class="l mono small">T(n) ≥ c·f(n) for all n ≥ n₀</td><td class="l">floor</td></tr>
<tr><td>T(n) = Θ(f(n))</td><td class="l mono small">c₁·f(n) ≤ T(n) ≤ c₂·f(n) for all n ≥ n₀</td><td class="l">both: tight</td></tr></table></div>
<h3>Worked example: n − 10 = Ω(n) (the slide 8 clicker)</h3>
<p>We need n − 10 ≥ cn. That rearranges to (1 − c)n ≥ 10, which is possible only if c &lt; 1. With c = 0.5 it holds from n = ${bestN0(T, n1, 'Ω', { lower: Q('0.5') })}; with c = 0.99 from n = ${bestN0(T, n1, 'Ω', { lower: Q('0.99') })}, where the two sides are exactly equal; with c = 2 or 20, never.</p>
${valuesTable(T, n1, '0.5', [0, 19, 20, 21, 100], 'Ω')}
<h3>Worked example: 32n² + 17n + 1 = Θ(n²) (slide 11)</h3>
<p><b>Floor:</b> throw the positive terms away. 32n² + 17n + 1 ≥ 32n² at every n, so c₁ = 32 from n = 0.</p>
<p><b>Ceiling:</b> 33n² works once n² ≥ 17n + 1, first true at n = ${b33}. Or round every term up: 32n² + 17n + 1 ≤ 32n² + 17n² + n² = 50n² for n ≥ 1.</p>
<p>One n₀ for both: the later of the two. c₁ = 32, c₂ = 33, n₀ = ${b33}. It is <i>not</i> Θ(n): no c keeps c·n above 32n². And not Θ(n³): no c keeps c·n³ below it.</p>
<div class="note"><b>Moves that find witnesses.</b> Ceiling: round every term up to the biggest shape. Floor: drop positive terms; for a negative term, give up part of the constant (n − 10 ≥ ½n once ½n ≥ 10). Then solve for n₀, and check the first whole number.</div>
<div class="try"><span class="tag">Warm-up W1 · ceiling or floor?</span>
<p>Fill in the table for T(n) = 4n + 10 against 5n. From which n is 5n a ceiling? Could 5n ever be a floor?</p>
${blankValues(poly(10, 4), n1, '5', [0, 5, 9, 10, 11, 20], 'O')}${writeLines(2)}</div></div>`;
}

function part2(keys) {
  const out = (p, n) => p.run(n).map((s) => s.out ?? '').join('');
  keys.push(`<section class="k"><div class="khead">W2 · Print1 and Print2 at n = 3</div>
<p><b>Print1:</b> <span class="mono">${out(PRINT1, 3)}</span>: ${countOf(PRINT1, 3)} characters, and n² + n = 9 + 3 = 12.</p>
<p><b>Print2:</b> <span class="mono">${out(PRINT2, 3)}</span>: ${countOf(PRINT2, 3)} characters, and 2n = 6.</p></section>`);
  return `<div class="page"><span class="tag">Part 2 · Learn</span><h2>Count every step</h2>
<p>Asymptotic notation is about a count. Get the count first, exactly if you can, and read the bound off it.</p>
<div class="two"><div><pre>${esc(['Print1(n)', ...PRINT1.lines].join('\n'))}</pre>
<p>Each of the n rounds prints one X and n Y: <b>n(1 + n) = n² + n</b> characters. At n = 4: <span class="mono">${out(PRINT1, 4)}</span>, ${countOf(PRINT1, 4)} characters.</p></div>
<div><pre>${esc(['Print2(n)', ...PRINT2.lines].join('\n'))}</pre>
<p>The Y loop runs only when i = 1: <b>n + n = 2n</b> characters. At n = 4: <span class="mono">${out(PRINT2, 4)}</span>, ${countOf(PRINT2, 4)} characters. Nested-looking, but linear.</p></div></div>
<h3>Many bounds are true; one is tight</h3>
<p>n² + n is Ω(√n), Θ(n²) and O(n⁴), all at once. Only Θ(n²) pins it down. 2n is Θ(n).</p>
<h3>foo and bar (slides 4 and 12)</h3>
<p>foo is two nested loops from 1 to n, bar is three. Both are O(n³), and yet they are not the same: foo is Θ(n²), bar Θ(n³). A ceiling alone cannot tell two algorithms apart.</p>
<div class="try"><span class="tag">Warm-up W2 · trace by hand</span>
<p>Write out exactly what Print1 and Print2 print for n = 3, and check the counts against n² + n and 2n.</p>
<p class="small">Print1:</p>${writeLines(1)}<p class="small">Print2:</p>${writeLines(1)}</div></div>`;
}

function part3(keys) {
  const n = 8;
  keys.push(`<section class="k"><div class="khead">W3 · sum-product at n = 7</div>
<p>All of it: 7 + 6 + … + 1 = 7·8/2 = <b>${countOf(SUM_PRODUCT, 7)}</b>. The square: i ≤ 3.5 and j ≥ 3.5, so 3 rows × 4 columns = <b>${squareCount(7)}</b>. The slide's (n/2)² would be 12.25: for odd n the square is a quarter short of it, but ${squareCount(7)} ≥ ((7 − 1)/2)² = 9, which is all Ω(n²) needs.</p>${gridSvg(7, { square: true })}</section>`);
  return `<div class="page"><span class="tag">Part 3 · Learn</span><h2>The triangle</h2>
<pre>${esc(['sum-product', ...SUM_PRODUCT.lines].join('\n'))}</pre>
<p>Each pair (i, j) the inner line runs on is one cell of an n × n grid, and it runs exactly on the cells with j ≥ i: a triangle, diagonal included.</p>
<div class="two"><div>${gridSvg(n, { square: true })}<div class="small muted">n = ${n}. Shaded: every step that runs. Outlined: the easy way's square.</div></div>
<div><h3>The hard way</h3><p>Count all of it: n + (n − 1) + … + 1 = n(n + 1)/2. At n = ${n}: ${countOf(SUM_PRODUCT, n)}. At least n²/2, so Ω(n²).</p>
<h3>The easy way</h3><p>Ignore every step with i &gt; n/2 or j &lt; n/2. What is left is a square of ⌊n/2⌋ × (⌊n/2⌋ + 1) steps, all inside the triangle, so the program does at least that many. At n = ${n}: ${squareCount(n)} ≥ (n/2)² = ${(n / 2) ** 2}. A constant times n², so Ω(n²), without ever finding the exact count.</p>
<div class="warn"><b>Checking the slide.</b> "At least (n/2)²" holds for even n. For odd n the square has ⌊n/2⌋(⌊n/2⌋ + 1) steps, a quarter below (n/2)²: at n = 5, 6 against 6.25. The conclusion survives, since it is at least ((n − 1)/2)².</div></div></div>
<p><b>The general moves.</b> Upper bounds: add work that is not there (every loop runs to n). Lower bounds: throw work away (keep a part you can count). Both give Θ(n²) here: ${squareCount(n)} ≤ ${countOf(SUM_PRODUCT, n)} ≤ ${n * n}.</p>
<p><b>Additivity, upgraded.</b> If f and g are nonnegative and f = O(g), then f + g = Θ(g): the floor is free, since f + g ≥ g. So n² + 42n + n log n = Θ(n²).</p>
<div class="try"><span class="tag">Warm-up W3 · n = 7</span>${gridSvg(7, { filled: false })}
<p>Shade the cells sum-product runs on, count them, then outline the easy way's square and count that. ${writeLines(2)}</p></div></div>`;
}

function part4() {
  const at = 30;
  const secs = (steps) => {
    const s = steps / 1e9;
    if (s < 1e-3) return `${(s * 1e6).toFixed(1)} µs`;
    if (s < 1) return `${(s * 1e3).toFixed(1)} ms`;
    if (s < 120) return `${s.toFixed(1)} s`;
    if (s < 172800) return `${(s / 3600).toFixed(1)} hours`;
    if (s < 6.3e7) return `${(s / 86400).toFixed(0)} days`;
    return `${(s / 3.15e7).toExponential(1)} years`;
  };
  return `<div class="page"><span class="tag">Part 4 · Learn</span><h2>Polynomial or not</h2>
<div class="defn">An algorithm runs in <b>polynomial time</b> if its running time is O(nᵈ) for some constant d.</div>
<table class="wide"><tr><th class="l">Running time (slide 16)</th><th class="l">Class</th><th>Polynomial?</th><th>At n = ${at}, 10⁹ steps a second</th></tr>
${SLIDE_16.map((f) => `<tr><td class="l">${esc(f.label)}</td><td class="l">Θ(${esc(showGrowth(f.growth))})</td><td>${isPolynomial(f.growth) ? 'yes' : '<b>no</b>'}</td><td>${secs(f.at(at))}</td></tr>`).join('')}</table>
<h3>Why this is the definition of efficient (slide 17)</h3>
<ul><li>It matches practice: almost all practically efficient algorithms are polynomial.</li>
<li>It usually separates a clever algorithm from brute force. Stable matching by brute force tries n! matchings (${factorial(10).toLocaleString('en-US')} at n = 10); propose-and-reject makes at most n² = 100 proposals.</li>
<li>It is refutable: it gives a way to say an algorithm is not efficient, or that no efficient algorithm exists.</li></ul>
<p class="small">Polynomial says nothing about the degree: n¹⁰⁰ is polynomial. And every exponential passes every polynomial eventually: 2ⁿ overtakes n¹⁰ between n = 58 and 59, and stays ahead.</p></div>`;
}

function part5(keys) {
  const n = 12;
  const cell = (p) => {
    const b = p.box(n);
    return `<p class="small">Box at n = ${n}: ${p.bands.map(esc).join(', ')}: ${b.i.hi - b.i.lo + 1} × ${b.j.hi - b.j.lo + 1} × ${b.k.hi - b.k.lo + 1} = <b>${boxSize(b)}</b> steps, of ${countOf(p, n)} in all.</p>`;
  };
  const b6 = DEEPER.box(5);
  keys.push(`<section class="k"><div class="khead">W5 · deeper at n = 5</div>
<p>Exact: ${countOf(DEEPER, 5)} (1² + 2² + … + 5²). Box: i ≤ 2, j ≥ 3, k ≤ 2: ${b6.i.hi - b6.i.lo + 1} × ${b6.j.hi - b6.j.lo + 1} × ${b6.k.hi - b6.k.lo + 1} = ${boxSize(b6)}. Ceiling: 5³ = 125. So ${boxSize(b6)} ≤ ${countOf(DEEPER, 5)} ≤ 125.</p></section>`);
  return `<div class="page"><span class="tag">Part 5 · Learn</span><h2>Three loops deep</h2>
<p>The triangle’s moves work one dimension up. The count is a sum of sums; the ceiling lets every loop run to n; the floor keeps a <b>box</b> of triples where every one really runs, and each side of the box is a constant fraction of n.</p>
<div class="two"><div><pre>${esc(['triangles(n)', ...TRIANGLES.lines].join('\n'))}</pre>
<p>Exact: ${esc(TRIANGLES.countText)}. ${esc(TRIANGLES.boxWhy)}</p>${cell(TRIANGLES)}</div>
<div><pre>${esc(['deeper(n)', ...DEEPER.lines].join('\n'))}</pre>
<p>Exact: ${esc(DEEPER.countText)}. ${esc(DEEPER.boxWhy)}</p>${cell(DEEPER)}</div></div>
<div class="note"><b>Choosing a box.</b> Pick a band for each index so that (1) every triple in the box satisfies the loop conditions, and (2) each band has at least a constant fraction of n values. Then the box has at least c·n³ steps, and the program at least that many: Ω(n³).</div>
<div class="warn"><b>A box that is too thin proves too little.</b> If one band has only 10 values, the box has about 10·n² steps: a true floor, but only Ω(n²).</div>
<div class="try"><span class="tag">Warm-up W5 · deeper at n = 5</span><p>Count deeper’s steps at n = 5 exactly, then count its box (i ≤ n/2, j ≥ n/2, k ≤ n/2), and check the box fits under the count and the count under n³.</p>${writeLines(3)}</div></div>`;
}

function part6(keys) {
  const n = 10;
  keys.push(`<section class="k"><div class="khead">W6 · powers at n = 5</div>
<p>From scratch: 1 + 2 + 3 + 4 + 5 = ${countOf(POWERS_SLOW, 5)} multiplications. Reusing: ${countOf(POWERS_FAST, 5)}. Both write ${written(POWERS_FAST, 5).join(', ')}.</p></section>`);
  return `<div class="page"><span class="tag">Part 6 · Learn</span><h2>Same answer, less work</h2>
<div class="two"><div><pre>${esc(['powers, from scratch', ...POWERS_SLOW.lines].join('\n'))}</pre><p>${esc(POWERS_SLOW.countText)} multiplications: ${countOf(POWERS_SLOW, n)} at n = ${n}. Θ(n²).</p></div>
<div><pre>${esc(['powers, reusing the last one', ...POWERS_FAST.lines].join('\n'))}</pre><p>${esc(POWERS_FAST.countText)} multiplications: ${countOf(POWERS_FAST, n)} at n = ${n}. Θ(n).</p></div></div>
<p>Same table, entry for entry. The slow one rebuilt xᵏ⁻¹ inside every xᵏ; the fast one kept it. <b>Strictly faster</b> means the ratio goes to 0: here n / (n(n + 1)/2) = 2/(n + 1) → 0. A version that did half the work would be faster, but not strictly: the ratio would be ½.</p>
<div class="defn"><b>The output is a floor.</b> Whatever the algorithm, it must write its answer. The powers table has n entries, so Ω(n): the fast version is as good as it gets. A times table has n² entries (${countOf(TIMES_TABLE, n)} at n = ${n}), so no algorithm fills it in less than Ω(n²).</div>
<div class="try"><span class="tag">Warm-up W6 · powers at n = 5</span><p>Count the multiplications each version makes at n = 5, and write out the table they both produce (x = 3).</p>${writeLines(2)}</div></div>`;
}

function summary() {
  return `<div class="page summary"><span class="tag">Keep this page</span><h2>One-page summary</h2><div class="two"><div>
<h3>Definitions</h3><ul><li>O: T ≤ c·f from n₀ on. A ceiling, and it can be loose.</li><li>Ω: T ≥ c·f from n₀ on. A floor.</li><li>Θ: both, c₁·f ≤ T ≤ c₂·f, one n₀ (the later one). Tight.</li><li>f = O(g) says nothing about whether g = O(f).</li></ul>
<h3>Finding witnesses</h3><ul><li>Ceiling: round every term up to the biggest shape.</li><li>Floor: drop positive terms; pay for negative ones with part of the constant.</li><li>Solve for n₀, then check the first whole number (≥ allows equality).</li><li>For Ω, c must be below the leading coefficient; for O, above it (or equal, if the rest is ≤ 0).</li></ul>
</div><div>
<h3>Counting</h3><ul><li>Count exactly first; the bound comes from the count.</li><li>Add per round, don't multiply by nesting depth (Print2 is 2n).</li><li>Upper bound: add work that is not there. Lower bound: throw work away.</li><li>1 + 2 + … + n = n(n + 1)/2 = Θ(n²).</li><li>If f = O(g) and both ≥ 0: f + g = Θ(g).</li></ul>
<h3>Polynomial time</h3><ul><li>O(nᵈ) for some constant d.</li><li>log &lt; polynomial &lt; exponential &lt; factorial.</li><li>Brute force is often n! or 2ⁿ; the clever algorithm is polynomial.</li></ul>
</div></div></div>`;
}

// ---------------------------------------------------------------------------

export function buildBounds() {
  const byTier = {};
  for (const q of QUESTIONS) (byTier[q.tier] ??= []).push(q);
  const keys = [];
  const actKeys = [];

  let body = `<div class="cover"><span class="tag">Algorithms · printable workbook</span>
<h1>Floors and Ceilings</h1><div class="sub">Big-Omega, Big-Theta and running-time analysis (COMPSCI 311, lecture 3) on paper: the definitions, witnesses you find yourself, loops counted exactly, three loops deep, doing the same job with less work, and ${QUESTIONS.length} questions in six tiers, with an answer key worked out by the same code the website runs.</div>
<h3>How to use this packet</h3><ol>
<li>Work in order: each part is a Learn page with worked examples, a warm-up, then questions.</li>
<li>Questions marked <b>clicker</b> are the lecture's own.</li>
<li>For a witness question, any constants and n₀ that really hold are right. The key shows one and says how to check yours.</li>
<li>The threshold is inclusive throughout: "for all n ≥ n₀", as in the lecture.</li></ol>
<table class="toc" style="margin-top:14pt">${[1, 2, 3, 4, 5, 6].map((t) => `<tr><td><b>Part ${t}</b></td><td>${TIER_LABELS[t]}</td><td>${byTier[t].length} questions</td></tr>`).join('')}
<tr><td><b>Summary</b></td><td>One page to keep</td><td></td></tr><tr><td><b>Key</b></td><td>Warm-ups and every question</td><td></td></tr></table></div>`;

  const questionPages = (t) => {
    let s = `<div class="flow"><span class="tag">Part ${t} · Questions</span><h2>Tier ${t}: ${TIER_LABELS[t]}</h2>`;
    byTier[t].forEach((q, i) => {
      const num = `${t}.${i + 1}`;
      const pre = q.clicker ? `<div class="small muted">Clicker · ${esc(q.clicker)}</div>` : '';
      if (q.kind === 'witness') {
        const shared = { ...q, kind: 'bounds-witness' };
        s += renderQ(num, shared, { pre, body: witnessBody(q) });
        keys.push(renderKey(num, shared, { body: witnessKey(q) }));
      } else {
        s += renderQ(num, q, { pre });
        keys.push(renderKey(num, q));
      }
    });
    return `${s}</div>`;
  };

  body += part1(actKeys);
  body += questionPages(1);
  body += part2(actKeys);
  body += questionPages(2);
  body += part3(actKeys);
  body += questionPages(3);
  body += part4();
  body += questionPages(4);
  body += part5(actKeys);
  body += questionPages(5);
  body += part6(actKeys);
  body += questionPages(6);
  body += summary();
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: warm-ups</h2><p class="keyintro">Try everything before you look.</p>${actKeys.join('')}</div>`;
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: questions</h2>${keys.join('')}</div>`;
  return doc('Floors and Ceilings: printable workbook', body);
}

