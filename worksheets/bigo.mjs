import { loadBigO, renderQ, renderKey, doc, plotGrid, writeLines } from './lib.mjs';

const T = (n) => 14 * n * n + 4 * n + 6;
const TIER_NAMES = {
  1: 'The definition, on one example',
  2: 'Functions and code you have not seen',
  3: 'The work a problem set asks for',
  4: 'The whole family: O, Ω, Θ, o, ω',
  5: 'What any of this is for',
};

const WITNESS_LABELS = {
  'producing a witness rather than recognising one': ['If your c was 1 or less', 'If your c was between 1 and 4 and the pair failed', 'If you gave c = 4, n₀ = 1'],
  'a witness for a bound the page never drew': ['If you gave c = 1, n₀ = 1', 'If your c was below 1'],
};

function building() {
  // A schematic of the site's metaphor: roof, street, basement.
  const chip = (x, y, w, t, fill = '#fff', dash = '') =>
    `<rect x="${x}" y="${y}" width="${w}" height="22" rx="3" fill="${fill}" stroke="#1b1b1b" stroke-width="1.3" ${dash}/><text x="${x + w / 2}" y="${y + 15}" font-size="11" text-anchor="middle" font-family="Menlo, monospace">${t}</text>`;
  return `<svg width="640" height="208" viewBox="0 0 640 208" xmlns="http://www.w3.org/2000/svg">
  <text x="10" y="16" font-size="10" font-weight="700">STEP 1–2 · roof = "part of T(n)"</text>
  <rect x="10" y="52" width="170" height="10" fill="#bbb" stroke="#1b1b1b"/>
  <rect x="20" y="62" width="150" height="90" fill="none" stroke="#1b1b1b"/>
  ${chip(16, 28, 56, '14n²')}${chip(80, 28, 40, '4n')}${chip(128, 28, 30, '6')}
  <line x1="0" y1="152" x2="190" y2="152" stroke="#1b1b1b" stroke-width="2"/><text x="186" y="166" font-size="8.5" text-anchor="end">street</text>
  <text x="200" y="16" font-size="10" font-weight="700">STEP 3 · n grows, 14n² crowds them off</text>
  <rect x="200" y="52" width="170" height="10" fill="#bbb" stroke="#1b1b1b"/>
  <rect x="210" y="62" width="150" height="90" fill="none" stroke="#1b1b1b"/>
  ${chip(206, 26, 150, '14n²')}${chip(366, 128, 34, '4n')}${chip(404, 128, 26, '6')}
  <line x1="190" y1="152" x2="440" y2="152" stroke="#1b1b1b" stroke-width="2"/>
  <text x="398" y="106" font-size="8.5" text-anchor="middle">outgrown, not gone:</text><text x="398" y="118" font-size="8.5" text-anchor="middle">still &gt; 0</text>
  <text x="450" y="16" font-size="10" font-weight="700">LATER · roof = "≥ T(n)"</text>
  <rect x="450" y="52" width="100" height="10" fill="#bbb" stroke="#1b1b1b"/>
  ${chip(456, 26, 88, '15·n²', '#e7f2e7')}
  <rect x="470" y="62" width="60" height="140" fill="none" stroke="#1b1b1b" stroke-dasharray="3 2"/>
  ${chip(474, 176, 52, 'n²', '#f7e7e7')}
  <line x1="440" y1="152" x2="640" y2="152" stroke="#1b1b1b" stroke-width="2"/>
  <text x="536" y="178" font-size="8.5">basement:</text><text x="536" y="190" font-size="8.5">n² alone &lt; T(n)</text>
  </svg>`;
}

