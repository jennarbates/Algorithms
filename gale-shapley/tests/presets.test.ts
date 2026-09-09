import { describe, expect, it } from 'vitest';
import { matchingOf, run } from '../src/core/engine';
import {
  MAX_ENUMERABLE_SIZE,
  allStableMatchings,
  isSideOptimal,
  isSidePessimal,
  sameMatching,
} from '../src/core/enumerate';
import { isPerfect, isStable } from '../src/core/stability';
import { PRESETS, presetById } from '../src/content/presets';
import { randomInstance } from './helpers';
import type { Instance, Side } from '../src/core/types';

/**
 * The claims the page makes about each preset, checked by exhaustive search.
 *
 * If one of these ever fails, the page is teaching something false and the
 * build should stop. That is the entire reason this file exists.
 */

function studentRanks(instance: Instance, side: Side): number[] {
  const matching = matchingOf(run(instance, side));
  return instance.students.map((student) => {
    const school = matching[student.id];
    if (school == null) throw new Error(`${student.id} unmatched`);
    return student.prefs.indexOf(school) + 1;
  });
}

function displacementCount(instance: Instance, side: Side): number {
  return run(instance, side).log.filter((e) => e.kind === 'displaced').length;
}

describe('every preset', () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))(
    '%s produces a perfect, stable arrangement from both directions',
    (_id, instance) => {
      for (const side of ['students', 'schools'] as const) {
        const matching = matchingOf(run(instance, side));
        expect(isPerfect(instance, matching)).toBe(true);
        expect(isStable(instance, matching)).toBe(true);
      }
    },
  );

  it.each(
    PRESETS.filter((p) => p.students.length <= MAX_ENUMERABLE_SIZE).map((p) => [p.id, p] as const),
  )(
    '%s gives the asking side its best possible outcome and the other side its worst',
    (_id, instance) => {
      const stable = allStableMatchings(instance);
      expect(stable.length).toBeGreaterThan(0);

      const byStudents = matchingOf(run(instance, 'students'));
      expect(isSideOptimal(instance, byStudents, 'students', stable)).toBe(true);
      expect(isSidePessimal(instance, byStudents, 'schools', stable)).toBe(true);

      const bySchools = matchingOf(run(instance, 'schools'));
      expect(isSideOptimal(instance, bySchools, 'schools', stable)).toBe(true);
      expect(isSidePessimal(instance, bySchools, 'students', stable)).toBe(true);
    },
  );
});

describe('A. the opener', () => {
  const instance = presetById('opener');

  it('has exactly two stable arrangements', () => {
    expect(allStableMatchings(instance)).toHaveLength(2);
  });

  it('contains one displacement when students ask', () => {
    expect(displacementCount(instance, 'students')).toBe(1);
    // Priya is held by MIT and then pushed out by Sam.
    const log = run(instance, 'students').log;
    const displaced = log.find((e) => e.kind === 'displaced');
    expect(displaced).toMatchObject({ asker: 'sam', receiver: 'mit', displaced: 'priya' });
  });

  it('lands Priya on her second choice one way and her last the other', () => {
    const byStudents = matchingOf(run(instance, 'students'));
    const bySchools = matchingOf(run(instance, 'schools'));
    expect(byStudents['priya']).toBe('umass');
    expect(bySchools['priya']).toBe('nyu');

    const priya = instance.students.find((s) => s.id === 'priya');
    if (!priya) throw new Error('missing Priya');
    expect(priya.prefs.indexOf('umass')).toBe(1); // second choice
    expect(priya.prefs.indexOf('nyu')).toBe(2); // last choice
  });

  it('settles in four proposals when students ask', () => {
    expect(run(instance, 'students').log.filter((e) => e.kind === 'ask')).toHaveLength(4);
  });
});

describe('B. head-on collision', () => {
  const instance = presetById('head-on');

  it('has exactly two stable arrangements, which are exact opposites', () => {
    expect(allStableMatchings(instance)).toHaveLength(2);
    const byStudents = matchingOf(run(instance, 'students'));
    const bySchools = matchingOf(run(instance, 'schools'));
    expect(sameMatching(byStudents, bySchools)).toBe(false);
    for (const student of instance.students) {
      expect(byStudents[student.id]).not.toBe(bySchools[student.id]);
    }
  });

  it('gives whoever asks their first choice, and the other side their last', () => {
    expect(studentRanks(instance, 'students')).toEqual([1, 1]);
    expect(studentRanks(instance, 'schools')).toEqual([2, 2]);
  });
});

