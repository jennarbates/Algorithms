import { loadGS, run, blocking, renderQ, renderKey, doc, esc, writeLines } from './lib.mjs';

const TIER_NAMES = {
  1: 'The run, by hand',
  2: 'Reading a statement exactly',
  3: 'Where the textbook chapter ends',
  4: 'The chapter’s own exercises: variants',
};
const ord = (i) => ['1st', '2nd', '3rd', '4th', '5th', '6th'][i];

function prefTables(inst, { reasons = true, compact = false } = {}) {
  const n = inst.S.length;
  if (!Object.keys(inst.reasons).length) reasons = false;
  const row = (who, list, why) =>
    `<tr><td class="who">${esc(who)}</td>${list.map((x) => `<td>${esc(x)}</td>`).join('')}${reasons && !compact ? `<td class="why">${esc(why ?? '')}</td>` : ''}</tr>`;
  const hdr = (label) => `<tr><th class="l">${label}</th>${[...Array(n).keys()].map((i) => `<th>${ord(i)}</th>`).join('')}${reasons && !compact ? '<th class="l">why</th>' : ''}</tr>`;
  const st = `<table class="pref">${hdr('Student')}${inst.S.map((s, i) => row(s, inst.sp[i].map((j) => inst.C[j]), inst.reasons[inst.sIds[i]])).join('')}</table>`;
  const sc = `<table class="pref">${hdr('School')}${inst.C.map((c, j) => row(c, inst.cp[j].map((i) => inst.S[i]), inst.notes[inst.cIds[j]])).join('')}</table>`;
  return compact ? `<div class="two">${st}${sc}</div>` : `${st}${sc}`;
}

function traceTable(rows) {
  return `<table class="blank wide"><tr><th style="width:26pt">#</th><th>Who asks</th><th>Whom</th><th class="l">What happens (held? turned away? who is let go?)</th></tr>
  ${[...Array(rows).keys()].map((i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td></tr>`).join('')}</table>`;
}

function seatFill(inst) {
  return `<div class="seatrow"><b>Final seats:</b> ${inst.S.map((s) => `<span>${esc(s)} → <span class="fill"></span></span>`).join('')}</div>`;
}

function keyTrace(inst, studentsAsk) {
  const r = run(inst, studentsAsk);
  return `<table class="wide small"><tr><th>#</th><th>asks</th><th>whom</th><th class="l">what happens</th></tr>${r.log.map((e, i) =>
    `<tr><td>${i + 1}</td><td>${esc(e.a)}</td><td>${esc(e.b)}</td><td class="l">${e.what}</td></tr>`).join('')}</table>
  <p class="small muted">Your order of asks may differ from this one. The final seats cannot: see question 1.6.</p>`;
}
const seatsLine = (inst, seat) => inst.S.map((s) => `${esc(s)} → <b>${esc(seat[s])}</b>`).join(' · ');

function permutations(n) {
  if (n === 0) return [[]];
  const out = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) { const q = [...p]; q.splice(i, 0, n - 1); out.push(q); }
  return out;
}
function allStable(inst) {
  return permutations(inst.S.length)
    .map((p) => Object.fromEntries(inst.S.map((s, i) => [s, inst.C[p[i]]])))
    .filter((seat) => blocking(inst, seat).length === 0);
}

function blockSentence(inst, b) {
  return `${b.s} and ${b.c} would both switch: ${b.s} has ${b.has} but ranks ${b.c} higher, and ${b.c} has ${b.holder} but ranks ${b.s} higher.`;
}

// ---------------------------------------------------------------------------

function part1(P, keys) {
  const op = P.opener;
  const ex = run(op, true);
  const w1 = `<div class="try"><span class="tag">Warm-up W1 · your turn</span>
<p>Same three students and schools as the worked example, but now the <b>schools</b> ask (each school walks down its own list of students; each student holds the best school that has asked so far).</p>
${traceTable(5)}${seatFill(op)}
<p class="small">Compare with the worked example. Who does better, and who does worse? ${writeLines(1)}</p></div>`;
  keys.push(`<section class="k"><div class="khead">Worked example check and W1</div>