function part1() {
  return `
<div class="page"><span class="tag">Part 1 · Learn</span><h2>What Big-O actually claims</h2>
<p>Big-O answers one question: <b>as the input gets bigger, how fast does the amount of work grow?</b> The answer always comes as a <i>ceiling</i>.</p>
<h3>The letters</h3>
<ul>
<li><b>n</b> is the size of the input, say how many items are in a list. It counts things, so it is a whole number.</li>
<li><b>T(n)</b> is the number of steps the code takes on an input of size n. The running example in this packet is <span class="mono">T(n) = 14n² + 4n + 6</span>.</li>
<li>The pieces added together are its <b>terms</b>. The biggest, <span class="mono">14n²</span>, is the <b>leading term</b>; <span class="mono">4n</span> and <span class="mono">6</span> are the <b>lower order terms</b>.</li>
</ul>
<div class="defn"><div class="big">T(n) = O(f(n))</div>
means: <b>there is</b> a fixed number c &gt; 0 (the constant) <b>and</b> a starting point n₀ such that
<div class="big">T(n) ≤ c · f(n) &nbsp;for every n ≥ n₀</div>
From n₀ on, c·f(n) never drops below T(n). That is the whole promise.</div>
<p>Because it is only a ceiling, it says <b>nothing</b> about how many seconds the code takes, <b>nothing</b> about small inputs, and <b>nothing</b> about T(n) being anywhere near the ceiling. <span class="mono">T(n) = 6</span> is O(n²) too.</p>
<div class="note"><b>One convention, fixed before any arithmetic.</b> This packet writes <span class="mono">n ≥ n₀</span>, the way Kleinberg &amp; Tardos and CLRS do, so n₀ is the <i>first</i> n the promise covers. Some courses write <span class="mono">n &gt; n₀</span>, making n₀ the <i>last</i> n allowed to fail. Same claim; every "smallest n₀" answer shifts by one. Check which one a problem set means.</div>

<h3>The picture: a building</h3>
<p>The interactive page tells this as a building, and several questions refer to it. T(n) starts on the roof with all its terms standing side by side. As n grows, 14n² swells and shoulders the small terms off the edge onto the street. Later, a candidate ceiling c·f(n) is tested against the roof: on it if it is at or above T(n), sent to the basement if it is below.</p>
${building()}
<div class="warn"><b>The roof changes meaning once.</b> At first "on the roof" means <i>is a term of T(n)</i> (membership, not size, which is why 6 stands level with 14n²). Later it means <i>is at or above T(n)</i>. Under the first reading n² belongs on the roof; under the second it goes to the basement. Keep the two questions apart: <i>what is T(n) made of?</i> versus <i>what sits above T(n)?</i></div>
</div>

<div class="flow"><span class="tag">Part 1 · Try it</span><h2>Find the constant and the threshold yourself</h2>
<div class="try"><span class="tag">Activity A · fill in the table</span>
<p>T(n) = 14n² + 4n + 6. Fill every empty cell, then answer underneath. (The first row is done for you.)</p>
<table class="blank wide"><tr><th>n</th><th>T(n)</th><th>14n²</th><th>15n²</th><th>15n² ≥ T(n)?</th><th>n²</th><th>4n + 6</th><th>n² ≥ 4n + 6?</th></tr>
<tr><td>1</td><td>24</td><td>14</td><td>15</td><td>no</td><td>1</td><td>10</td><td>no</td></tr>
${[2, 3, 4, 5, 6, 7, 8].map((n) => `<tr><td>${n}</td>${'<td></td>'.repeat(7)}</tr>`).join('')}
</table>
<ol>
<li>Is 14n² ≥ T(n) in <i>any</i> row? Cancel 14n² from both sides of <span class="mono">14n² ≥ 14n² + 4n + 6</span>. What is left, and why can it never be true? ${writeLines(2)}</li>
<li>What is the first n where 15n² ≥ T(n)? Compare the two "?" columns. Why do they flip at the same row? ${writeLines(2)}</li>
<li>At n = 11, 4n + 6 is 50 and T(11) is 1744, under 3 percent. Does that make 4n + 6 "negligible" for the inequality? ${writeLines(2)}</li>
</ol></div>

<div class="try"><span class="tag">Activity B · plot the gap</span>
<p>The distance between the ceiling and T(n) is <span class="mono">15n² − T(n) = n² − 4n − 6</span>. Plot it for n = 0 … 8 and join the dots. Where it is <b>below</b> zero, the ceiling is short. Shade that stretch. Where does the curve cross zero (roughly)? Why is n₀ the next <i>whole</i> number and not the crossing itself?</p>
${plotGrid({ xs: [0, 1, 2, 3, 4, 5, 6, 7, 8], yMin: -15, yMax: 30, yStep: 5, yLabel: 'n² − 4n − 6', w: 640, h: 360 })}
${writeLines(2)}</div>
</div>

<div class="page"><span class="tag">Part 1 · Learn</span><h2>Why the constant is 15, not 14</h2>
<h3>The small terms are outgrown, not killed</h3>
<p>4n + 6 does not shrink as n grows; it grows too. What shrinks is its <i>share</i>, <span class="mono">(4n + 6) / T(n)</span>. <b>A small share is not a small number.</b> 14n² on its own falls short of T(n) by exactly 4n + 6, at every n, forever. So c = 14 never works, not for any n₀.</p>
<h3>Raising c pays for what you stopped naming</h3>
<p>Raising the constant by one is worth exactly one whole n², because <span class="mono">15n² − 14n² = n²</span>. The question becomes: is one spare n² enough to cover 4n + 6? That is <span class="mono">n² ≥ 4n + 6</span>, which first holds at n = 6 (at n = 5: 25 vs 26, still short by one; at n = 6: 36 vs 30). The two curves cross at n ≈ 5.16, and n counts things, so the first whole n past the crossing is the answer: <b>n₀ = 6</b>.</p>
<div class="note">The moment the <i>shape</i> n² outgrows the terms you dropped is exactly the moment c = 15 starts working. <span class="mono">15n² ≥ T(n)</span> and <span class="mono">n² ≥ 4n + 6</span> are the same inequality.</div>
<h3>What multiplying by c does</h3>
<p>c·f(n) <b>stretches</b> the curve vertically. It never bends it. That is the whole mechanism: n² is too small by itself (it rides the elevator to the basement), and 15·n² is the same shape lifted until it clears T(n) from n₀ on. The constant is the elevator ticket. It can never turn one shape into another: <span class="mono">c·n² ≥ n³</span> rearranges to <span class="mono">c ≥ n</span>, which fails the moment n passes c.</p>
<p>The word <b>asymptotic</b> names the "from some point onward" part: tiny inputs may be messy; only the long run counts.</p>
<h3>The ceiling does not have to be low</h3>
<table><tr><th>ceiling</th><th>c</th><th>holds from</th><th>check</th></tr>
<tr><td class="mono">15n²</td><td>15</td><td>n = 6</td><td class="l small">540 ≥ 534 at n = 6</td></tr>
<tr><td class="mono">100n²</td><td>100</td><td>n = 1</td><td class="l small">100 ≥ 24 at n = 1</td></tr>
<tr><td class="mono">n³</td><td>1</td><td>n = 15</td><td class="l small">n = 14: 2744 &lt; 2806; n = 15: 3375 ≥ 3216</td></tr></table>
<p>All three are true. So T(n) = O(n²) <i>and</i> T(n) = O(n³) (and O(n⁴)…), each weaker than the last. n² is worth saying because it is the lowest ceiling that fits. That stronger claim, pinned from both sides, is <b>Θ</b> ("theta"): <span class="mono">14n² ≤ T(n) ≤ 15n²</span> for every n ≥ 6, so T(n) = Θ(n²). Big-O alone only ever promises the ceiling.</p>
<div class="warn">Trap: n³ meets 14n² at exactly n = 14 (both 2744). That is <i>not</i> where n³ passes T(n); the bound is against T(n), not its leading term. n³ is still 62 short at n = 14.</div>

<div class="try"><span class="tag">Activity C · c and n₀ trade against each other</span>
<p>For each constant, find the smallest n₀ with T(n) ≤ c·n² for every n ≥ n₀. Hint: T(n) ≤ c·n² is <span class="mono">(c − 14)n² − 4n − 6 ≥ 0</span>.</p>
<table class="blank"><tr><th>c</th><th>14</th><th>15</th><th>16</th><th>17</th><th>18</th><th>50</th></tr><tr><th>smallest n₀</th><td></td><td></td><td></td><td></td><td></td><td></td></tr></table>
<p class="small">What happens to n₀ as c goes up? Is any of these pairs a "better" proof that T(n) = O(n²)?</p>${writeLines(2)}</div>
</div>`;
}

