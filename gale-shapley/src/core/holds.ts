import type { EngineState } from './engine';

/**
 * When each receiver first started holding somebody, and the fact that they
 * never stop.
 *
 * This is the evidence for the second claim: nobody is left out, because the
 * only way to run out of list is to have asked everyone, and everyone who has
 * been asked is holding somebody. The second half of that is a property of
 * receivers, and this module reads it off a run so the page can point at the
 * exact moment each receiver's "nobody yet" went away and say that it never
 * came back.
 *
 * Pure over engine state, like `asks.ts`, so the claim is tested for every
 * preset in both directions rather than eyeballed.
 */

export interface FirstHold {
  readonly receiver: string;
  /** The step of the first ask this receiver ever got. */
  readonly askedStep: number;
  /** The step at which they started holding somebody: the answer to that ask. */
  readonly heldStep: number;
  /** Who asked first. */
  readonly firstAsker: string;
}

/** The first ask each receiver got, by receiver id. Receivers never asked are absent. */
export function firstHolds(state: EngineState): ReadonlyMap<string, FirstHold> {
  const out = new Map<string, FirstHold>();
  for (const event of state.log) {
    if (event.kind !== 'ask' || out.has(event.receiver)) continue;
    out.set(event.receiver, {
      receiver: event.receiver,
      askedStep: event.step,
      heldStep: event.step + 1,
      firstAsker: event.asker,
    });
  }
  return out;
}

/**
 * True if, in this state, every receiver who has ever been asked is holding
 * somebody. The engine keeps this true at every step; this reads it back.
 * The moment between an ask and its answer counts as held, because the ask
 * has not been answered yet and nobody has been let go.
 */
export function everyAskedIsHolding(state: EngineState): boolean {
  const first = firstHolds(state);
  for (const [receiverId, hold] of first) {
    if (state.stepCount < hold.heldStep) continue;
    const receiver = state.receivers[receiverId];
    if (!receiver || receiver.holding === null) return false;
  }
  return true;
}

/** The receivers a given asker actually asked in this run, in the order they asked. */
export function askedBy(state: EngineState, askerId: string): readonly string[] {
  return state.log.flatMap((e) => (e.kind === 'ask' && e.asker === askerId ? [e.receiver] : []));
}
