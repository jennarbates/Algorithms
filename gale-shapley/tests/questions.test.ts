import { describe, expect, it } from 'vitest';
import { createEngine, matchingOf, run, step } from '../src/core/engine';
import {
  MAX_ENUMERABLE_SIZE,
  allPerfectMatchings,
  allStableMatchings,
  sameMatching,
} from '../src/core/enumerate';
import { blockingPairs, isPerfect, isStable } from '../src/core/stability';
import { PRESETS, presetById } from '../src/content/presets';
import { QUESTIONS, FORMAL_TERMS, questionsIn } from '../src/content/questions';
import type { Option, Question, TieClaim } from '../src/content/questions';
import { instanceFromGiven, tiedQuote } from '../src/content/bench';
import { judgeTiedPair, strongInstabilities, weakInstabilities } from '../src/core/ties';
import type { Instance, Matching } from '../src/core/types';

/**
 * The practice questions, checked rather than proofread.
 *
 * A question bank is the one part of a teaching page that can be confidently
 * wrong. Everything here exists so that it cannot be wrong quietly: the answers
 * that can be computed are recomputed from the core, the instances the questions
 * lean on are checked for the properties the questions claim they have, and the
 * vocabulary rule that governs the rest of the page governs these words too.
 */

const BANNED = [
  'propose',
  'proposal',
  'proposer',
  'receiver',
  'reject',
  'tentative',
  'tentatively',
  'optimal',
  'pessimal',
  'stable',
  'unstable',
  'blocking pair',
  'algorithm',
  'terminate',
  'converge',
  'iteration',
  'agent',
  'matching',
  'invariant',
];

/** Every sentence a question puts on the page, wherever it lives in the shape. */
function wordsOf(q: Question): string[] {
  const out = [q.tests, q.prompt, q.close];
  if (q.quote) out.push(q.quote);
  if (q.kind === 'choice' || q.kind === 'multi') {
    for (const o of q.options) out.push(o.t, o.why);
  }
  if (q.kind === 'proof') {
    for (const step of q.steps) {
      out.push(step.lead);
      for (const o of step.options) out.push(o.t, o.why);
    }
  }
  if (q.kind === 'pairing') out.push(...Object.values(q.rows));
  if (q.kind === 'arrangements') out.push(...q.candidates.map((c) => c.note));
  return out;
}

describe('every question', () => {
  it.each(QUESTIONS.map((q) => [q.id, q] as const))(
    '%s is shaped so it can be answered',
    (_id, q) => {
      expect(q.tests.trim().length).toBeGreaterThan(0);
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.close.trim().length).toBeGreaterThan(0);

      if (q.kind === 'choice') {
        expect(q.options.filter((o) => o.ok)).toHaveLength(1);
      }
      if (q.kind === 'multi') {
        expect(q.options.some((o) => o.ok)).toBe(true);
        expect(q.options.some((o) => !o.ok)).toBe(true);
      }
      if (q.kind === 'choice' || q.kind === 'multi') {
        for (const o of q.options) expect(o.why.trim().length, o.t).toBeGreaterThan(0);
      }
      if (q.kind === 'proof') {
        for (const step of q.steps) {
          expect(
            step.options.filter((o) => o.ok),
            step.lead,
          ).toHaveLength(1);
          for (const o of step.options) expect(o.why.trim().length, o.t).toBeGreaterThan(0);
        }
      }
    },
  );

  it('has an id nobody else has', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('does not offer the same answer twice in one question', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'choice' && q.kind !== 'multi') continue;
      const labels = q.options.map((o) => o.t);
      expect(new Set(labels).size, q.id).toBe(labels.length);
    }
  });

  // A reader who notices the right answer is always first stops reading, which
  // costs more than it saves. This only asks that it moves around.
  it('does not always put the right answer first', () => {
    const positions = QUESTIONS.filter((q) => q.kind === 'choice').map((q) =>
      q.kind === 'choice' ? q.options.findIndex((o) => o.ok) : -1,
    );
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  // Same again for the proofs, where it is easier to slip into: a proof whose
  // right line is always first is answered by clicking down the left edge.
  it('does not always put the right line of a proof step first', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'proof') continue;
      const positions = q.steps.map((st) => st.options.findIndex((o) => o.ok));
      expect(
        new Set(positions).size,
        `${q.id}: every step has its answer in the same place`,
      ).toBeGreaterThan(1);
    }
  });
});