<p>Students asking: ${seatsLine(op, ex.seat)}.</p>
<p><b>W1, schools asking:</b></p>${keyTrace(op, false)}<p>${seatsLine(op, run(op, false).seat)}. Every school got its first choice and every student is worse off or level: Priya drops from UMass (her 2nd) to NYU (her last), Ravi from NYU (1st) to UMass (last). Sam is at MIT either way. <b>The answer depends on who asks.</b></p>
<p><b>Check table:</b> Priya has NYU and would rather have MIT or UMass Amherst, but each is holding its own first choice (Sam, Ravi). Ravi has UMass Amherst and would rather have NYU or MIT, and again each has its first choice. Sam has his first choice. Nobody can find a partner who would also switch, so it holds. Both runs hold; they are the two extremes.</p></section>`);

  return `<div class="page"><span class="tag">Part 1 · Learn</span><h2>Ask, hold, bump, repeat</h2>
<p>Some students, the same number of schools, one seat at each. Every student ranks every school, and every school ranks every student. We want an arrangement that <b>holds</b>: one where no student and school would <i>both</i> rather have each other than who they ended up with.</p>
<div class="defn"><b>The process (students asking)</b><ol style="margin:4pt 0 0">
<li>Pick any student who has no seat. They ask the next school on their list that they have not asked yet.</li>
<li>If that school is holding nobody, it <b>holds</b> the student. Holding is a "maybe", not a yes.</li>
<li>If it is already holding somebody, it keeps whichever of the two it likes better. The other one is <b>turned away</b> (if they were the one asking) or <b>let go</b> (if they were being held).</li>
<li>Anyone without a seat goes back to step 1, carrying on down their own list from where they left off.</li>
<li>When everybody is held, stop. Only now is anything final.</li></ol></div>
<ul><li><b>Turned away</b> costs you one name off your list. <b>Let go</b> (bumped) sends you back to spend more of your list.</li>
<li>Nobody ever asks the same school twice. A school, once asked, is always holding somebody, and only ever swaps for someone it likes better.</li>
<li>Either side can be the one asking. Swap the roles and run the same rules.</li></ul>
<h3>How to keep track on paper</h3>
<p>Cross names off the asker's list as they ask. Under each school, write who it is holding right now, and strike them out when they are let go. Log every ask on a line of the trace table.</p>

