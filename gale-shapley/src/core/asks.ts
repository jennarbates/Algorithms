import type { EngineState } from './engine';

/**
 * Every ask in a run, laid out as a grid.
 *
 * This is the evidence for the first claim: the process finishes because each
 * ask uses up one name on one list, and there are only n times n names in
 * total. Drawn as a grid, one row per asker and one column per person they can
 * ask, a run is a set of cells filling in, and the claim is that no cell ever
 * fills twice and the grid has only so many cells.
 *
 * The functions here are pure over engine state, so the claim can be checked
 * in a test for every preset in both directions rather than eyeballed.
 */

/** Which step an asker asked a receiver at, or nothing if they never did. */
export type AskGrid = ReadonlyMap<string, number>;

export function cellKey(asker: string, receiver: string): string {
  return `${asker}|${receiver}`;
}

/** The ask events of a state, in order, as a grid keyed by asker and receiver. */
export function askGrid(state: EngineState): AskGrid {
  const grid = new Map<string, number>();
  for (const event of state.log) {
    if (event.kind !== 'ask') continue;
    const key = cellKey(event.asker, event.receiver);
    if (grid.has(key)) {
      // This would mean somebody asked the same name twice, which the engine
      // never does and the whole argument depends on.
      throw new Error(`${event.asker} asked ${event.receiver} twice`);
    }
    grid.set(key, event.step);
  }
  return grid;
}

export interface AskTally {
  /** Asks made so far in this state. */
  readonly used: number;
  /** The most there could ever be: n askers, n names each. */
  readonly total: number;
  /** People per side. */
  readonly n: number;
}

export function askTally(state: EngineState): AskTally {
  const n = state.roster.askers.length;
  return { used: askGrid(state).size, total: n * n, n };
}

/**
 * Which question each ask was: the first ask is 1, the second 2, and so on.
 * Keyed by step, since that is how the grid finds its cells. The count above
 * the grid is in questions, so the cells should be too; the step is what the
 * log and the past banner count in, and it stays in the tooltip.
 */
export function askOrdinals(grid: AskGrid): ReadonlyMap<number, number> {
  const steps = [...grid.values()].sort((a, b) => a - b);
  return new Map(steps.map((step, index) => [step, index + 1]));
}

/** The step of the latest ask at or before this state's moment, or null before the first. */
export function latestAskStep(state: EngineState): number | null {
  for (let i = state.log.length - 1; i >= 0; i -= 1) {
    const event = state.log[i];
    if (event?.kind === 'ask') return event.step;
  }
  return null;
}
