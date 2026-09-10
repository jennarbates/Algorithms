import type { EngineState } from './engine';

/**
 * The replay behind the third claim: for any two who are not together, at
 * least one of them is happy where they are.
 *
 * Given a finished run and a pair, this finds the three moments the argument
 * turns on, so the page can scrub the board to each of them rather than talk
 * about them in the abstract:
 *
 *   1. the ask. If the asker wanted this receiver more than where they ended
 *      up, they must have asked, because they walked down their own list past
 *      this name to reach where they are;
 *   2. the answer. What the receiver did with them at that moment: held them,
 *      or turned them away;
 *   3. the end. The receiver's hold only ever moves up its own list from there,
 *      so whoever it ends with, it likes better than this asker.
 *
 * If the pair does not have that shape, because the asker already sits at or
 * above this receiver on their own list, there is nothing to replay: that is
 * not a pair that could break anything, because the asker does not want it.
 *
 * Pure over a finished engine state, so the test suite can run it for every
 * possible pair on every preset in both directions and check that the ask is
 * always found and the receiver's final hold always outranks the asker.
 */

export type Replay =
  /** Already together. Nothing to argue about. */
  | { readonly kind: 'together' }
  /** The asker likes where they ended up at least as much. No pull from their side. */
  | {
      readonly kind: 'asker-content';
      readonly askerEndedWith: string;
      /** 0 is the asker's first choice. */
      readonly askerRankOfEnd: number;
      readonly askerRankOfReceiver: number;
    }
  /** The asker wanted this receiver more, so the three beats apply. */
  | {
      readonly kind: 'replay';
      readonly askerEndedWith: string;
      readonly askerRankOfEnd: number;
      readonly askerRankOfReceiver: number;
      /** Step of the ask. */
      readonly askStep: number;
      /** Step of the answer, which is the step after. */
      readonly answerStep: number;
      readonly answer: 'held' | 'turned-away';
      /** Who the receiver ends holding. */
      readonly receiverEndedWith: string;
      /** 0 is the receiver's first choice. */
      readonly receiverRankOfEnd: number;
      readonly receiverRankOfAsker: number;
    };

export function stabilityReplay(final: EngineState, askerId: string, receiverId: string): Replay {
  const askerParty = final.roster.askers.find((a) => a.id === askerId);
  const receiverParty = final.roster.receivers.find((r) => r.id === receiverId);
  if (!askerParty) throw new Error(`Unknown asker id: ${askerId}`);
  if (!receiverParty) throw new Error(`Unknown receiver id: ${receiverId}`);

  const askerEndedWith = final.askers[askerId]?.heldBy ?? null;
  const receiverEndedWith = final.receivers[receiverId]?.holding ?? null;
  if (askerEndedWith === null || receiverEndedWith === null) {
    throw new Error('The replay is about a finished board, and this one has somebody unpaired');
  }

  if (askerEndedWith === receiverId) return { kind: 'together' };

  const askerRankOfEnd = rank(askerParty.rankOf, askerEndedWith);
  const askerRankOfReceiver = rank(askerParty.rankOf, receiverId);

  if (askerRankOfReceiver > askerRankOfEnd) {
    return { kind: 'asker-content', askerEndedWith, askerRankOfEnd, askerRankOfReceiver };
  }

  const ask = final.log.find(
    (e) => e.kind === 'ask' && e.asker === askerId && e.receiver === receiverId,
  );
  if (!ask) {
    throw new Error(`${askerId} ended below ${receiverId} on their list but never asked`);
  }
  const answerEvent = final.log.find((e) => e.step === ask.step + 1);
  if (!answerEvent || answerEvent.kind === 'ask' || answerEvent.kind === 'settled') {
    throw new Error(`No answer to the ask at step ${ask.step}`);
  }

  return {
    kind: 'replay',
    askerEndedWith,
    askerRankOfEnd,
    askerRankOfReceiver,
    askStep: ask.step,
    answerStep: ask.step + 1,
    answer: answerEvent.kind === 'turned-away' ? 'turned-away' : 'held',
    receiverEndedWith,
    receiverRankOfEnd: rank(receiverParty.rankOf, receiverEndedWith),
    receiverRankOfAsker: rank(receiverParty.rankOf, askerId),
  };
}

function rank(rankOf: Readonly<Record<string, number>>, id: string): number {
  const r = rankOf[id];
  if (r === undefined) throw new Error(`${id} is not on this list`);
  return r;
}
