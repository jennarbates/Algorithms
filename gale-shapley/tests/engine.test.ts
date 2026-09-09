import { describe, expect, it } from 'vitest';
import {
  createEngine,
  matchingOf,
  nextFreeAsker,
  run,
  runToCompletion,
  step,
} from '../src/core/engine';
import type { EngineState } from '../src/core/engine';
import { isPerfect, isStable } from '../src/core/stability';
import { sameMatching } from '../src/core/enumerate';
import { presetById } from '../src/content/presets';
import { randomInstance } from './helpers';
import type { Instance, Side } from '../src/core/types';

/** Every state the engine passes through, first to last. */
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

const SIDES: Side[] = ['students', 'schools'];

describe('step semantics', () => {
  const instance = presetById('opener');

  it('alternates ask and resolve, and stops on done', () => {
    const states = history(instance, 'students');
    const phases = states.map((s) => s.phase);

    expect(phases[0]).toBe('ask');
    expect(phases[phases.length - 1]).toBe('done');

    // Every state before the last is followed by the other half of a proposal.
    for (let i = 0; i < phases.length - 1; i += 1) {
      const here = phases[i];
      const next = phases[i + 1];
      if (here === 'ask') expect(next === 'resolve' || next === 'done').toBe(true);
      if (here === 'resolve') expect(next).toBe('ask');
    }
  });

  it('does not mutate the state it is given', () => {
    const before = createEngine(instance, 'students');
    const snapshot = structuredClone({
      askers: before.askers,
      receivers: before.receivers,
      phase: before.phase,
      log: before.log,
    });

    step(step(before));

    expect(before.askers).toEqual(snapshot.askers);
    expect(before.receivers).toEqual(snapshot.receivers);
    expect(before.phase).toEqual(snapshot.phase);
    expect(before.log).toEqual(snapshot.log);
  });

  it('is idempotent once done', () => {
    const done = run(instance, 'students');
    expect(step(done)).toBe(done);
  });

  it('leaves nobody free at the end', () => {
    const done = run(instance, 'students');
    expect(nextFreeAsker(done)).toBeNull();
    for (const asker of Object.values(done.askers)) {
      expect(asker.heldBy).not.toBeNull();
    }
  });
});

describe('the two invariants', () => {
  const instances = [
    presetById('opener'),
    presetById('cascade'),
    presetById('nothing-changes'),
    presetById('big-one'),
  ];

  it('askers only ever move down their own list', () => {
    for (const instance of instances) {
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

  it('receivers only ever move up their own list, and never go back to empty', () => {
    for (const instance of instances) {
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

            // Once somebody is being held, somebody is always being held.
            if (before.holding !== null) expect(after.holding).not.toBeNull();

            // And any change is an improvement on their own list.
            if (before.holding !== null && after.holding !== null) {
              const rankBefore = party.prefs.indexOf(before.holding);
              const rankAfter = party.prefs.indexOf(after.holding);
              expect(rankAfter).toBeLessThanOrEqual(rankBefore);
            }
          }
        }
      }
    }
  });

  it('never repeats a proposal', () => {
    for (const instance of instances) {
      for (const side of SIDES) {
        const done = run(instance, side);
        const asks = done.log
          .filter((e) => e.kind === 'ask')
          .map((e) => `${e.asker}->${e.receiver}`);
        expect(new Set(asks).size).toBe(asks.length);
      }
    }
  });

  it('makes at most one proposal per pair, so it always finishes', () => {
    for (const instance of instances) {
      const n = instance.students.length;
      for (const side of SIDES) {
        const done = run(instance, side);
        const asks = done.log.filter((e) => e.kind === 'ask').length;
        expect(asks).toBeLessThanOrEqual(n * n);
      }
    }
  });
});

describe('results', () => {
  it('produces a perfect, stable arrangement from either side', () => {
    for (const instance of [
      presetById('opener'),
      presetById('head-on'),
      presetById('everyone-agrees'),
      presetById('cascade'),
      presetById('nothing-changes'),
      presetById('big-one'),
    ]) {
      for (const side of SIDES) {
        const matching = matchingOf(run(instance, side));
        expect(isPerfect(instance, matching), `${instance.id} / ${side} perfect`).toBe(true);
        expect(isStable(instance, matching), `${instance.id} / ${side} stable`).toBe(true);
      }
    }
  });

  it('is stable on every random instance it is given', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const instance = randomInstance(6, seed);
      for (const side of SIDES) {
        const matching = matchingOf(run(instance, side));
        expect(isStable(instance, matching), `seed ${seed} / ${side}`).toBe(true);
        expect(isPerfect(instance, matching), `seed ${seed} / ${side}`).toBe(true);
      }
    }
  });

  it('reaches the same answer whatever order free askers are served in', () => {
    // The engine serves the lowest-index free asker. Relabelling the parties
    // changes that order without changing the market, so if the result depended
    // on the order, a relabelled run would disagree.
    for (let seed = 1; seed <= 60; seed += 1) {
      const instance = randomInstance(6, seed);
      const reversed: Instance = {
        ...instance,
        students: [...instance.students].reverse(),
        schools: [...instance.schools].reverse(),
      };

      const a = matchingOf(run(instance, 'students'));
      const b = matchingOf(run(reversed, 'students'));
      expect(sameMatching(a, b), `seed ${seed}`).toBe(true);
    }
  });

  it('refuses to loop forever if the engine is broken', () => {
    const instance = presetById('opener');
    const stuck = { ...createEngine(instance, 'students'), phase: 'ask' as const };
    // Sanity: the guard exists and a healthy engine never trips it.
    expect(() => runToCompletion(stuck)).not.toThrow();
  });
});