function part2() {
  return `<div class="page"><span class="tag">Part 2 · Learn</span><h2>Reading growth off code, and the ladder</h2>
<h3>What a loop does to its counter decides the shape</h3>
<table class="wide"><tr><th class="l">Pattern</th><th class="l">Count</th><th>Bound</th></tr>
<tr><td class="l">counter goes down (or up) by 1 each pass</td><td class="l">n passes</td><td>O(n)</td></tr>
<tr><td class="l">counter is <b>divided</b> (halved) each pass</td><td class="l">about log₂ n passes (n = 1000 → 9)</td><td>O(log n)</td></tr>
<tr><td class="l">loop inside a loop, both over n</td><td class="l">n · n</td><td>O(n²)</td></tr>
<tr><td class="l">inner loop runs i times (i = 0 … n−1)</td><td class="l">0 + 1 + … + (n−1) = n(n−1)/2</td><td>still Θ(n²)</td></tr>
<tr><td class="l">stage A, <b>then</b> stage B (one after the other)</td><td class="l">cost(A) + cost(B)</td><td>the larger one</td></tr>
<tr><td class="l">stage B <b>inside</b> stage A (nested)</td><td class="l">cost(A) × cost(B)</td><td>the product</td></tr></table>
<p>Halving the work does not change the class: the ½ is a constant factor and disappears into c.</p>
<h3>The ladder everything gets read against</h3>
<p class="mono" style="font-size:11.5pt;text-align:center">1 &lt; log n &lt; √n &lt; n &lt; n log n &lt; n² &lt; n³ &lt; 2ⁿ &lt; n!</p>
<p>The gaps are not the same size. n and n log n are near neighbours (the log is 20 at a million); n² and 2ⁿ are worlds apart. Every exponential eventually beats every polynomial, even n¹⁰⁰ (the crossing is near n = 1000, and Big-O does not care how late it is).</p>
<h3>Rules of thumb, and where they break</h3>
<ul>
<li><b>Constant factors are forgiven</b>: 2ⁿ⁺¹ = 2·2ⁿ = O(2ⁿ); log(n²) = 2 log n = O(log n); the base of a log never matters (log₂ n = log n / log 2).</li>
<li><b>Constants inside an exponent are not</b>: 2²ⁿ = 4ⁿ, and 4ⁿ/2ⁿ = 2ⁿ passes every c. (log n)² is not O(log n).</li>
<li><b>f = O(g) runs one way.</b> n = O(n log n) but not the reverse. When it runs both ways the pair is Θ of each other.</li>
<li><b>O(1)</b> means the cost stops depending on n. Not "one step", not "always the same", not "fast": a routine that always takes 40,000 steps is O(1).</li>
<li><b>O is not "worst case".</b> Worst, best and average case are three different functions of n; O, Ω, Θ are three ways to bound a function. Quicksort's worst case is O(n²) and its best case is O(n log n); both are Big-O statements.</li>
</ul>
<div class="try"><span class="tag">Activity D · count it</span>
<pre class="code">k = n
while k > 1:
    k = k // 2
    step()</pre>
<table class="blank"><tr><th>n</th><th>1</th><th>2</th><th>8</th><th>10</th><th>100</th><th>1000</th></tr><tr><th>step() calls</th><td></td><td></td><td></td><td></td><td></td><td></td></tr></table>
<pre class="code">for i in range(n):
    for j in range(i):
        step()</pre>
<table class="blank"><tr><th>n</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>10</th></tr><tr><th>step() calls</th><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><th>n(n−1)/2</th><td></td><td></td><td></td><td></td><td></td><td></td></tr></table>
</div></div>`;
}

