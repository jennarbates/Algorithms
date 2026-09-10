import type { Side } from '../core/types';

/**
 * The words in the "Why this works" section.
 *
 * Every claim has two layers. The plain layer is what the page shows by
 * default, in the page's own vocabulary, and the vocabulary test in
 * `tests/proofs.test.ts` walks it the same way `tests/narration.test.ts` walks
 * the log. The formal layer sits behind a toggle, and it is allowed the
 * textbook words on one condition: each one is introduced by naming the plain
 * phrase it replaces. That is the same rule every expander on the page follows.
 *
 * Keeping the two layers in one file, side by side, is deliberate. It makes it
 * hard to edit one and forget the other, and it makes the test's job simple:
 * check `plain`, leave `formal` alone.
 *
 * The plain sketches are written for whichever side is asking, because a
 * sketch that says "student" while the schools are the ones walking down their
 * lists is wrong, not merely awkward. The formal layer says proposer and
 * receiver, which is the one place those words earn their keep.
 *
 * The bodies of the claims, the part that scrubs the board, are not here. They
 * are built from the run itself, per claim, in their own components.
 */

export type ClaimId = 'finishes' | 'nobody-left-out' | 'holds';

/** One textbook term and the plain phrase the page uses for it. */
export interface Term {
  readonly term: string;
  readonly replaces: string;
}

/**
 * The nouns and pronouns for each role in a run, so a sketch can be written
 * once and read correctly in both directions. A student is "they", a school
 * is "it", and the verb forms follow.
 */
export interface Roles {
  readonly asker: string;
  readonly askers: string;
  readonly asked: string;
  readonly askeds: string;
  /** "they" or "it", for one asker. */
  readonly they: string;
  /** "their" or "its", for one asker. */
  readonly their: string;
  /** "they are" or "it is", for one asker. */
  readonly theyAre: string;
  /** "they are" or "it is", for one of the asked. */
  readonly itIsA: string;
  /** "they like" or "it likes", for one of the asked. */
  readonly itLikesA: string;
  /** "they liked" or "it liked", for one of the asked. */
  readonly itLikedA: string;
  /** "they never go" or "it never goes", for one of the asked. */
  readonly itNeverGoesA: string;
  /** "they have" or "it has", for one of the asked. */
  readonly itHasA: string;
}

const STUDENT_ASKS: Roles = {
  asker: 'student',
  askers: 'students',
  asked: 'school',
  askeds: 'schools',
  they: 'they',
  their: 'their',
  theyAre: 'they are',
  itIsA: 'it is',
  itLikesA: 'it likes',
  itLikedA: 'it liked',
  itNeverGoesA: 'it never goes',
  itHasA: 'it has',
};

const SCHOOL_ASKS: Roles = {
  asker: 'school',
  askers: 'schools',
  asked: 'student',
  askeds: 'students',
  they: 'it',
  their: 'its',
  theyAre: 'it is',
  itIsA: 'they are',
  itLikesA: 'they like',
  itLikedA: 'they liked',
  itNeverGoesA: 'they never go',
  itHasA: 'they have',
};

export function roles(side: Side): Roles {
  return side === 'students' ? STUDENT_ASKS : SCHOOL_ASKS;
}

export interface Claim {
  readonly id: ClaimId;
  /** A short handle for the expander's header, two or three words. */
  readonly title: string;
  readonly plain: {
    /** The claim, one sentence. */
    readonly claim: string;
    /** Why it holds in general, in the same words, for the side that is asking. */
    readonly sketch: (side: Side) => string;
  };
  readonly formal: {
    readonly claim: string;
    readonly sketch: string;
    /** The terms the formal wording uses, each with what it replaces. */
    readonly terms: readonly Term[];
  };
}

