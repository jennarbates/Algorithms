// The problem-solving workbook: the skills a challenge set asks for, practised
// on problems of the same kind but never the set's own.
//
// Five parts: writing an algorithm answer in four parts, "does it always
// exist?" (algorithm or counterexample, and preferences with ties), counting
// loops whose inner work is not constant, counting proposals, and searching
// when you can only afford a few failures.
//
// Every number in the key is computed below by running the thing it describes:
// matchings are enumerated, programs are run, proposals are counted by the same
// Gale-Shapley as the other keys, and test plans are played against every
// possible answer. The closed forms the text states are asserted against those
// runs when the workbook builds, so a wrong formula stops the build.

import { run, renderQ, renderKey, doc, esc, writeLines } from './lib.mjs';

const assert = (ok, what) => {
  if (!ok) throw new Error(`prep workbook: ${what}`);
};

// ---------------------------------------------------------------------------
// Preferences with ties
// ---------------------------------------------------------------------------

// A list is an array of groups, best first; everyone in a group is tied.
const rank = (list, x) => list.findIndex((g) => g.includes(x));

/** Every pair that is an instability of matching m (m[s] = college), and whether it is strong. */
function instabilities(inst, m) {
  const holder = [];
  m.forEach((c, s) => (holder[c] = s));
  const out = [];
  inst.S.forEach((_, s) => {
    inst.C.forEach((_, c) => {
      if (m[s] === c) return;
      const s2 = holder[c];
      const rs = rank(inst.sp[s], c) - rank(inst.sp[s], m[s]);
      const rc = rank(inst.cp[c], s) - rank(inst.cp[c], s2);
      const sP = rs < 0;
      const sI = rs === 0;
      const cP = rc < 0;
      const cI = rc === 0;
      const strong = sP && cP;
      const weak = (sP && (cP || cI)) || (cP && (sP || sI));
      if (weak) out.push({ s, c, strong, sP, sI, cP, cI, has: m[s], holder: s2 });
    });
  });
  return out;
}

const perms = (n) =>
  n === 0 ? [[]] : perms(n - 1).flatMap((p) => [...Array(n).keys()].map((i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));

const showList = (list, names) => list.map((g) => (g.length > 1 ? `(${g.map((x) => names[x]).join(' = ')})` : names[g[0]])).join(' &gt; ');
const showMatching = (inst, m) => m.map((c, s) => `${inst.S[s]}–${inst.C[c]}`).join(', ');
const pairName = (inst, p) => `${inst.S[p.s]} & ${inst.C[p.c]}`;

function tieTables(inst) {
  const rows = (names, lists, other) =>
    names.map((x, i) => `<tr><td class="who">${esc(x)}</td><td class="l mono">${showList(lists[i], other)}</td></tr>`).join('');
  return `<div class="two"><table class="pref"><tr><th class="l">Student</th><th class="l">Ranking, best first</th></tr>${rows(inst.S, inst.sp, inst.C)}</table>
<table class="pref"><tr><th class="l">College</th><th class="l">Ranking, best first</th></tr>${rows(inst.C, inst.cp, inst.S)}</table></div>`;
}

/** How each side of pair (s, c) feels about swapping to each other, under matching m. */
function sides(inst, m, s, c) {
  const has = m[s];
  const holder = m.indexOf(c);
  const say = (who, d, x, y) =>
    d < 0 ? `${who} gains (prefers ${x} to ${y})` : d === 0 ? `${who} is level (indifferent between ${x} and ${y})` : `${who} loses (prefers ${y} to ${x})`;
  const ds = rank(inst.sp[s], c) - rank(inst.sp[s], has);
  const dc = rank(inst.cp[c], s) - rank(inst.cp[c], holder);
  return {
    sSide: say(inst.S[s], ds, inst.C[c], inst.C[has]),
    cSide: say(inst.C[c], dc, inst.S[s], inst.S[holder]),
    strong: ds < 0 && dc < 0,
    weak: (ds < 0 && dc <= 0) || (dc < 0 && ds <= 0),
  };
}

/** Why one pair is, or is not, an instability, in words. */
function explainPair(inst, m, s, c) {
  const x = sides(inst, m, s, c);
  const verdict = x.strong
    ? '<b>Strong</b> (and so weak too): both strictly gain.'
    : x.weak
      ? '<b>Weak only</b>: one gains and the other does not lose.'
      : '<b>Neither</b>: someone would lose by the swap, or nobody gains.';
  return `<b>${esc(inst.S[s])} &amp; ${esc(inst.C[c])}</b>: ${esc(x.sSide)}; ${esc(x.cSide)}. ${verdict}`;
}

function weakOnlyWords() {
  const p = instabilities(TIES, WORKED_M).find((x) => !x.strong);
  const x = sides(TIES, WORKED_M, p.s, p.c);
  return `${x.sSide} and ${x.cSide}: weak, not strong.`;
}

// Ava and Cal each have a tie, as do MIT and NYU. Chosen so that its six
// matchings show every case: strong, weak only, and none at all.
const TIES = {
  S: ['Ava', 'Ben', 'Cal'],
  C: ['MIT', 'NYU', 'UMass'],
  sp: [[[0, 1], [2]], [[0], [1], [2]], [[1], [0, 2]]],
  cp: [[[2], [0, 1]], [[0], [1, 2]], [[1], [0], [2]]],
};
const WORKED_M = [2, 1, 0]; // Ava–UMass, Ben–NYU, Cal–MIT
const ASK_M = [0, 1, 2]; // Ava–MIT, Ben–NYU, Cal–UMass

// The words and the classifier must agree on every pair of every matching.
for (const m of perms(3)) {
  const ins = instabilities(TIES, m);
  TIES.S.forEach((_, s) => TIES.C.forEach((_, c) => {
    if (m[s] === c) return;
    const x = sides(TIES, m, s, c);
    const hit = ins.find((p) => p.s === s && p.c === c);
    assert(x.weak === Boolean(hit) && x.strong === Boolean(hit?.strong), `sides() against instabilities() at ${s}, ${c}`);
  }));
}


// ---------------------------------------------------------------------------
// Stable roommates: the worked counterexample
// ---------------------------------------------------------------------------

const RM = { P: ['Ana', 'Bo', 'Cy', 'Di'], pref: [[1, 2, 3], [2, 0, 3], [0, 1, 3], [0, 1, 2]] };
function roommateMatchings() {
  // the three ways to split four people into two pairs
  return [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
}
function roommateBlocking(m) {
  const partner = [];
  for (const [a, b] of m) {
    partner[a] = b;
    partner[b] = a;
  }
  const better = (x, y) => RM.pref[x].indexOf(y) < RM.pref[x].indexOf(partner[x]);
  const out = [];
  for (let x = 0; x < 4; x++) for (let y = x + 1; y < 4; y++) if (partner[x] !== y && better(x, y) && better(y, x)) out.push([x, y]);
  return out;
}

// ---------------------------------------------------------------------------
// Programs, run for real
// ---------------------------------------------------------------------------

// "for i = 1..n, for j = 1..i, add up A[1..j] with a loop": the inner loop is j steps.
const runPrefixy = (n) => {
  let steps = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= i; j++) for (let k = 1; k <= j; k++) steps++;
  return steps;
};
const prefixyExact = (n) => (n * (n + 1) * (n + 2)) / 6;
// The box: i ≥ n/2 and n/4 ≤ j ≤ n/2. Every such j ≤ i, so the pair runs, and its inner loop is j ≥ n/4 steps.
const boxPairs = (n) => {
  let c = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= i; j++) if (2 * i >= n && 4 * j >= n && 2 * j <= n) c++;
  return c;
};
const boxSteps = (n) => {
  let c = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= i; j++) if (2 * i >= n && 4 * j >= n && 2 * j <= n) c += j;
  return c;
};
// every triple i < j < k
const runTriples = (n) => {
  let c = 0;
  for (let i = 1; i <= n; i++) for (let j = i + 1; j <= n; j++) for (let k = j + 1; k <= n; k++) c++;
  return c;
};
// for i, for j, for k = 1..min(i, j)
const runMin = (n) => {
  let c = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) for (let k = 1; k <= Math.min(i, j); k++) c++;
  return c;
};
// powers: P[k] = xᵏ for k = 1..n, each from scratch (k − 1 multiplications), or as P[k − 1] · x (one each, after P[1])
const powersScratch = (n) => {
  let c = 0;
  for (let k = 1; k <= n; k++) for (let t = 2; t <= k; t++) c++;
  return c;
};
const powersReuse = (n) => Math.max(n - 1, 0);
// Pascal: C(i, j) for 0 ≤ j ≤ i ≤ n, from factorials (i + j + (i − j) = 2i multiplications, give or take), or by Pascal's rule (one addition)
const pascalScratch = (n) => {
  let c = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= i; j++) c += 2 * i;
  return c;
};
const pascalEntries = (n) => ((n + 1) * (n + 2)) / 2;