describe('the vocabulary rule', () => {
  it('keeps tier 1 in the words the rest of the page uses', () => {
    for (const q of questionsIn(1)) {
      for (const sentence of wordsOf(q)) {
        const lower = sentence.toLowerCase();
        for (const term of BANNED) {
          expect(lower, `${q.id}: "${sentence}"`).not.toContain(term);
        }
      }
    }
  });

  it('introduces every textbook word the formal tiers lean on', () => {
    const introduced = FORMAL_TERMS.map((t) => t.term.toLowerCase());
    for (const q of [...questionsIn(2), ...questionsIn(3), ...questionsIn(4)]) {
      const text = wordsOf(q).join(' ').toLowerCase();
      for (const banned of BANNED) {
        if (!text.includes(banned)) continue;
        const covered = introduced.some((t) => t.includes(banned) || banned.includes(t));
        expect(covered, `${q.id} says "${banned}" without introducing it`).toBe(true);
      }
    }
  });

  it('uses every word it introduces, and gives each one a plain phrase', () => {
    const text = [...questionsIn(2), ...questionsIn(3), ...questionsIn(4)]
      .flatMap(wordsOf)
      .join(' ')
      .toLowerCase();
    for (const { term, replaces } of FORMAL_TERMS) {
      expect(text, `"${term}" is introduced and never used`).toContain(term.toLowerCase());
      expect(replaces.trim().length, term).toBeGreaterThan(0);
    }
    const names = FORMAL_TERMS.map((t) => t.term);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('the questions that are worked, not read', () => {
  it('asks about runs whose answer the engine actually produces', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'pairing') continue;
      const instance = presetById(q.instanceId);
      const matching = matchingOf(run(instance, q.side));
      expect(isPerfect(instance, matching), q.id).toBe(true);
      expect(isStable(instance, matching), q.id).toBe(true);
      // one written line per person, and nobody left without one
      for (const student of instance.students) {
        expect(q.rows[student.id], `${q.id}: no line for ${student.id}`).toBeTruthy();
      }
      expect(Object.keys(q.rows)).toHaveLength(instance.students.length);
    }
  });

  it('names the school each line says the person ends at', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'pairing') continue;
      const instance = presetById(q.instanceId);
      const matching = matchingOf(run(instance, q.side));
      for (const student of instance.students) {
        const schoolId = matching[student.id];
        const school = instance.schools.find((c) => c.id === schoolId);
        const line = q.rows[student.id] ?? '';
        expect(school, `${q.id}: ${student.id} is unmatched`).toBeDefined();
        // The reason has to mention where they land, or it is a reason for
        // something else. Two lines end by naming the other run instead, and
        // those say the school by way of "where he started", so allow either.
        const names = school ? line.includes(school.name) : false;
        const refersToTheOtherRun = line.includes('other run');
        expect(
          names || refersToTheOtherRun,
          `${q.id}: the line for ${student.id} never says ${school?.name}`,
        ).toBe(true);
      }
    }
  });

  it('offers arrangements whose verdicts are decided by the core, not by the text', () => {
    for (const q of QUESTIONS) {
      if (q.kind !== 'arrangements') continue;
      const instance = presetById(q.instanceId);
      const stable = allStableMatchings(instance);

      let held = 0;
      for (const candidate of q.candidates) {
        const matching: Matching = candidate.pairs;
        expect(isPerfect(instance, matching), `${q.id}: ${JSON.stringify(candidate.pairs)}`).toBe(
          true,
        );
        if (isStable(instance, matching)) held += 1;
        expect(candidate.note.trim().length).toBeGreaterThan(0);
      }

      // A tick-the-true question is worthless if everything is true or nothing is.
      expect(held, `${q.id}: nothing in it holds`).toBeGreaterThan(0);
      expect(held, `${q.id}: everything in it holds`).toBeLessThan(q.candidates.length);
      // And every arrangement that holds anywhere in the instance is on offer,
      // so "tick every one that holds" is a complete question.
      expect(held).toBe(stable.length);

      // Every one that breaks can say who breaks it, in names.
      for (const candidate of q.candidates) {
        const blocking = blockingPairs(instance, candidate.pairs);
        for (const pair of blocking) {
          expect(instance.students.some((s) => s.id === pair.student)).toBe(true);
          expect(instance.schools.some((c) => c.id === pair.school)).toBe(true);
        }
      }
    }
  });
});