function part3() {
  const rows = [0, 1, 2, 3, 4, 5, 6];
  return `<div class="page"><span class="tag">Part 3 · Learn</span><h2>Proving things from the definition</h2>
<h3>The quantifiers are the claim</h3>
<p>∃ means "there is at least one", ∀ means "for every", ¬ means "it is not the case that".</p>
<div class="defn"><div class="big">f(n) = O(g(n)) &nbsp;⇔&nbsp; ∃c &gt; 0 &nbsp;∃n₀ &nbsp;∀n ≥ n₀ : f(n) ≤ c·g(n)</div>
Read left to right: each thing is chosen knowing only what stands to its left. c and n₀ are fixed <i>once</i>, then every n from n₀ on must obey. Move ∃c inside ∀n and the constant may change with n, which makes the condition true of everything and so worthless. Change ∃c to ∀c and you get the much stronger <b>o</b> ("little o").</div>
<h3>A proof of f = O(g) is a witness plus a check</h3>
<p>Name a c and an n₀, then show the inequality holds for every n ≥ n₀. Nothing asks for the smallest c. <b>Any pair that holds is a correct proof.</b> Rearranging algebra without naming the pair is not a proof.</p>
<h3>Negating it</h3>
<p>Walk left to right: every ∃ becomes ∀ and every ∀ becomes ∃, <b>nothing changes places</b>, and the relation at the end flips:</p>
<div class="given" style="text-align:center">f ≠ O(g) &nbsp;⇔&nbsp; ∀c &gt; 0 &nbsp;∀n₀ &nbsp;∃n ≥ n₀ : f(n) &gt; c·g(n)</div>
<p>In words: whatever c and n₀ somebody offers, there is an n at or past n₀ that breaks them. (Two ∀ next to each other may swap; order only matters across a change of quantifier.)</p>
<h3>Proof by contradiction: the template</h3>
<ol>
<li><b>Assume</b> f = O(g): there are <i>some</i> c &gt; 0 and n₀ with f(n) ≤ c·g(n) for all n ≥ n₀. You do not get to choose them.</li>
<li><b>Rearrange</b> keeping c as a letter (divide by something positive, keep the direction).</li>
<li><b>Build the breaking n out of c</b> (and make sure it is ≥ n₀, e.g. take the larger of the two). It must pass the ceiling strictly, not just reach it.</li>
<li><b>Conclude</b>: this contradicts the assumed pair, whichever it was, so no pair exists.</li>
</ol>
<div class="warn"><b>The classic slip</b>: writing "n log n ≤ n" on line one. That silently sets c = 1, and the contradiction then rules out c = 1 and nothing else.</div>
<div class="warn"><b>Another</b>: "f is O(n²) and g is O(n²), so f = O(g)". A shared ceiling relates each function to the ceiling, not to each other (n² and n are both O(n²); n² is not O(n)). Transitivity is f = O(g) and g = O(h) ⇒ f = O(h).</div>
</div>
<div class="flow"><span class="tag">Part 3 · Try it</span><h2>Where are the failures?</h2>
<div class="try"><span class="tag">Activity E · the tier's running example</span>
<p>f(n) = n² and g(n) = (n − 1)(n − 2) + 1 = n² − 3n + 3. Fill in the table and mark each c·g column ✓ where c·g(n) ≥ f(n).</p>
<table class="blank wide"><tr><th>n</th><th>f(n) = n²</th><th>g(n)</th><th>1·g</th><th>2·g</th><th>3·g</th><th>4·g</th></tr>
${rows.map((n) => `<tr><td>${n}</td>${'<td></td>'.repeat(6)}</tr>`).join('')}</table>
<ol><li>For c = 3, which n fail? Is it the small ones? What is the smallest n₀? ${writeLines(1)}</li>
<li>For c = 2, what is the smallest n₀? ${writeLines(1)}</li>
<li>Show that 4g(n) − f(n) is a perfect square times a constant. What does that tell you about c = 4? ${writeLines(2)}</li>
<li>Why does c = 1 never work? (Cancel.) ${writeLines(1)}</li></ol></div>
</div>`;
}

