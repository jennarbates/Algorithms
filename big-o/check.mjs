// The practice bank, checked rather than trusted.
//
// The page is one hand-written HTML file with no build step and no test runner,
// which is fine for the drawing and not fine for the questions: a question bank
// asserts arithmetic, and arithmetic that nobody recomputes is arithmetic that
// drifts. So this script lifts the bank straight out of index.html, evaluates it,
// and then recomputes every number the questions claim.
//
// It reads the same source the browser reads. There is no second copy of the bank
// to fall out of step with the first.
//
//   node check.mjs
//
// Exits non-zero on the first thing it cannot confirm.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, 'index.html'), 'utf8');

const open = html.indexOf('const BANK = [');
const close = html.indexOf('\n  ];', open);
if (open < 0 || close < 0) throw new Error('could not find the question bank in index.html');
const source = html.slice(open + 'const BANK = '.length, close + 4);

// The bank is data plus a few arrow functions, so evaluating it is reading it.
const BANK = new Function(`return ${source};`)();

let failed = 0;
const ok = (cond, what) => {
  if (!cond) {
    failed += 1;
    console.log(`  FAIL  ${what}`);
  }
};

// --- every question can be rendered, scored, and read ----------------------

const SCENES = 9;

for (const q of BANK) {
  const id = `tier ${q.tier} · ${q.tests}`;
  ok(!!q.prompt, `${id}: no prompt`);
  ok(!!q.tests, `${id}: no "testing" line`);
  ok(!!q.close, `${id}: no closing note`);
  if (q.step != null) ok(q.step >= 0 && q.step < SCENES, `${id}: step ${q.step} is not a scene`);

  if (q.kind === 'choice') {
    ok(q.options.filter((o) => o.ok).length === 1, `${id}: a choice needs exactly one right option`);
    for (const o of q.options) ok(!!o.why, `${id}: "${o.t}" has no reason`);
  }
  if (q.kind === 'multi') {
    ok(q.options.some((o) => o.ok), `${id}: nothing in it is true`);
    ok(q.options.some((o) => !o.ok), `${id}: nothing in it is false`);
    for (const o of q.options) ok(!!o.why, `${id}: "${o.t}" has no reason`);
  }
  if (q.kind === 'order') {
    for (const it of q.items) ok(!!it.why, `${id}: "${it.t}" has no reason`);
  }
  if (q.kind === 'number') {
    ok(typeof q.answer === 'number', `${id}: no answer`);
    ok(!!q.why, `${id}: no working`);
    for (const n of q.near ?? []) ok(n.v !== q.answer, `${id}: near miss ${n.v} is the answer`);
  }
  if (q.kind === 'proof') {
    for (const [i, st] of q.steps.entries()) {
      ok(!!st.lead, `${id}: step ${i + 1} has no lead`);
      ok(st.options.filter((o) => o.ok).length === 1, `${id}: step ${i + 1} needs one right line`);
      for (const o of st.options) ok(!!o.why, `${id}: step ${i + 1}, "${o.t}" has no reason`);
    }
  }
  if (q.kind === 'witness') {
    ok(typeof q.f === 'function' && typeof q.g === 'function', `${id}: no f and g to check against`);
    ok(!!q.why, `${id}: no working`);
  }
}

// A reader who notices the right answer is always in the same place stops reading
// the others, which is where most of the teaching is. These only ask that it moves.
{
  const firsts = BANK.filter((q) => q.kind === 'choice').map((q) =>
    q.options.findIndex((o) => o.ok),
  );
  ok(new Set(firsts).size > 1, 'the right option sits in the same place in every choice question');
  for (const q of BANK.filter((q) => q.kind === 'proof')) {
    const places = q.steps.map((st) => st.options.findIndex((o) => o.ok));
    ok(
      new Set(places).size > 1,
      `tier ${q.tier} proof: every step has its right line in the same place, so it is answered by clicking down the left edge`,
    );
  }
}

for (const tier of [1, 2, 3, 4, 5]) {
  const n = BANK.filter((q) => q.tier === tier).length;
  ok(n === 9, `tier ${tier} has ${n} questions, not 9`);
}