<h3>Worked example: three students, three seats (students asking)</h3>
${prefTables(op)}
<table class="wide small"><tr><th>#</th><th>asks</th><th>whom</th><th class="l">what happens</th></tr>${ex.log.map((e, i) => `<tr><td>${i + 1}</td><td>${e.a}</td><td>${e.b}</td><td class="l">${e.what}</td></tr>`).join('')}</table>
<p>Result: ${seatsLine(op, ex.seat)}. Priya was held by MIT and then bumped by Sam, whom MIT likes best. Nobody got everything: Priya is at her 2nd choice. Does it hold? Priya would rather have MIT, but MIT has Sam, its first choice, so MIT would not switch. It takes two. Sam and Ravi are at their first choices. So nobody can break it.</p>
</div>
<div class="flow"><span class="tag">Part 1 · Try it</span><h2>Run it the other way</h2>
${w1}
<h3>Checking whether an arrangement holds</h3>
<p>Two people <b>break</b> an arrangement if they would both rather have each other than who they have. To check an arrangement, go student by student:</p>
<ol><li>List the schools this student ranks <i>above</i> the one they have.</li>
<li>For each of those, ask: does that school rank this student above the student it has?</li>
<li>If yes, those two would both switch. The arrangement is broken. If no student has such a school, it holds.</li></ol>
<table class="blank wide"><tr><th>Student</th><th>has</th><th>schools they'd rather have</th><th>would any of those rather have them?</th></tr>
${op.S.map((s) => `<tr><td>${s}</td><td></td><td></td><td></td></tr>`).join('')}</table>
<p class="small">Use this table on the result of W1. Does it hold? ${writeLines(1)}</p>
<div class="note"><b>Three facts worth carrying into the questions</b> (proved in Part 3):
<ol style="margin:3pt 0 0"><li>The order in which the asks happen never changes the ending, only the story.</li>
<li>Whichever side asks gets the best seat for them that any arrangement that holds can give; the other side gets its worst.</li>
<li>So anyone in the same seat in both runs is in that seat in <i>every</i> arrangement that holds.</li></ol></div>
</div>`;
}

function warmups(P, keys) {
  const W = [
    { id: 'W2', inst: P['head-on'], text: 'Two students who want opposite things. Run it both ways.', rows: 3,
      key: (i) => `Students asking: ${seatsLine(i, run(i, true).seat)}. Schools asking: ${seatsLine(i, run(i, false).seat)}. Each student's first choice is a school whose first choice is the other student, so whoever asks gets everything, in two questions and no bumps. Both arrangements hold.` },
    { id: 'W3', inst: P['everyone-agrees'], text: 'Everyone wants the same things. Run it with the students asking and count the asks. Then predict the schools-asking result before running it.', rows: 11,
      key: (i) => `${seatsLine(i, run(i, true).seat)}, both ways. ${run(i, true).log.length} asks each way, lots of turning away and nobody ever bumped. When everybody agrees there is only one arrangement that holds, so who asks cannot matter.` },
    { id: 'W4', inst: P['nothing-changes'], text: 'Preferences genuinely conflict here. Run it both ways and compare.', rows: 11,
      key: (i) => `Students asking (${run(i, true).log.length} asks): ${seatsLine(i, run(i, true).seat)}. Schools asking (${run(i, false).log.length} asks): ${seatsLine(i, run(i, false).seat)}. Identical, even though people were bumped along the way: this set of lists has exactly one arrangement that holds, so both directions must find it. Asking first is only an advantage when more than one arrangement holds.` },
  ];
  let s = `<div class="flow"><span class="tag">Part 1 · More practice</span><h2>Warm-ups before the questions</h2>`;
  for (const w of W) {
    s += `<div class="try"><span class="tag">Warm-up ${w.id} · ${esc(w.inst.title)}</span><p>${w.text}</p>${prefTables(w.inst, { reasons: true })}
    ${w.rows > 5 ? `<p class="small muted">Trace, students asking (run the schools-asking side on scrap paper, or predict it):</p>` : ''}${traceTable(w.rows)}${w.rows > 5 ? '<p class="small">Students asking:</p>' : ''}${seatFill(w.inst)}
    ${w.id === 'W2' ? `<p class="small">Schools asking:</p>${seatFill(w.inst)}` : `<p class="small">Schools asking:</p>${seatFill(w.inst)}`}</div>`;
    keys.push(`<section class="k"><div class="khead">Warm-up ${w.id}</div><p>${w.key(w.inst)}</p>${keyTrace(w.inst, true)}</section>`);
  }
  s += '</div>';
  return s;
}

