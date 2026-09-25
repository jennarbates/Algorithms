import { SCHOOLS, STUDENTS, schoolIdentity, studentIdentity } from './cast';
import { fromGroups, tiedGroups } from '../core/ties';
import type { TiedVerdict } from '../core/ties';
import type { Instance, Matching, School, Student } from '../core/types';

/**
 * The words and the markets of the workbench: the part of the page where the
 * reader writes their own lists.
 *
 * The walkthrough and the practice section work on lists somebody else chose.
 * A problem set eventually asks for lists the reader chooses, to make something
 * happen or to test whether it can. That needs somewhere to try an idea and
 * have it checked, which is what the workbench is: an editor, a checker, and a
 * run of the process with its asks counted. It says what is true of the lists
 * on screen and nothing about lists in general.
 */

/** The smallest and largest markets the editor offers. */
export const BENCH_MIN = 2;
export const BENCH_MAX = 6;
/** Every arrangement of five a side is 120 of them, too many to read as a list. */
export const TIES_MAX = 4;
/** How often a freshly dealt list in the ties view has a tie between two neighbours. */
export const TIE_CHANCE = 0.25;

// ---------------------------------------------------------------------------
// Markets
// ---------------------------------------------------------------------------

/** Small deterministic generator, so a shuffle can be reproduced from its seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) throw new Error('shuffle index out of range');
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** The first n people of each side of the cast. */
function castOf(n: number): { studentIds: string[]; schoolIds: string[] } {
  return {
    studentIds: STUDENTS.slice(0, n).map((s) => s.id),
    schoolIds: SCHOOLS.slice(0, n).map((c) => c.id),
  };
}

/**
 * A market of n a side with shuffled lists. With a tie chance above zero, each
 * pair of neighbours on each list is tied with that chance, so the ties view
 * opens on something with ties in it; at zero the lists are strict.
 */
export function shuffledMarket(n: number, seed: number, tieChance = 0): Instance {
  const rnd = mulberry32(seed);
  const { studentIds, schoolIds } = castOf(n);
  const marks = () =>
    tieChance > 0 ? { tiedWithNext: Array.from({ length: n - 1 }, () => rnd() < tieChance) } : {};
  return {
    id: `bench-${n}-${seed}`,
    title: 'Your own lists',
    teaches: 'Whatever the reader is trying out.',
    students: studentIds.map((id) => ({
      id,
      name: studentIdentity(id).name,
      prefs: shuffled(schoolIds, rnd),
      ...marks(),
    })),
    schools: schoolIds.map((id) => ({
      id,
      name: schoolIdentity(id).name,
      prefs: shuffled(studentIds, rnd),
      ...marks(),
    })),
  };
}

/** A copy of a preset the reader can edit without touching the preset. */
export function editableCopy(instance: Instance): Instance {
  return {
    id: `bench-from-${instance.id}`,
    title: instance.title,
    teaches: instance.teaches,
    students: instance.students.map((s) => ({ id: s.id, name: s.name, prefs: [...s.prefs] })),
    schools: instance.schools.map((c) => ({ id: c.id, name: c.name, prefs: [...c.prefs] })),
  };
}

type Person = Student | School;

function marksOf(person: Person): boolean[] {
  return Array.from({ length: person.prefs.length - 1 }, (_, k) => !!person.tiedWithNext?.[k]);
}

/**
 * Move the name at position k one place earlier. The tie marks stay where they
 * are: they belong to the gaps between positions, not to the names.
 */
export function moveEarlier<P extends Person>(person: P, k: number): P {
  if (k <= 0 || k >= person.prefs.length) return person;
  const prefs = [...person.prefs];
  const a = prefs[k - 1];
  const b = prefs[k];
  if (a === undefined || b === undefined) return person;
  prefs[k - 1] = b;
  prefs[k] = a;
  return { ...person, prefs };
}

/** Tie the names either side of gap k, or untie them if they were tied. */
export function toggleTie<P extends Person>(person: P, gap: number): P {
  const marks = marksOf(person);
  if (gap < 0 || gap >= marks.length) return person;
  marks[gap] = !marks[gap];
  return { ...person, tiedWithNext: marks };
}

/** One arrangement per student, pairing each with the school in the same position. */
export function inOrder(instance: Instance): Matching {
  const m: Record<string, string> = {};
  instance.students.forEach((s, i) => {
    const school = instance.schools[i];
    if (school) m[s.id] = school.id;
  });
  return m;
}

// ---------------------------------------------------------------------------
// Printing lists with ties
// ---------------------------------------------------------------------------

const nameOf = (instance: Instance, id: string) =>
  instance.students.find((s) => s.id === id)?.name ??
  instance.schools.find((c) => c.id === id)?.name ??
  id;

/** "MIT = UMass Amherst > NYU": best first, = between tied names. */
export function listText(instance: Instance, person: Person): string {
  return tiedGroups(person.prefs, person.tiedWithNext)
    .map((group) => group.map((id) => nameOf(instance, id)).join(' = '))
    .join(' > ');
}