// The tiers are a ramp, so the bank has to be in tier order: the panel walks it
// straight through and there is nothing that sorts it on the way to the screen.
ok(
  BANK.every((q, i) => i === 0 || BANK[i - 1].tier <= q.tier),
  'the bank is not in tier order',
);

// --- the arithmetic the questions assert -----------------------------------

const T = (n) => 14 * n * n + 4 * n + 6;
const f = (n) => n * n;
const g = (n) => (n - 1) * (n - 2) + 1;

/**
 * The first n at or past n₀ where f(n) <= c·g(n) fails, or null if it never does.
 *
 * The threshold is inclusive because the page follows Kleinberg and Tardos and
 * CLRS, both of which write the definition as "for all n >= n0". Under that
 * reading n₀ is the first n the claim covers, not the last one it may skip, and
 * every smallest-n₀ answer in the bank is one higher than it would be under the
 * strict convention some courses use.
 */
const firstFailure = (c, n0, span = 200000) => {
  for (let n = n0; n <= n0 + span; n += 1) if (f(n) > c * g(n)) return n;
  return null;
};

// tier 1 and 2, the claims the walkthrough's own example carries
ok(14 * 25 < T(5) && 15 * 25 < T(5) && 15 * 36 > T(6), 'c = 15 fails at n = 5 and holds from n = 6, so n₀ = 6');
ok(18 * 1 < T(1) && 18 * 4 > T(2), 'c = 18 fails at n = 1 and holds from n = 2, so n₀ = 2');
ok(14 ** 3 === 2744 && 14 * 14 ** 2 === 2744, 'n³ meets 14n² at n = 14');
ok(14 ** 3 < T(14) && 15 ** 3 > T(15), 'T(n) = O(n³) fails at n = 14 and holds from n = 15, so n₀ = 15');

// tier 3, on f(n) = n² against g(n) = (n − 1)(n − 2) + 1
ok(g(0) === 3 && g(1) === 1 && g(2) === 1 && g(3) === 3, 'g at 0, 1, 2, 3');
for (let n = 0; n <= 1000; n += 1) {
  ok(g(n) > 0, `g is positive at n = ${n}`);
  ok(4 * g(n) - f(n) === 3 * (n - 2) ** 2, `4g − f = 3(n − 2)² at n = ${n}`);
  ok(3 * g(n) - f(n) === (2 * n - 3) * (n - 3), `3g − f = (2n − 3)(n − 3) at n = ${n}`);
  ok(2 * g(n) - f(n) === n * n - 6 * n + 6, `2g − f = n² − 6n + 6 at n = ${n}`);
}
ok(firstFailure(4, 1) === null, 'c = 4 and n₀ = 1 hold everywhere');
ok(4 * g(2) === f(2), 'c = 4 is exactly tight, at n = 2');
ok(firstFailure(3.999, 0) === 2, 'anything under c = 4 fails at n = 2');
ok(firstFailure(3, 0) === 2 && firstFailure(3, 2) === 2 && firstFailure(3, 3) === null,
  'c = 3 fails at n = 2 alone, so its smallest n₀ is 3');
ok(firstFailure(2, 4) === 4 && firstFailure(2, 5) === null,
  'c = 2 fails last at n = 4, so its smallest n₀ is 5');
ok(firstFailure(1, 0) === 2 && firstFailure(1, 10000) === 10000, 'c = 1 fails forever');
ok(g(100) === 9703 && g(1000) === 997003, 'g(100) and g(1000) as the reasons quote them');

// g = O(f) as well, so the two are Θ of each other
let gUnderF = true;
for (let n = 1; n <= 200000; n += 1) if (g(n) > f(n)) gUnderF = false;
ok(gUnderF, 'g(n) <= n² for every n >= 1');
ok(g(0) > f(0), 'n = 0 is the one place g is the larger, and n₀ = 1 excludes it');

// the two numeric answers tier 3 states, against the inequality itself
const cQ = BANK.find((q) => q.tier === 3 && q.kind === 'number' && q.unit === 'c =');
ok(cQ.answer === 4 && firstFailure(cQ.answer, 1) === null && firstFailure(cQ.answer - 0.001, 1) !== null,
  'the smallest c with n₀ = 1 is 4');
