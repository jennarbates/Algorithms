import { describe, expect, it } from 'vitest';
import { askedBy, everyAskedIsHolding, firstHolds } from '../src/core/holds';
import { createEngine, runToCompletion } from '../src/core/engine';
import { advance, createHistory } from '../src/core/history';
import { PRESETS, presetById } from '../src/content/presets';
import type { Side } from '../src/core/types';

/**
 * Claim two, checked rather than drawn: once anybody has been asked they are
 * holding somebody, at every later moment of the run, for every preset in both
 * directions. And at the end everyone has been asked, so everyone is holding.
 */

const SIDES: Side[] = ['students', 'schools'];

describe('nobody is left out', () => {
  it('a receiver, once asked, is holding somebody at every later step', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        let history = createHistory(instance, side);
        for (let i = 0; i < 1000; i += 1) {
          const next = advance(history);
          if (next === history) break;
          history = next;
        }
        for (const state of history.states) {
          expect(everyAskedIsHolding(state), `${instance.id}/${side} step ${state.stepCount}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('by the end, everyone on the asked side has been asked and is holding somebody', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const final = runToCompletion(createEngine(instance, side));
        const holds = firstHolds(final);
        for (const r of final.roster.receivers) {
          expect(holds.has(r.id), `${instance.id}/${side}: ${r.id} never asked`).toBe(true);
          expect(final.receivers[r.id]?.holding).not.toBeNull();
        }
        expect(holds.size).toBe(final.roster.receivers.length);
      }
    }
  });

  it('records the first ask, and the step after it is when the hold began', () => {
    const final = runToCompletion(createEngine(presetById('opener'), 'students'));
    const holds = firstHolds(final);
    for (const hold of holds.values()) {
      const ask = final.log.find((e) => e.kind === 'ask' && e.receiver === hold.receiver);
      if (!ask || ask.kind !== 'ask') throw new Error('no ask');
      expect(hold.askedStep).toBe(ask.step);
      expect(hold.firstAsker).toBe(ask.asker);
      expect(hold.heldStep).toBe(ask.step + 1);
      const answer = final.log.find((e) => e.step === hold.heldStep);
      expect(answer?.kind).toBe('accepted-empty');
    }
  });

  it('lists who an asker asked, in order, and nobody else', () => {
    const final = runToCompletion(createEngine(presetById('opener'), 'students'));
    for (const a of final.roster.askers) {
      const asked = askedBy(final, a.id);
      const cursor = final.askers[a.id]?.cursor ?? 0;
      expect(asked).toEqual(a.prefs.slice(0, cursor));
    }
  });
});
