import { schoolIdentity, studentIdentity } from './cast';
import type { Instance, School, Student } from '../core/types';

/**
 * The six instances the page ships with.
 *
 * Every claim made about these ("this one has exactly one stable arrangement",
 * "flipping the sides changes nothing here") is asserted in `tests/presets.test.ts`
 * by exhaustive search. Nothing here is trusted because it was constructed
 * carefully; it is trusted because it is checked on every run of the suite.
 *
 * Preference lists are written as indices into the student and school id arrays
 * that accompany them. That looks less friendly than names, but it is exactly
 * the form the search that produced them emitted, so there is no transcription
 * step in which a preset could quietly become a different instance.
 */

interface PresetSpec {
  readonly id: string;
  readonly title: string;
  readonly teaches: string;
  readonly studentIds: readonly string[];
  readonly schoolIds: readonly string[];
  /** studentPrefs[i] lists school indices, most wanted first. */
  readonly studentPrefs: readonly (readonly number[])[];
  /** schoolPrefs[j] lists student indices, most wanted first. */
  readonly schoolPrefs: readonly (readonly number[])[];
  readonly reasons?: Readonly<Record<string, string>>;
  readonly notes?: Readonly<Record<string, string>>;
}

function buildInstance(spec: PresetSpec): Instance {
  const { studentIds, schoolIds } = spec;

  const students: Student[] = studentIds.map((id, i) => {
    const prefRow = spec.studentPrefs[i];
    if (!prefRow) throw new Error(`${spec.id}: no preference row for student ${id}`);
    const reason = spec.reasons?.[id];
    return {
      id,
      name: studentIdentity(id).name,
      prefs: prefRow.map((j) => {
        const schoolId = schoolIds[j];
        if (schoolId === undefined) throw new Error(`${spec.id}: bad school index ${j}`);
        return schoolId;
      }),
      ...(reason === undefined ? {} : { reason }),
    };
  });

  const schools: School[] = schoolIds.map((id, j) => {
    const prefRow = spec.schoolPrefs[j];
    if (!prefRow) throw new Error(`${spec.id}: no preference row for school ${id}`);
    const note = spec.notes?.[id];
    return {
      id,
      name: schoolIdentity(id).name,
      prefs: prefRow.map((i) => {
        const studentId = studentIds[i];
        if (studentId === undefined) throw new Error(`${spec.id}: bad student index ${i}`);
        return studentId;
      }),
      ...(note === undefined ? {} : { note }),
    };
  });

  return { id: spec.id, title: spec.title, teaches: spec.teaches, students, schools };
}

// ---------------------------------------------------------------------------
// A. The Opener
//
// Four proposals when students ask, including one displacement: Priya is held
// by MIT and then pushed out by Sam. Two stable arrangements, and the flip
// changes where Priya lands from her second choice to her last.
// ---------------------------------------------------------------------------

const opener = buildInstance({
  id: 'opener',
  title: 'Three students, three seats',
  teaches: 'The whole process, start to finish, and why the answer depends on who asks.',
  studentIds: ['priya', 'sam', 'ravi'],
  schoolIds: ['mit', 'umass', 'nyu'],
  studentPrefs: [
    [0, 1, 2],
    [0, 2, 1],
    [2, 0, 1],
  ],
  schoolPrefs: [
    [1, 2, 0],
    [2, 0, 1],
    [0, 1, 2],
  ],
  reasons: {
    priya: 'Wants the strongest engineering programme, but UMass is close to home and in-state.',
    sam: 'Set on MIT, and failing that wants to be in a city.',
    ravi: 'Set on New York. Everything else is a fallback.',
  },
  notes: {
    mit: 'Weighting research experience above everything else.',
    umass: 'Building out its data science cohort.',
    nyu: 'Looking for leadership and portfolio work.',
  },
});