for (let n = 0; n <= 40; n++) {
  assert(runPrefixy(n) === prefixyExact(n), `prefix count at n = ${n}`);
  assert(runTriples(n) === (n * (n - 1) * (n - 2)) / 6, `triples at n = ${n}`);
  assert(runMin(n) === (n * (n + 1) * (2 * n + 1)) / 6, `min count at n = ${n}`);
  assert(powersScratch(n) === (n * (n - 1)) / 2, `powers at n = ${n}`);
  assert(pascalScratch(n) === (2 * n * (n + 1) * (n + 2)) / 3, `pascal at n = ${n}`);
  if (n >= 4) assert(boxSteps(n) >= boxPairs(n) * Math.ceil(n / 4) && boxSteps(n) <= runPrefixy(n), `box at n = ${n}`);
  if (n >= 8) assert(boxSteps(n) >= (n * n * n) / 64, `box ≥ n³/64 at n = ${n}`);
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

const SN = ['Ava', 'Ben', 'Cal', 'Dee'];
const CN = ['MIT', 'NYU', 'UMass', 'Yale'];
const strict = (sp, cp) => ({ S: SN.slice(0, sp.length), C: CN.slice(0, sp.length), sp, cp });
const proposals = (inst) => run(inst, true).log.length;

function strictTables(inst) {
  const row = (who, list, names) => `<tr><td class="who">${esc(who)}</td>${list.map((x) => `<td>${esc(names[x])}</td>`).join('')}</tr>`;
  const hdr = (l) => `<tr><th class="l">${l}</th>${inst.S.map((_, i) => `<th>${['1st', '2nd', '3rd', '4th'][i]}</th>`).join('')}</tr>`;
  return `<div class="two"><table class="pref">${hdr('Student')}${inst.S.map((s, i) => row(s, inst.sp[i], inst.C)).join('')}</table>
<table class="pref">${hdr('College')}${inst.C.map((c, j) => row(c, inst.cp[j], inst.S)).join('')}</table></div>`;
}

const P_WORKED = strict([[0, 1, 2], [0, 2, 1], [1, 0, 2]], [[1, 0, 2], [0, 2, 1], [2, 1, 0]]);
const P_Q1 = strict([[1, 0, 2], [1, 2, 0], [0, 1, 2]], [[2, 0, 1], [0, 2, 1], [1, 0, 2]]);
const P_Q2 = strict(
  [[0, 1, 2, 3], [1, 0, 3, 2], [0, 2, 1, 3], [2, 3, 0, 1]],
  [[3, 1, 0, 2], [0, 2, 3, 1], [1, 3, 2, 0], [2, 0, 1, 3]],
);

// Every n = 3 instance's proposal count (6⁶ = 46,656 of them), keeping the first instance for each count.
function allCounts3() {
  const lists = perms(3);
  const seen = new Map();
  const idx = [0, 0, 0, 0, 0, 0];
  for (let t = 0; t < 6 ** 6; t++) {
    let x = t;
    for (let d = 0; d < 6; d++) {
      idx[d] = x % 6;
      x = Math.floor(x / 6);
    }
    const inst = strict(idx.slice(0, 3).map((i) => lists[i]), idx.slice(3).map((i) => lists[i]));
    const k = proposals(inst);
    if (!seen.has(k)) seen.set(k, inst);
  }
  return seen;
}
const COUNTS3 = allCounts3();
assert(Math.min(...COUNTS3.keys()) === 3, 'n = 3 minimum');

/** Proposals equals the sum over students of the position of their final partner (1 = first choice). */
function positionSum(inst) {
  const { seat } = run(inst, true);
  return inst.S.reduce((acc, s, i) => acc + inst.sp[i].indexOf(inst.C.indexOf(seat[s])) + 1, 0);
}
for (const inst of [P_WORKED, P_Q1, P_Q2, ...COUNTS3.values()]) assert(positionSum(inst) === proposals(inst), 'proposals = position sum');

// ---------------------------------------------------------------------------
// Boards: a plan, played against every possible strength
// ---------------------------------------------------------------------------

// Strength s is the heaviest weight the board holds, 0..n (0: it breaks at 1).
// The first board tests the listed weights in order. When it breaks at w, having
// held at the previous listed weight p, the second board tests p + 1, p + 2, …
// and stops at its first break (or at w − 1, which then must be the strength).
// If the first board never breaks on the list, it carries on one weight at a time.
function testsFor(n, plan, s) {
  let tests = 0;
  let prev = 0;
  for (const w of plan) {
    tests++;
    if (s < w) return tests + Math.min(s - prev + 1, w - 1 - prev);
    prev = w;
  }
  return tests + Math.min(s - prev + 1, n - prev);
}
function worst(n, plan) {
  let best = { tests: -1, at: [] };
  for (let s = 0; s <= n; s++) {
    const t = testsFor(n, plan, s);
    if (t > best.tests) best = { tests: t, at: [s] };
    else if (t === best.tests) best.at.push(s);
  }
  return best;
}
/** The cost of each gap: first-board tests to reach its top, plus the scan inside it. */
function gapCosts(n, plan) {
  const out = [];
  let prev = 0;
  plan.forEach((w, i) => {
    out.push({ from: prev + 1, to: w - 1, cost: i + 1 + (w - 1 - prev) });
    prev = w;
  });
  if (prev < n) out.push({ from: prev + 1, to: n, cost: plan.length + (n - prev) });
  return out;
}
const showGaps = (n, plan) => gapCosts(n, plan).map((g) => `${g.from === g.to ? g.from : `${g.from}..${g.to}`}: ${g.cost}`).join('; ');
const binaryTests = (n) => Math.ceil(Math.log2(n + 1)); // n + 1 possible answers
assert(worst(10, []).tests === 10, 'one board scans');
for (const [n, plan] of [[30, [12, 20, 26]], [100, [20, 50, 70, 85]], [100, [40, 80]], [10, [5]], [10, [3, 6, 9]], [50, [7, 13, 30]]])
  assert(Math.max(...gapCosts(n, plan).map((g) => g.cost)) === worst(n, plan).tests, `gap costs for ${plan}`);

const PLAN_A = { n: 30, plan: [12, 20, 26] };
const PLAN_B = { n: 100, plan: [20, 50, 70, 85] };
const PLAN_C = { n: 100, plan: [40, 80] };

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const range = (xs) => (xs.length === 1 ? `${xs[0]}` : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs[0]} to ${xs[xs.length - 1]}`);

function part1Questions() {
  return [
    {
      kind: 'choice',
      tests: 'telling the four parts apart',
      prompt: 'A write-up for "detect a cycle in an undirected graph with BFS" contains this sentence. Which of the four parts is it?',
      quote: 'Every edge is looked at twice, once from each end, and every vertex is put in the queue at most once.',
      options: [
        { t: '(a) the algorithm', why: 'It describes what the algorithm does, but only in order to count it. The algorithm is the steps, not their cost.' },
        { t: '(b) the intuition', why: 'Intuition says why the idea should work, not how long it takes.' },
        { t: '(c) correctness', why: 'Nothing here says the output is right: a wrong algorithm could touch every edge twice too.' },
        { t: '(d) the running time', ok: true, why: 'It bounds the work: O(1) per queue visit and per edge end, so O(m + n).' },
      ],
      close: 'Before handing in, label each paragraph (a), (b), (c) or (d) in the margin. A part with no paragraph is a part you have not written.',
    },
    {
      kind: 'multi',
      tests: 'what counts as a correctness argument',
      prompt: 'Which of these, on their own, justify that an algorithm is correct?',
      options: [
        { t: 'Running it on the example from the problem and getting the right answer.', why: 'One instance shows it works on one instance. Correctness is a claim about every input.' },
        { t: 'Running it on 1,000 random inputs and getting the right answer each time.', why: 'Evidence, not proof. Bugs live in the inputs you did not generate: the empty one, the tied one, the one where everything is equal.' },
        { t: 'An invariant that holds at the start, is kept by every step, and at the end implies the output is right.', ok: true, why: 'This is a proof, and it covers every input at once.' },
        { t: 'A proof by contradiction: suppose the output is wrong, and derive something impossible.', ok: true, why: 'Also a proof. Gale-Shapley’s stability proof is this shape: suppose a blocking pair, then someone proposed where they could not have.' },
        { t: '"It clearly works, since each step is reasonable."', why: 'This is intuition, part (b). Useful, but the grader asked for (c) as well.' },
      ],
      close: 'Examples find bugs. Only an argument about every input shows there are none.',
    },
    {
      kind: 'open',
      tests: 'a complete four-part answer',
      prompt: 'Give a four-part answer for: given an array of n integers, decide whether any value appears twice. Your algorithm must beat O(n²).',
      lines: 10,
      key: `<p><b>(a)</b> Sort the array. Then compare each entry with the next one; answer yes if some A[i] = A[i + 1], and no otherwise.</p>
<p><b>(b)</b> Sorting puts equal values next to each other, so a duplicate, if there is one, must show up as two equal neighbours.</p>
<p><b>(c)</b> If the answer is yes, the two equal neighbours are a duplicate, so yes is right. If some value v appears twice, then after sorting all the copies of v are consecutive (anything between two copies would be ≥ v and ≤ v, so equal to v), so some neighbouring pair is equal and the algorithm says yes.</p>
<p><b>(d)</b> Sorting is O(n log n) (merge sort), and the scan is n − 1 comparisons, so O(n log n) in total, which is o(n²).</p>`,
      close: 'Notice that (c) has two directions: every yes is right, and every true duplicate is found. Checking only one is the most common gap.',
    },
    {
      kind: 'choice',
      tests: 'running time for a problem the question sets',
      prompt: 'A problem asks for "an algorithm with running time strictly slower-growing than f(n) = n³, meaning lim g(n)/f(n) = 0". Which g does NOT qualify?',
      options: [
        { t: 'n²', why: 'n²/n³ = 1/n → 0. Qualifies.' },
        { t: 'n² log n', why: '(n² log n)/n³ = (log n)/n → 0. Qualifies.' },
        { t: 'n^2.99', why: 'n^2.99/n³ = n^(−0.01) → 0, slowly, but it does. Qualifies.' },
        { t: 'n³ / 1000', ok: true, why: 'The ratio is 1/1000, a constant, not 0. Dividing by a constant never changes the growth: this is still Θ(n³).' },
      ],
      close: 'Strictly slower means a different growth class, not a smaller constant.',
    },
  ];
}

function part2Questions() {
  const all = perms(3).map((m) => ({ m, ins: instabilities(TIES, m) }));
  const noWeak = all.filter((x) => x.ins.length === 0);
  const noStrong = all.filter((x) => !x.ins.some((p) => p.strong));
  const ask = instabilities(TIES, ASK_M);
  const rmAll = roommateMatchings();
  assert(rmAll.every((m) => roommateBlocking(m).length > 0), 'roommates: every matching blocked');
  assert(noWeak.length >= 1 && noStrong.length > noWeak.length, 'ties instance shape');
  assert(ask.length > 0 && ask.every((p) => !p.strong), 'asked matching has weak-only instabilities');
  const pairs = [];
  TIES.S.forEach((_, s) => TIES.C.forEach((_, c) => {
    if (ASK_M[s] !== c) pairs.push({ s, c });
  }));

  return [
    {
      kind: 'multi',
      tests: 'what a proof of "not always" needs',
      prompt: 'You believe that for some problem, a matching with property P does not always exist. Which of these are needed for a complete answer?',
      options: [
        { t: 'One specific instance (actual people, actual rankings).', ok: true, why: '"Not always" is disproved by a single instance, so you must give it, concretely.' },
        { t: 'A proof that every matching of that instance fails P.', ok: true, why: 'Showing that one matching fails proves nothing: a different matching of the same instance might have P.' },
        { t: 'A proof that the algorithm from lecture fails P on that instance.', why: 'One algorithm failing does not mean no matching has P. You must rule out every matching, not one algorithm’s output.' },
        { t: 'Many instances, to be safe.', why: 'One is enough, if the proof covers all of its matchings. More instances add length, not strength.' },
      ],
      close: 'Small is your friend: with 2 students there are 2 perfect matchings, with 3 there are 6. Check them all, one line each.',
    },
    {
      kind: 'multi',
      tests: 'what a proof of "always" needs',
      prompt: 'You believe a matching with property P always exists. Which of these would be complete answers?',
      options: [
        { t: 'An algorithm that works on every instance, with a proof that its output always has P, and its running time.', ok: true, why: 'This is the constructive route, and when the question says "give and analyze an algorithm" it is the route they want.' },
        { t: 'A reduction: transform any instance into one a known algorithm solves, run it, translate the answer back, and prove the translated answer has P.', ok: true, why: 'A reduction is an algorithm too. The proof burden is the translation step: an instability in your answer must give an instability the known algorithm could not have produced.' },
        { t: 'Checking that every instance with 3 students has one.', why: 'Every size, not one size. Small cases are how you form the belief, not how you prove it.' },
        { t: 'An instance where one exists.', why: 'Existence in one instance says nothing about the others.' },
      ],
      close: 'Before proving, decide which one you believe by trying small instances. Try to break it first: a counterexample is shorter than a proof.',
    },
    {
      kind: 'open',
      tests: 'classifying pairs with ties',
      prompt: `For the instance with ties on the Learn page, take the matching ${showMatching(TIES, ASK_M)}. For each of the six pairs not in the matching, say whether it is a strong instability, a weak instability only, or neither, and why.`,
      body: `<table class="blank wide"><tr><th class="l">Pair</th><th>Strong</th><th>Weak only</th><th>Neither</th><th class="l">Why (one line)</th></tr>${pairs.map((p) => `<tr><td class="l">${esc(pairName(TIES, p))}</td><td></td><td></td><td></td><td></td></tr>`).join('')}</table>`,
      key: `<ul class="whys">${pairs.map((p) => `<li>${explainPair(TIES, ASK_M, p.s, p.c)}</li>`).join('')}</ul>
<p>So this matching has ${ask.length} instabilities, all weak only: it has <b>no strong</b> instability, but it is not free of weak ones.</p>`,
      close: 'Work one side at a time: first "does the student strictly gain, stay level, or lose?", then the same for the college. The answer is then a lookup.',
    },
    {
      kind: 'number',
      tests: 'exhausting every matching',
      prompt: 'Still in the instance with ties: how many of its 6 perfect matchings have no weak instability at all?',
      unit: 'matchings',
      answer: noWeak.length,
      why: `List all six and classify each (one line each is enough). ${all.map((x) => `${showMatching(TIES, x.m)}: ${x.ins.length === 0 ? 'none' : x.ins.map((p) => `${pairName(TIES, p)} ${p.strong ? '(strong)' : '(weak)'}`).join(', ')}`).join('. ')}. Only ${noWeak.map((x) => showMatching(TIES, x.m)).join(' and ')} is clean.`,
      near: [
        { v: noStrong.length, why: `That is how many have no strong instability. A matching can be free of strong ones and still have weak ones.` },
        { v: 0, why: 'Check the matching the key names: every pair outside it has someone who would lose.' },
      ],
      close: 'Exhausting every matching is exactly what a counterexample proof has to do, so it is worth being fast at it.',
    },
    {
      kind: 'choice',
      tests: 'what one instance tells you',
      prompt: 'This instance has a matching with no weak instability. What does that tell you about whether every instance with ties has one?',
      options: [
        { t: 'Every instance has one.', why: 'One instance cannot prove "every". That needs an argument about all of them.' },
        { t: 'Some instance does not.', why: 'Nothing here points that way either.' },
        { t: 'Nothing either way.', ok: true, why: 'An instance that has one is consistent with both answers. Only a proof, or a counterexample, settles it.' },
      ],
      close: 'When exploring, keep a note of which instances you tried and why. Extreme instances are where surprises live.',
    },
    {
      kind: 'multi',
      tests: 'the definitions, exactly',
      prompt: 'With ties allowed, which of these are true for every instance and every perfect matching?',
      options: [
        { t: 'Every strong instability is also a weak instability.', ok: true, why: 'Strong: both strictly prefer. Then in particular one strictly prefers and the other strictly prefers, which the weak definition allows.' },
        { t: 'Every weak instability is also a strong instability.', why: `No. In the Learn page’s matching, ${weakOnlyWords()}` },
        { t: 'If nobody has a tie anywhere, strong and weak instabilities are the same pairs.', ok: true, why: 'With no ties, "indifferent" never happens, so "prefers or indifferent" is just "prefers".' },
        { t: 'A matching with no weak instability has no strong instability.', ok: true, why: 'Strong ones are weak ones, so having none of the weak kind means none of the strong kind.' },
      ],
      close: 'Weak instabilities are the larger set. Avoiding all of them is the harder demand.',
    },
    {
      kind: 'open',
      tests: 'a reduction proof, one step at a time',
      prompt: 'Colleges now have k seats each (n colleges, kn students, strict rankings). A pair (s, c) is unstable if s prefers c to their college, and c prefers s to one of the students it holds. Show that a stable assignment always exists by reducing to ordinary stable matching.',
      lines: 9,
      key: `<p><b>Transform.</b> Replace each college c by k copies c¹ … cᵏ, each with c’s ranking of students. Each student ranks the copies in place of c, in the order c¹ &gt; c² &gt; … &gt; cᵏ, keeping the other colleges where they were. Now there are kn students and kn seats: an ordinary instance.</p>
<p><b>Run</b> Gale-Shapley; it returns a stable matching M′. <b>Translate back:</b> s gets c if s is matched to any copy of c. Every college gets exactly k students.</p>
<p><b>Prove.</b> Suppose (s, c) were unstable in the translation: s prefers c to its college d, and c prefers s to some s′ it holds, say s′ is on copy cⁱ. In the copied instance, s ranks cⁱ above its own copy dʲ (every copy of c is above every copy of d), and cⁱ ranks s above s′. So (s, cⁱ) blocks M′, contradicting its stability.</p>
<p><b>Time.</b> The copied instance has kn on each side, so O((kn)²).</p>`,
      close: 'The shape to remember: transform, run what you know, translate back, and prove "an instability in the translation would be an instability the known algorithm never leaves".',
    },
  ];
}

function part3Questions() {
  const n = 6;
  const bn = 12;
  return [
    {
      kind: 'number',
      tests: 'an exact count with a dependent inner loop',
      prompt: `How many times does the innermost line run, at n = ${n}?`,
      code: 'for i = 1 to n\n  for j = 1 to n\n    for k = 1 to min(i, j)\n      one step',
      unit: 'steps',
      answer: runMin(n),
      why: `For each (i, j) the inner loop runs min(i, j) times. Group by the value m = min(i, j): it equals m on 2(n − m) + 1 pairs. Or count by k: step k runs for every (i, j) with both ≥ k, which is (n − k + 1)² pairs, so the total is 1² + 2² + … + n² = n(n + 1)(2n + 1)/6 = ${runMin(n)} at n = ${n}.`,
      near: [
        { v: n ** 3, why: 'That is n³: it assumes every inner loop runs n times. That is the upper bound, not the count.' },
        { v: (n * n * (n + 1)) / 2, why: 'That treats the inner loop as running i times (or j). It runs min(i, j) times, which is smaller.' },
      ],
      close: 'Swapping the order of summation (count by k instead of by (i, j)) is often the shortcut to a closed form.',
    },
    {
      kind: 'number',
      tests: 'counting triples',
      prompt: `How many times does "one step" run at n = ${n}?`,
      code: 'for i = 1 to n\n  for j = i + 1 to n\n    for k = j + 1 to n\n      one step',
      unit: 'steps',
      answer: runTriples(n),
      why: `Each step is one triple i < j < k chosen from 1..n, and each triple is visited once: C(n, 3) = n(n − 1)(n − 2)/6 = ${runTriples(n)}.`,
      near: [
        { v: n ** 3, why: 'n³ counts ordered triples with repeats, like (2, 2, 5) and (5, 2, 2).' },
        { v: n * (n - 1) * (n - 2), why: 'That counts ordered triples of distinct values. Each set {i, j, k} is visited once, in increasing order, not 3! = 6 times.' },
      ],
      close: 'Θ(n³), with constant 1/6. A floor argument does not need the constant, only that it is not zero.',
    },
    {
      kind: 'open',
      tests: 'a floor by throwing work away',
      prompt: `For the program on the Learn page (for i, for j = 1..i, a loop of j steps), keep only the pairs with i ≥ n/2 and n/4 ≤ j ≤ n/2. (a) Why do all these pairs really run? (b) How many steps does each of their inner loops take, at least? (c) How many such pairs are there, at least? (d) Conclude a floor, and fill in the numbers at n = ${bn}.`,
      lines: 7,
      key: `<p>(a) j ≤ n/2 ≤ i, so j is in the range 1..i: the program really visits (i, j). (b) Its inner loop is j steps, and j ≥ n/4. (c) At least n/2 choices of i and about n/4 choices of j, so about n²/8 pairs. (d) Steps ≥ (n²/8)(n/4) = n³/32, so Ω(n³); with the upper bound n³ (every loop runs to n), Θ(n³).</p>
<p>At n = ${bn}: ${boxPairs(bn)} pairs, inner loops of at least ${Math.ceil(bn / 4)} steps, so at least ${boxPairs(bn) * Math.ceil(bn / 4)}; the box really holds ${boxSteps(bn)} and the whole program ${runPrefixy(bn)}. The floor is loose, and that is fine: it only has to be a constant times n³.</p>`,
      close: 'Choose a box where three things are each at least a constant fraction of n: the number of i, the number of j, and the inner work. Then multiply.',
    },
    {
      kind: 'choice',
      tests: 'why the box has to be in the middle',
      prompt: 'Someone tries the floor for the same program with the box "i ≥ n/2 and j ≤ 10". What goes wrong?',
      options: [
        { t: 'Nothing: it gives Ω(n³).', why: 'Count it: about n/2 values of i, 10 values of j, inner loops of at most 10 steps. That is at most 50n steps.' },
        { t: 'It only gives Ω(n), because the j-range and the inner work stay constant as n grows.', ok: true, why: 'A floor argument is only as strong as the part you keep. Every factor has to grow with n.' },
        { t: 'Those pairs do not run.', why: 'They do run (j ≤ 10 ≤ i once n ≥ 20). They just do not carry enough work.' },
      ],
      close: 'A lower bound you can prove but that is too low is not wrong, just useless. Check each factor grows.',
    },
    {
      kind: 'open',
      tests: 'doing the same job with less work',
      prompt: 'Fill in the table C[i, j] = "i choose j" for every 0 ≤ j ≤ i ≤ n. The obvious way computes each entry from its factorial formula, i! / (j! (i − j)!), building each factorial by multiplying from 1. Give a four-part answer for a faster algorithm, and say how much faster.',
      lines: 9,
      key: `<p><b>(a)</b> For i = 0 to n: set C[i, 0] = C[i, i] = 1, then for j = 1 to i − 1 set C[i, j] = C[i − 1, j − 1] + C[i − 1, j].</p>
<p><b>(b)</b> Row i can be built from row i − 1, which is already in the table: choosing j from i items either uses item i (and j − 1 from the rest) or does not (and j from the rest).</p>
<p><b>(c)</b> Induction on i. Row 0 is right. If row i − 1 is right, each entry of row i is the sum of two right entries, and Pascal’s rule (the sentence in (b)) says that sum is i choose j.</p>
<p><b>(d)</b> One addition per entry, (n + 1)(n + 2)/2 entries: Θ(n²). The factorial way costs about 2i multiplications per entry of row i, ${pascalScratch(10)} at n = 10 against ${pascalEntries(10)} entries, Θ(n³). The ratio → 0. And Θ(n²) is the best possible here, since there are Θ(n²) entries to write.</p>`,
      close: 'Look for an answer you can build from answers already in your table. Then each one costs O(1) instead of a fresh computation.',
    },
    {
      kind: 'choice',
      tests: 'the size of the output is a floor',
      prompt: 'An algorithm must fill in an n × n table of answers (one entry for every pair). What is the best running time it could possibly have?',
      options: [
        { t: 'O(n), with a clever enough idea.', why: 'Writing n² entries takes n² steps, whatever the idea.' },
        { t: 'O(n log n)', why: 'Still below the n² writes it cannot avoid.' },
        { t: 'Ω(n²): it cannot beat the cost of writing its output.', ok: true, why: 'Every entry is at least one step. So Θ(n²) is as good as it gets, and an O(n²) algorithm for it is optimal.' },
      ],
      close: 'When a problem’s answer is a table of every pair, O(n²) is not a failure to be clever: it is the floor.',
    },
    {
      kind: 'multi',
      tests: 'not every line is one step',
      prompt: 'Which lines take more than constant time, so that counting them as one step would undercount?',
      options: [
        { t: 'sum = sum + A[i]', why: 'One addition, one read, one write. Constant.' },
        { t: 'm = the largest value in list L', ok: true, why: 'Finding a maximum has to look at all |L| entries: that line is a hidden loop.' },
        { t: 'if x is in list L', ok: true, why: 'Searching a list is up to |L| comparisons, unless L is a hash set or you are told otherwise.' },
        { t: 'B[i, j] = 0', why: 'One write into a table. Constant.' },
        { t: 'copy A[1..i] into C', ok: true, why: 'Copying i entries takes i steps.' },
      ],
      close: 'Before counting, rewrite every line that hides a loop as the loop. Then count loops as usual.',
    },
  ];
}

function part4Questions() {
  const q1 = proposals(P_Q1);
  const q2 = proposals(P_Q2);
  const tries = [4, 6].map((k) => ({ k, inst: COUNTS3.get(k) }));
  assert(tries.every((t) => t.inst), 'n = 3 examples exist');
  const max3 = Math.max(...COUNTS3.keys());
  return [
    {
      kind: 'number',
      tests: 'counting proposals by hand',
      prompt: 'Students propose. How many proposals happen in total, including the ones that are turned down?',
      pre: strictTables(P_Q1),
      unit: 'proposals',
      answer: q1,
      why: `Trace it: ${run(P_Q1, true).log.map((e) => `${e.a} → ${e.b}`).join(', ')}.`,
      near: [
        { v: 3, why: 'That is only the first round, one proposal per student. Count the ones after a student is let go, too.' },
        { v: 9, why: 'n² = 9 is the upper bound from lecture, not the count here.' },
      ],
      close: 'Count every proposal, accepted or not: the running time is the number of proposals, up to a constant.',
    },
    {
      kind: 'number',
      tests: 'the same count, a bigger instance',
      prompt: 'Students propose. How many proposals in total?',
      pre: strictTables(P_Q2),
      unit: 'proposals',
      answer: q2,
      why: `Trace: ${run(P_Q2, true).log.map((e) => `${e.a} → ${e.b}`).join(', ')}. Check: the final partners sit at positions ${P_Q2.S.map((s, i) => P_Q2.sp[i].indexOf(P_Q2.C.indexOf(run(P_Q2, true).seat[s])) + 1).join(', ')} on the students’ lists, which add to ${positionSum(P_Q2)}.`,
      near: [{ v: 16, why: 'n² = 16 is the lecture’s ceiling. Few instances reach it.' }],
      close: 'The check in the key is the next question.',
    },
    {
      kind: 'open',
      tests: 'turning a run into a count',
      prompt: 'Explain why, when students propose, the total number of proposals equals the sum over students of the position of their final college on their own list (1 for first choice). Then check it on question 4.1.',
      lines: 6,
      key: `<p>Each student proposes down their list in order and never skips a college or proposes twice. The run ends with every student at their final college, which they proposed to last. So a student whose final college is at position p made exactly p proposals, and the total is the sum of the positions. (The order in which free students are chosen does not change the final matching, from lecture, so it does not change this sum either.)</p>
<p>For 4.1: positions ${P_Q1.S.map((s, i) => P_Q1.sp[i].indexOf(P_Q1.C.indexOf(run(P_Q1, true).seat[s])) + 1).join(' + ')} = ${positionSum(P_Q1)}, the same as the ${q1} proposals in the trace.</p>`,
      close: 'Now "how many proposals?" becomes "where does each student end up on their own list?", which you can often see without tracing.',
    },
    {
      kind: 'open',
      tests: 'building an instance to order',
      prompt: `With n = 3, write student and college lists for which the students-propose run makes exactly ${tries[0].k} proposals, and a second pair of lists that makes exactly ${tries[1].k}. Check each by tracing.`,
      body: `<div class="two"><div><p class="small"><b>${tries[0].k} proposals</b></p><table class="blank wide"><tr><th>Student</th><th>1st</th><th>2nd</th><th>3rd</th></tr>${SN.slice(0, 3).map((s) => `<tr><td>${s}</td><td></td><td></td><td></td></tr>`).join('')}</table><table class="blank wide"><tr><th>College</th><th>1st</th><th>2nd</th><th>3rd</th></tr>${CN.slice(0, 3).map((s) => `<tr><td>${s}</td><td></td><td></td><td></td></tr>`).join('')}</table></div>
<div><p class="small"><b>${tries[1].k} proposals</b></p><table class="blank wide"><tr><th>Student</th><th>1st</th><th>2nd</th><th>3rd</th></tr>${SN.slice(0, 3).map((s) => `<tr><td>${s}</td><td></td><td></td><td></td></tr>`).join('')}</table><table class="blank wide"><tr><th>College</th><th>1st</th><th>2nd</th><th>3rd</th></tr>${CN.slice(0, 3).map((s) => `<tr><td>${s}</td><td></td><td></td><td></td></tr>`).join('')}</table></div></div>`,
      key: `<p>Any lists whose trace makes that many proposals are right. Use 4.3 to aim: choose where each student should end up on their own list so the positions add to the target, then pick college rankings that force it. One instance of each, found by the engine:</p>
${tries.map((t) => `<p class="small"><b>${t.k} proposals</b> (trace: ${run(t.inst, true).log.map((e) => `${e.a} → ${e.b}`).join(', ')})</p>${strictTables(t.inst)}`).join('')}
<p class="small">Over all 46,656 instances with n = 3, the fewest proposals is ${Math.min(...COUNTS3.keys())} and the most is ${max3}, which is less than n² = 9.</p>`,
      close: 'Building an instance to hit a target is a skill of its own: decide the outcome first, then write the rankings that force it.',
    },
    {
      kind: 'choice',
      tests: 'what a bound on the count needs',
      prompt: 'To show the algorithm can take Ω(n²) proposals, what do you have to give?',
      options: [
        { t: 'One instance with n = 100 that takes 5,000 proposals.', why: 'One n says nothing about growth. Ω is a claim about all large n.' },
        { t: 'For every n, an instance of that size, and a proof that it takes at least c·n² proposals for some constant c > 0.', ok: true, why: 'A family of instances, one per n, with a count you can prove, not just observe.' },
        { t: 'A proof that every instance takes at least c·n² proposals.', why: 'More than a worst-case bound asks for, and false besides: question 4.1’s instance takes only 4 proposals.' },
      ],
      close: 'A lower bound on the worst case needs one bad instance per n, described by a rule, with its count proved.',
    },
  ];
}

function part5Questions() {
  const a = worst(PLAN_A.n, PLAN_A.plan);
  const b = worst(PLAN_B.n, PLAN_B.plan);
  const c = worst(PLAN_C.n, PLAN_C.plan);
  const s = 17;
  const tS = testsFor(PLAN_A.n, PLAN_A.plan, s);
  // for each listed weight, the best worst case reachable by moving only that weight
  const moves = PLAN_B.plan.map((w, i) => {
    let best = null;
    for (let v = (PLAN_B.plan[i - 1] ?? 0) + 1; v < (PLAN_B.plan[i + 1] ?? PLAN_B.n + 1); v++) {
      const p = [...PLAN_B.plan];
      p[i] = v;
      const r = worst(PLAN_B.n, p).tests;
      if (!best || r < best.r) best = { to: v, r };
    }
    return { from: w, ...best };
  });
  const top = Math.min(...moves.map((m) => m.r));
  assert(moves.filter((m) => m.r === top).length === 1, 'one best move');
  const bin = binaryTests(100);
  return [
    {
      kind: 'choice',
      tests: 'why one board forces a scan',
      prompt: 'With one board and weights 1..n, why can you not test 1, 3, 5, … to save time?',
      options: [
        { t: 'Odd weights are harder to set up.', why: 'The weights are identical one-pound units; nothing is harder.' },
        { t: 'If it breaks at 3, the strength could be 1 or 2, and you have no board left to tell which.', ok: true, why: 'Skipping a weight is a gamble you can only take if you can afford to lose the board and still finish.' },
        { t: 'You can; it halves the tests.', why: 'It halves the tests and sometimes gets the answer wrong. A strategy must always be right.' },
      ],
      close: 'With your last board, you must go up one weight at a time. Every plan ends in this phase.',
    },
    {
      kind: 'number',
      tests: 'binary search, when boards are free',
      prompt: 'With as many boards as you like, n = 100, how many tests does binary search need in the worst case? (There are 101 possible answers, 0 to 100.)',
      unit: 'tests',
      answer: bin,
      why: `Each test at least halves the range of possible strengths, in the worst case. 2⁶ = 64 < 101 ≤ 128 = 2⁷, so ${bin}.`,
      near: [{ v: 6, why: '2⁶ = 64 is fewer than the 101 possible answers.' }],
      close: 'log₂ n with unlimited boards, n with one board. The interesting cases are in between.',
    },
    {
      kind: 'multi',
      tests: 'binary search with only two boards',
      prompt: 'With exactly two boards and n = 100, you start binary search at 50. Which of these are true?',
      options: [
        { t: 'If the first board holds at 50, you still have two boards and the range 51..100.', ok: true, why: 'Holding costs nothing. You are in the same situation with half the range.' },
        { t: 'If it breaks at 50, you have one board for the range 1..49.', ok: true, why: 'So from there you must scan 1, 2, 3, … one at a time.' },
        { t: 'If it breaks at 50, the worst case is still about log₂ 100 tests.', why: 'No: after a break at 50 the last board scans up to 49 weights. The worst case is around 50.' },
        { t: 'Starting in the middle is the best first test.', why: 'A break is expensive and a hold is cheap, so the two outcomes are not worth the same. The best first test is not where binary search puts it.' },
      ],
      close: 'Binary search treats the two outcomes as equally costly. With a limited number of boards, they are not.',
    },
    {
      kind: 'number',
      tests: 'playing a plan against one strength',
      prompt: `n = ${PLAN_A.n}. First board tests ${PLAN_A.plan.join(', ')}, then the second board scans up from the last weight that held. If the true strength is ${s}, how many tests happen?`,
      unit: 'tests',
      answer: tS,
      why: `12 holds, 20 breaks (2 tests). The second board tests 13, 14, …, 18: holds up to 17, breaks at 18 (6 more). Total ${tS}.`,
      near: [{ v: 7, why: 'You stopped at 17. You only know 17 is the strength once 18 breaks.' }],
      close: 'Simulate before optimising: write out the tests for one strength, then find the strength that makes the count largest.',
    },
    {
      kind: 'number',
      tests: 'the worst case of a plan',
      prompt: `Same plan (n = ${PLAN_A.n}, first board: ${PLAN_A.plan.join(', ')}). What is the worst-case number of tests over every strength from 0 to ${PLAN_A.n}?`,
      unit: 'tests',
      answer: a.tests,
      why: `Cost of each gap (first-board tests to reach its top, plus the second board’s scan inside it): ${showGaps(PLAN_A.n, PLAN_A.plan)}. The worst is ${a.tests}, at strength ${range(a.at)}.`,
      near: [{ v: 11, why: 'You forgot the first board’s own test at 12 that broke.' }],
      close: 'Each gap’s cost is "how many first-board tests got you there, plus how wide the gap is". The worst case is the biggest of those.',
    },
    {
      kind: 'choice',
      tests: 'improving a plan by one move',
      prompt: `n = ${PLAN_B.n}, first board: ${PLAN_B.plan.join(', ')}, worst case ${b.tests} tests (at strength ${range(b.at)}). Moving which one listed weight (keeping the list in order) lowers the worst case the most?`,
      options: moves.map((m) => ({
        t: `Move ${m.from}`,
        ...(m.r === top ? { ok: true } : {}),
        why:
          m.r === top
            ? `Best is to ${m.to}: worst case ${m.r}. The costliest gap was ${showGaps(PLAN_B.n, PLAN_B.plan).split('; ').find((g) => g.endsWith(`: ${b.tests}`))}; this move splits its cost more evenly with its neighbour.`
            : m.r < b.tests
              ? `Helps, but less: the best place for it is ${m.to}, worst case ${m.r}.`
              : `Cannot help: wherever it goes, the worst case stays at ${m.r} or more, because the costliest gap does not move.`,
      })),
      close: 'The worst case always lives in one gap. Look there first.',
    },
    {
      kind: 'number',
      tests: 'a plan with few first-board tests',
      prompt: `n = ${PLAN_C.n}, first board: ${PLAN_C.plan.join(', ')}. Worst case?`,
      unit: 'tests',
      answer: c.tests,
      why: `Gap costs: ${showGaps(PLAN_C.n, PLAN_C.plan)}. The worst is ${c.tests}, at strength ${range(c.at)}: the gaps are wide, so the second board does most of the work.`,
      near: [],
      close: 'Too few first-board tests leaves wide gaps for the second board. Put 5.5, 5.6 and this one side by side and ask what the best plans have in common.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Learn pages
// ---------------------------------------------------------------------------

function learn1() {
  return `<div class="page"><span class="tag">Part 1 · Learn</span><h2>Writing an algorithm answer</h2>
<p>A design question is graded on four things, and a correct idea with a missing part loses the part. Write them as four labelled paragraphs.</p>
<div class="defn"><table class="wide"><tr><th>Part</th><th class="l">What it is</th><th class="l">Test: could a classmate…</th></tr>
<tr><td>(a) Algorithm</td><td class="l">The steps, in pseudocode or precise sentences.</td><td class="l">…carry it out with no questions?</td></tr>
<tr><td>(b) Intuition</td><td class="l">Why the idea should work, in a few sentences.</td><td class="l">…say why you thought of it?</td></tr>
<tr><td>(c) Correctness</td><td class="l">A proof about every input: an invariant, induction, or contradiction.</td><td class="l">…check it line by line and be convinced?</td></tr>
<tr><td>(d) Running time</td><td class="l">A bound, and why: count loops, cost per step.</td><td class="l">…recount it and get the same bound?</td></tr></table></div>
<h3>Worked example: is a graph bipartite?</h3>
<p><b>(a)</b> Run BFS from any uncoloured vertex, colouring layer 0 red, layer 1 blue, layer 2 red, and so on. Repeat until every vertex is coloured. Then look at every edge: if both ends have the same colour, answer no; otherwise yes.</p>
<p><b>(b)</b> In a two-colouring, colours must alternate along every path, and BFS layers are exactly "distance mod 2", so the layering is the only colouring worth trying (up to swapping colours per component).</p>
<p><b>(c)</b> If the answer is yes, every edge joins different colours, so the colouring is a witness. If it is no, some edge joins two vertices in layers of the same parity; with the two BFS paths back to their common ancestor, that edge closes an odd cycle, and an odd cycle cannot be two-coloured. So no two-colouring exists.</p>
<p><b>(d)</b> BFS is O(m + n) over all components; the edge check is O(m). Total O(m + n).</p>
<div class="note"><b>Note what (c) did.</b> Both answers got a proof: "yes" by showing the witness, "no" by showing an obstacle. An algorithm that answers yes or no needs both directions.</div>
<div class="try"><span class="tag">Warm-up W1 · grade this answer</span>
<p>"Algorithm: run Gale-Shapley. It works because the lecture proved it does. It makes at most n² proposals." A classmate wrote this for "find a stable matching when n students and n colleges have strict rankings". Which parts are present, and which are missing or too thin?</p>${writeLines(3)}</div></div>`;
}

function learn2() {
  const worked = instabilities(TIES, WORKED_M);
  const rm = roommateMatchings();
  const N = RM.P;
  return `<div class="page"><span class="tag">Part 2 · Learn</span><h2>Always, or not always?</h2>
<p>"Does there always exist…?" has two possible answers, and each has its own kind of proof. Decide which you believe <i>before</i> writing, by trying small instances and trying to break your belief.</p>
<div class="two"><div class="defn"><b>Yes, always.</b> Give an algorithm (or reduction) that works on every instance, prove its output has the property, and bound its running time.</div>
<div class="defn"><b>No, not always.</b> Give one concrete instance, and prove that <i>every</i> candidate for it fails. Not one algorithm’s output: every candidate.</div></div>
<h3>Worked "no": stable roommates</h3>
<p>Four people share two double rooms. Each ranks the other three. A pairing is unstable if two people in different rooms both prefer each other to their roommates. Does a stable pairing always exist?</p>
<table class="pref">${N.map((p, i) => `<tr><td class="who">${p}</td><td class="l mono">${RM.pref[i].map((j) => N[j]).join(' &gt; ')}</td></tr>`).join('')}</table>
<p>There are exactly three pairings. Check each:</p>
<ul>${rm.map((m) => {
    const bl = roommateBlocking(m)[0];
    return `<li><b>${m.map(([a, b]) => `${N[a]}–${N[b]}`).join(', ')}</b>: ${N[bl[0]]} and ${N[bl[1]]} both prefer each other to their roommates.</li>`;
  }).join('')}</ul>
<p>Every pairing is unstable, so the answer is <b>no</b>. The key to finding it: ${N[3]} is everyone’s last choice, so whoever rooms with ${N[3]} wants out, and the other three prefer each other in a cycle.</p>
<h3>Worked "yes": a reduction</h3>
<p>If a variant looks like the original problem with a twist, try to <b>transform</b> the variant into the original, run the algorithm you already trust, and <b>translate back</b>. The proof then says: if the translated answer had an instability, the answer to the original would have had one too, and it does not. Question 2.7 walks you through one.</p>
<div class="note"><b>Strategy.</b> Start with n = 2 (2 matchings) and n = 3 (6 matchings). Try the extremes: rankings that all agree, rankings that all differ, many ties, no ties. If every attempt to break the property fails, look for a proof; if one succeeds, you have your counterexample.</div></div>

<div class="page"><span class="tag">Part 2 · Learn</span><h2>Preferences with ties</h2>
<p>Rankings may now contain ties: a college can be indifferent between two students. Write a tie in brackets: (A = B) &gt; C means A and B are tied at the top, both above C.</p>
<div class="defn"><b>Prefers</b> means strictly: s prefers c₁ to c₂ when c₁ is ranked higher and they are not tied.<br>
For s matched to c′ and c matched to s′, the pair (s, c) is a<br>
&nbsp;• <b>strong instability</b> if s prefers c to c′ <i>and</i> c prefers s to s′ (both strictly gain);<br>
&nbsp;• <b>weak instability</b> if one side prefers, and the other either prefers or is indifferent (one gains, nobody loses).</div>
<p>Every strong instability is also a weak one. So "no weak instability" is the stricter demand.</p>
<h3>Worked instance</h3>${tieTables(TIES)}
<p>Take the matching <b>${showMatching(TIES, WORKED_M)}</b>. Check every pair not in it, one side at a time:</p>
<ul>${worked.map((p) => `<li>${explainPair(TIES, WORKED_M, p.s, p.c)}</li>`).join('')}</ul>
<p>Every other pair has someone who would lose by the swap, so it is neither. This matching has a strong instability, so it fails both standards.</p>
<div class="try"><span class="tag">Warm-up W2 · one side at a time</span>
<p>In the same instance, with the same matching, check the pair Ben &amp; MIT. Does Ben gain, stay level, or lose? Does MIT? So which kind is it, if any?</p>${writeLines(2)}</div></div>`;
}

function learn3() {
  const n = 8;
  return `<div class="page"><span class="tag">Part 3 · Learn</span><h2>Counting when the inner work is not constant</h2>
<p>Lecture counted loops whose innermost line is one step. Real programs hide loops inside lines: "scan", "copy", "max of", "is x in the list". The first move is to <b>rewrite every hidden loop as a loop</b>, then count as usual.</p>
<pre>for i = 1 to n
  for j = 1 to i
    total = A[1] + A[2] + … + A[j]      ← a loop of j steps</pre>
<h3>Exact</h3><p>Pair (i, j) costs j. Summing over j ≤ i gives i(i + 1)/2, and summing that over i gives n(n + 1)(n + 2)/6. At n = ${n}: ${runPrefixy(n)} steps (the program, run, agrees for every n up to 40).</p>
<h3>Ceiling: add work that is not there</h3><p>Every loop runs at most n times, so at most n · n · n = n³ steps. O(n³).</p>
<h3>Floor: throw work away</h3><p>Keep only the pairs with i ≥ n/2 and n/4 ≤ j ≤ n/2. Each really runs (j ≤ n/2 ≤ i), each costs j ≥ n/4 steps, and there are about (n/2)(n/4) of them. So at least about n³/32 steps: Ω(n³). At n = ${n}: ${boxPairs(n)} pairs in the box, ${boxSteps(n)} steps.</p>
<p>Ceiling and floor together: <b>Θ(n³)</b>. The floor did not need the exact count, only a box where the number of i, the number of j and the inner work each grow like n.</p>
<h3>Same answers, less work</h3>
<p>Suppose you need P[k] = xᵏ for every k from 1 to n. Computing each from scratch takes k − 1 multiplications: ${powersScratch(n)} at n = ${n}, Θ(n²) in all. But xᵏ is xᵏ⁻¹ times x, and xᵏ⁻¹ is already in the table: <b>P[k] = P[k − 1] · x</b>, one multiplication each, ${powersReuse(n)} at n = ${n}, Θ(n).</p>
<div class="note"><b>Where the speed-up came from.</b> The slow version redid work it had just done. Ask of any slow loop: can this answer be built from answers I already have? Then keep them.</div>
<div class="warn"><b>The output is a floor.</b> An algorithm that must write n answers is Ω(n), so the reuse version of the powers table is as fast as that job can go. Writing a whole n × n table is Ω(n²), however clever the algorithm.</div>
<div class="try"><span class="tag">Warm-up W3 · rewrite, then count</span>
<pre>for i = 1 to n
  for j = 1 to n
    if A[j] is in A[1..i] then count++</pre>
<p>Rewrite the "is in" as a loop, and give a ceiling and a floor. (Assume the search scans A[1..i] in full.)</p>${writeLines(3)}</div></div>`;
}

function learn4() {
  const log = run(P_WORKED, true).log;
  return `<div class="page"><span class="tag">Part 4 · Learn</span><h2>Counting proposals</h2>
<p>Lecture showed propose-and-reject makes at most n² proposals: each student proposes to each college at most once. That is a ceiling. How many it <i>actually</i> makes depends on the rankings.</p>
<h3>Worked instance</h3>${strictTables(P_WORKED)}
<table class="wide small"><tr><th>#</th><th>asks</th><th>whom</th><th class="l">what happens</th></tr>${log.map((e, i) => `<tr><td>${i + 1}</td><td>${e.a}</td><td>${e.b}</td><td class="l">${e.what}</td></tr>`).join('')}</table>
<p><b>${log.length} proposals</b>, against a ceiling of 9. Look at where each student ended up on their own list, and add the positions: you get the same number. Question 4.3 asks you to explain why that always works.</p>
<div class="note"><b>Two kinds of claim.</b> "At most n²" is a ceiling for every instance. "It can take Ω(n²)" or "it can finish in O(n)" are claims about the <i>best</i> or <i>worst</i> instance, and are proved by giving, for every n, an instance and its count.</div>
<div class="try"><span class="tag">Warm-up W4 · ceiling or not</span><p>Could any instance with n = 3 need 10 proposals? Why or why not?</p>${writeLines(2)}</div></div>`;
}

function learn5() {
  return `<div class="page"><span class="tag">Part 5 · Learn</span><h2>Searching when failures are limited</h2>
<p>A board holds every weight up to its strength and breaks at anything heavier. Weights are 1..n; the strength is some number from 0 to n. A broken board is gone. You want the strength in as few tests as possible, <i>in the worst case</i>, and you must always get it right.</p>
<table class="wide"><tr><th class="l">Boards</th><th class="l">Strategy</th><th>Worst case</th></tr>
<tr><td class="l">1</td><td class="l">1, 2, 3, … until it breaks. Forced: skip a weight and a break leaves you unable to tell.</td><td>n</td></tr>
<tr><td class="l">Unlimited</td><td class="l">Binary search: test the middle of what is still possible.</td><td>about log₂ n</td></tr>
<tr><td class="l">2</td><td class="l">?</td><td>?</td></tr></table>
<h3>What a two-board plan looks like</h3>
<p>Every two-board plan has the same shape: the first board tests some increasing weights w₁ &lt; w₂ &lt; …; when it breaks at wₖ, the second (last) board must scan from wₖ₋₁ + 1 upward one at a time. So a plan is just the list of first-board weights, and its cost for a given strength is</p>
<div class="defn"><div class="big">tests = (first-board tests up to the break) + (second-board scan in that gap)</div></div>
<h3>Worst case, adversary style</h3>
<p>Think of the strength as chosen by an adversary who has seen your plan. For each gap, they can make the first board break at its top and the second board scan the whole gap. The worst case is the costliest gap: its position in the list plus its width.</p>
<div class="note"><b>The tension.</b> Wide gaps make the second board scan a lot. Narrow gaps mean many first-board tests before you reach the later gaps. A good plan balances the two. How exactly is for you to find: questions 5.5 to 5.7 give you the numbers to reason from.</div>
<div class="try"><span class="tag">Warm-up W5 · two small plans</span><p>n = 10. Compare the plans "5" and "3, 6, 9": for each, write the cost of every gap and the worst case.</p>${writeLines(3)}</div></div>`;
}

function summary() {
  return `<div class="page summary"><span class="tag">Keep this page</span><h2>One-page summary</h2><div class="two"><div>
<h3>Writing it up</h3><ul><li>Four labelled parts: algorithm, intuition, correctness, running time.</li><li>Correctness covers every input. Examples are not proofs.</li><li>Yes/no answers: prove both directions.</li><li>"Strictly slower" means g/f → 0: a different growth class, not a smaller constant.</li></ul>
<h3>Always or not</h3><ul><li>Try n = 2 and 3 first; try to break your guess.</li><li>No: one concrete instance, every candidate ruled out.</li><li>Yes: algorithm or reduction, with proof and time.</li><li>Reduction: transform, run what you trust, translate back, prove an instability would carry over.</li></ul>
<h3>Ties</h3><ul><li>Prefers = strictly. Indifferent = tied.</li><li>Strong: both gain. Weak: one gains, the other does not lose.</li><li>Strong ⊆ weak. No weak ones is the harder demand.</li><li>Check one side at a time: gain, level, or lose.</li></ul>
</div><div>
<h3>Counting</h3><ul><li>Rewrite hidden loops (scan, copy, max, search) as loops.</li><li>Ceiling: every loop runs to n.</li><li>Floor: keep a box where the number of each index and the inner work all grow like n.</li><li>Output size is a floor on any algorithm.</li><li>Faster: build each answer from answers you already have.</li></ul>
<h3>Proposals</h3><ul><li>Count every proposal, turned down or not.</li><li>Total = sum of each student’s final position on their own list.</li><li>Best/worst-case claims need an instance for every n, described by a rule, with its count proved.</li></ul>
<h3>Limited failures</h3><ul><li>Last board: scan one at a time.</li><li>Plan = first-board weights; cost = tests so far + gap width.</li><li>Worst case = costliest gap. Balance the gaps against the tests.</li></ul>
</div></div></div>`;
}

function readiness() {
  const items = [
    'I can write a four-part answer where each part would survive a classmate checking it.',
    'Given a variant of stable matching, I try n = 2 and n = 3 instances before deciding "always" or "not always".',
    'I can list every perfect matching of a 3 × 3 instance and classify each pair as strong, weak only, or neither, quickly.',
    'I can write a reduction to ordinary stable matching and prove that an instability would carry over.',
    'I can rewrite a line that hides a loop, and give an exact count, a ceiling and a box-style floor for three nested loops.',
    'I can find a faster algorithm by building answers from ones already computed, and explain why it cannot beat the size of its output.',
    'I can count proposals from where each student ends up, and I can build an instance that makes a chosen number of them.',
    'I can say what a best-case or worst-case bound on proposals needs: an instance for every n, and a proof of its count.',
    'I can compute the worst case of a two-board plan and say which change to it helps.',
  ];
  return `<div class="page"><span class="tag">Before a challenge set</span><h2>Ready-check</h2>
<p>Tick each one you could do cold, without this packet. If one is not ticked, the part it comes from is where to go back to.</p>
<ol class="opts">${items.map((t) => `<li><span class="box sq"></span>${esc(t)}</li>`).join('')}</ol></div>`;
}

// ---------------------------------------------------------------------------

export function buildPrep() {
  const parts = [
    { title: 'Writing an algorithm answer', learn: learn1, qs: part1Questions() },
    { title: 'Always, or not always?', learn: learn2, qs: part2Questions() },
    { title: 'Counting when the inner work is not constant', learn: learn3, qs: part3Questions() },
    { title: 'Counting proposals', learn: learn4, qs: part4Questions() },
    { title: 'Searching when failures are limited', learn: learn5, qs: part5Questions() },
  ];
  const keys = [];
  const total = parts.reduce((a, p) => a + p.qs.length, 0);

  let body = `<div class="cover"><span class="tag">Algorithms · printable workbook</span>
<h1>Proving, Counting, Searching</h1><div class="sub">The skills a challenge set asks for, practised on problems of the same kind: writing an algorithm answer, "does it always exist?" with preferences that tie, counting loops that hide loops, counting proposals, and searching when you can only afford a few failures. ${total} questions in five parts, with a key computed by running what each question describes.</div>
<h3>How to use this packet</h3><ol>
<li>Work in order: each part is a Learn page, a warm-up, then questions.</li>
<li>Questions are the same <i>kind</i> as a challenge set’s, never its own problems. The Learn pages stop short on purpose where the set would start.</li>
<li>Questions marked "open" want a written answer. The key shows one good answer; yours can differ and still be right.</li>
<li>Finish with the ready-check on the last page before the key.</li></ol>
<table class="toc" style="margin-top:14pt">${parts.map((p, i) => `<tr><td><b>Part ${i + 1}</b></td><td>${p.title}</td><td>${p.qs.length} questions</td></tr>`).join('')}
<tr><td><b>Summary</b></td><td>One page to keep</td><td></td></tr><tr><td><b>Ready-check</b></td><td>What you should be able to do cold</td><td></td></tr><tr><td><b>Key</b></td><td>Warm-ups and every question</td><td></td></tr></table></div>`;

  parts.forEach((p, pi) => {
    body += p.learn();
    body += `<div class="flow"><span class="tag">Part ${pi + 1} · Questions</span><h2>${p.title}</h2>`;
    p.qs.forEach((q, qi) => {
      const num = `${pi + 1}.${qi + 1}`;
      const pre = q.pre ?? '';
      if (q.kind === 'open') {
        body += renderQ(num, q, { pre, body: q.body ?? writeLines(q.lines ?? 6) });
        keys.push(renderKey(num, q, { body: q.key }));
      } else {
        body += renderQ(num, q, { pre });
        keys.push(renderKey(num, q));
      }
    });
    body += '</div>';
  });

  body += summary();
  body += readiness();
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: warm-ups</h2><p class="keyintro">Try everything before you look.</p>${warmupKeys()}</div>`;
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: questions</h2>${keys.join('')}</div>`;
  return doc('Proving, Counting, Searching: printable workbook', body);
}

function warmupKeys() {
  const w10 = (plan) => worst(10, plan);
  const n = 8;
  return [
    `<section class="k"><div class="khead">W1 · grading an answer</div><p>(a) is there only by name: "run Gale-Shapley" is fine if the course has defined it, but say who proposes. (b) is missing. (c) is a citation, not an argument; if the question is about the lecture algorithm itself that is circular, and for any variant it is not enough. (d) says "at most n² proposals" but not what each costs: O(1) per proposal with a rank table, so O(n²) in all.</p></section>`,
    `<section class="k"><div class="khead">W2 · Ben &amp; MIT</div><p>${explainPair(TIES, WORKED_M, 1, 0)}</p></section>`,
    `<section class="k"><div class="khead">W3 · rewrite, then count</div><p>The test is a loop of i steps, so pair (i, j) costs i, and there are n pairs for each i: n · (1 + 2 + … + n) = n²(n + 1)/2 steps. Ceiling n³. Floor: keep i ≥ n/2, any j: n/2 · n pairs, each ≥ n/2 steps, so ≥ n³/4. Θ(n³). (At n = ${n}: ${n * n * (n + 1) / 2} steps.)</p></section>`,
    `<section class="k"><div class="khead">W4 · 10 proposals at n = 3?</div><p>No. Each student proposes to each college at most once, so at most 3 · 3 = 9. (In fact at most ${Math.max(...COUNTS3.keys())}: the run stops the moment the last college gets its first proposal, so that college gets exactly one, and the other two get at most three each.)</p></section>`,
    `<section class="k"><div class="khead">W5 · two plans at n = 10</div><p><b>Plan "5":</b> gap costs ${showGaps(10, [5])}. Worst case ${w10([5]).tests}.</p><p><b>Plan "3, 6, 9":</b> gap costs ${showGaps(10, [3, 6, 9])}. Worst case ${w10([3, 6, 9]).tests}.</p><p>Each gap’s cost includes the first-board test that broke at its top. The scan inside a gap stops one short of the top, since the top already broke.</p></section>`,
  ].join('');
}