describe('C. everyone agrees', () => {
  const instance = presetById('everyone-agrees');

  it('has exactly one stable arrangement', () => {
    expect(allStableMatchings(instance)).toHaveLength(1);
  });

  it('never displaces anybody, because the best asker always arrives first', () => {
    expect(displacementCount(instance, 'students')).toBe(0);
    expect(displacementCount(instance, 'schools')).toBe(0);
  });

  it('still takes ten proposals, because everyone tries the top of the list first', () => {
    expect(run(instance, 'students').log.filter((e) => e.kind === 'ask')).toHaveLength(10);
  });

  it('gives the same answer whichever side asks', () => {
    expect(
      sameMatching(matchingOf(run(instance, 'students')), matchingOf(run(instance, 'schools'))),
    ).toBe(true);
  });
});

describe('D. the cascade', () => {
  const instance = presetById('cascade');

  it('displaces seven people when students ask', () => {
    expect(displacementCount(instance, 'students')).toBe(7);
  });

  it('does it as one unbroken chain', () => {
    // Each person pushed out immediately goes and pushes out somebody else.
    const log = run(instance, 'students').log;
    let longest = 0;
    let current = 0;
    let lastDisplaced: string | null = null;

    for (const event of log) {
      if (event.kind === 'displaced') {
        current = event.asker === lastDisplaced ? current + 1 : 1;
        lastDisplaced = event.displaced;
        longest = Math.max(longest, current);
      } else if (event.kind === 'accepted-empty' || event.kind === 'turned-away') {
        current = 0;
        lastDisplaced = null;
      }
    }
    expect(longest).toBe(7);
  });

  it('has four stable arrangements and gives different answers each way', () => {
    expect(allStableMatchings(instance)).toHaveLength(4);
    expect(
      sameMatching(matchingOf(run(instance, 'students')), matchingOf(run(instance, 'schools'))),
    ).toBe(false);
  });

  it('gives every school its first choice when schools ask', () => {
    const matching = matchingOf(run(instance, 'schools'));
    for (const school of instance.schools) {
      const student = instance.students.find((s) => matching[s.id] === school.id);
      if (!student) throw new Error(`${school.id} unfilled`);
      expect(school.prefs.indexOf(student.id)).toBe(0);
    }
  });
});

describe('E. nothing changes', () => {
  const instance = presetById('nothing-changes');

  it('has exactly one stable arrangement', () => {
    expect(allStableMatchings(instance)).toHaveLength(1);
  });

  it('gives an identical answer whichever side asks', () => {
    expect(
      sameMatching(matchingOf(run(instance, 'students')), matchingOf(run(instance, 'schools'))),
    ).toBe(true);
  });

  it('is not a market where everybody agrees', () => {
    const studentOrders = new Set(instance.students.map((s) => s.prefs.join()));
    const schoolOrders = new Set(instance.schools.map((c) => c.prefs.join()));
    expect(studentOrders.size).toBeGreaterThan(1);
    expect(schoolOrders.size).toBeGreaterThan(1);
  });

  it('has real churn on the way there, so the tie is not a trivial one', () => {
    expect(displacementCount(instance, 'students')).toBeGreaterThanOrEqual(2);
  });

  it('does not let either side sweep its first choices', () => {
    const ranks = studentRanks(instance, 'students');
    expect(ranks.some((r) => r > 1)).toBe(true);

    const matching = matchingOf(run(instance, 'students'));
    const schoolRanks = instance.schools.map((school) => {
      const student = instance.students.find((s) => matching[s.id] === school.id);
      if (!student) throw new Error(`${school.id} unfilled`);
      return school.prefs.indexOf(student.id) + 1;
    });
    expect(schoolRanks.some((r) => r > 1)).toBe(true);
  });
});

describe('F. the big one', () => {
  const instance = presetById('big-one');

  it('gives five of twelve students their first choice when students ask', () => {
    expect(studentRanks(instance, 'students').filter((r) => r === 1)).toHaveLength(5);
  });

  it('gives only three of twelve their first choice when schools ask', () => {
    expect(studentRanks(instance, 'schools').filter((r) => r === 1)).toHaveLength(3);
  });

  it('moves the average student from their 2.5th choice to their 4.2nd', () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(studentRanks(instance, 'students'))).toBeCloseTo(2.5, 1);
    expect(mean(studentRanks(instance, 'schools'))).toBeCloseTo(4.17, 1);
  });

  it('is a typical instance of its size, not a cherry-picked one', () => {
    // Compare against the average over many random markets of the same size.
    // If the shipped preset were an outlier, the lesson it teaches would be
    // overstated, so this test holds it near the middle of the distribution.
    const TRIALS = 400;
    let asking = 0;
    let asked = 0;

    for (let seed = 1; seed <= TRIALS; seed += 1) {
      const random = randomInstance(12, seed + 900000);
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      asking += mean(studentRanks(random, 'students'));
      asked += mean(studentRanks(random, 'schools'));
    }

    const typicalAsking = asking / TRIALS;
    const typicalAsked = asked / TRIALS;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

    expect(mean(studentRanks(instance, 'students'))).toBeCloseTo(typicalAsking, 0);
    expect(mean(studentRanks(instance, 'schools'))).toBeCloseTo(typicalAsked, 0);
  });
});