export const CLAIMS: readonly Claim[] = [
  {
    id: 'finishes',
    title: 'It finishes',
    plain: {
      claim:
        'Every question moves somebody one step down their own list, and a list only has so many names on it.',
      sketch: (side) => {
        const r = roles(side);
        return `Every ${r.asker} has a list with one name on it for every ${r.asked}. Each ask uses up one name, and nobody ever asks the same name twice. So with this many ${r.askers} and this many names on each list, there can only be so many asks in total, and after that there is nothing left to ask. It has to stop.`;
      },
    },
    formal: {
      claim: 'The algorithm terminates after at most n² proposals.',
      sketch:
        'Each proposer keeps a cursor into their own preference list. A proposal advances that cursor by one, and the cursor never moves back, so it is monotone. With n proposers and n names per list, at most n² proposals can be made before every cursor has reached the end, and the algorithm terminates.',
      terms: [
        { term: 'algorithm', replaces: 'the process' },
        { term: 'terminates', replaces: 'finishes' },
        { term: 'proposal', replaces: 'a question, an ask' },
        { term: 'proposer', replaces: 'whoever is doing the asking' },
        { term: 'monotone', replaces: 'only ever moves one way' },
        { term: 'n', replaces: 'how many people are on each side' },
      ],
    },
  },
  {
    id: 'nobody-left-out',
    title: 'Nobody is left out',
    plain: {
      claim:
        'Nobody ever runs out of list, because the only way to run out is to have asked everyone, and everyone who has been asked is holding somebody.',
      sketch: (side) => {
        const r = roles(side);
        return `Once a ${r.asked} has been asked by anyone, ${r.itIsA} holding somebody, and ${r.itNeverGoesA} back to holding nobody: the only thing that ever changes is a swap for somebody ${r.itLikesA} better. So if a ${r.asker} had asked every ${r.asked}, every ${r.asked} would be holding somebody. That is as many ${r.askers} held as there are ${r.askeds}, which is as many as there are ${r.askers}. This ${r.asker} would have to be one of them.`;
      },
    },
    formal: {
      claim: 'The resulting matching is perfect: every agent on both sides is matched.',
      sketch:
        'A receiver that has been proposed to is never again unmatched, because it only ever replaces its current partner with a preferred one. Suppose a proposer exhausted their list. Then every receiver has been proposed to, so every receiver is matched, which accounts for n proposers. The exhausted proposer is one of the n, a contradiction.',
      terms: [
        { term: 'matching', replaces: 'who ended up with whom' },
        { term: 'perfect', replaces: 'nobody is left out' },
        { term: 'agent', replaces: 'a student or a school' },
        { term: 'receiver', replaces: 'whoever is being asked' },
        { term: 'proposer', replaces: 'whoever is doing the asking' },
        { term: 'unmatched', replaces: 'holding nobody, or held by nobody' },
      ],
    },
  },
  {
    id: 'holds',
    title: 'It holds',
    plain: {
      claim: 'For any two who are not together, at least one of them is happy where they are.',
      sketch: (side) => {
        const r = roles(side);
        return `Take any ${r.asker} and any ${r.asked} that did not end up together, where the ${r.asker} would rather have that ${r.asked}. Then the ${r.asker} asked that ${r.asked} at some point, because ${r.they} walked down ${r.their} list past that name to get where ${r.theyAre}. From that first ask on, the ${r.asked} was holding somebody, and only ever swapped for somebody ${r.itLikedA} better. So whoever the ${r.asked} has at the end, ${r.itLikesA} them better than this ${r.asker}. The ${r.asked} does not want them back. It takes two, and there is only one.`;
      },
    },
    formal: {
      claim: 'The resulting matching is stable: it admits no blocking pair.',
      sketch:
        'Suppose proposer p and receiver r form a blocking pair, so p prefers r to their partner and r prefers p to its partner. Since p prefers r to their final partner, p proposed to r before reaching their partner. From that point r was matched, and the receiver-side invariant is that r only ever trades up its own preference list. So r ends with a partner it prefers to p, which contradicts r preferring p. No blocking pair exists.',
      terms: [
        { term: 'matching', replaces: 'who ended up with whom' },
        { term: 'stable', replaces: 'holds, cannot be broken' },
        { term: 'blocking pair', replaces: 'two people who would both rather have each other' },
        { term: 'proposer', replaces: 'whoever is doing the asking' },
        { term: 'receiver', replaces: 'whoever is being asked' },
        { term: 'invariant', replaces: 'something that stays true the whole way through' },
      ],
    },
  },
];

export function claimById(id: ClaimId): Claim {
  const found = CLAIMS.find((c) => c.id === id);
  if (!found) throw new Error(`No claim with id ${id}`);
  return found;
}

/** The section's own words: its heading, its intro, and the line shown before the run is over. */
export const SECTION = {
  title: 'Why this works',
  intro:
    'Three things are true of what you just watched, and each one can be checked against the run on this page rather than taken on trust.',
  notYet: 'Wait until everyone is settled. All three of these are about the finished board.',
  toggleOn: 'Say it the textbook way',
  toggleOff: 'Say it plainly',
  termsHeading: 'The words this swaps in',
} as const;

