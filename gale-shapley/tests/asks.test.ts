import { describe, expect, it } from 'vitest';
import { askGrid, askOrdinals, askTally, cellKey, latestAskStep } from '../src/core/asks';
import { createEngine, runToCompletion, step } from '../src/core/engine';
import { PRESETS, presetById } from '../src/content/presets';
import type { Side } from '../src/core/types';

/**
 * Claim one, checked rather than drawn: for every preset in both directions,
 * no cell of the grid ever fills twice, the count never exceeds n squared, and
 * the run stops.
 */

const SIDES: Side[] = ['students', 'schools'];

describe('the grid of questions', () => {
  it('never fills the same cell twice, on any preset, in either direction', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const final = runToCompletion(createEngine(instance, side));
        // askGrid throws on a repeat, so reaching the size check is the test.
        const grid = askGrid(final);
        expect(grid.size).toBe(final.log.filter((e) => e.kind === 'ask').length);
      }
    }
  });

  it('never uses more than n squared asks, and stops', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const final = runToCompletion(createEngine(instance, side));
        const tally = askTally(final);
        expect(final.phase).toBe('done');
        expect(tally.used).toBeLessThanOrEqual(tally.total);
        expect(tally.total).toBe(tally.n * tally.n);
        expect(tally.used).toBeGreaterThanOrEqual(tally.n);
      }
    }
  });

  it('fills in step with the board: the tally after k steps counts only asks up to k', () => {
    const instance = presetById('cascade');
    let state = createEngine(instance, 'students');
    let asksSeen = 0;
    while (state.phase !== 'done') {
      state = step(state);
      const last = state.log[state.log.length - 1];
      if (last?.kind === 'ask') asksSeen += 1;
      expect(askTally(state).used).toBe(asksSeen);
    }
  });

  it('keys cells by asker then receiver, and records the step of the ask', () => {
    const instance = presetById('opener');
    let state = createEngine(instance, 'students');
    state = step(state);
    const first = state.log[0];
    if (first?.kind !== 'ask') throw new Error('first event should be an ask');
    expect(askGrid(state).get(cellKey(first.asker, first.receiver))).toBe(1);
    expect(latestAskStep(state)).toBe(1);
    expect(latestAskStep(step(state))).toBe(1);
    expect(latestAskStep(createEngine(instance, 'students'))).toBeNull();
  });

  it('numbers the asks first to last, whatever their step numbers', () => {
    const final = runToCompletion(createEngine(presetById('opener'), 'students'));
    const grid = askGrid(final);
    const ordinals = askOrdinals(grid);
    const steps = [...grid.values()].sort((a, b) => a - b);
    expect([...ordinals.keys()]).toEqual(steps);
    expect([...ordinals.values()]).toEqual(steps.map((_, i) => i + 1));
    expect(ordinals.get(1)).toBe(1);
  });
});