const n0Q = BANK.find((q) => q.tier === 3 && q.kind === 'number' && q.unit === 'n₀ =');
ok(n0Q.answer === 3 && firstFailure(3, n0Q.answer) === null && firstFailure(3, n0Q.answer - 1) !== null,
  'the smallest n₀ with c = 3 is 3');

// the smallest-n₀ answers in tiers 1 and 2, recomputed against the inequality.
// These are the ones the threshold convention moves, so they are checked here
// rather than left to the prose.
{
  const holdsFrom = (h, n0, span = 200000) => {
    for (let n = n0; n <= n0 + span; n += 1) if (!h(n)) return false;
    return true;
  };
  const smallestN0 = (h) => {
    for (let n0 = 0; n0 <= 100000; n0 += 1) if (holdsFrom(h, n0, 5000)) return n0;
    return null;
  };

  const c18 = BANK.find((q) => q.tier === 1 && q.kind === 'number' && q.unit === 'n₀ =');
  ok(c18.answer === smallestN0((n) => T(n) <= 18 * n * n),
    `the smallest n₀ for c = 18 is ${smallestN0((n) => T(n) <= 18 * n * n)}, the bank says ${c18.answer}`);
  ok(smallestN0((n) => T(n) <= 15 * n * n) === 6, 'and the smallest n₀ for c = 15 is 6');
  ok(smallestN0((n) => T(n) <= 16 * n * n) === 3, 'for c = 16 it is 3');
  ok(smallestN0((n) => T(n) <= 50 * n * n) === 1, 'and for c = 50 it is 1');

  const P = (n) => 3 * n * n + 100 * n + 5000;
  const big = BANK.find((q) => q.tier === 2 && q.kind === 'number' && q.unit === 'n₀ =');
  ok(big.answer === smallestN0((n) => P(n) <= 4 * n * n),
    `the smallest n₀ for 3n² + 100n + 5000 under c = 4 is ${smallestN0((n) => P(n) <= 4 * n * n)}, the bank says ${big.answer}`);
}

// Nothing in the bank may state the threshold the other way round. The page
// follows CLRS and Kleinberg and Tardos, so the only place "n > n₀" is allowed
// to appear is where the difference between the two conventions is being named.
{
  const said = JSON.stringify(BANK);
  const strays = (said.match(/n > n₀/g) ?? []).length;
  ok(strays <= 1, `"n > n₀" appears ${strays} times in the bank; it belongs only where the two conventions are contrasted`);
}

// the witness question carries the same f and g this script has been using
const wQ = BANK.find((q) => q.tier === 3 && q.kind === 'witness');
for (let n = 0; n <= 200; n += 1) {
  ok(wQ.f(n) === f(n) && wQ.g(n) === g(n), `the witness question's f and g agree at n = ${n}`);
}
// and its named near misses fire on the cases they describe, and only there
ok(
  wQ.near.some((h) => h.when(1, 0, false)) &&
    wQ.near.some((h) => h.when(3, 0, false)) &&
    wQ.near.some((h) => h.when(2, 0, false)),
  'the near misses cover c = 1, c = 2 and c = 3',
);
// A hint keyed on c alone would fire on pairs that are actually correct: c = 2.5 with
// n0 = 3 holds, and the c = 2 hint would have told the reader they needed n0 = 4.
ok(!wQ.near.some((h) => h.when(4, 5, true)), 'no failure hint fires on a pair that works');
ok(!wQ.near.some((h) => h.when(2.5, 4, true)), 'no failure hint fires on c = 2.5 with n0 = 4');
ok(firstFailure(2.5, 4) === null, 'c = 2.5 with n0 = 4 really does hold');
ok(firstFailure(2.5, 3) !== null, 'and c = 2.5 with n0 = 3 really does not');

// n log₂ n against c·n, for the contradiction proof and the flawed one
ok(Math.log2(1024) === 10 && 1024 * Math.log2(1024) === 10 * 1024,
  'n log₂ n = 10n exactly at n = 1024');
ok(1025 * Math.log2(1025) > 10 * 1025, 'and breaks c = 10 at n = 1025');
for (const c of [1, 2, 5, 10, 20]) {
  const n = 2 ** (c + 1);
  ok(Math.log2(n) > c, `the witness n = 2^(c+1) clears c = ${c}`);
  ok(Math.log2(2 ** c) === c, `n = 2^c only reaches c = ${c}, which is not a contradiction`);
}

