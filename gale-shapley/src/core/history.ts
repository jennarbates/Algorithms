import { createEngine, step } from './engine';
import type { EngineState } from './engine';
import type { Instance, Side } from './types';

/**
 * A run, with every moment of it kept.
 *
 * `step` is pure and each state is small, so keeping all of them costs
 * nothing, and it is what lets the page point at a past moment: the log can
 * show the board as it was, and the proofs can say "look at step four" and
 * mean it.
 *
 * `states[k]` is the board after k steps, so `states[k].stepCount === k` and
 * a log event with `step: k` describes the move that produced `states[k]`.
 *
 * `viewStep` is which moment the page is looking at, or null for now. It is
 * kept here rather than in a component so that the rule "you cannot step
 * while looking at the past" is a fact about the data and not about a button.
 */
export interface RunHistory {
  readonly instance: Instance;
  readonly askingSide: Side;
  readonly states: readonly EngineState[];
  readonly viewStep: number | null;
}

export function createHistory(instance: Instance, askingSide: Side): RunHistory {
  return { instance, askingSide, states: [createEngine(instance, askingSide)], viewStep: null };
}

/** The latest state, which is the only one the process can move on from. */
export function latest(history: RunHistory): EngineState {
  const state = history.states[history.states.length - 1];
  if (!state) throw new Error('A run always has at least its starting state');
  return state;
}

/** The state the page is looking at: a past moment, or the latest. */
export function viewing(history: RunHistory): EngineState {
  if (history.viewStep === null) return latest(history);
  const state = history.states[history.viewStep];
  if (!state) throw new Error(`No state at step ${history.viewStep}`);
  return state;
}

export function isViewingPast(history: RunHistory): boolean {
  return history.viewStep !== null && history.viewStep < history.states.length - 1;
}

/**
 * One more step, from the latest state. Refused while looking at the past,
 * because stepping from the middle of history would fork it, and a fork is
 * exactly the kind of thing that makes a reader lose track of what is real.
 */
export function advance(history: RunHistory): RunHistory {
  if (isViewingPast(history)) return history;
  const last = latest(history);
  if (last.phase === 'done') return history;
  return { ...history, states: [...history.states, step(last)], viewStep: null };
}

/**
 * Every remaining step at once, each one kept, so the log and the grid of asks
 * read exactly as they would have after stepping by hand. Refused while looking
 * at the past, for the same reason `advance` is.
 */
export function finish(history: RunHistory): RunHistory {
  let out = history;
  for (let next = advance(out); next !== out; next = advance(out)) out = next;
  return out;
}

/** Look at a past moment. Out-of-range steps are clamped rather than thrown. */
export function viewAt(history: RunHistory, stepIndex: number): RunHistory {
  const clamped = Math.max(0, Math.min(stepIndex, history.states.length - 1));
  const isLatest = clamped === history.states.length - 1;
  return { ...history, viewStep: isLatest ? null : clamped };
}

export function backToNow(history: RunHistory): RunHistory {
  return history.viewStep === null ? history : { ...history, viewStep: null };
}