/**
 * The sentences that quote a number.
 *
 * A reason that says "UMass asks three times" is an assertion about a run, and an
 * assertion about a run can go stale the moment a preference list is touched. Each
 * of these recomputes the number the prose quotes.
 */
describe('the counts the reasons quote', () => {
  const worksheet = presetById('worksheet');
  const asksBy = (side: 'students' | 'schools') => {
    const tally: Record<string, number> = {};
    for (const e of run(worksheet, side).log) {
      if (e.kind === 'ask') tally[e.asker] = (tally[e.asker] ?? 0) + 1;
    }
    return tally;
  };

  it('has UMass asking three times when the schools ask, and nobody asking more', () => {
    const tally = asksBy('schools');
    expect(tally['umass']).toBe(3);
    expect(Math.max(...Object.values(tally))).toBe(3);
  });

  it('has four schools asking Priya, and her letting three of them go', () => {
    const log = run(worksheet, 'schools').log;
    const askedPriya = log.filter((e) => e.kind === 'ask' && e.receiver === 'priya');
    expect(askedPriya).toHaveLength(4);
    // she is the receiver here, so a displacement is a school she lets go
    const letGo = log.filter((e, i) => {
      if (e.kind !== 'displaced') return false;
      const ask = log[i - 1];
      return ask?.kind === 'ask' && ask.receiver === 'priya';
    });
    expect(letGo).toHaveLength(3);
  });

  it('has UMass ask Sam first, MIT displace it, and Sam turn Berkeley away', () => {
    const log = run(worksheet, 'schools').log;
    const aboutSam: string[] = [];
    for (let i = 0; i < log.length; i += 1) {
      const e = log[i];
      if (e?.kind !== 'ask' || e.receiver !== 'sam') continue;
      const outcome = log[i + 1];
      aboutSam.push(`${e.asker}:${outcome?.kind ?? '?'}`);
    }
    expect(aboutSam).toEqual(['umass:accepted-empty', 'mit:displaced', 'berkeley:turned-away']);
  });

  it('has nobody else ask Ravi, and UMass ask Maya last', () => {
    const log = run(worksheet, 'schools').log;
    expect(log.filter((e) => e.kind === 'ask' && e.receiver === 'ravi')).toHaveLength(1);
    const asks = log.filter((e) => e.kind === 'ask');
    const last = asks[asks.length - 1];
    expect(last?.kind === 'ask' && last.receiver).toBe('maya');
    expect(last?.kind === 'ask' && last.asker).toBe('umass');
  });

  it('leaves the cascade with four arrangements, only two of which a run reaches', () => {
    const cascade = presetById('cascade');
    const all = allStableMatchings(cascade);
    expect(all).toHaveLength(4);
    const byStudents = matchingOf(run(cascade, 'students'));
    const bySchools = matchingOf(run(cascade, 'schools'));
    const reachable = all.filter((m) => sameMatching(m, byStudents) || sameMatching(m, bySchools));
    expect(reachable).toHaveLength(2);
  });

  it('leaves one preset giving the same answer either way, as one reason claims', () => {
    const agrees = PRESETS.filter(
      (p) =>
        p.students.length <= MAX_ENUMERABLE_SIZE &&
        sameMatching(matchingOf(run(p, 'students')), matchingOf(run(p, 'schools'))),
    );
    expect(agrees.length).toBeGreaterThan(0);
    for (const p of agrees) expect(allStableMatchings(p)).toHaveLength(1);
  });
});