// --- tier 4, the facts the chapter leaves you with -------------------------

const lg = (x) => Math.log2(x);

// lg(n!) against n lg n, both directions
let lgFact = 0;
for (let n = 1; n <= 50000; n += 1) {
  lgFact += lg(n);
  ok(lgFact <= n * lg(n) + 1e-9, `lg(n!) <= n lg n at n = ${n}`);
  if (n >= 4) {
    ok(lgFact >= (n / 2) * (lg(n) - 1) - 1e-9, `lg(n!) >= (n/2)(lg n - 1) at n = ${n}`);
  }
}
// and no constant below 1 holds forever, which is what the near miss claims.
// Stirling puts the ratio at 1 - lg(e)/lg(n) + o(1), so it climbs to 1 from below
// and slowly. Checking that it climbs, and how far it has climbed by n = 200000,
// is what can honestly be checked with doubles.
{
  let acc = 0;
  let previous = 0;
  let climbs = true;
  let reached = 0;
  for (let n = 2; n <= 200000; n += 1) {
    acc += lg(n);
    const ratio = acc / (n * lg(n));
    if (n > 16 && ratio < previous - 1e-12) climbs = false;
    previous = ratio;
    reached = ratio;
  }
  ok(climbs, 'lg(n!) / (n lg n) should be climbing, not settling below 1');
  ok(reached > 0.9, `lg(n!) / (n lg n) only reached ${reached.toFixed(3)} by n = 200000`);
  // and the Stirling form the reason quotes agrees with the sum
  const n = 200000;
  const stirling = n * lg(n) - n * Math.LOG2E + 0.5 * lg(2 * Math.PI * n);
  ok(Math.abs(acc - stirling) < 1e-3, 'the sum of logarithms should match Stirling at n = 200000');
}

// n^(1/lg n) is the constant 2
for (const n of [2, 3, 10, 1000, 1e6, 1e12]) {
  ok(Math.abs(n ** (1 / lg(n)) - 2) < 1e-9, `n^(1/lg n) = 2 at n = ${n}`);
}

// the ranking in the ordering question, checked at a size where the order has settled
{
  const ladder = [
    ['n^(1/lg n)', (n) => n ** (1 / lg(n))],
    ['lg*(n)', (n) => { let i = 0; let x = n; while (x > 1) { x = lg(x); i += 1; } return i; }],
    ['lg lg n', (n) => lg(lg(n))],
    ['sqrt(lg n)', (n) => Math.sqrt(lg(n))],
    ['lg^2 n', (n) => lg(n) ** 2],
    ['2^sqrt(2 lg n)', (n) => 2 ** Math.sqrt(2 * lg(n))],
    ['n lg n', (n) => n * lg(n)],
  ];
  const bankOrder = BANK.find((q) => q.tier === 4 && q.kind === 'order');
  ok(
    bankOrder.items.length === ladder.length,
    `the ordering question has ${bankOrder.items.length} rows, the check has ${ladder.length}`,
  );
  // Every neighbouring pair has to be strictly ordered at every size from here up,
  // so the answer is the eventual order and not an accident of one value of n.
  // The order below is the EVENTUAL order, and several of these pairs cross late:
  // lg* only falls behind lg lg n past about 2^32, and lg² n only falls behind
  // 2^√(2 lg n) past about 2^80. Checking at a small n would fail here and would
  // be right to, which is why the question says "order of growth" and not "order
  // at n = 1000". Doubles run out at 2^1024, so 2^1000 is the last size available.
  for (const n of [2 ** 128, 2 ** 256, 2 ** 512, 2 ** 1000]) {
    for (let i = 1; i < ladder.length; i += 1) {
      ok(
        ladder[i - 1][1](n) < ladder[i][1](n),
        `${ladder[i - 1][0]} should be below ${ladder[i][0]} at n = 2^${Math.round(lg(n))}`,
      );
    }
  }
  // and the labels in the bank are the same ladder, in the same order
  ok(
    bankOrder.items.map((it) => it.t).join(' | ') ===
      'n^(1/lg n) | lg*(n) | lg lg n | √(lg n) | lg² n | 2^√(2 lg n) | n lg n',
    'the ordering question no longer matches the ladder this file checks',
  );
}

