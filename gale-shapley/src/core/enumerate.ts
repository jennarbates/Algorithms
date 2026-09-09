import { isStable } from './stability';
import type { Instance, Matching, SchoolId, Side, StudentId } from './types';

/**
 * Brute force over every possible arrangement.
 *
 * This exists to check the fast algorithm, not to replace it. Nothing in the
 * page claims a property that has not been confirmed here by exhaustive search,
 * which is what stops a hand-built preset from quietly teaching something false.
 *
 * Cost is n! arrangements, each checked in n^2, so it is capped well below the
 * point where that matters.
 */

export const MAX_ENUMERABLE_SIZE = 8;

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];

  const out: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) out.push([item, ...tail]);
  });
  return out;
}

export function allPerfectMatchings(instance: Instance): Matching[] {
  const n = instance.students.length;
  if (n !== instance.schools.length) {
    throw new Error('Enumeration expects equally sized sides');
  }
  if (n > MAX_ENUMERABLE_SIZE) {
    throw new Error(
      `Refusing to enumerate ${n}! arrangements; the cap is ${MAX_ENUMERABLE_SIZE} per side`,
    );
  }

  const schoolIds = instance.schools.map((c) => c.id);
  return permutations(schoolIds).map((order) => {
    const matching: Record<StudentId, SchoolId | null> = {};
    instance.students.forEach((student, index) => {
      matching[student.id] = order[index] ?? null;
    });
    return matching;
  });
}

export function allStableMatchings(instance: Instance): Matching[] {
  return allPerfectMatchings(instance).filter((m) => isStable(instance, m));
}

/** Who a given student is with, across a set of arrangements. */
function partnersOfStudent(matchings: readonly Matching[], studentId: StudentId): SchoolId[] {
  return matchings
    .map((m) => m[studentId] ?? null)
    .filter((schoolId): schoolId is SchoolId => schoolId !== null);
}

/** Who a given school has, across a set of arrangements. */
function partnersOfSchool(matchings: readonly Matching[], schoolId: SchoolId): StudentId[] {
  return matchings
    .map((m) => Object.keys(m).find((studentId) => m[studentId] === schoolId))
    .filter((studentId): studentId is StudentId => studentId !== undefined);
}

function bestOn(prefs: readonly string[], candidates: readonly string[]): string | null {
  let best: string | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const rank = prefs.indexOf(candidate);
    if (rank !== -1 && rank < bestRank) {
      best = candidate;
      bestRank = rank;
    }
  }
  return best;
}

function worstOn(prefs: readonly string[], candidates: readonly string[]): string | null {
  let worst: string | null = null;
  let worstRank = -1;
  for (const candidate of candidates) {
    const rank = prefs.indexOf(candidate);
    if (rank > worstRank) {
      worst = candidate;
      worstRank = rank;
    }
  }
  return worst;
}

/**
 * True when every member of `side` has, in `matching`, the best partner they
 * get in ANY stable arrangement.
 *
 * This is the surprising half of the theory. You might expect the askers to
 * compete with each other for good outcomes, so that helping one hurts another.
 * They do not. There is a single arrangement that is simultaneously best for
 * all of them, and Gale-Shapley run from that side produces exactly it.
 */
export function isSideOptimal(
  instance: Instance,
  matching: Matching,
  side: Side,
  stableMatchings: readonly Matching[],
): boolean {
  if (side === 'students') {
    return instance.students.every((student) => {
      const best = bestOn(student.prefs, partnersOfStudent(stableMatchings, student.id));
      return (matching[student.id] ?? null) === best;
    });
  }

  return instance.schools.every((school) => {
    const best = bestOn(school.prefs, partnersOfSchool(stableMatchings, school.id));
    const actual = Object.keys(matching).find((studentId) => matching[studentId] === school.id);
    return (actual ?? null) === best;
  });
}

/**
 * True when every member of `side` has their WORST stable partner.
 *
 * The same arrangement that is best for one side is worst for the other, every
 * time. This is the asymmetry the whole page is built to show.
 */
export function isSidePessimal(
  instance: Instance,
  matching: Matching,
  side: Side,
  stableMatchings: readonly Matching[],
): boolean {
  if (side === 'students') {
    return instance.students.every((student) => {
      const worst = worstOn(student.prefs, partnersOfStudent(stableMatchings, student.id));
      return (matching[student.id] ?? null) === worst;
    });
  }

  return instance.schools.every((school) => {
    const worst = worstOn(school.prefs, partnersOfSchool(stableMatchings, school.id));
    const actual = Object.keys(matching).find((studentId) => matching[studentId] === school.id);
    return (actual ?? null) === worst;
  });
}

export function sameMatching(a: Matching, b: Matching): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) return false;
  }
  return true;
}
