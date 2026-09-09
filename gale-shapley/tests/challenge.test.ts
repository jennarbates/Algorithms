import { describe, expect, it } from 'vitest';
import { createEngine, matchingOf, run, step } from '../src/core/engine';
import { blockingPairs, judgePair } from '../src/core/stability';
import { explainPair, narrationText } from '../src/content/narration';
import type { NarrationSegment, PairExplanation } from '../src/content/narration';
import { PRESETS, presetById } from '../src/content/presets';
import type { Instance, Matching } from '../src/core/types';

/**
 * The challenge is the page's centrepiece, so what it says is held to the same
 * standard as the algorithm itself.
 *
 * Two claims matter. On a finished board, EVERY pair a reader can pick must
 * fail, and it must fail for a reason the page can state. Partway through, some
 * pairs must genuinely succeed, because a challenge nobody can ever win teaches
 * nothing about what "settled" means.
 */

const BANNED = [
  'propose',
  'proposal',
  'proposer',
  'receiver',
  'reject',
  'tentative',
  'optimal',
  'pessimal',
  'stable',
  'unstable',
  'blocking pair',
  'algorithm',
  'terminate',
  'converge',
  'iteration',
  'agent',
  'matching',
  'invariant',
];

function asText(instance: Instance, segments: readonly NarrationSegment[]): string {
  return narrationText(instance, { segments, tone: 'neutral' });
}

function fullText(instance: Instance, explanation: PairExplanation): string {
  return [
    explanation.studentQuote,
    asText(instance, explanation.studentDetail),
    explanation.schoolQuote,
    asText(instance, explanation.schoolDetail),
    explanation.outcome,
  ].join(' ');
}

function everyExplanation(instance: Instance, matching: Matching): PairExplanation[] {
  const out: PairExplanation[] = [];
  for (const student of instance.students) {
    for (const school of instance.schools) {
      out.push(explainPair(judgePair(instance, matching, student.id, school.id)));
    }
  }
  return out;
}

describe('on a finished board', () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))(
    '%s: every pair a reader can pick fails, in both directions',
    (_id, instance) => {
      for (const side of ['students', 'schools'] as const) {
        const matching = matchingOf(run(instance, side));
        for (const explanation of everyExplanation(instance, matching)) {
          expect(explanation.blocks).toBe(false);
        }
      }
    },
  );

  it('always has one side saying they are happy where they are', () => {
    // This is what "it takes two" looks like from the reader's chair: they can
    // always find someone willing to move, and never both at once.
    for (const instance of PRESETS) {
      const matching = matchingOf(run(instance, 'students'));
      for (const explanation of everyExplanation(instance, matching)) {
        if (explanation.alreadyTogether) continue;
        const someoneIsHappy =
          explanation.studentQuote.includes('happy') || explanation.schoolQuote.includes('happy');
        expect(someoneIsHappy).toBe(true);
      }
    }
  });

  it('refuses to score a pair who already have each other', () => {
    const instance = presetById('opener');
    const matching = matchingOf(run(instance, 'students'));

    for (const student of instance.students) {
      const school = matching[student.id];
      if (school == null) continue;
      const explanation = explainPair(judgePair(instance, matching, student.id, school));
      expect(explanation.alreadyTogether).toBe(true);
      expect(explanation.blocks).toBe(false);
      expect(explanation.outcome).toContain('already have each other');
    }
  });

  it('closes with "It takes two"', () => {
    const instance = presetById('opener');
    const matching = matchingOf(run(instance, 'students'));
    const explanation = explainPair(judgePair(instance, matching, 'priya', 'mit'));
    expect(explanation.outcome).toBe('Nothing happens. It takes two.');
  });
});

describe('partway through', () => {
  it('really does have pairs that come apart, or the challenge would be hollow', () => {
    const instance = presetById('cascade');
    let state = createEngine(instance, 'students');
    let foundABreakablePair = false;

    while (state.phase !== 'done') {
      state = step(state);
      const matching = matchingOf(state);
      if (blockingPairs(instance, matching).length > 0) {
        const pair = blockingPairs(instance, matching)[0];
        if (!pair) continue;
        const explanation = explainPair(judgePair(instance, matching, pair.student, pair.school));
        expect(explanation.blocks).toBe(true);
        expect(explanation.outcome).toContain('can still come apart');
        foundABreakablePair = true;
        break;
      }
    }

    expect(foundABreakablePair).toBe(true);
  });

  it('describes people who have nowhere yet without pretending they do', () => {
    const instance = presetById('opener');
    const empty = createEngine(instance, 'students');
    const explanation = explainPair(judgePair(instance, matchingOf(empty), 'priya', 'mit'));

    expect(asText(instance, explanation.studentDetail)).toContain('has nowhere yet');
    expect(asText(instance, explanation.schoolDetail)).toContain('has nobody yet');
    expect(explanation.blocks).toBe(true);
  });
});

describe('the vocabulary rule', () => {
  it('holds for the challenge copy too, at every point in every run', () => {
    for (const instance of PRESETS) {
      for (const side of ['students', 'schools'] as const) {
        let state = createEngine(instance, side);

        // Check the copy at the start, partway, and at the end.
        const checkpoints = [matchingOf(state)];
        while (state.phase !== 'done') state = step(state);
        checkpoints.push(matchingOf(state));

        for (const matching of checkpoints) {
          for (const explanation of everyExplanation(instance, matching)) {
            const lower = fullText(instance, explanation).toLowerCase();
            for (const term of BANNED) {
              expect(lower, `${instance.id}/${side}`).not.toContain(term);
            }
          }
        }
      }
    }
  });
});