describe('the instances the questions lean on', () => {
  const worksheet = presetById('worksheet');
  const cycle = presetById('no-mutual-first');

  it('gives the worksheet instance exactly two arrangements that hold', () => {
    expect(allStableMatchings(worksheet)).toHaveLength(2);
  });

  it('moves two of its four people and leaves two where they are', () => {
    const byStudents = matchingOf(run(worksheet, 'students'));
    const bySchools = matchingOf(run(worksheet, 'schools'));
    const moved = worksheet.students.filter((s) => byStudents[s.id] !== bySchools[s.id]);
    expect(moved.map((s) => s.id).sort()).toEqual(['maya', 'ravi']);
    // Which is the claim the closing note makes: whoever does not move between
    // the two extremes cannot move in any arrangement that holds.
    const stable = allStableMatchings(worksheet);
    for (const id of ['priya', 'sam']) {
      const seats = new Set(stable.map((m) => m[id]));
      expect(seats.size, id).toBe(1);
    }
  });

  it('turns two people away and displaces nobody when the students ask', () => {
    const log = run(worksheet, 'students').log;
    expect(log.filter((e) => e.kind === 'displaced')).toHaveLength(0);
    expect(log.filter((e) => e.kind === 'turned-away')).toHaveLength(2);
  });

  it('leaves nobody first on the list of anybody who is first on theirs', () => {
    for (const school of cycle.schools) {
      const top = school.prefs[0];
      const student = cycle.students.find((s) => s.id === top);
      expect(student).toBeDefined();
      expect(student?.prefs[0], `${school.id} tops ${top}`).not.toBe(school.id);
    }
  });

  it('leaves both of its arrangements without such a pair, which is what the disproof needs', () => {
    const stable = allStableMatchings(cycle);
    expect(stable).toHaveLength(2);
    for (const matching of stable) {
      for (const student of cycle.students) {
        const schoolId = matching[student.id];
        const school = cycle.schools.find((c) => c.id === schoolId);
        expect(school).toBeDefined();
        const mutualFirst = school?.prefs[0] === student.id && student.prefs[0] === school?.id;
        expect(mutualFirst, `${student.id} and ${schoolId}`).toBe(false);
      }
    }
  });

  // The flawed answer the practice section quotes calls its matching stable and
  // is right about that. If this ever fails, the question is quoting a broken
  // argument for the wrong reason.
  it('makes the matching the flawed answer exhibits a stable one', () => {
    const exhibited: Matching = { priya: 'mit', sam: 'nyu' };
    expect(isStable(cycle, exhibited)).toBe(true);
    const theOther: Matching = { priya: 'nyu', sam: 'mit' };
    expect(isStable(cycle, theOther)).toBe(true);
    // and in the other one both students do get their first choice, which is
    // why "neither student has their first choice" cannot finish the proof
    for (const student of cycle.students) {
      expect(theOther[student.id]).toBe(student.prefs[0]);
    }
  });
});

/**
 * Two claims the tier 3 reasons make about instances, kept honest.
 *
 * The first is the lattice fact stated the right way round, which is easy to
 * write backwards: the run in which the students ask is the one the schools like
 * least, so every other arrangement leaves every school at least as happy.
 */
describe('the direction of the asymmetry', () => {
  const worksheet = presetById('worksheet');

  it('leaves both schools that move better off in the other arrangement', () => {
    const byStudents = matchingOf(run(worksheet, 'students'));
    const holder = (m: Matching, schoolId: string) =>
      worksheet.students.find((s) => m[s.id] === schoolId)?.id;

    for (const other of allStableMatchings(worksheet)) {
      if (sameMatching(other, byStudents)) continue;
      for (const school of worksheet.schools) {
        const here = holder(byStudents, school.id);
        const there = holder(other, school.id);
        expect(here, school.id).toBeDefined();
        expect(there, school.id).toBeDefined();
        // never worse in the other arrangement: students-asking is school-pessimal
        expect(
          school.prefs.indexOf(there as string) <= school.prefs.indexOf(here as string),
          `${school.id} should not be worse off away from the student-optimal arrangement`,
        ).toBe(true);
      }
      // and the two that move are strictly better off, which is what the reason says
      expect(holder(byStudents, 'nyu')).toBe('maya');
      expect(holder(byStudents, 'umass')).toBe('ravi');
      expect(holder(other, 'nyu')).toBe('ravi');
      expect(holder(other, 'umass')).toBe('maya');
    }
  });

  it('never asks more than n² − n + 1 questions, on every preset it can enumerate', () => {
    for (const preset of PRESETS) {
      const n = preset.students.length;
      for (const side of ['students', 'schools'] as const) {
        const asks = run(preset, side).log.filter((e) => e.kind === 'ask').length;
        expect(asks, `${preset.id}/${side}`).toBeLessThanOrEqual(n * n - n + 1);
      }
    }
  });
});