function part4() {
  return `<div class="page"><span class="tag">Part 4 · Learn</span><h2>The family: O, Ω, Θ, o, ω</h2>
<table class="wide"><tr><th>Say</th><th>Reads like</th><th class="l">Definition (from some n₀ on)</th><th class="l">Meaning</th></tr>
<tr><td>f = O(g)</td><td>≤</td><td class="l mono small">∃c ∃n₀ ∀n≥n₀: f(n) ≤ c·g(n)</td><td class="l">ceiling</td></tr>
<tr><td>f = Ω(g)</td><td>≥</td><td class="l mono small">∃c ∃n₀ ∀n≥n₀: f(n) ≥ c·g(n)</td><td class="l">floor</td></tr>
<tr><td>f = Θ(g)</td><td>=</td><td class="l mono small">both: c₁·g ≤ f ≤ c₂·g</td><td class="l">tight, same shape</td></tr>
<tr><td>f = o(g)</td><td>&lt;</td><td class="l mono small">∀c ∃n₀ ∀n≥n₀: f(n) ≤ c·g(n)</td><td class="l">falls behind by every factor</td></tr>
<tr><td>f = ω(g)</td><td>&gt;</td><td class="l mono small">∀c ∃n₀ ∀n≥n₀: f(n) ≥ c·g(n)</td><td class="l">pulls away by every factor</td></tr></table>
<ul>
<li><b>Transpose symmetry:</b> f = O(g) ⇔ g = Ω(f), and f = o(g) ⇔ g = ω(f). Θ is its own transpose, which is why it reads like equality.</li>
<li><b>"At least O(n²)" is empty.</b> O is already a ceiling; putting a floor word in front rules nothing out. Say Ω(n²).</li>
<li><b>Where the analogy breaks:</b> any two numbers compare, but not any two functions. n and n^(1 + sin n) are neither O nor Ω of each other: the exponent keeps swinging between 0 and 2.</li>
<li><b>Notation inside an equation</b> (e.g. 2n² + Θ(n) = Θ(n²)): on the left it means "for every function in the set", on the right "there is one". Each "=" in a chain may lose detail, never invent it.</li>
<li><b>f + o(f) = Θ(f)</b>: lower order terms don't change the class, stated so it can be checked (c₁ = 1, c₂ = 2).</li>
</ul>
<h3>Facts to carry (lg = log₂)</h3>
<ul>
<li><b>lg(n!) = Θ(n lg n)</b>. Upper: n! ≤ nⁿ. Lower: the top half of the factors are each ≥ n/2, so n! ≥ (n/2)^(n/2). This is why comparison sorting needs about n lg n comparisons.</li>
<li><b>n^(1/lg n) = 2</b> for every n &gt; 1: a constant in disguise.</li>
<li><b>lg*(n)</b> = how many times you take lg before reaching 1. lg*(2^65536) = 5. Grows more slowly than lg lg n.</li>
<li><b>Polylog &lt; polynomial &lt; exponential</b>: lgᵏ n = o(n^ε) for any ε &gt; 0, and nᵏ = o(bⁿ) for any b &gt; 1. Between polylog and polynomial live things like 2^√(2 lg n).</li>
</ul>
<h3>Every Θ proof has the same shape</h3>
<p>An upper bound, a lower bound, and one threshold past which both hold: produce c₁, c₂ &gt; 0 and n₀. Often the lower bound is where the idea is.</p>
<div class="try"><span class="tag">Warm-up</span>
<p>1. Show 2ⁿ⁺¹ = Θ(2ⁿ) by naming c₁, c₂. &nbsp; 2. Show 2²ⁿ ≠ O(2ⁿ) in one line. &nbsp; 3. Compute lg(8!) and 8 lg 8 and (8/2)(lg 8 − 1).</p>${writeLines(3)}</div>
</div>`;
}