// ---------------------------------------------------------------------------
// Claim one: it finishes
// ---------------------------------------------------------------------------

/** The count above the grid. */
export function finishesTally(used: number, total: number, settled: boolean): string {
  const one = used === 1;
  if (settled) {
    const left = total - used;
    const tail =
      left === 0
        ? 'That was every question there was.'
        : `It stopped with ${left} ${left === 1 ? 'question' : 'questions'} never needed.`;
    return `${used} of ${total} possible ${one ? 'question' : 'questions'} asked. ${tail}`;
  }
  return `${used} of ${total} possible ${one ? 'question' : 'questions'} asked so far.`;
}

/** What the grid is, in one line, for the side that is asking. */
export function finishesLegend(side: Side): string {
  const r = roles(side);
  return `One row per ${r.asker}, one square for every ${r.asked} on their list. A square fills the moment that question is asked, and the same square never fills twice.`;
}

export const FINISHES = {
  /** A filled cell's tooltip. */
  cell: (asker: string, asked: string, step: number) =>
    `${asker} asked ${asked} at step ${step}. Click to look at that moment.`,
  /** A cell that fills later in the run than the moment being looked at. */
  cellAhead: (asker: string, asked: string, step: number) =>
    `${asker} asks ${asked} later, at step ${step}. Click to jump ahead to it.`,
  /** A cell that never fills. */
  cellNever: (asker: string, asked: string) => `${asker} never needed to ask ${asked}.`,
  /** Past about six on a side the grid gives way to the count alone. */
  tooBig: 'Too many people to draw every square here, so just the count.',
  gridLabel: 'Every question in the run, as a grid',
} as const;

// ---------------------------------------------------------------------------
// Claim two: nobody is left out
// ---------------------------------------------------------------------------

export const LEFT_OUT = {
  /** The picker's label. */
  pick: (side: Side) => `Pick a ${roles(side).asker}. The argument is about them.`,
  /** Before anyone is picked. */
  empty: (side: Side) => `Pick any ${roles(side).asker} and suppose they had run out of list.`,
  /** The supposition, with the picked asker's name and the size of the market. */
  suppose: (name: string, n: number, side: Side) => {
    const r = roles(side);
    return `Suppose ${name} had run out of list. That could only happen if ${name} had asked all ${n} ${r.askeds}. So look at what happens to a ${r.asked} once anybody asks:`;
  },
  /** Above the picked asker's own list. */
  listLabel: (name: string) => `${name}'s list, with everyone ${name} actually asked crossed off`,
  /** One beat per receiver. */
  askedByPicked: (asker: string, asked: string, question: number) =>
    `${asker} asked ${asked} (question ${question}).`,
  notAskedByPicked: (asker: string, asked: string) => `${asker} never needed to ask ${asked}.`,
  firstHeld: (asked: string, firstAsker: string, step: number, side: Side) => {
    const r = roles(side);
    return `${asked} was first asked at step ${step}, by ${firstAsker}, and ${r.itHasA} been holding somebody ever since.`;
  },
  endsWith: (asked: string, held: string) => `${asked} ends holding ${held}.`,
  neverAsked: (asked: string) => `Nobody has asked ${asked} yet.`,
  /** The button on each beat. */
  look: 'Look',
  /** The count at the end. */
  conclusion: (name: string, n: number, endedWith: string, side: Side) => {
    const r = roles(side);
    return `At the end, all ${n} ${r.askeds} are holding somebody. That is ${n} ${r.askers} held, and there are only ${n} ${r.askers}. ${name} has to be one of them. And so it is: ${name} ended up with ${endedWith}.`;
  },
} as const;

// ---------------------------------------------------------------------------
// Claim three: it holds
// ---------------------------------------------------------------------------