function challenge(P, keys) {
  const c = P.cascade;
  const r = run(c, true);
  const bumps = r.log.filter((e) => e.what.includes('lets')).length;
  const st = allStable(c);
  const gb = P['good-and-bad'];
  const gst = allStable(gb);
  keys.push(`<section class="k"><div class="khead">Challenge C1 · the cascade</div>${keyTrace(c, true)}
<p>Students asking: ${seatsLine(c, r.seat)} (${r.log.length} asks, ${bumps} people let go, all in one unbroken chain set off when Diego asks MIT). Schools asking: ${seatsLine(c, run(c, false).seat)}, five asks and no bumps. This instance has ${st.length} arrangements that hold:</p>
<ul>${st.map((m) => `<li>${seatsLine(c, m)}</li>`).join('')}</ul><p>Two of them are reachable by neither run: the process only ever finds the two extremes.</p></section>
<section class="k"><div class="khead">Challenge C2 · good people and bad people</div>
<p>All ${gst.length} arrangements that hold:</p><ul>${gst.map((m) => `<li>${seatsLine(gb, m)}</li>`).join('')}</ul>
<p>Priya and Sam (the good students) are always at MIT or UMass Amherst (the good schools). The argument is question 4.3.</p></section>`);
  return `<div class="flow"><span class="tag">Part 1 · Challenge</span><h2>Two harder instances</h2>
<div class="try"><span class="tag">Challenge C1 · ${esc(c.title)}</span>
<p>Five and five. Run it with the students asking. Count how many people get let go, and notice how late in the run the chain happens. Then run it with the schools asking.</p>
${prefTables(c, { reasons: false })}${traceTable(13)}${seatFill(c)}<p class="small">Schools asking:</p>${seatFill(c)}
<p class="small">Bonus: this instance has four arrangements that hold. Find the two that neither run produces. ${writeLines(2)}</p></div>
<div class="try"><span class="tag">Challenge C2 · ${esc(gb.title)}</span>
<p>MIT and UMass Amherst are the "good" schools and Priya and Sam the "good" students: every list ranks both good people above both bad ones. Find <b>every</b> arrangement that holds (there are several). What do they all have in common?</p>
${prefTables(gb, { reasons: false })}${writeLines(4)}</div></div>`;
}

function part2() {
  return `<div class="page"><span class="tag">Part 2 · Learn</span><h2>Why this works, and the textbook words</h2>
<p>Three things are true of every finished run. Each comes plainly first, then the way a textbook says it.</p>
<h3>1. It finishes</h3>
<p>Every ask uses up one name off one list, and nobody ever asks the same name twice. With n askers and n names on each list, there can be at most n × n asks, and then there is nothing left to ask.</p>
<p class="small muted"><b>Textbook:</b> The algorithm terminates after at most n² proposals. Each proposer keeps a cursor into their preference list; each proposal advances it by one and it never moves back (it is monotone).</p>
<h3>2. Nobody is left out</h3>
<p>Once anybody asks a school, that school is holding somebody forever after. So if some student had asked every school, every school would be holding somebody: that is n students held, and there are only n students. The one who ran out would have to be one of them. Contradiction.</p>
<p class="small muted"><b>Textbook:</b> The resulting matching is perfect. A receiver that has been proposed to is never again unmatched…</p>
<h3>3. It holds</h3>
<p>Take a student and a school not together, where the student would rather have that school. Then the student asked it at some point (they walked past it on their list to get where they are). From that ask on the school was holding somebody and only ever traded up. So it ends with somebody it likes better than this student and would not switch. It takes two.</p>
<p class="small muted"><b>Textbook:</b> The resulting matching is stable: it admits no blocking pair. Uses the invariant that a receiver only ever trades up its own list.</p>
<h3>Glossary: textbook word = plain phrase</h3>
<table class="wide small">${'<tr><th class="l">Textbook</th><th class="l">Plain</th></tr>'}${loadGS().FORMAL_TERMS.map((t) => `<tr><td class="l"><b>${esc(t.term)}</b></td><td class="l">${esc(t.replaces)}</td></tr>`).join('')}
<tr><td class="l"><b>college (c), student (s)</b></td><td class="l">the textbook's names for the two sides; "college" = school</td></tr></table>
</div>
<div class="page"><span class="tag">Part 2 · Learn</span><h2>Reading a statement exactly</h2>
<p>Problem sets grade whether you read a claim precisely. The tier's statement (Kleinberg &amp; Tardos ch. 1, exercise 1):</p>
<pre class="quote">${esc(loadGS().STATEMENT)}</pre>
<h3>Symbols</h3>
<p><b>∀</b> for every · <b>∃</b> there is at least one · <b>∧</b> and · <b>¬</b> it is not the case that. An <b>instance</b> is one complete set of inputs: the two sides and a strict ranking of the whole other side for each person. It does not include who asks, and it does not include any answer.</p>
<h3>English phrases are quantifiers</h3>
<p>Underline them in order and the formula writes itself: "in every instance" = ∀I, "there is a stable matching" = ∃M, "containing a pair" = ∃(c, s) ∈ M.</p>
<h3>Negating: walk left to right</h3>
<p>Every quantifier turns into the other kind, nothing moves, and the part at the end is negated. ∀I ∃M ∃(c,s): φ &nbsp;becomes&nbsp; ∃I ∀M ∀(c,s): ¬φ.</p>
<div class="warn"><b>What a disproof must do.</b> The negation says: <i>there is an instance</i> in which <i>every</i> stable matching lacks the pair. Finding the instance is half. Ruling out <i>every</i> stable matching of it is the other half, and it is the half that gets skipped.</div>
<div class="try"><span class="tag">Try it</span>
<p>1. Underline the three quantifier phrases in the statement above. 2. Write its negation in plain English. 3. In the instance below, list every matching, say which are stable, and check each for a pair who are first on each other's lists.</p>
<pre class="quote">c1 : s1 &gt; s2        s1 : c2 &gt; c1
c2 : s2 &gt; s1        s2 : c1 &gt; c2</pre>${writeLines(5)}</div>
</div>`;
}