// ---------------------------------------------------------------------------
// B. Head-on collision
//
// The smallest possible demonstration of the asymmetry. Each student's first
// choice is a school whose first choice is the other student. Whoever asks
// gets everything.
// ---------------------------------------------------------------------------

const headOn = buildInstance({
  id: 'head-on',
  title: 'Two students who want opposite things',
  teaches: 'The smallest case where asking first wins outright.',
  studentIds: ['priya', 'sam'],
  schoolIds: ['mit', 'nyu'],
  studentPrefs: [
    [0, 1],
    [1, 0],
  ],
  schoolPrefs: [
    [1, 0],
    [0, 1],
  ],
  reasons: {
    priya: 'MIT first, and she is not really considering anywhere else.',
    sam: 'New York first. MIT would be a consolation.',
  },
  notes: {
    mit: 'Sam is their standout applicant this round.',
    nyu: 'Priya is exactly who they are looking for.',
  },
});

// ---------------------------------------------------------------------------
// C. Everyone agrees
//
// All four students rank the schools the same way and all four schools rank the
// students the same way. Ten proposals, no displacements at all, exactly one
// stable arrangement, and flipping the sides changes nothing.
// ---------------------------------------------------------------------------

const everyoneAgrees = buildInstance({
  id: 'everyone-agrees',
  title: 'Everyone wants the same things',
  teaches:
    'What a market with no disagreement looks like: lots of turning away, nothing tentative.',
  studentIds: ['priya', 'sam', 'ravi', 'maya'],
  schoolIds: ['mit', 'berkeley', 'umass', 'northeastern'],
  studentPrefs: [
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
  ],
  schoolPrefs: [
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
  ],
});

// ---------------------------------------------------------------------------
// D. The cascade
//
// Found by exhaustive search over random five-by-five instances, maximising the
// longest chain of consecutive displacements. Seven displacements in a row:
// each person pushed out immediately goes and pushes out somebody else.
// Four stable arrangements, and the two directions give different answers.
// ---------------------------------------------------------------------------

const cascade = buildInstance({
  id: 'cascade',
  title: 'One question, seven people moved',
  teaches: 'Why nothing is settled until the very end. One late question unravels the whole board.',
  studentIds: ['priya', 'sam', 'ravi', 'maya', 'diego'],
  schoolIds: ['mit', 'umass', 'nyu', 'berkeley', 'michigan'],
  studentPrefs: [
    [1, 4, 0, 2, 3],
    [4, 1, 2, 0, 3],
    [0, 1, 3, 2, 4],
    [3, 0, 1, 4, 2],
    [0, 3, 1, 4, 2],
  ],
  schoolPrefs: [
    [3, 0, 4, 1, 2],
    [4, 3, 1, 2, 0],
    [0, 4, 2, 1, 3],
    [1, 0, 4, 2, 3],
    [2, 0, 3, 1, 4],
  ],
});

// ---------------------------------------------------------------------------
// E. Nothing changes
//
// Found by exhaustive search: preferences genuinely conflict, three
// displacements happen, and yet there is exactly one stable arrangement, so
// flipping the sides gives an identical result. Neither side sweeps its first
// choices, so the outcome does not read as a win for anybody.
//
// This is the honest caveat. The asymmetry is real but it is not universal.
// ---------------------------------------------------------------------------

const nothingChanges = buildInstance({
  id: 'nothing-changes',
  title: 'The time it makes no difference',
  teaches: 'Asking first is only an advantage when more than one stable arrangement exists.',
  studentIds: ['priya', 'sam', 'ravi', 'maya'],
  schoolIds: ['mit', 'umass', 'nyu', 'berkeley'],
  studentPrefs: [
    [0, 3, 2, 1],
    [2, 3, 0, 1],
    [2, 3, 0, 1],
    [0, 3, 1, 2],
  ],
  schoolPrefs: [
    [3, 2, 1, 0],
    [0, 3, 1, 2],
    [0, 3, 1, 2],
    [3, 1, 2, 0],
  ],
});

