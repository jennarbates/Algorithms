import { describe, expect, it } from 'vitest';
import { stabilityReplay } from '../src/core/replay';
import { createEngine, runToCompletion } from '../src/core/engine';
import { PRESETS, presetById } from '../src/content/presets';
import type { Side } from '../src/core/types';

/**
 * The stability replay, checked for every possible pair on every preset in
 * both directions: whenever the asker wanted this receiver more than where
 * they ended up, the ask is found in the log, the answer is the next step,
 * and the receiver's final hold outranks the asker on the receiver's list.
 * That last fact is the whole argument, and here it is never assumed.
 */

const SIDES: Side[] = ['students', 'schools'];

describe('the stability replay', () => {
  it('finds the ask and the answer, and the receiver always ends above the asker', () => {
    for (const instance of PRESETS) {
      for (const side of SIDES) {
        const final = runToCompletion(createEngine(instance, side));
        for (const a of final.roster.askers) {
          for (const r of final.roster.receivers) {
            const replay = stabilityReplay(final, a.id, r.id);
            const label = `${instance.id}/${side}: ${a.id} & ${r.id}`;

            if (replay.kind === 'together') {
              expect(final.askers[a.id]?.heldBy, label).toBe(r.id);
              continue;
            }
            if (replay.kind === 'asker-content') {
              expect(replay.askerRankOfReceiver, label).toBeGreaterThan(replay.askerRankOfEnd);
              continue;
            }

            expect(replay.askerRankOfReceiver, label).toBeLessThan(replay.askerRankOfEnd);
            const ask = final.log.find((e) => e.step === replay.askStep);
            expect(ask?.kind, label).toBe('ask');
            if (ask?.kind === 'ask') {
              expect(ask.asker).toBe(a.id);
              expect(ask.receiver).toBe(r.id);
            }
            expect(replay.answerStep).toBe(replay.askStep + 1);
            const answer = final.log.find((e) => e.step === replay.answerStep);
            expect(answer?.kind === 'turned-away' ? 'turned-away' : 'held', label).toBe(
              replay.answer,
            );
            expect(replay.receiverRankOfEnd, label).toBeLessThan(replay.receiverRankOfAsker);
            expect(final.receivers[r.id]?.holding).toBe(replay.receiverEndedWith);
          }
        }
      }
    }
  });

  it('covers every pair with exactly one of the three shapes', () => {
    const final = runToCompletion(createEngine(presetById('opener'), 'students'));
    const kinds = new Set<string>();
    for (const a of final.roster.askers) {
      for (const r of final.roster.receivers) {
        kinds.add(stabilityReplay(final, a.id, r.id).kind);
      }
    }
    expect(kinds.has('together')).toBe(true);
    expect(kinds.has('replay')).toBe(true);
  });

  it('refuses an unfinished board', () => {
    const state = createEngine(presetById('opener'), 'students');
    expect(() => stabilityReplay(state, 'priya', 'mit')).toThrow();
  });
});