function part5() {
  return `<div class="page"><span class="tag">Part 5 · Learn</span><h2>Why anybody reaches for this</h2>
<h3>Worst case, by default</h3>
<p>An average needs a probability distribution over inputs, and real inputs don't come from a distribution you know. A worst-case bound is a promise about <i>every</i> input. Average-case analysis is done (quicksort) but its answer depends on the assumption.</p>
<h3>Efficient = polynomial time</h3>
<p>A running time is <b>polynomial</b> if it is O(nᵈ) for some constant d. The property the definition is built on: <b>doubling the input multiplies the time by a constant</b>, c(2n)ᵈ = 2ᵈ·cnᵈ, whatever n was. Doubling the input to 2ⁿ <i>squares</i> the time. The line is about scaling, not speed: n¹⁰⁰ is polynomial and hopeless; n^(1 + 0.02 lg n) is not polynomial yet usable.</p>
<ul><li>d need not be whole: n^1.59, √n, and n log n (≤ n²) are all polynomial.</li>
<li>A polynomial a₀ + a₁n + … + a_d nᵈ with a_d &gt; 0 is Θ(nᵈ) whatever the signs of the others: each term is ≤ |aⱼ|nᵈ for n ≥ 1, and a fixed-size sum of O(nᵈ) terms is O(nᵈ). The leading term need not be largest at every n (in n² − 100n + 5000, 5000 leads until n = 50, 100n until n = 100).</li>
<li>A missing <b>log base</b> is fine (bases differ by a constant factor). A missing <b>exponential base</b> is not: (r/s)ⁿ is unbounded. At a million steps a second, 1.5⁵⁰ steps is about 11 minutes, 2⁵⁰ is about 36 years.</li></ul>
<h3>Where running times come from</h3>
<table class="wide"><tr><th>Bound</th><th class="l">Usual cause</th></tr>
<tr><td>O(log n)</td><td class="l">throw away half of what is left each step (binary search)</td></tr>
<tr><td>O(n)</td><td class="l">one pass, constant work per item (max, merging two sorted lists)</td></tr>
<tr><td>O(n log n)</td><td class="l">split in half, recurse, combine in linear time (mergesort); or sort then one pass</td></tr>
<tr><td>O(n²)</td><td class="l">all pairs (closest pair, the obvious way)</td></tr>
<tr><td>O(n³)</td><td class="l">three nested loops (every pair of sets, check for a common element)</td></tr>
<tr><td>O(nᵏ)</td><td class="l">all subsets of fixed size k</td></tr>
<tr><td>O(2ⁿ)</td><td class="l">all subsets (brute-force search)</td></tr>
<tr><td>O(n!)</td><td class="l">all orderings / all ways to pair n with n</td></tr></table>
<div class="note"><b>What an algorithm buys.</b> A stable matching instance has n! possible pairings but the propose-and-reject algorithm finds a stable one in O(n²) steps. A compact input implicitly describes a huge search space; finding structure that lets you skip enumerating it is what algorithm design is. (See the Gale-Shapley packet.)</div>
<div class="try"><span class="tag">Activity F · doubling</span>
<table class="blank"><tr><th>running time</th><th>n</th><th>n²</th><th>n³</th><th>n⁵</th><th>2ⁿ (n: 10 → 20)</th></tr><tr><th>factor when input doubles</th><td></td><td></td><td></td><td></td><td></td></tr></table>
<p class="small">At 10⁶ steps per second, how long is 2⁵⁰ steps? And 1.5⁵⁰ (≈ 6.4 × 10⁸)?</p>${writeLines(2)}</div>
</div>`;
}