function part3(P) {
  const w = P.worksheet;
  return `<div class="page"><span class="tag">Part 3 · Learn</span><h2>Running time, and who comes out best</h2>
<h3>How many asks?</h3>
<p>At most n²: each ask spends a name from a list and names are never put back. (The exact worst case is n² − n + 1.) A chain of bumps can be long but never exponential, because each bump still spends a name.</p>
<h3>Making each ask cost O(1)</h3>
<p>When a school holding somebody is asked, it compares two names on its list. Scanning the list each time costs O(n), making the whole run O(n³). Fix: before the run, build for each school an array <b>ranking[student] = position on this school's list</b>. That costs O(n²) once, and afterwards every comparison is two array reads. Keep free askers in a queue or stack so picking the next is O(1) too.</p>
<div class="try"><span class="tag">Activity · build the ranking array for the four-by-four instance</span>
<p>School lists: ${w.C.map((c, j) => `<b>${c}</b>: ${w.cp[j].map((i) => w.S[i]).join(' &gt; ')}`).join(' &nbsp;·&nbsp; ')}</p>
<table class="blank"><tr><th>ranking</th>${w.S.map((s) => `<th>${s}</th>`).join('')}</tr>${w.C.map((c) => `<tr><th>${c}</th>${w.S.map(() => '<td></td>').join('')}</tr>`).join('')}</table>
<p class="small">Using only your table: UMass Amherst is holding Ravi and Maya asks. What happens? ${writeLines(1)}</p></div>
<h3>Best for the askers, worst for the asked</h3>
<p>Call a school a <b>valid partner</b> of a student if at least one stable matching pairs them. The theorem: <b>no asker is ever turned away by a valid partner</b>. Proof idea: look at the <i>first</i> time it happens, p rejected by valid partner r in favour of q. Because it is the first time, q has not been rejected by any valid partner, so q likes r at least as much as any valid partner, including q's partner in the stable matching M that pairs p with r. Then q and r block M. Contradiction. So every asker ends with their <b>best valid partner</b> (proposer-optimal) and, mirror image, every receiver with its <b>worst</b> (receiver-pessimal). This is also why the order of asks cannot matter.</p>
<h3>Does lying pay?</h3>
<p>Not for the askers: telling the truth is a <b>dominant strategy</b> for them (Dubins &amp; Freedman; Roth). The receivers <i>can</i> sometimes gain by misreporting, e.g. truncating their list. No process that always ends stable can make honesty best for both sides.</p>
<h3>Which assumptions carry weight?</h3>
<p>Lists are <b>strict</b> (no ties) and <b>complete</b> (everyone ranks everyone). Allow incomplete lists and people can end unmatched, so "nobody is left out" fails and stability must be restated to include "nobody" as an option. It still finishes, and the result is still stable under the new definition.</p>
</div>`;
}

