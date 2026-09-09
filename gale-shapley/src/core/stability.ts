import type { BlockingPair, Instance, Matching, SchoolId, StudentId } from './types';

/**
 * Stability, checked directly from the definition.
 *
 * A student and a school block an arrangement when they would BOTH rather have
 * each other than what they currently have. One side wanting out is not enough.
 * That is the whole idea, and the check below is a literal transcription of it.
 */

/** Who is at each school under this arrangement. */
function occupantOf(matching: Matching): Readonly<Record<SchoolId, StudentId>> {
  const occupant: Record<SchoolId, StudentId> = {};
  for (const [studentId, schoolId] of Object.entries(matching)) {
    if (schoolId != null) occupant[schoolId] = studentId;
  }
  return occupant;
}

/**
 * True when `candidate` is strictly better than `current` on `prefs`.
 * A `null` current means anything is better: having nobody is the worst case.
 */
function prefers(prefs: readonly string[], candidate: string, current: string | null): boolean {
  if (current === null) return true;
  const candidateRank = prefs.indexOf(candidate);
  const currentRank = prefs.indexOf(current);
  if (candidateRank === -1) return false;
  if (currentRank === -1) return true;
  return candidateRank < currentRank;
}

/**
 * Every pair who would both walk. Returned in a stable order so the UI can show
 * a consistent list and tests can compare directly.
 */
export function blockingPairs(instance: Instance, matching: Matching): BlockingPair[] {
  const occupant = occupantOf(matching);
  const pairs: BlockingPair[] = [];

  for (const student of instance.students) {
    const theirSchool = matching[student.id] ?? null;

    for (const school of instance.schools) {
      if (school.id === theirSchool) continue;

      const studentWouldSwitch = prefers(student.prefs, school.id, theirSchool);
      if (!studentWouldSwitch) continue;

      const schoolsStudent = occupant[school.id] ?? null;
      const schoolWouldSwitch = prefers(school.prefs, student.id, schoolsStudent);
      if (!schoolWouldSwitch) continue;

      pairs.push({ student: student.id, school: school.id });
    }
  }

  return pairs;
}

export function isStable(instance: Instance, matching: Matching): boolean {
  return blockingPairs(instance, matching).length === 0;
}

/** Everyone matched, and nobody matched twice. */
export function isPerfect(instance: Instance, matching: Matching): boolean {
  const assigned = instance.students.map((s) => matching[s.id] ?? null);
  if (assigned.some((schoolId) => schoolId === null)) return false;
  return new Set(assigned).size === instance.schools.length;
}

/**
 * The explanation behind a single pair, in the shape the UI needs for the two
 * speech bubbles. Returned for any pair, blocking or not, because the whole
 * point of the challenge is showing a person why their guess did not work.
 */
export interface PairVerdict {
  readonly student: StudentId;
  readonly school: SchoolId;
  readonly studentsSchool: SchoolId | null;
  readonly schoolsStudent: StudentId | null;
  readonly studentWouldSwitch: boolean;
  readonly schoolWouldSwitch: boolean;
  readonly blocks: boolean;
  /** True when these two are already matched to each other. */
  readonly alreadyTogether: boolean;
}

export function judgePair(
  instance: Instance,
  matching: Matching,
  studentId: StudentId,
  schoolId: SchoolId,
): PairVerdict {
  const student = instance.students.find((s) => s.id === studentId);
  if (!student) throw new Error(`Unknown student id: ${studentId}`);
  const school = instance.schools.find((c) => c.id === schoolId);
  if (!school) throw new Error(`Unknown school id: ${schoolId}`);

  const studentsSchool = matching[studentId] ?? null;
  const schoolsStudent = occupantOf(matching)[schoolId] ?? null;
  const alreadyTogether = studentsSchool === schoolId;

  const studentWouldSwitch = !alreadyTogether && prefers(student.prefs, schoolId, studentsSchool);
  const schoolWouldSwitch = !alreadyTogether && prefers(school.prefs, studentId, schoolsStudent);

  return {
    student: studentId,
    school: schoolId,
    studentsSchool,
    schoolsStudent,
    studentWouldSwitch,
    schoolWouldSwitch,
    blocks: studentWouldSwitch && schoolWouldSwitch,
    alreadyTogether,
  };
}