function summary() {
  return `<div class="page summary"><span class="tag">Keep this page</span><h2>One-page summary</h2>
<div class="two"><div>
<h3>The definition</h3><p class="mono">T(n) = O(f(n)) ⇔ ∃c&gt;0 ∃n₀ ∀n≥n₀: T(n) ≤ c·f(n)</p>
<ul><li>A ceiling, not a measurement. No seconds, no small inputs, no closeness.</li>
<li>n₀ = first n covered (n ≥ n₀ convention).</li>
<li>Witness = one pair (c, n₀) + a check. Not unique; smallest earns nothing.</li>
<li>c stretches, never bends. c·n² never catches n³.</li>
<li>Lower-order terms are <i>paid for</i> by raising c, not deleted. Small share ≠ small number.</li>
<li>For 14n² + 4n + 6: c = 14 never; c = 15 from n₀ = 6; c = 18 from 2.</li></ul>
<h3>Growth ladder</h3><p class="mono">1 &lt; lg* n &lt; lg lg n &lt; log n &lt; √n &lt; n &lt; n log n &lt; n² &lt; n³ &lt; 2ⁿ &lt; n! &lt; nⁿ</p>
<h3>Code shapes</h3><ul><li>subtract → n; divide → log n; nested → ×; sequential → + (keep the larger)</li><li>Σ i for i &lt; n = n(n−1)/2 = Θ(n²)</li></ul>
</div><div>
<h3>The family</h3><ul><li>O ≤ · Ω ≥ · Θ = · o &lt; · ω &gt;</li><li>O(g) ⇔ transpose Ω; o ⇔ ω</li><li>Not every pair of functions compares.</li><li>In equations: left side ∀, right side ∃.</li></ul>
<h3>Proofs</h3><ul><li>Negate: flip every quantifier, keep order, flip relation.</li><li>Contradiction: keep c general; build breaking n from c and n₀; pass the ceiling strictly.</li><li>Shared ceiling ≠ transitivity.</li><li>Θ proof: c₁, c₂, one n₀.</li></ul>
<h3>Rewrites</h3><ul><li>Constant factors forgiven; constants in exponents not.</li><li>Log base: irrelevant. Exponential base: matters.</li><li>lg(n!) = Θ(n lg n); n^(1/lg n) = 2.</li></ul>
<h3>Efficiency</h3><ul><li>Worst case by default (no distribution needed).</li><li>Polynomial = O(nᵈ), constant d; doubling n costs ×2ᵈ.</li><li>Exponential: doubling n squares the cost.</li></ul>
</div></div></div>`;
}

function activityKey() {
  const r = (n) => `<tr><td>${n}</td><td>${T(n)}</td><td>${14 * n * n}</td><td>${15 * n * n}</td><td>${15 * n * n >= T(n) ? 'yes' : 'no'}</td><td>${n * n}</td><td>${4 * n + 6}</td><td>${n * n >= 4 * n + 6 ? 'yes' : 'no'}</td></tr>`;
  const gap = (n) => n * n - 4 * n - 6;
  const pts = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, gap(n), gap(n) < 0 ? '#b23a3a' : '#2e7d32']);
  const g = (n) => n * n - 3 * n + 3;
  const ck = (n, c) => `${c * g(n)}${c * g(n) >= n * n ? ' ✓' : ' ✗'}`;
  const minN0 = (c) => { let last = -1; for (let n = 1; n < 500; n++) if (T(n) > c * n * n) last = n; return last >= 499 ? 'none' : last + 1; };
  return `<section class="k"><div class="khead">Activity A</div>
<table class="wide"><tr><th>n</th><th>T(n)</th><th>14n²</th><th>15n²</th><th>15n² ≥ T?</th><th>n²</th><th>4n+6</th><th>n² ≥ 4n+6?</th></tr>${[1, 2, 3, 4, 5, 6, 7, 8].map(r).join('')}</table>
<p>1. Never: it cancels to 0 ≥ 4n + 6, and 4n + 6 is positive at every n. 2. n = 6; the columns flip together because 15n² ≥ T(n) is the same inequality as n² ≥ 4n + 6. 3. No: the share is small but the amount is 50 and growing; 14n² is short by exactly that much at every n.</p></section>
<section class="k"><div class="khead">Activity B</div>
${plotGrid({ xs: [0, 1, 2, 3, 4, 5, 6, 7, 8], yMin: -15, yMax: 30, yStep: 5, yLabel: 'n² − 4n − 6', w: 400, h: 230, points: pts, lines: [{ pts: Array.from({ length: 81 }, (_, i) => [i / 10, gap(i / 10)]) }] })}
<p>Values: ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${n}→${gap(n)}`).join(', ')}. Negative from 0 through 5, crosses zero at n = 2 + √10 ≈ 5.16. n is a whole number and the rule covers every n ≥ n₀, so the first whole n past the crossing, 6, is n₀.</p></section>
<section class="k"><div class="khead">Activity C</div>
<table><tr><th>c</th><th>14</th><th>15</th><th>16</th><th>17</th><th>18</th><th>50</th></tr><tr><th>n₀</th><td>none</td>${[15, 16, 17, 18, 50].map((c) => `<td>${minN0(c)}</td>`).join('')}</tr></table>
<p>Bigger constant, earlier threshold. Every pair is an equally good witness; nothing rewards the tightest.</p></section>
<section class="k"><div class="khead">Activity D</div>
<p>Halving loop: n = 1 → 0, 2 → 1, 8 → 3, 10 → 3, 100 → 6, 1000 → 9. About log₂ n: O(log n).<br>Triangular loop: n = 1 → 0, 2 → 1, 3 → 3, 4 → 6, 5 → 10, 10 → 45, matching n(n−1)/2. Θ(n²).</p></section>
<section class="k"><div class="khead">Activity E</div>
<table class="wide"><tr><th>n</th><th>f</th><th>g</th><th>1·g</th><th>2·g</th><th>3·g</th><th>4·g</th></tr>${[0, 1, 2, 3, 4, 5, 6].map((n) => `<tr><td>${n}</td><td>${n * n}</td><td>${g(n)}</td><td>${ck(n, 1)}</td><td>${ck(n, 2)}</td><td>${ck(n, 3)}</td><td>${ck(n, 4)}</td></tr>`).join('')}</table>
<p>1. c = 3 fails only at n = 2 (the middle, not the start): n₀ = 3, since 3g − f = (2n − 3)(n − 3) is negative only between 1.5 and 3. 2. c = 2 fails at 2, 3, 4: n₀ = 5. 3. 4g − f = 3n² − 12n + 12 = 3(n − 2)² ≥ 0, so c = 4 works from n₀ = 1 (touching at n = 2), and nothing below 4 survives n = 2. 4. c = 1 cancels to 3n ≤ 3, true at n = 1 only: every larger n fails.</p></section>
<section class="k"><div class="khead">Part 4 warm-up</div>
<p>1. 2ⁿ⁺¹ = 2·2ⁿ, so c₁ = c₂ = 2 (any c₁ ≤ 2 ≤ c₂). 2. 2²ⁿ / 2ⁿ = 2ⁿ, which passes every constant. 3. lg(8!) = lg 40320 ≈ 15.3; 8 lg 8 = 24; (8/2)(lg 8 − 1) = 8. So 8 ≤ 15.3 ≤ 24, as the two bounds say.</p></section>
<section class="k"><div class="khead">Activity F</div>
<p>×2, ×4, ×8, ×32; for 2ⁿ going from n = 10 to 20 the time is multiplied by 2¹⁰ = 1024, i.e. squared (2²⁰ = (2¹⁰)²), and the factor itself grows with n. 2⁵⁰ / 10⁶ s ≈ 1.13 × 10⁹ s ≈ 36 years; 1.5⁵⁰ / 10⁶ ≈ 638 s ≈ 11 minutes.</p></section>`;
}

export function buildBigO() {
  const BANK = loadBigO();
  const byTier = {};
  for (const q of BANK) (byTier[q.tier] ??= []).push(q);
  const parts = { 1: part1(), 2: part2(), 3: part3(), 4: part4(), 5: part5() };

  let body = `<div class="cover"><span class="tag">Algorithms · printable workbook</span>
