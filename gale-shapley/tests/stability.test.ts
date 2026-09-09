import { describe, expect, it } from 'vitest';
import { blockingPairs, isPerfect, isStable, judgePair } from '../src/core/stability';
import { presetById } from '../src/content/presets';
import { createEngine, matchingOf, run, step } from '../src/core/engine';
import type { Instance, Matching } from '../src/core/types';

const headOn = presetById('head-on');

/** Priya at MIT and Sam at NYU: both students hold their first choice. */
const studentsWin: Matching = { priya: 'mit', sam: 'nyu' };
/** Sam at MIT and Priya at NYU: both schools hold their first choice. */
const schoolsWin: Matching = { priya: 'nyu', sam: 'mit' };

describe('blocking pairs', () => {
  it('needs both sides to want out', () => {
    // Under studentsWin, Priya is at MIT but MIT would rather have Sam.
    // MIT wants out. Sam does not, because he already has his first choice.
    // One-sided longing is not a blocking pair.
    expect(blockingPairs(headOn, studentsWin)).toEqual([]);
    expect(isStable(headOn, studentsWin)).toBe(true);
  });

  it('finds the pair when both sides do want out', () => {
    // Deliberately broken: give each student their last choice.
    const bad: Matching = { priya: 'nyu', sam: 'mit' };
    // This one happens to be the other stable arrangement, so it is fine.
    expect(isStable(headOn, bad)).toBe(true);

    // Now a genuinely unstable arrangement from the opener.
    const opener = presetById('opener');
    const unstable: Matching = { priya: 'nyu', sam: 'umass', ravi: 'mit' };
    const pairs = blockingPairs(opener, unstable);
    expect(pairs.length).toBeGreaterThan(0);

    // Every reported pair really does have both sides wanting the switch.
    for (const pair of pairs) {
      const verdict = judgePair(opener, unstable, pair.student, pair.school);
      expect(verdict.studentWouldSwitch).toBe(true);
      expect(verdict.schoolWouldSwitch).toBe(true);
      expect(verdict.blocks).toBe(true);
    }
  });

  it('agrees with judgePair on every possible pair', () => {
    const opener = presetById('opener');
    const matching = matchingOf(run(opener, 'students'));
    const reported = new Set(
      blockingPairs(opener, matching).map((p) => `${p.student}|${p.school}`),
    );

    for (const student of opener.students) {
      for (const school of opener.schools) {
        const verdict = judgePair(opener, matching, student.id, school.id);
        expect(verdict.blocks).toBe(reported.has(`${student.id}|${school.id}`));
      }
    }
  });

  it('never calls an already-matched pair a blocking pair', () => {
    const opener = presetById('opener');
    const matching = matchingOf(run(opener, 'students'));
    for (const student of opener.students) {
      const school = matching[student.id];
      if (school == null) continue;
      const verdict = judgePair(opener, matching, student.id, school);
      expect(verdict.alreadyTogether).toBe(true);
      expect(verdict.blocks).toBe(false);
    }
  });
});

describe('the challenge the page puts to the reader', () => {
  it('has no winning answer once the process has finished', () => {
    // "Find two people who would both rather have each other." Every pair,
    // exhaustively, must fail. This is the property the whole page rests on.
    for (const id of ['opener', 'head-on', 'everyone-agrees', 'cascade', 'nothing-changes']) {
      const instance = presetById(id);
      const matching = matchingOf(run(instance, 'students'));
      for (const student of instance.students) {
        for (const school of instance.schools) {
          expect(judgePair(instance, matching, student.id, school.id).blocks, `${id}`).toBe(false);
        }
      }
    }
  });

  it('does have winning answers partway through', () => {
    // And mid-run it usually does not hold, which is what makes "maybe" mean
    // something. Checked on the cascade, where the board churns the most.
    const instance = presetById('cascade');
    const midway = midRunMatching(instance);
    expect(blockingPairs(instance, midway).length).toBeGreaterThan(0);
  });
});

/** The tentative arrangement halfway through the students-asking run. */
function midRunMatching(instance: Instance): Matching {
  const halfway = Math.floor(run(instance, 'students').stepCount / 2);

  let state = createEngine(instance, 'students');
  for (let i = 0; i < halfway && state.phase !== 'done'; i += 1) {
    state = step(state);
  }
  return matchingOf(state);
}

describe('perfection', () => {
  it('rejects an arrangement with anyone left out', () => {
    const opener = presetById('opener');
    const partial: Matching = { priya: 'mit', sam: null, ravi: 'nyu' };
    expect(isPerfect(opener, partial)).toBe(false);
  });

  it('rejects an arrangement that double-books a school', () => {
    const opener = presetById('opener');
    const doubled: Matching = { priya: 'mit', sam: 'mit', ravi: 'nyu' };
    expect(isPerfect(opener, doubled)).toBe(false);
  });

  it('accepts the real thing', () => {
    expect(isPerfect(headOn, studentsWin)).toBe(true);
    expect(isPerfect(headOn, schoolsWin)).toBe(true);
  });
});
