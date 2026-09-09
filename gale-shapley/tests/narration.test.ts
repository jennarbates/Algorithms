import { describe, expect, it } from 'vitest';
import { createEngine, step } from '../src/core/engine';
import { narrate, narrationText } from '../src/content/narration';
import { PRESETS, presetById } from '../src/content/presets';
import type { EngineState } from '../src/core/engine';
import type { Instance, Side } from '../src/core/types';

/**
 * The vocabulary rule, enforced rather than remembered.
 *
 * The page is for someone with no maths background, and the fastest way to lose
 * them is a technical word wearing an everyday word's clothes. This test makes
 * the rule mechanical: if a banned term ever reaches the default surface, the
 * build fails instead of the reader quietly bouncing off.
 */

const BANNED = [
  'propose',
  'proposal',
  'proposer',
  'receiver',
  'reject',
  'tentative',
  'tentatively',
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

function everyNarration(instance: Instance, side: Side): string[] {
  const out: string[] = [];
  let state: EngineState = createEngine(instance, side);
  const cap = 2 * instance.students.length * instance.students.length + 4;

  for (let i = 0; i < cap && state.phase !== 'done'; i += 1) {
    state = step(state);
    const latest = state.log[state.log.length - 1];
    if (latest) out.push(narrationText(instance, narrate(state, latest)));
  }
  return out;
}

describe('the vocabulary rule', () => {
  it('never uses a banned term anywhere on the default surface', () => {
    for (const instance of PRESETS) {
      for (const side of ['students', 'schools'] as const) {
        for (const sentence of everyNarration(instance, side)) {
          const lower = sentence.toLowerCase();
          for (const term of BANNED) {
            expect(lower, `${instance.id}/${side}: "${sentence}"`).not.toContain(term);
          }
        }
      }
    }
  });

  it('produces a sentence for every event, in both directions', () => {
    for (const instance of PRESETS) {
      for (const side of ['students', 'schools'] as const) {
        for (const sentence of everyNarration(instance, side)) {
          expect(sentence.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('the four things that can happen', () => {
  const instance = presetById('opener');

  function narrationsFor(side: Side): string[] {
    return everyNarration(instance, side);
  }

  it('narrates a question and its answer as two separate beats', () => {
    const lines = narrationsFor('students');
    expect(lines[0]).toBe('Priya asks MIT.');
    expect(lines[1]).toBe('MIT has nobody yet, so Priya is in. For now.');
  });

  it('narrates a displacement naming everyone involved', () => {
    const lines = narrationsFor('students');
    expect(lines[3]).toBe(
      'MIT was holding Priya, but likes Sam better. Sam is in. Priya is back to looking.',
    );
  });

  it('ends by saying, in plain words, that nothing is provisional any more', () => {
    const lines = narrationsFor('students');
    expect(lines[lines.length - 1]).toBe('Everyone is settled. Nothing here is a maybe any more.');
  });

  it('draws each named person as a token, not just as text', () => {
    let state = createEngine(instance, 'students');
    state = step(state);
    const latest = state.log[state.log.length - 1];
    if (!latest) throw new Error('no event');

    const parties = narrate(state, latest).segments.filter((s) => s.kind === 'party');
    expect(parties).toHaveLength(2);
    expect(parties.map((p) => (p.kind === 'party' ? p.party : ''))).toEqual(['student', 'school']);
  });

  it('swaps which side is drawn as a person when the schools ask', () => {
    let state = createEngine(instance, 'schools');
    state = step(state);
    const latest = state.log[state.log.length - 1];
    if (!latest) throw new Error('no event');

    const parties = narrate(state, latest).segments.filter((s) => s.kind === 'party');
    expect(parties.map((p) => (p.kind === 'party' ? p.party : ''))).toEqual(['school', 'student']);
  });
});