export const HOLDS = {
  pick: 'Pick a student and a school who did not end up together. These are the same pickers as in Try to break it above, and a pick there is a pick here.',
  empty: 'Pick one of each to replay what happened between them.',
  together: 'These two already have each other. Pick two who do not.',
  /** The asker likes where they ended up at least as much: nothing to replay. */
  askerContent: (asker: string, asked: string, endedWith: string, side: Side) => {
    const r = roles(side);
    return `${asker} ended up with ${endedWith}, and puts ${endedWith} above ${asked} on ${r.their} own list. So ${asker} does not want ${asked}. That is not a pair that could break anything: it takes two, and this one does not even have one.`;
  },
  /** Beat one: the ask had to happen. */
  beatOneTitle: (asker: string, asked: string) => `${asker} must have asked ${asked}.`,
  beatOne: (asker: string, asked: string, endedWith: string, question: number, step: number) =>
    `${asker} ended up with ${endedWith}, which is further down the list than ${asked}. To get there ${asker} walked past ${asked}, which means asking. Here is that moment: question ${question}, step ${step}. The red line on the board is the pairing that would have to form.`,
  /** Beat two: what the receiver did. */
  beatTwoTitle: (asked: string, asker: string) => `What ${asked} did with ${asker}.`,
  beatTwoHeld: (asked: string, asker: string) =>
    `${asked} held ${asker}. For the time being, as always.`,
  beatTwoTurnedAway: (asked: string, asker: string, keeping: string, side: Side) => {
    const r = roles(side);
    return `${asked} turned ${asker} away. ${asked} was already holding ${keeping}, and ${r.itLikesA} ${keeping} better.`;
  },
  /** Beat three: the receiver only trades up. */
  beatThreeTitle: (asked: string) => `${asked} only ever traded up from there.`,
  beatThree: (asked: string, asker: string, endedWith: string, side: Side) => {
    const r = roles(side);
    return `From that moment on ${asked} was holding somebody, and the only thing that ever changed was a swap for somebody ${r.itLikedA} better. ${asked} ends holding ${endedWith}, who is above ${asker} on ${asked}'s list. ${asked} does not want ${asker} back.`;
  },
  /** Above the receiver's list, drawn with the asker and the final hold marked. */
  listLabel: (asked: string) => `${asked}'s list at the end`,
  conclusion: (asker: string, asked: string) =>
    `${asker} would go. ${asked} would not have ${asker}. It takes two, and there is only one.`,
  look: 'Look',
  lookEnd: 'Look at the end',
} as const;

/**
 * Every string on the plain surface of the section, for one direction of the
 * run, flattened so the vocabulary test can walk them without knowing the
 * shape of this file. Sentences that take numbers or names are sampled.
 */
export function plainSurface(side: Side): readonly string[] {
  return [
    SECTION.title,
    SECTION.intro,
    SECTION.notYet,
    SECTION.toggleOn,
    SECTION.toggleOff,
    ...CLAIMS.flatMap((c) => [c.title, c.plain.claim, c.plain.sketch(side)]),
    finishesTally(1, 9, false),
    finishesTally(5, 9, false),
    finishesTally(9, 9, true),
    finishesTally(6, 9, true),
    finishesTally(8, 9, true),
    finishesLegend(side),
    FINISHES.cell('Priya', 'MIT', 3),
    FINISHES.cellAhead('Priya', 'MIT', 3),
    FINISHES.cellNever('Priya', 'MIT'),
    FINISHES.tooBig,
    FINISHES.gridLabel,
    LEFT_OUT.pick(side),
    LEFT_OUT.empty(side),
    LEFT_OUT.suppose('Priya', 3, side),
    LEFT_OUT.listLabel('Priya'),
    LEFT_OUT.askedByPicked('Priya', 'MIT', 1),
    LEFT_OUT.notAskedByPicked('Priya', 'MIT'),
    LEFT_OUT.firstHeld('MIT', 'Sam', 3, side),
    LEFT_OUT.endsWith('MIT', 'Sam'),
    LEFT_OUT.neverAsked('MIT'),
    LEFT_OUT.look,
    LEFT_OUT.conclusion('Priya', 3, 'NYU', side),
    HOLDS.pick,
    HOLDS.empty,
    HOLDS.together,
    HOLDS.askerContent('Priya', 'MIT', 'NYU', side),
    HOLDS.beatOneTitle('Priya', 'MIT'),
    HOLDS.beatOne('Priya', 'MIT', 'NYU', 1, 1),
    HOLDS.beatTwoTitle('MIT', 'Priya'),
    HOLDS.beatTwoHeld('MIT', 'Priya'),
    HOLDS.beatTwoTurnedAway('MIT', 'Priya', 'Sam', side),
    HOLDS.beatThreeTitle('MIT'),
    HOLDS.beatThree('MIT', 'Priya', 'Sam', side),
    HOLDS.listLabel('MIT'),
    HOLDS.conclusion('Priya', 'MIT'),
    HOLDS.look,
    HOLDS.lookEnd,
  ];
}