/**
 * The three tier 4 claims that can be settled by computation rather than by
 * reading. Each one is an answer the bank marks correct, so each one is checked.
 * The newer tie questions are checked further down, claim by claim.
 */
describe('the variants tier 4 asserts', () => {
  // --- ties: strong always avoidable, weak not -------------------------------
  //
  // Two students both rank MIT above NYU; both schools are indifferent between
  // the two students. The question says every matching here has a weakly blocking
  // pair, and that a matching with no strongly blocking pair exists.
  type Tiers = readonly (readonly string[])[];
  const rank = (tiers: Tiers, who: string) => tiers.findIndex((t) => t.includes(who));

  const studentPrefs: Record<string, Tiers> = {
    priya: [['mit'], ['nyu']],
    sam: [['mit'], ['nyu']],
  };
  const schoolPrefs: Record<string, Tiers> = {
    mit: [['priya', 'sam']],
    nyu: [['priya', 'sam']],
  };
  const everyPairing = [
    { priya: 'mit', sam: 'nyu' },
    { priya: 'nyu', sam: 'mit' },
  ];

  function blocks(pairing: Record<string, string>, kind: 'strong' | 'weak') {
    const holder: Record<string, string> = {};
    for (const [s, c] of Object.entries(pairing)) holder[c] = s;
    for (const s of Object.keys(studentPrefs)) {
      for (const c of Object.keys(schoolPrefs)) {
        if (pairing[s] === c) continue;
        const sTiers = studentPrefs[s] as Tiers;
        const cTiers = schoolPrefs[c] as Tiers;
        const sHas = pairing[s] as string;
        const cHas = holder[c] as string;
        const sStrict = rank(sTiers, c) < rank(sTiers, sHas);
        const sSame = rank(sTiers, c) === rank(sTiers, sHas);
        const cStrict = rank(cTiers, s) < rank(cTiers, cHas);
        const cSame = rank(cTiers, s) === rank(cTiers, cHas);
        if (kind === 'strong' && sStrict && cStrict) return [s, c];
        if (kind === 'weak' && ((sStrict && (cStrict || cSame)) || (cStrict && (sStrict || sSame))))
          return [s, c];
      }
    }
    return null;
  }

  it('leaves no matching of the tie instance free of a weakly blocking pair', () => {
    for (const pairing of everyPairing) {
      expect(blocks(pairing, 'weak'), JSON.stringify(pairing)).not.toBeNull();
    }
  });

  it('and leaves at least one free of a strongly blocking pair', () => {
    const clean = everyPairing.filter((p) => blocks(p, 'strong') === null);
    expect(clean.length).toBeGreaterThan(0);
    // both of them, in fact, which is what breaking the ties either way produces
    expect(clean).toHaveLength(2);
  });

  // --- good and bad people ---------------------------------------------------
  //
  // Every list ranks every good person above every bad one. The question says
  // every good student is with a good school in every stable matching.
  it('keeps every good student with a good school in every stable matching', () => {
    // priya and sam are good, ravi and maya are bad; mit and umass are the good
    // schools, nyu and berkeley the bad ones. Orders inside each block vary.
    const good = buildGoodBad();
    for (const matching of allStableMatchings(good)) {
      for (const student of ['priya', 'sam']) {
        expect(['mit', 'umass'], `${student} in ${JSON.stringify(matching)}`).toContain(
          matching[student],
        );
      }
    }
  });

  // --- hospitals and residents ----------------------------------------------
  //
  // A hospital with q posts is q hospitals with one post and the same list. The
  // question says splitting turns the variant into the ordinary problem, so the
  // result has to be stable under the hospitals-and-residents definition, which
  // has a case for the students who end up with nothing.
  it('gets a stable assignment out of the splitting trick, surplus students and all', () => {
    // 4 students, 2 hospitals, 3 posts: mercy has two, chest has one.
    const capacity = { mercy: 2, chest: 1 };
    const hospitalPrefs: Record<string, readonly string[]> = {
      mercy: ['priya', 'ravi', 'sam', 'maya'],
      chest: ['sam', 'priya', 'maya', 'ravi'],
    };
    const studentRanking: Record<string, readonly string[]> = {
      priya: ['chest', 'mercy'],
      sam: ['mercy', 'chest'],
      ravi: ['chest', 'mercy'],
      maya: ['mercy', 'chest'],
    };

    // Run the split instance by hand: three posts, each asking down mercy's or
    // chest's list, students holding the best post asked so far.
    const posts = ['mercy#1', 'mercy#2', 'chest#1'];
    const owner = (post: string) => post.split('#')[0] as string;
    const held: Record<string, string> = {}; // student -> post
    const next: Record<string, number> = { 'mercy#1': 0, 'mercy#2': 0, 'chest#1': 0 };
    const free = [...posts];
    let guard = 0;
    while (free.length > 0 && guard < 100) {
      guard += 1;
      const post = free.shift() as string;
      const list = hospitalPrefs[owner(post)] as readonly string[];
      const student = list[next[post] as number] as string;
      next[post] = (next[post] as number) + 1;
      const current = held[student];
      const mine = studentRanking[student] as readonly string[];
      if (current === undefined) held[student] = post;
      else if (mine.indexOf(owner(post)) < mine.indexOf(owner(current))) {
        held[student] = post;
        free.push(current);
      } else free.push(post);
    }
    expect(guard).toBeLessThan(100);

    const assigned: Record<string, string> = {}; // student -> hospital
    for (const [student, post] of Object.entries(held)) assigned[student] = owner(post);
    // every post filled
    const filled: Record<string, number> = {};
    for (const h of Object.values(assigned)) filled[h] = (filled[h] ?? 0) + 1;
    expect(filled).toEqual(capacity);

    // and no instability of either kind
    const students = Object.keys(studentRanking);
    for (const s of students) {
      for (const h of Object.keys(capacity)) {
        const hList = hospitalPrefs[h] as readonly string[];
        const mine = studentRanking[s] as readonly string[];
        const theirs = assigned[s];
        const wantsH = theirs === undefined || mine.indexOf(h) < mine.indexOf(theirs);
        if (!wantsH) continue;
        // h would have to prefer s to somebody it took
        const taken = students.filter((x) => assigned[x] === h);
        const worst = taken.reduce((a, b) => (hList.indexOf(a) > hList.indexOf(b) ? a : b));
        expect(hList.indexOf(s) > hList.indexOf(worst), `${s} and ${h} form an instability`).toBe(
          true,
        );
      }
    }
  });
});