// lg* is 5 at 2^65536, which the ordering question's reason claims. That number is
// past what a double can hold, so it is checked through lg*(2^x) = 1 + lg*(x).
{
  const lgStar = (n) => { let i = 0; let x = n; while (x > 1) { x = lg(x); i += 1; } return i; };
  ok(lgStar(16) === 3, 'lg*(16) = 3');
  ok(lgStar(65536) === 4, 'lg*(65536) = 4, so lg*(2^65536) = 5');
  ok(lgStar(2 ** 1000) === 5, 'lg* is still 5 at 2^1000');
}

// 2^sqrt(2 lg n) really does sit between polylog and polynomial, and it takes its
// time about the polylog side: it only passes lg^3 n past roughly 2^400.
for (const n of [2 ** 600, 2 ** 1000]) {
  ok(2 ** Math.sqrt(2 * lg(n)) > lg(n) ** 3, `2^sqrt(2 lg n) beats lg^3 n at n = 2^${lg(n)}`);
}
for (const n of [2 ** 40, 2 ** 128, 2 ** 600, 2 ** 1000]) {
  ok(2 ** Math.sqrt(2 * lg(n)) < n ** 0.25, `2^sqrt(2 lg n) stays under n^0.25 at n = 2^${lg(n)}`);
}

// n against n^(1 + sin n): the ratio has to be unbounded in both directions
{
  let over = false;
  let under = false;
  for (let n = 2; n <= 2000000; n += 1) {
    const ratio = n ** Math.sin(n);
    if (ratio > 1000) over = true;
    if (ratio < 0.001) under = true;
  }
  ok(over && under, 'n and n^(1 + sin n) should be incomparable in both directions');
}

// the counterexamples the prove-or-disprove question leans on
ok(4 ** 20 / 2 ** 20 > 1e5, '4^n / 2^n passes any constant, so 2^(2n) is not O(2^n)');
for (const n of [10, 1000, 100000]) {
  const ratio = (1 / n) / (1 / n) ** 2;
  ok(Math.abs(ratio - n) < n * 1e-9, `f = 1/n has f / f^2 = n at n = ${n}, so f is not O(f^2)`);
}
// f = n at even n, 1 at odd n: O(n), not Theta(n), not o(n)
{
  const osc = (n) => (n % 2 === 0 ? n : 1);
  ok([...Array(1000).keys()].every((n) => osc(n) <= n), 'the oscillating f is O(n)');
  ok([...Array(1000).keys()].some((n) => n > 10 && osc(n) < n / 100), 'and is not Theta(n)');
  ok([...Array(1000).keys()].some((n) => n > 10 && osc(n) === n), 'and is not o(n)');
}

// the tier-4 witness question carries the f and g this file has been checking
{
  const w4 = BANK.find((q) => q.tier === 4 && q.kind === 'witness');
  let acc = 0;
  for (let n = 1; n <= 2000; n += 1) {
    acc += lg(n);
    ok(Math.abs(w4.f(n) - acc) < 1e-9, `the tier 4 witness f is lg(n!) at n = ${n}`);
    ok(Math.abs(w4.g(n) - n * lg(n)) < 1e-9, `the tier 4 witness g is n lg n at n = ${n}`);
  }
  ok(w4.near.some((h) => h.when(1, 0, true)), 'the c = 1, n0 = 0 pair is named');
  ok(w4.near.some((h) => h.when(0.5, 0, false)), 'a constant below 1 is named');
  ok(!w4.near.some((h) => h.when(2, 0, true)), 'no failure hint fires on a pair that works');
}

// --- tier 5, the numbers Kleinberg and Tardos quote ------------------------

// the scaling property: doubling the input multiplies a c·N^d bound by 2^d
for (const d of [1, 2, 3, 5]) {
  for (const N of [10, 1000, 1e6]) {
    ok(Math.abs((2 * N) ** d / N ** d - 2 ** d) < 1e-9, `doubling N multiplies N^${d} by 2^${d}`);
  }
}
ok(2 ** 3 === 8, 'd = 3 gives a factor of 8');