// ---------------------------------------------------------------------------
// F. The big one
//
// Twelve a side, generated at random and then chosen for being TYPICAL rather
// than dramatic: its numbers sit within a rounding error of the average over
// two thousand random instances of this size. Picking the most lopsided seed
// would have made a better demo and a worse lesson.
//
// Students asking: five of twelve get their first choice, average rank 2.5.
// Schools asking: three of twelve students get their first choice, average 4.2.
// ---------------------------------------------------------------------------

const bigOne = buildInstance({
  id: 'big-one',
  title: 'Twelve and twelve',
  teaches: 'How large the gap gets once the market is big enough for the pattern to show.',
  studentIds: [
    'priya',
    'sam',
    'ravi',
    'maya',
    'diego',
    'lena',
    'omar',
    'tessa',
    'jonah',
    'aisha',
    'nico',
    'farah',
  ],
  schoolIds: [
    'mit',
    'umass',
    'nyu',
    'berkeley',
    'michigan',
    'gatech',
    'utaustin',
    'northeastern',
    'washington',
    'illinois',
    'oregon',
    'cmu',
  ],
  studentPrefs: [
    [11, 1, 7, 6, 10, 0, 5, 4, 9, 2, 8, 3],
    [9, 5, 2, 10, 7, 6, 4, 0, 8, 3, 11, 1],
    [4, 10, 11, 1, 6, 3, 8, 2, 0, 7, 5, 9],
    [4, 8, 6, 9, 5, 1, 3, 0, 2, 10, 7, 11],
    [1, 10, 3, 0, 2, 5, 8, 7, 6, 11, 9, 4],
    [3, 9, 1, 4, 7, 6, 2, 5, 10, 0, 11, 8],
    [0, 9, 10, 11, 6, 7, 5, 1, 3, 8, 4, 2],
    [2, 8, 6, 3, 11, 0, 5, 1, 7, 10, 4, 9],
    [5, 10, 9, 2, 0, 6, 7, 3, 11, 8, 1, 4],
    [3, 7, 9, 8, 4, 0, 2, 1, 5, 11, 10, 6],
    [8, 6, 1, 0, 4, 7, 3, 11, 5, 9, 2, 10],
    [10, 5, 4, 8, 11, 6, 9, 1, 7, 3, 2, 0],
  ],
  schoolPrefs: [
    [3, 8, 9, 10, 4, 7, 0, 6, 5, 11, 2, 1],
    [2, 5, 8, 7, 0, 1, 9, 10, 6, 11, 4, 3],
    [11, 4, 7, 0, 1, 9, 3, 2, 5, 10, 6, 8],
    [7, 9, 2, 4, 5, 8, 10, 3, 11, 1, 6, 0],
    [7, 4, 8, 3, 0, 11, 1, 9, 5, 2, 6, 10],
    [0, 5, 6, 11, 8, 9, 3, 1, 4, 2, 10, 7],
    [7, 6, 0, 3, 5, 10, 9, 11, 2, 8, 4, 1],
    [5, 6, 11, 1, 8, 0, 7, 3, 10, 4, 2, 9],
    [2, 0, 3, 11, 4, 5, 9, 1, 6, 8, 10, 7],
    [6, 9, 0, 7, 11, 1, 10, 5, 3, 4, 8, 2],
    [10, 8, 1, 11, 7, 9, 2, 5, 0, 4, 3, 6],
    [11, 5, 0, 1, 3, 10, 9, 8, 7, 4, 6, 2],
  ],
});

export const PRESETS: readonly Instance[] = [
  opener,
  headOn,
  everyoneAgrees,
  cascade,
  nothingChanges,
  bigOne,
];

export const DEFAULT_PRESET_ID = opener.id;

export function presetById(id: string): Instance {
  const found = PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown preset id: ${id}`);
  return found;
}