/** Good people above bad people on every list, with the blocks internally shuffled. */
function buildGoodBad() {
  return presetById('good-and-bad');
}

/**
 * One more claim from tier 4, this time about the shape of a run rather than
 * about an instance: the number of free people is allowed to stand still, which
 * is what disqualifies it as a measure of progress, and it never rises.
 */
describe('the quantity that does not bound the loop', () => {
  it('never lets the number of free people rise, and lets it stand still', () => {
    let stoodStill = false;
    for (const preset of PRESETS) {
      for (const side of ['students', 'schools'] as const) {
        let state = createEngine(preset, side);
        let free = countFree(state);
        while (state.phase !== 'done') {
          state = step(state);
          const now = countFree(state);
          expect(now, `${preset.id}/${side}`).toBeLessThanOrEqual(free);
          if (now === free) stoodStill = true;
          free = now;
        }
      }
    }
    expect(stoodStill).toBe(true);
  });
});

function countFree(state: ReturnType<typeof createEngine>): number {
  // Free means holding nobody and being held by nobody, counted across both sides.
  const askersFree = Object.values(state.askers).filter((a) => a.heldBy === null).length;
  const receiversFree = Object.values(state.receivers).filter((r) => r.holding === null).length;
  return askersFree + receiversFree;
}

describe('everything the question needs is on the page with it', () => {
  it('names a set of lists that exists, wherever it names one', () => {
    for (const q of QUESTIONS) {
      if (!q.instanceId) continue;
      expect(() => presetById(q.instanceId as string), q.id).not.toThrow();
    }
  });

  it('prints the lists for every question worked against a run', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'pairing' || q.kind === 'arrangements') {
        expect(q.instanceId, `${q.id} is worked against a run`).toBeTruthy();
      }
    }
  });

  it('prints the lists for every tier 1 question, since every one of them names people', () => {
    // Most of tier 1 is about the worksheet's market; the last three are the
    // lecture's own lists. Either way the panel has to print the lists it is about.
    for (const q of questionsIn(1)) {
      expect(q.instanceId, `${q.id} names people the reader cannot otherwise see`).toBeTruthy();
      expect(() => presetById(q.instanceId as string), q.id).not.toThrow();
    }
  });
});

