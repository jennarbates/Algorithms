import { describe, expect, it } from 'vitest';
import { CLAIMS, claimById, finishesTally, plainSurface, roles } from '../src/content/proofs';
import type { Side } from '../src/core/types';

/**
 * The vocabulary rule, applied to the proof section.
 *
 * The plain layer of every claim is held to the same list of banned terms as
 * the log. The formal layer is exempt, on the condition that every term it
 * leans on is introduced with the plain phrase it replaces, and that condition
 * is checked here too, so the split between the two layers is real and not a
 * matter of remembering.
 */

const SIDES: Side[] = ['students', 'schools'];

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

describe('the plain layer', () => {
  it('never uses a banned term, in either direction', () => {
    for (const side of SIDES) {
      for (const sentence of plainSurface(side)) {
        const lower = sentence.toLowerCase();
        for (const term of BANNED) {
          expect(lower, `${side}: "${sentence}"`).not.toContain(term);
        }
      }
    }
  });

  it('has a claim and a sketch for every claim, in both directions', () => {
    for (const claim of CLAIMS) {
      expect(claim.plain.claim.trim().length).toBeGreaterThan(0);
      for (const side of SIDES) {
        expect(claim.plain.sketch(side).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('says student and school the right way round for whoever is asking', () => {
    const studentsAsk = claimById('holds').plain.sketch('students');
    const schoolsAsk = claimById('holds').plain.sketch('schools');
    expect(studentsAsk).toContain('Take any student and any school');
    expect(schoolsAsk).toContain('Take any school and any student');
    expect(studentsAsk).not.toBe(schoolsAsk);
  });

  it('counts questions in plain words, singular and plural', () => {
    expect(finishesTally(1, 9, false)).toBe('1 of 9 possible question asked so far.');
    expect(finishesTally(4, 9, false)).toBe('4 of 9 possible questions asked so far.');
    expect(finishesTally(9, 9, true)).toBe(
      '9 of 9 possible questions asked. That was every question there was.',
    );
    expect(finishesTally(8, 9, true)).toBe(
      '8 of 9 possible questions asked. It stopped with 1 question never needed.',
    );
    expect(finishesTally(5, 9, true)).toBe(
      '5 of 9 possible questions asked. It stopped with 4 questions never needed.',
    );
  });

  it('has a role table with no blank entries', () => {
    for (const side of SIDES) {
      for (const [key, value] of Object.entries(roles(side)) as [string, string][]) {
        expect(value.trim().length, `${side}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('the formal layer', () => {
  it('has three claims, in the order the plan gives them', () => {
    expect(CLAIMS.map((c) => c.id)).toEqual(['finishes', 'nobody-left-out', 'holds']);
  });

  it('introduces every term it uses, and uses every term it introduces', () => {
    for (const claim of CLAIMS) {
      const formalText = `${claim.formal.claim} ${claim.formal.sketch}`.toLowerCase();

      // Every term the glossary lists actually appears in the formal wording.
      for (const { term, replaces } of claim.formal.terms) {
        expect(formalText, `${claim.id} lists "${term}" but never says it`).toContain(
          term.toLowerCase(),
        );
        expect(
          replaces.trim().length,
          `${claim.id}: "${term}" has no plain phrase`,
        ).toBeGreaterThan(0);
      }

      // Every banned term the formal wording uses is in the glossary. A banned
      // term with no entry is jargon the reader was never given a way into.
      const introduced = claim.formal.terms.map((t) => t.term.toLowerCase());
      for (const banned of BANNED) {
        if (!formalText.includes(banned)) continue;
        const covered = introduced.some((t) => t.includes(banned) || banned.includes(t));
        expect(covered, `${claim.id} says "${banned}" without introducing it`).toBe(true);
      }
    }
  });

  it('does not name a term twice', () => {
    for (const claim of CLAIMS) {
      const names = claim.formal.terms.map((t) => t.term);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