function part4() {
  return `<div class="page"><span class="tag">Part 4 · Learn</span><h2>Proof tools and variants</h2>
<h3>A measure of progress</h3>
<p>To show a loop stops, find one number that goes up by at least one every step and cannot pass a ceiling. Here: the number of (asker, asked) pairs where the ask has already happened. +1 each step, never above n². "Number of free people" does not work: a bump leaves it unchanged.</p>
<h3>"Finishes" and "nobody left out" are two theorems</h3>
<p>The loop stops when no free asker has anyone left to ask. The step to prove: a free asker always has somebody left, by counting (if they had asked everyone, all n on the other side are holding someone, so n askers are held, leaving no room for this one).</p>
<h3>Claims about <i>every</i> stable matching</h3>
<p>No algorithm appears. The shape: assume some stable matching is "wrong", count until two people are provably misplaced, show they would both switch. Example: if every list ranks the k good people above the bad ones, a good student with a bad school means one good school has a bad student, and those two block.</p>
<h3>Variants</h3>
<ul>
<li><b>Forbidden pairs</b> (incomplete lists). Not the same as ranking last: a forbidden pair isn't a bad matching, it isn't a matching. People may end unmatched; stability gains cases (a matched person who prefers some unmatched partner; two unmatched people allowed to each other). The loop changes one word: keep asking while a free asker has someone left they are <i>allowed</i> to ask.</li>
<li><b>Hospitals and residents.</b> Hospitals have q posts; more students than posts. Each hospital holds its q best askers so far. A hospital with q posts is q hospitals with one post and the same list, so the old proofs carry over. Stability gains a case: an unmatched student and a hospital that prefers them to someone it took. (The US residency match used this before Gale and Shapley published in 1962.)</li>
<li><b>Ties.</b> A pair blocks <i>strongly</i> if both strictly prefer each other; <i>weakly</i> if one strictly prefers and the other is at least indifferent. Break ties arbitrarily and run the process: no strongly blocking pair survives, so that kind always exists. A matching with no weakly blocking pair need not exist.</li>
</ul>
<div class="try"><span class="tag">Try it</span>
<p>Two students both rank MIT above NYU; both schools are indifferent between the two students. List both possible matchings and find a weakly blocking pair in each.</p>${writeLines(4)}</div>
</div>`;
}

function summary() {
  return `<div class="page summary"><span class="tag">Keep this page</span><h2>One-page summary</h2><div class="two"><div>
<h3>The process</h3><ul><li>Free asker asks the next name on their list.</li><li>Asked side holds the best asker so far; the other is turned away / let go.</li><li>Stop when nobody is free. At most n² asks.</li></ul>
<h3>Holds (stable)</h3><ul><li>Broken by two people who would <b>both</b> rather have each other (blocking pair).</li><li>Check: for each student, schools above their seat; would any of those prefer them to who it has?</li></ul>
<h3>Why it works</h3><ul><li>Finishes: names are spent, never returned.</li><li>Nobody left out: anyone asked holds someone forever; counting.</li><li>Holds: you asked every school above yours; each ended with someone it likes better.</li></ul>
<h3>Who asks matters</h3><ul><li>Askers: best valid partner. Asked: worst valid partner.</li><li>Order of asks never changes the ending.</li><li>Same seat in both runs ⇒ same seat in every stable matching.</li><li>Exactly one stable matching ⇒ both directions agree.</li><li>A mutual first-choice pair is in every stable matching.</li><li>There may be many stable matchings (exponentially many); runs find only the two extremes.</li></ul>
</div><div>
<h3>Statements</h3><ul><li>Instance = the inputs only (people + strict complete lists).</li><li>Negate: flip every quantifier, keep order, negate the end.</li><li>Disprove "∀I ∃M": one instance + <b>every</b> stable matching of it.</li></ul>
<h3>Running time</h3><ul><li>n² asks × O(1) each, using ranking[school][student] built once in O(n²).</li></ul>
<h3>Incentives</h3><ul><li>Honesty is dominant for askers; receivers can gain by lying.</li></ul>
<h3>Variants</h3><ul><li>Incomplete lists / forbidden pairs: unmatched people; stability grows cases.</li><li>Hospitals with q posts = q copies with one post.</li><li>Ties: strongly-stable-free always exists (break ties); weakly-blocking-free may not.</li></ul>
<h3>Proof moves</h3><ul><li>Measure of progress: one number, +1 per step, capped.</li><li>"First violation" in extremal proofs.</li><li>Count, then exhibit a blocking pair.</li></ul>
</div></div></div>`;
}