/**
 * The questions on markets with ties.
 *
 * No preset has ties, so each of these carries its lists in `tied` and prints
 * them in `quote`. Two things could go stale: the printed lists could drift from
 * the stored ones, and an `ok` could stop matching what the core says. Both are
 * checked, every option of every question, rather than proofread.
 */
describe('the questions on lists with ties', () => {
  const tiedQuestions = QUESTIONS.filter(
    (q): q is Question & { tied: NonNullable<Question['tied']> } => q.tied !== undefined,
  );

  function holds(instance: Instance, fallback: Matching | undefined, claim: TieClaim): boolean {
    const matching = claim.matching ?? fallback;
    if (!matching) throw new Error('a claim about a matching needs a matching');
    let ok = true;
    if (claim.freeOfStrong !== undefined) {
      ok &&= (strongInstabilities(instance, matching).length === 0) === claim.freeOfStrong;
    }
    if (claim.freeOfWeak !== undefined) {
      ok &&= (weakInstabilities(instance, matching).length === 0) === claim.freeOfWeak;
    }
    if (claim.pair) {
      const [student, school] = claim.pair;
      const v = judgeTiedPair(instance, matching, student, school);
      expect(v.alreadyTogether, `${student} and ${school} are together`).toBe(false);
      const kind = v.strong ? 'strong' : v.weak ? 'weak only' : 'neither';
      if (claim.is === 'weak') ok &&= v.weak;
      else if (claim.is !== undefined) ok &&= kind === claim.is;
    }
    return ok;
  }

  const optionsOf = (q: Question): readonly Option[] =>
    q.kind === 'choice' || q.kind === 'multi' ? q.options : [];

  it('exists, in the formal tiers', () => {
    expect(tiedQuestions.length).toBeGreaterThan(0);
    for (const q of tiedQuestions) expect(q.tier, q.id).toBeGreaterThan(1);
  });

  it('prints exactly the lists it stores', () => {
    for (const q of tiedQuestions) expect(q.quote, q.id).toBe(tiedQuote(q.tied));
  });

  it('really has ties in the lists it quotes, and a perfect matching where it names one', () => {
    for (const q of tiedQuestions) {
      const instance = instanceFromGiven(q.id, q.tied);
      const tied = [...instance.students, ...instance.schools].some((p) =>
        p.tiedWithNext?.some(Boolean),
      );
      expect(tied, q.id).toBe(true);
      const matchings: Readonly<Record<string, string>>[] = [];
      if (q.tied.matching) matchings.push(q.tied.matching);
      for (const o of optionsOf(q)) if (o.claims?.matching) matchings.push(o.claims.matching);
      for (const m of matchings) {
        expect(new Set(Object.values(m)).size, q.id).toBe(instance.schools.length);
        expect(Object.keys(m).sort(), q.id).toEqual(instance.students.map((s) => s.id).sort());
      }
    }
  });

  it('marks an option right exactly when the core says its claim holds', () => {
    for (const q of tiedQuestions) {
      const instance = instanceFromGiven(q.id, q.tied);
      for (const o of optionsOf(q)) {
        expect(o.claims, `${q.id}: "${o.t}" makes no checkable claim`).toBeDefined();
        if (!o.claims) continue;
        expect(holds(instance, q.tied.matching, o.claims), `${q.id}: "${o.t}"`).toBe(!!o.ok);
      }
    }
  });

  it('offers every pair not already together, when the options are pairs', () => {
    for (const q of tiedQuestions) {
      if (q.kind !== 'multi' || !q.tied.matching) continue;
      const offered = q.options.map((o) => o.claims?.pair?.join('|')).sort();
      const instance = instanceFromGiven(q.id, q.tied);
      const everyPair = instance.students
        .flatMap((s) => instance.schools.map((c) => [s.id, c.id] as const))
        .filter(([s, c]) => q.tied.matching?.[s] !== c)
        .map((p) => p.join('|'))
        .sort();
      expect(offered, q.id).toEqual(everyPair);
    }
  });

  it('offers every matching, when the options are matchings', () => {
    for (const q of tiedQuestions) {
      if (q.kind !== 'multi' || q.tied.matching) continue;
      const instance = instanceFromGiven(q.id, q.tied);
      const offered = q.options.map((o) => JSON.stringify(o.claims?.matching));
      expect(new Set(offered).size, q.id).toBe(offered.length);
      expect(offered.length, q.id).toBe(allPerfectMatchings(instance).length);
    }
  });
});

