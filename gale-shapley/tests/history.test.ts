import { describe, expect, it } from 'vitest';
import { createEngine, step } from '../src/core/engine';
import {
  advance,
  backToNow,
  createHistory,
  isViewingPast,
  latest,
  viewAt,
  viewing,
} from '../src/core/history';
import { PRESETS, presetById } from '../src/content/presets';
import type { Side } from '../src/core/types';

const SIDES: Side[] = ['students', 'schools'];

function advanced(times: number, instance = presetById('cascade'), side: Side = 'students') {
  let history = createHistory(instance, side);
  for (let i = 0; i < times; i += 1) history = advance(history);
  return history;
}

describe('history keeps every moment', () => {
  it('states[k] is a fresh engine stepped k times, with stepCount k', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        let history = createHistory(instance, side);
        let fresh = createEngine(instance, side);
        let k = 0;
        while (fresh.phase !== 'done') {
          history = advance(history);
          fresh = step(fresh);
          k += 1;
          expect(history.states[k]).toEqual(fresh);
          expect(history.states[k]?.stepCount).toBe(k);
        }
        expect(history.states).toHaveLength(k + 1);
      }
    }
  });

  it('a log event with step k describes the move that produced states[k]', () => {
    const history = advanced(9);
    for (const state of history.states) {
      const last = state.log[state.log.length - 1];
      if (last) expect(last.step).toBe(state.stepCount);
    }
  });

  it('does not advance past done', () => {
    let history = createHistory(presetById('cascade'), 'students');
    for (let i = 0; i < 200; i += 1) history = advance(history);
    const settled = history;
    expect(latest(settled).phase).toBe('done');
    expect(advance(settled)).toBe(settled);
  });
});

describe('looking at the past', () => {
  it('views a past step and reports it as past', () => {
    const history = viewAt(advanced(6), 3);
    expect(history.viewStep).toBe(3);
    expect(isViewingPast(history)).toBe(true);
    expect(viewing(history)).toBe(history.states[3]);
    expect(latest(history)).toBe(history.states[6]);
  });

  it('viewing the latest step is the same as viewing now', () => {
    const history = viewAt(advanced(6), 6);
    expect(history.viewStep).toBeNull();
    expect(isViewingPast(history)).toBe(false);
  });

  it('clamps out-of-range steps instead of throwing', () => {
    const history = advanced(6);
    expect(viewAt(history, -4).viewStep).toBe(0);
    expect(viewAt(history, 99).viewStep).toBeNull();
  });

  it('refuses to step while looking at the past', () => {
    const past = viewAt(advanced(6), 2);
    expect(advance(past)).toBe(past);
    expect(advance(past).states).toHaveLength(7);
  });

  it('back to now clears the view and stepping resumes from the latest', () => {
    const resumed = advance(backToNow(viewAt(advanced(6), 2)));
    expect(resumed.viewStep).toBeNull();
    expect(resumed.states).toHaveLength(8);
    expect(latest(resumed).stepCount).toBe(7);
  });
});