/** "Priya–NYU · Sam–UMass Amherst", in student order. */
export function arrangementText(instance: Instance, matching: Matching): string {
  return instance.students
    .map((s) => {
      const c = matching[s.id];
      return `${s.name}–${c ? nameOf(instance, c) : 'nobody'}`;
    })
    .join(' · ');
}

// ---------------------------------------------------------------------------
// The market a question quotes
// ---------------------------------------------------------------------------

/**
 * The shape the tie questions store their lists in, which is the shape a person
 * writes them in: groups, best first. Kept structural so the suite can check
 * every claim a question makes against the core, and so the quoted text can be
 * checked against the lists it claims to print.
 */
export interface TiedGiven {
  readonly students: Readonly<Record<string, readonly (readonly string[])[]>>;
  readonly schools: Readonly<Record<string, readonly (readonly string[])[]>>;
  /** The arrangement the question is about, when it is about one. */
  readonly matching?: Readonly<Record<string, string>>;
}

export function instanceFromGiven(id: string, given: TiedGiven): Instance {
  return {
    id,
    title: id,
    teaches: 'A market a question quotes.',
    students: Object.entries(given.students).map(([sid, groups]) => ({
      id: sid,
      name: studentIdentity(sid).name,
      ...fromGroups(groups),
    })),
    schools: Object.entries(given.schools).map(([cid, groups]) => ({
      id: cid,
      name: schoolIdentity(cid).name,
      ...fromGroups(groups),
    })),
  };
}

/** The text block a tie question quotes, generated so it can be checked. */
export function tiedQuote(given: TiedGiven): string {
  const instance = instanceFromGiven('quoted', given);
  const width = Math.max(...[...instance.students, ...instance.schools].map((p) => p.name.length));
  const line = (p: Person) => `  ${p.name.padEnd(width)}  ${listText(instance, p)}`;
  const out = [
    'Students, best first (= means tied):',
    ...instance.students.map(line),
    'Schools, best first:',
    ...instance.schools.map(line),
  ];
  if (given.matching) out.push(`The matching: ${arrangementText(instance, given.matching)}`);
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

/** Where somebody is, or "nobody" / "nowhere" for an empty seat. */
function partnerName(instance: Instance, id: string | null, empty: string): string {
  return id === null ? empty : nameOf(instance, id);
}

/**
 * Why one pair is, or is not, an instability, in two halves: what the student
 * thinks and what the school thinks. Generated from the verdict, so the words
 * cannot disagree with the line drawn on the board.
 */
export function explainTied(instance: Instance, v: TiedVerdict): string {
  const s = nameOf(instance, v.student);
  const c = nameOf(instance, v.school);
  const has = partnerName(instance, v.studentsSchool, 'nowhere');
  const holds = partnerName(instance, v.schoolsStudent, 'nobody');

  if (v.alreadyTogether) return `${s} and ${c} are already together.`;

  const studentHalf =
    v.studentLean === 'better'
      ? `${s} would rather have ${c} than ${has}`
      : v.studentLean === 'same'
        ? `${s} ranks ${c} level with ${has}, so would not mind either way`
        : `${s} would rather keep ${has}`;
  const schoolHalf =
    v.schoolLean === 'better'
      ? `${c} would rather have ${s} than ${holds}`
      : v.schoolLean === 'same'
        ? `${c} ranks ${s} level with ${holds}, so would not mind either way`
        : `${c} would rather keep ${holds}`;

  const verdict = v.strong
    ? 'Both strictly, so this is a strong instability, and so a weak one as well.'
    : v.weak
      ? 'One strictly and the other does not mind, so this is a weak instability but not a strong one.'
      : v.studentLean === 'same' && v.schoolLean === 'same'
        ? 'Neither of them strictly wants the switch, so it is neither kind.'
        : 'One of them would strictly rather stay, so it is neither kind.';

  return `${studentHalf}, and ${schoolHalf}. ${verdict}`;
}

export const BENCH = {
  tiesLead:
    'Mark two neighbouring names as tied and the list stops saying which of them comes first. Pick an arrangement and the board shows every pair that could break it, and which kind.',
  strongKey: 'Strong: each strictly prefers the other to who they have.',
  weakKey: 'Weak: one strictly prefers the other, and the other either does too or does not mind.',
  noneHere:
    'Nothing breaks this one either way: for every two people not together, one of them would strictly rather stay, or neither strictly wants the switch.',
  tooBigForTies: `The ties view lists every arrangement, so it stops at ${TIES_MAX} a side. Pick a smaller size under the lists.`,
  countLead:
    'The process, run on the lists as they stand. Change a list and the run starts again from nothing. These lists are strict: the process has no rule for a tie.',
  editorHint:
    'Click a name to move it one place earlier. Click the sign between two names to tie them (=) or untie them (>).',
  editorHintStrict: 'Click a name to move it one place earlier.',
} as const;