// ---------------------------------------------------------------------------

export function buildGS() {
  const G = loadGS();
  const P = G.presets;
  const byTier = {};
  for (const q of G.QUESTIONS) (byTier[q.tier] ??= []).push(q);
  const keys = [];
  const actKeys = [];

  const w = P.worksheet;
  const activityRanking = `<section class="k"><div class="khead">Part 3 ranking array</div>
<table><tr><th></th>${w.S.map((s) => `<th>${s}</th>`).join('')}</tr>${w.C.map((c, j) => `<tr><th>${c}</th>${w.S.map((_, i) => `<td>${w.cp[j].indexOf(i) + 1}</td>`).join('')}</tr>`).join('')}</table>
<p>UMass Amherst: ranking[Maya] = ${w.cp[1].indexOf(3) + 1} &lt; ranking[Ravi] = ${w.cp[1].indexOf(2) + 1}, so it holds Maya and lets Ravi go.</p></section>`;
  const part2Key = `<section class="k"><div class="khead">Part 2 try-it</div>
<p>2. There is an instance in which every stable matching contains no pair (c, s) that are first on each other's lists. 3. Matchings {(c1,s1),(c2,s2)} and {(c1,s2),(c2,s1)}. Both are stable: in the first both colleges have their first choice, in the second both students do. Neither contains a mutual first pair, because none exists in this instance: c1 tops s2's list but c1 wants s1; c2 tops s1's list but c2 wants s2. That is the full disproof (question 2.6).</p></section>`;
  const part4Key = `<section class="k"><div class="khead">Part 4 try-it</div>
<p>Matching 1: student A at MIT, B at NYU. B strictly prefers MIT, and MIT is indifferent between A and B, so (B, MIT) blocks weakly. Matching 2 is the mirror, blocked weakly by (A, MIT). Every matching has a weakly blocking pair, so none is weakly stable, yet neither has a strongly blocking pair.</p></section>`;

  let body = `<div class="cover"><span class="tag">Algorithms · printable workbook</span>
<h1>Who Gets In, and Why</h1><div class="sub">Stable matching (the Gale-Shapley algorithm), learned on paper: the procedure, runs you work by hand, the proofs, and 24 questions in four tiers, with an answer key that explains every option.</div>
<h3>How to use this packet</h3><ol>
<li>Work in order. <b>Part 1</b> teaches the procedure with a worked example, then you run it yourself on warm-ups and two challenges. Every run has a blank <b>trace table</b>: one line per ask.</li>
<li>Part 1 uses plain words (ask, hold, let go, holds). From Part 2 on, the textbook words come in, each with the plain phrase it replaces. The glossary is on the Part 2 page.</li>
<li>Each question names the <b>skill</b> it checks, and every wrong option is a mistake people really make.</li>
<li>The <b>answer key</b> is at the back on its own pages. It includes a full trace for every run and explains every option. Your order of asks may differ from the key's; your final seats should not.</li>
<li>The preference lists are made up. The schools are real; their preferences are not.</li></ol>
<table class="toc" style="margin-top:14pt">${[1, 2, 3, 4].map((t) => `<tr><td><b>Part ${t}</b></td><td>${TIER_NAMES[t]}</td><td>${byTier[t].length} questions</td></tr>`).join('')}
<tr><td><b>Summary</b></td><td>One page to keep</td><td></td></tr><tr><td><b>Key</b></td><td>Traces, activities, every question</td><td></td></tr></table></div>`;

  body += part1(P, actKeys);
  body += warmups(P, actKeys);
  body += challenge(P, actKeys);

  const questionPages = (t, intro = '') => {
    let s = `<div class="flow"><span class="tag">Part ${t} · Questions</span><h2>Tier ${t}: ${TIER_NAMES[t]}</h2>${intro}`;
    byTier[t].forEach((q, i) => {
      const num = `${t}.${i + 1}`;
      const inst = q.instanceId ? P[q.instanceId] : null;
      if (q.kind === 'pairing') {
        const studentsAsk = q.side === 'students';
        const r = run(inst, studentsAsk);
        const bodyQ = `${i === 0 ? prefTables(inst) : `<p class="small muted">Same lists as question ${t}.1.</p>${prefTables(inst, { compact: true })}`}${traceTable(studentsAsk ? 8 : 11)}${seatFill(inst)}`;
        s += renderQ(num, q, { body: bodyQ });
        keys.push(renderKey(num, q, { body: `<p class="ans">${seatsLine(inst, r.seat)}</p><ul class="whys">${inst.S.map((st, k) => `<li><b>${st}</b>: ${esc(q.rows[inst.sIds[k]])}</li>`).join('')}</ul>${keyTrace(inst, studentsAsk)}` }));
      } else if (q.kind === 'arrangements') {
        const bodyQ = `<p class="small muted">Same lists as question ${t}.1.</p>${prefTables(inst, { compact: true })}
          ${q.candidates.map((c, k) => `<div class="cand"><b>${'ABCDEF'[k]}</b><div><span class="box sq" style="display:inline-block;vertical-align:middle"></span> holds &nbsp; <span class="seats">${inst.S.map((st, x) => `${st} → ${inst.C[inst.cIds.indexOf(c.pairs[inst.sIds[x]])]}`).join(' · ')}</span></div><div class="blk">If not, who would both switch? <span></span> &amp; <span style="width:90pt"></span></div></div>`).join('')}`;
        s += renderQ(num, q, { body: bodyQ });
        const lines = q.candidates.map((c, k) => {
          const seat = Object.fromEntries(inst.S.map((st, x) => [st, inst.C[inst.cIds.indexOf(c.pairs[inst.sIds[x]])]]));
          const b = blocking(inst, seat);
          return `<li class="${b.length ? 'no' : 'ok'}"><b>${'ABCDEF'[k]}</b> ${b.length ? `✗ Broken. ${esc(blockSentence(inst, b[0]))}${b.length > 1 ? ` (${b.length} such pairs in all: ${b.map((x) => `${x.s} & ${x.c}`).join(', ')}.)` : ''}` : '✓ Holds: no student has a school above their seat that would also rather have them.'} <i>${esc(c.note)}</i></li>`;
        });
        const okL = q.candidates.map((c, k) => {
          const seat = Object.fromEntries(inst.S.map((st, x) => [st, inst.C[inst.cIds.indexOf(c.pairs[inst.sIds[x]])]]));
          return blocking(inst, seat).length ? null : 'ABCDEF'[k];
        }).filter(Boolean);
        keys.push(renderKey(num, q, { body: `<p class="ans">Hold: <b>${okL.join(', ')}</b></p><ul class="whys">${lines.join('')}</ul>` }));
      } else {
        const pre = inst && q.instanceId === 'worksheet' ? `<p class="small muted">About the four-by-four lists in question 1.1.</p>` : '';
        s += renderQ(num, q, { pre });
        keys.push(renderKey(num, q));
      }
    });
    return s + '</div>';
  };

  body += questionPages(1);
  body += part2();
  body += questionPages(2, `<p class="small muted">Glossary on the Part 2 Learn page. c = college (school), s = student.</p>`);
  body += part3(P);
  body += questionPages(3);
  body += part4();
  body += questionPages(4);
  body += summary();
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: runs and activities</h2><p class="keyintro">Try everything before you look.</p>${actKeys.join('')}${part2Key}${activityRanking}${part4Key}</div>`;
  body += `<div class="page"><span class="tag">Answer key</span><h2>Answer key: questions</h2>${keys.join('')}</div>`;
  return doc('Who Gets In, and Why: printable workbook', body);
}
