import type { BlockingPair, Instance, Matching, SchoolId, StudentId, TiedWithNext } from './types';

/**
 * Preference lists with ties, and the two kinds of instability they give rise to.
 *
 * Everywhere else on the page a list is strict: of any two names on it, one is
 * higher. Here two neighbouring names can be tied, which means the person has
 * no preference between them. "Prefers" keeps its strict meaning throughout: a
 * person prefers x to y when x is higher on their list and the two are not tied.
 *
 * Take an arrangement, and a student and a school who are not together in it.
 *
 *   - They are a STRONG instability when the student prefers the school to
 *     where they are, and the school prefers the student to who it has.
 *   - They are a WEAK instability when one of them prefers the other, and the
 *     other either prefers too or is indifferent: ranks the newcomer level with
 *     who they already have.
 *
 * So every strong instability is also a weak one. On strict lists nobody is
 * ever indifferent between two different people, so the two notions coincide,
 * and both are the ordinary blocking pair that `core/stability` finds.
 * `tests/ties.test.ts` checks that on every arrangement of a few hundred random
 * markets rather than trusting the argument.
 *
 * This file only judges arrangements somebody hands it. It never builds one.
 */

/**
 * How a person feels about switching to `candidate` from `current`: `better`
 * if they prefer the candidate, `same` if the two are tied or are the same
 * person, `worse` if they prefer who they have. Having nobody is the worst case,
 * so anyone on the list is better than `null`.
 */
export type Lean = 'better' | 'same' | 'worse';

/** True when the list has at least one tie in it. */
export function listHasTies(tiedWithNext: TiedWithNext | undefined): boolean {
  return tiedWithNext?.some(Boolean) ?? false;
}

/** True when any list on either side has a tie in it. */
export function hasTies(instance: Instance): boolean {
  return (
    instance.students.some((s) => listHasTies(s.tiedWithNext)) ||
    instance.schools.some((c) => listHasTies(c.tiedWithNext))
  );
}

/**
 * Which tied group each name is in, 0 for the top group. Names in the same
 * group share a number, and a strict list numbers every name differently.
 */
export function groupRanks(
  prefs: readonly string[],
  tiedWithNext: TiedWithNext | undefined,
): Readonly<Record<string, number>> {
  const rank: Record<string, number> = {};
  let group = 0;
  prefs.forEach((id, k) => {
    if (k > 0 && !tiedWithNext?.[k - 1]) group += 1;
    rank[id] = group;
  });
  return rank;
}

/** The list as its tied groups, best group first. A strict list is all singletons. */
export function tiedGroups(
  prefs: readonly string[],
  tiedWithNext: TiedWithNext | undefined,
): string[][] {
  const groups: string[][] = [];
  prefs.forEach((id, k) => {
    const last = groups[groups.length - 1];
    if (k > 0 && tiedWithNext?.[k - 1] && last) last.push(id);
    else groups.push([id]);
  });
  return groups;
}

/** The other way round: groups, best first, into a list and its tie marks. */
export function fromGroups(groups: readonly (readonly string[])[]): {
  prefs: string[];
  tiedWithNext: boolean[];
} {
  const prefs = groups.flat();
  const tiedWithNext: boolean[] = [];
  for (const group of groups) {
    group.forEach((_, k) => {
      if (prefs.length > tiedWithNext.length + 1) tiedWithNext.push(k < group.length - 1);
    });
  }
  return { prefs, tiedWithNext };
}

export function lean(
  prefs: readonly string[],
  tiedWithNext: TiedWithNext | undefined,
  candidate: string,
  current: string | null,
): Lean {
  if (current === null) return 'better';
  if (candidate === current) return 'same';
  const rank = groupRanks(prefs, tiedWithNext);
  const a = rank[candidate];
  const b = rank[current];
  if (a === undefined) throw new Error(`${candidate} is not on this list`);
  if (b === undefined) throw new Error(`${current} is not on this list`);
  return a < b ? 'better' : a === b ? 'same' : 'worse';
}

/** Who is at each school under this arrangement. */
function occupantOf(matching: Matching): Readonly<Record<SchoolId, StudentId>> {
  const occupant: Record<SchoolId, StudentId> = {};
  for (const [studentId, schoolId] of Object.entries(matching)) {
    if (schoolId != null) occupant[schoolId] = studentId;
  }
  return occupant;
}

/**
 * One student and one school, judged against an arrangement. Returned for any
 * pair, instability or not, so the page can say why a pair does not qualify as
 * readily as why one does.
 */
export interface TiedVerdict {
  readonly student: StudentId;
  readonly school: SchoolId;
  readonly studentsSchool: SchoolId | null;
  readonly schoolsStudent: StudentId | null;
  /** How the student feels about this school against the one they have. */
  readonly studentLean: Lean;
  /** How the school feels about this student against the one it has. */
  readonly schoolLean: Lean;
  readonly alreadyTogether: boolean;
  /** Both prefer each other. */
  readonly strong: boolean;
  /** One prefers the other, and the other prefers too or is indifferent. */
  readonly weak: boolean;
}

export function judgeTiedPair(
  instance: Instance,
  matching: Matching,
  studentId: StudentId,
  schoolId: SchoolId,
): TiedVerdict {
  const student = instance.students.find((s) => s.id === studentId);
  if (!student) throw new Error(`Unknown student id: ${studentId}`);
  const school = instance.schools.find((c) => c.id === schoolId);
  if (!school) throw new Error(`Unknown school id: ${schoolId}`);

  const studentsSchool = matching[studentId] ?? null;
  const schoolsStudent = occupantOf(matching)[schoolId] ?? null;
  const alreadyTogether = studentsSchool === schoolId;

  const studentLean = alreadyTogether
    ? 'same'
    : lean(student.prefs, student.tiedWithNext, schoolId, studentsSchool);
  const schoolLean = alreadyTogether
    ? 'same'
    : lean(school.prefs, school.tiedWithNext, studentId, schoolsStudent);

  const strong = studentLean === 'better' && schoolLean === 'better';
  const weak =
    (studentLean === 'better' && schoolLean !== 'worse') ||
    (schoolLean === 'better' && studentLean !== 'worse');

  return {
    student: studentId,
    school: schoolId,
    studentsSchool,
    schoolsStudent,
    studentLean,
    schoolLean,
    alreadyTogether,
    strong,
    weak,
  };
}

/**
 * Every pair that is an instability of either kind, student by student and
 * school by school in list order, so the page and the tests see one order.
 * The strong ones are in here too, since each of them is also weak.
 */
export function instabilities(instance: Instance, matching: Matching): TiedVerdict[] {
  const out: TiedVerdict[] = [];
  for (const student of instance.students) {
    for (const school of instance.schools) {
      const verdict = judgeTiedPair(instance, matching, student.id, school.id);
      if (verdict.weak) out.push(verdict);
    }
  }
  return out;
}

const asPair = (v: TiedVerdict): BlockingPair => ({ student: v.student, school: v.school });

export function strongInstabilities(instance: Instance, matching: Matching): BlockingPair[] {
  return instabilities(instance, matching)
    .filter((v) => v.strong)
    .map(asPair);
}

export function weakInstabilities(instance: Instance, matching: Matching): BlockingPair[] {
  return instabilities(instance, matching).map(asPair);
}