// Table 2.1, at a million instructions a second
{
  const perSecond = 1e6;
  const year = 365 * 24 * 3600;
  const years = (steps) => steps / perSecond / year;
  ok(Math.round(years(2 ** 50)) === 36, `2^50 should be about 36 years, is ${years(2 ** 50).toFixed(1)}`);
  ok(Math.round(1.5 ** 50 / perSecond / 60) === 11, `1.5^50 should be about 11 minutes, is ${(1.5 ** 50 / perSecond / 60).toFixed(1)}`);
  // and the two exponentials really are incomparable, which is the point of the question
  ok((2 / 1.5) ** 50 > 1e6, '2^n / 1.5^n passes any constant');
}

// the survey ladder, cheapest first, with k = 4
{
  const survey = [
    ['O(log n)', (n) => Math.log2(n)],
    ['O(n)', (n) => n],
    ['O(n log n)', (n) => n * Math.log2(n)],
    ['O(n^2)', (n) => n ** 2],
    ['O(n^3)', (n) => n ** 3],
    ['O(n^4)', (n) => n ** 4],
    ['O(2^n)', (n) => 2 ** n],
    ['O(n!)', (n) => { let f = 1; for (let i = 2; i <= n; i += 1) f *= i; return f; }],
  ];
  const bank5 = BANK.find((q) => q.tier === 5 && q.kind === 'order');
  ok(
    bank5.items.map((it) => it.t).join(' | ') ===
      'O(log n) | O(n) | O(n log n) | O(n²) | O(n³) | O(n⁴) | O(2ⁿ) | O(n!)',
    'the tier 5 ordering no longer matches the ladder this file checks',
  );
  // n! only passes 2^n at n = 4, and n^4 only falls behind 2^n later still, so the
  // order is the eventual one and is checked where it has settled
  for (const n of [30, 50, 100]) {
    for (let i = 1; i < survey.length; i += 1) {
      ok(
        survey[i - 1][1](n) < survey[i][1](n),
        `${survey[i - 1][0]} should be below ${survey[i][0]} at n = ${n}`,
      );
    }
  }
  // and the two facts the reasons quote about counting
  const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i += 1) r = (r * (n - i)) / (i + 1); return r; };
  for (const n of [10, 50, 500]) {
    ok(choose(n, 2) === (n * (n - 1)) / 2, `C(n,2) = n(n-1)/2 at n = ${n}`);
    ok(choose(n, 2) <= n ** 2 / 2 + 1e-6, `C(n,2) <= n^2/2 at n = ${n}`);
    ok(choose(n, 4) <= n ** 4 / 24 + 1e-6, `C(n,4) <= n^4/4! at n = ${n}`);
  }
}

// n log n <= n^2 from n = 1, which is why O(n log n) is polynomial
for (let n = 1; n <= 100000; n += 1) {
  ok(n * Math.log2(n) <= n * n + 1e-9, `n log n <= n^2 at n = ${n}`);
}

// n^(1 + 0.02 lg n) passes every fixed exponent, so it is not polynomial
for (const d of [2, 5, 100]) {
  const n = 2 ** (50 * d + 50);
  ok(1 + 0.02 * Math.log2(n) > d, `n^(1 + 0.02 lg n) passes exponent ${d} by n = 2^${50 * d + 50}`);
}

// and the degree-d polynomial claim the tier leans on, including the negative middle term
{
  const p = (n) => n * n - 100 * n + 5000;
  ok(p(0) === 5000 && p(70) === 2900 && p(0) > p(70), 'n^2 - 100n + 5000 dips before it climbs');
  // which of the three terms is the largest changes twice on the way out
  const biggest = (n) => Math.max(n * n, 100 * n, 5000);
  ok(biggest(10) === 5000 && biggest(50) === 5000, 'the constant leads up to n = 50');
  ok(biggest(51) === 5100 && biggest(99) === 9900, 'the middle term leads from 50 to 100');
  ok(biggest(101) === 101 ** 2, 'and n^2 only leads past n = 100');
  ok(50 ** 2 < 100 * 50 && 100 * 100 === 100 ** 2, 'the two crossings are at n = 50 and n = 100');
}

console.log(failed ? `\n${failed} check${failed === 1 ? '' : 's'} failed` : 'every check passed');
process.exit(failed ? 1 : 0);
