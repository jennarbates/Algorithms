import { describe, expect, it } from 'vitest';
import { createEngine, matchingOf, nextFreeAsker, run, step } from './engine';
import type { EngineState } from './engine';
import { isPerfect, isStable } from '../../src/core/stability';
import { allStableMatchings, isSideOptimal, sameMatching } from '../../src/core/enumerate';
import { PRESETS, presetById } from '../../src/content/presets';
import { randomInstance } from '../../tests/helpers';
import type { Instance, Side } from '../../src/core/types';

/**
 * The same properties the reference implementation is held to.
 *
 * Getting a stable answer is the easy half. Getting the asking side's BEST
 * stable answer is the half that tells you the process is actually right.
 */

const SIDES: Side[] = ['students', 'schools'];

function history(instance: Instance, side: Side): EngineState[] {
  const states: EngineState[] = [createEngine(instance, side)];
  const cap = 2 * instance.students.length * instance.students.length + 4;

  for (let i = 0; i < cap; i += 1) {
    const last = states[states.length - 1];
    if (!last || last.phase === 'done') break;
    states.push(step(last));
  }
  return states;
}

describe('it finishes, and finishes properly', () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))(
    '%s settles with nobody left looking',
    (_id, instance) => {
      for (const side of SIDES) {
        const done = run(instance, side);
        expect(done.phase).toBe('done');
        expect(nextFreeAsker(done)).toBeNull();
        for (const asker of Object.values(done.askers)) {
          expect(asker.heldBy).not.toBeNull();
        }
      }
    },
  );

  it('never asks the same person twice', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const asks = run(instance, side)
          .log.filter((e) => e.kind === 'ask')
          .map((e) => `${e.asker}->${e.receiver}`);
        expect(new Set(asks).size).toBe(asks.length);
      }
    }
  });
});

describe('the two invariants', () => {
  it('askers only ever move down their own list', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const states = history(instance, side);
        for (let i = 1; i < states.length; i += 1) {
          const prev = states[i - 1];
          const curr = states[i];
          if (!prev || !curr) throw new Error('missing state');
          for (const id of Object.keys(curr.askers)) {
            const before = prev.askers[id];
            const after = curr.askers[id];
            if (!before || !after) throw new Error('missing asker');
            expect(after.cursor).toBeGreaterThanOrEqual(before.cursor);
          }
        }
      }
    }
  });

  it('receivers only ever move up theirs, and never go back to empty', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const states = history(instance, side);
        for (let i = 1; i < states.length; i += 1) {
          const prev = states[i - 1];
          const curr = states[i];
          if (!prev || !curr) throw new Error('missing state');
          for (const party of curr.roster.receivers) {
            const before = prev.receivers[party.id];
            const after = curr.receivers[party.id];
            if (!before || !after) throw new Error('missing receiver');
            if (before.holding !== null) expect(after.holding).not.toBeNull();
            if (before.holding !== null && after.holding !== null) {
              expect(party.prefs.indexOf(after.holding)).toBeLessThanOrEqual(
                party.prefs.indexOf(before.holding),
              );
            }
          }
        }
      }
    }
  });

  it('does not mutate the state it is handed', () => {
    const before = createEngine(presetById('cascade'), 'students');
    const snapshot = structuredClone({ askers: before.askers, receivers: before.receivers });
    step(step(before));
    expect(before.askers).toEqual(snapshot.askers);
    expect(before.receivers).toEqual(snapshot.receivers);
  });
});

describe('the answer', () => {
  it('is stable and leaves nobody out', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const matching = matchingOf(run(instance, side));
        expect(isPerfect(instance, matching), `${instance.id}/${side}`).toBe(true);
        expect(isStable(instance, matching), `${instance.id}/${side}`).toBe(true);
      }
    }
  });

  it('is stable on random markets too', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const instance = randomInstance(6, seed);
      for (const side of SIDES) {
        expect(isStable(instance, matchingOf(run(instance, side))), `seed ${seed}`).toBe(true);
      }
    }
  });

  it('is the BEST outcome the asking side gets in any stable arrangement', () => {
    for (const instance of PRESETS.filter((p) => p.students.length <= 6)) {
      const stable = allStableMatchings(instance);
      expect(
        isSideOptimal(instance, matchingOf(run(instance, 'students')), 'students', stable),
      ).toBe(true);
      expect(isSideOptimal(instance, matchingOf(run(instance, 'schools')), 'schools', stable)).toBe(
        true,
      );
    }
  });

  it('does not depend on the order free askers are served in', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const instance = randomInstance(6, seed);
      const reversed: Instance = {
        ...instance,
        students: [...instance.students].reverse(),
        schools: [...instance.schools].reverse(),
      };
      expect(
        sameMatching(matchingOf(run(instance, 'students')), matchingOf(run(reversed, 'students'))),
        `seed ${seed}`,
      ).toBe(true);
    }
  });
});