<h1>The Big-O Building</h1><div class="sub">The definition of Big-O, learned on paper: a walkthrough, six hands-on activities, 45 questions in five tiers, and a full answer key that explains every wrong option too.</div>
<h3>How to use this packet</h3><ol>
<li>Work through it in order. Each part starts with <b>Learn</b> pages, then <b>Try it</b> activities, then that tier's questions.</li>
<li>Use a pencil. Every question has space to mark your answer and, for multiple choice, a line to say why you ruled out the option you almost picked.</li>
<li>Each question names the <b>skill</b> it checks. Every wrong option is a real misconception somebody holds.</li>
<li>The <b>answer key</b> starts on its own page at the back, so you can tear it off. It explains <i>every</i> option, not only the right one. Read the explanations for the options you didn't pick too; that's where most of the learning is.</li>
<li>Some questions mention "the page" or "the walkthrough": that's the interactive site these come from. Part 1 here covers the same ground, including the building picture.</li></ol>
<table class="toc" style="margin-top:14pt">${[1, 2, 3, 4, 5].map((t) => `<tr><td><b>Part ${t}</b></td><td>${TIER_NAMES[t]}</td><td>${byTier[t].length} questions</td></tr>`).join('')}
<tr><td><b>Summary</b></td><td>One page to keep</td><td></td></tr><tr><td><b>Key</b></td><td>Answers to the activities and every question</td><td></td></tr></table></div>`;

  const keys = [];
  for (const t of [1, 2, 3, 4, 5]) {
    body += parts[t];
    body += `<div class="flow"><span class="tag">Part ${t} · Questions</span><h2>Tier ${t}: ${TIER_NAMES[t]}</h2>`;
    byTier[t].forEach((q, i) => {
      const num = `${t}.${i + 1}`;
      body += renderQ(num, q);
      keys.push(renderKey(num, q, { witnessLabels: WITNESS_LABELS[q.tests] }));
    });
    body += '</div>';
  }
  body += summary();
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: activities</h2><p class="keyintro">Try everything before you look.</p>${activityKey()}</div>`;
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: questions</h2>${keys.join('')}</div>`;
  return doc('The Big-O Building: printable workbook', body);
}