/**
 * The questions that count proposals. The number each option gives is checked
 * against a run of the engine, so a list edited under one of them fails here
 * rather than leaving a wrong answer marked right.
 */
describe('the questions that count proposals', () => {
  const asksIn = (instanceId: string, side: 'students' | 'schools') =>
    run(presetById(instanceId), side).log.filter((e) => e.kind === 'ask').length;

  const counting = QUESTIONS.filter(
    (q) => (q.kind === 'choice' || q.kind === 'multi') && q.options.some((o) => o.asks),
  );

  it('exists, and every option in one gives a count', () => {
    expect(counting.length).toBeGreaterThan(0);
    for (const q of counting) {
      expect(q.instanceId, q.id).toBeTruthy();
      if (q.kind !== 'choice' && q.kind !== 'multi') continue;
      for (const o of q.options) expect(o.asks, `${q.id}: "${o.t}"`).toBeDefined();
    }
  });

  it('marks an option right exactly when the engine agrees with every count it gives', () => {
    for (const q of counting) {
      if (q.kind !== 'choice' && q.kind !== 'multi') continue;
      const id = q.instanceId as string;
      for (const o of q.options) {
        const { students, schools } = o.asks ?? {};
        const right =
          (students === undefined || students === asksIn(id, 'students')) &&
          (schools === undefined || schools === asksIn(id, 'schools'));
        expect(right, `${q.id}: "${o.t}"`).toBe(!!o.ok);
      }
    }
  });

  it('quotes the other counts and events its reasons rely on correctly', () => {
    // count-lecture: four with the students asking; MIT let go once, UMass
    // Amherst let go once and turned away once, with the schools asking.
    expect(asksIn('lecture-example', 'students')).toBe(4);
    const lecture = run(presetById('lecture-example'), 'schools').log;
    const letGo = lecture.flatMap((e) => (e.kind === 'displaced' ? [e.displaced] : []));
    const turned = lecture.flatMap((e) => (e.kind === 'turned-away' ? [e.asker] : []));
    expect(letGo.sort()).toEqual(['mit', 'umass']);
    expect(turned).toEqual(['umass']);

    // count-both-ways: who is let go with the students asking, and who asks
    // more than once, or all four names, in each run.
    const nothing = presetById('nothing-changes');
    const byStudents = run(nothing, 'students').log;
    expect(byStudents.flatMap((e) => (e.kind === 'displaced' ? [e.displaced] : []))).toEqual([
      'priya',
      'sam',
      'ravi',
    ]);
    expect(byStudents.filter((e) => e.kind === 'turned-away')).toHaveLength(3);
    const bySchools = run(nothing, 'schools').log;
    expect(bySchools.filter((e) => e.kind === 'displaced')).toHaveLength(2);
    expect(bySchools.filter((e) => e.kind === 'turned-away')).toHaveLength(2);
    const perAsker = (log: typeof bySchools) => {
      const tally: Record<string, number> = {};
      for (const e of log) if (e.kind === 'ask') tally[e.asker] = (tally[e.asker] ?? 0) + 1;
      return tally;
    };
    const schoolsTally = perAsker(bySchools);
    expect(
      Object.keys(schoolsTally)
        .filter((k) => (schoolsTally[k] ?? 0) > 1)
        .sort(),
    ).toEqual(['berkeley', 'umass']);
    const studentsTally = perAsker(byStudents);
    expect(Object.keys(studentsTally).filter((k) => studentsTally[k] === 4)).toEqual(['ravi']);
    expect(Object.keys(schoolsTally).filter((k) => schoolsTally[k] === 4)).toEqual(['umass']);
  });
});
