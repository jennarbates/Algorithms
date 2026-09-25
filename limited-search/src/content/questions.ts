import {
  andList,
  evaluate,
  explain,
  firstBoardList,
  halving,
  run,
  scan,
  stride,
} from '../core/boards.ts';

/**
 * The practice questions, in three tiers.
 *
 * The same rules as `../bounds` and `../graphs`: every number is computed here
 * from the engine when the file loads, never typed in, and the written claims
 * about particular lists are recomputed in `tests/questions.test.ts`.
 *
 * One rule of its own. These questions are about particular lists at a
 * particular n: what they cost, where they cost it, which edit helps. None of
 * them asks for, or gives away, a general two-board strategy or how its cost
 * grows with n. That is the problem the page leaves to the reader.
 */

export type Tier = 1 | 2 | 3;

export interface Option {
  readonly t: string;
  readonly ok?: true;
  readonly why: string;
}

interface Common {
  readonly id: string;
  readonly tier: Tier;
  readonly tests: string;
  readonly prompt: string;
  /** Monospaced block under the prompt: a list, or a claim. */
  readonly quote?: string;
  readonly close: string;
}

export interface ChoiceQuestion extends Common {
  readonly kind: 'choice';
  readonly options: readonly Option[];
}

export interface MultiQuestion extends Common {
  readonly kind: 'multi';
  readonly options: readonly Option[];
}

export interface NumberQuestion extends Common {
  readonly kind: 'number';
  readonly unit: string;
  readonly answer: number;
  readonly why: string;
  readonly near: readonly { readonly v: number; readonly why: string }[];
}

export type Question = ChoiceQuestion | MultiQuestion | NumberQuestion;

export const TIERS: readonly Tier[] = [1, 2, 3];

export const TIER_LABELS: Readonly<Record<Tier, string>> = {
  1: 'One board, and plenty',
  2: 'A list, checked',
  3: 'Changing a list',
};

/** The worst case of a first-board list at n, from the engine. */
export const worstOf = (list: readonly number[], n: number) =>
  evaluate(firstBoardList(list), n).worst;
export const worstAtOf = (list: readonly number[], n: number) =>
  evaluate(firstBoardList(list), n).worstAt;

const oneBoard20 = evaluate(scan(), 20);
const halving100 = evaluate(halving(), 100);
const halvingTwo = run(halving(2), 100, 0);
const halvingTwoLeft = (() => {
  const o = halvingTwo.outcome;
  return o.kind === 'stranded' ? o.hi - o.lo + 1 : -1;
})();
const skipFail = evaluate(stride(2), 20).failure;

const L30 = [8, 16, 24] as const;
const w30 = worstOf(L30, 30);
const at30 = worstAtOf(L30, 30);
const per30 = evaluate(firstBoardList(L30), 30).perStrength;
const L50 = [20, 40] as const;
const w50 = worstOf(L50, 50);
const FIVES = [5, 10, 15, 20, 25] as const;
const wFives = worstOf(FIVES, 30);
const atFives = worstAtOf(FIVES, 30);

const show = (l: readonly number[]) => l.join(', ');
const cost = (l: readonly number[], n: number) => `worst case ${worstOf(l, n)}`;

export const QUESTIONS: readonly Question[] = [
  // --- Tier 1: one board, and plenty ------------------------------------------------
  {
    id: 'one-board-20',
    tier: 1,
    kind: 'number',
    tests: 'the one-board worst case',
    prompt:
      'One board, n = 20 weights. You test 1, 2, 3, … on it until it breaks or the weights run out. In the worst case, how many tests is that?',
    unit: 'tests:',
    answer: oneBoard20.worst,
    why: `Strengths ${andList(oneBoard20.worstAt)} both need every weight tried: ${oneBoard20.worstAt[0]} breaks at 20 on the last test, and 20 holds all of them.`,
    near: [
      {
        v: 21,
        why: 'There is no weight 21 to try. Once 20 holds, the strength is 20 and you are done.',
      },
      {
        v: 19,
        why: 'Strength 19 is not settled until 20 is tried: 19 holding only says the strength is 19 or more.',
      },
    ],
    close:
      'With one board the worst case is n tests, all of them. Nothing cleverer is allowed, which the next question is about.',
  },
  {
    id: 'skip-one-board',
    tier: 1,
    kind: 'choice',
    tests: 'why a single board cannot skip',
    prompt:
      'With one board and n = 20, a friend tries every other weight: 2, 4, 6, … What goes wrong?',
    options: [
      {
        t: 'Nothing: it finds the strength in about half the tests',
        why: `The page runs it against every strength and it fails. ${skipFail ? `At strength ${skipFail.s}: ${skipFail.why}` : ''}`,
      },
      {
        t: 'When the board breaks at an even weight, the odd weight just below it is never tried, and there is no board left to try it',
        ok: true,
        why: `${skipFail ? `At strength ${skipFail.s}: ${skipFail.why}` : ''} The same happens between every pair of tests.`,
      },
      {
        t: 'It uses more tests than going one at a time',
        why: 'When it works it uses fewer. The trouble is that it does not always work.',
      },
    ],
    close:
      'The last board can only be put under a weight when the one below it is known to hold. That is the whole reason one board costs n.',
  },
  {
    id: 'halving-100',
    tier: 1,
    kind: 'number',
    tests: 'halving with as many boards as you like',
    prompt:
      'Now as many boards as you like, n = 100. Each test goes in the middle of the strengths still possible. At worst, how many tests?',
    unit: 'tests:',
    answer: halving100.worst,
    why: `There are 101 possible strengths, 0 to 100. Each test at least halves them (rounding up), and 2⁶ = 64 < 101 ≤ 128 = 2⁷.`,
    near: [
      {
        v: 6,
        why: 'Six halvings leave up to 2 of the 101 strengths standing. It takes one more.',
      },
      {
        v: 100,
        why: 'That is one board. With spare boards you can afford to guess high.',
      },
      {
        v: 50,
        why: 'Halving does not throw away one weight per test, it throws away half of what is left.',
      },
    ],
    close:
      'Plenty of boards: about log₂ n tests. One board: n. Two boards sit somewhere between, and where is the question the page leaves you.',
  },
  {
    id: 'halving-two',
    tier: 1,
    kind: 'number',
    tests: 'why halving needs spare boards',
    prompt:
      'Halving with only two boards, n = 100, and a board that is actually quite weak. The first test is at 50 and it breaks; the second is at 25 and it breaks. How many strengths are still possible?',
    unit: 'strengths:',
    answer: halvingTwoLeft,
    why: `${explain(halvingTwo)} That is 0 to 24, 25 values, with nothing left to test them on.`,
    near: [
      {
        v: 24,
        why: 'Count 0 as well: a board that breaks under one pound has strength 0.',
      },
      {
        v: 0,
        why: 'Nothing is known below 25 except that the board breaks at 25.',
      },
    ],
    close:
      'Halving breaks boards whenever the middle is too heavy. With two, a strategy has to decide when it can afford to break one.',
  },
  {
    id: 'one-board-where',
    tier: 1,
    kind: 'choice',
    tests: 'the conventions: strengths 0 to n',
    prompt: 'One board, n = 20, testing 1, 2, 3, … Which strength needs only one test?',
    options: [
      {
        t: 'Strength 1',
        why: 'Weight 1 holds, which says the strength is 1 or more. Weight 2 has to be tried too.',
      },
      {
        t: 'Strength 20',
        why: 'That one needs every test: all 20 weights hold.',
      },
      {
        t: 'Strength 0',
        ok: true,
        why: `It breaks under weight 1, so the strength is 0: ${oneBoard20.perStrength[0] ?? '?'} test.`,
      },
    ],
    close:
      'Strengths run from 0 (breaks under one pound) to n (never breaks here): n + 1 possibilities. Every count on the page uses this.',
  },

  // --- Tier 2: a list, checked -------------------------------------------------------
  {
    id: 'list-30',
    tier: 2,
    kind: 'number',
    tests: 'the worst case of a given list',
    prompt: `Two boards, n = 30. The first board is tested at ${show(L30)}. When it breaks, the second board goes up one at a time from the last weight that held. If it never breaks, the first board carries on one at a time after 24. What is the worst case?`,
    unit: 'tests:',
    answer: w30,
    why: `Breaking at 24 costs 3 first-board tests, then 17 to 23 on the second board, one at a time: ${w30}. Strengths ${andList(at30)} both need all of it.`,
    near: [
      {
        v: 8,
        why: 'That is breaking at 8: one test, then 1 to 7. Later breaks cost more, because the first board has already been used more.',
      },
      {
        v: 9,
        why: 'That is breaking at 16, or holding through 24 and going on to 30. Breaking at 24 is worse.',
      },
      {
        v: 30,
        why: 'That is one board. The list lets the first board skip.',
      },
    ],
    close:
      'A break at any listed weight costs the tests before it, plus the gap below it walked one at a time. Add those up for each gap and take the biggest.',
  },
  {
    id: 'list-30-where',
    tier: 2,
    kind: 'choice',
    tests: 'where the worst case sits',
    prompt: `Same list, ${show(L30)}, n = 30. Which strengths need the most tests?`,
    options: [
      {
        t: '6 and 7, in the first gap',
        why: `They need ${per30[7] ?? '?'} tests: 8 breaks first time, so only one first-board test is spent.`,
      },
      {
        t: '29 and 30, at the top',
        why: `They need ${per30[30] ?? '?'}: three first-board tests, then 25 to 30 is only six weights.`,
      },
      {
        t: `${andList(at30)}, in the gap below 24`,
        ok: true,
        why: `Three first-board tests, then 17 to 23 one at a time: ${w30}.`,
      },
      {
        t: 'Every strength needs the same number',
        why: `Strength 0 needs ${per30[0] ?? '?'} tests (8 breaks, then 1 breaks). The counts vary a lot.`,
      },
    ],
    close:
      'The chart under the number line on the "Two boards" chapter shows this for any list: one bar per strength.',
  },
  {
    id: 'list-50',
    tier: 2,
    kind: 'number',
    tests: 'the worst case of a given list',
    prompt: `Two boards, n = 50, the first board tested at ${show(L50)}. What is the worst case?`,
    unit: 'tests:',
    answer: w50,
    why: `Breaking at 40 costs 2 first-board tests, then 21 to 39, nineteen weights: ${w50}.`,
    near: [
      {
        v: 20,
        why: 'That is breaking at 20. Breaking at 40 has the same size gap below it and one more test before it.',
      },
      {
        v: 12,
        why: 'That is holding through 40 and scanning 41 to 50. It is the cheapest part here.',
      },
    ],
    close: `One board would need 50. This list needs ${w50}: better, but look at how uneven the parts are.`,
  },
  {
    id: 'list-fives',
    tier: 2,
    kind: 'number',
    tests: 'the part after the list',
    prompt: `Two boards, n = 30, the first board tested at ${show(FIVES)}. What is the worst case?`,
    unit: 'tests:',
    answer: wFives,
    why: `Holding through 25 costs 5 tests, then 26 to 30 one at a time: ${wFives}, at strengths ${andList(atFives)}.`,
    near: [
      {
        v: 9,
        why: 'That is breaking at 25: five tests, then 21 to 24. The weights after 25 are a gap too.',
      },
      {
        v: 5,
        why: 'Every gap below a break still has to be walked on the second board.',
      },
    ],
    close:
      'The stretch after the last listed weight counts, and the first board is still paying for every test it made before reaching it.',
  },

  // --- Tier 3: changing a list -------------------------------------------------------
  {
    id: 'which-lowers-30',
    tier: 3,
    kind: 'choice',
    tests: 'which edit lowers the worst case',
    prompt: `n = 30, first board at ${show(L30)}: ${cost(L30, 30)}. Which of these lowers it?`,
    options: [
      {
        t: `Add 28 at the end: ${show([8, 16, 24, 28])}`,
        why: `Still ${worstOf([8, 16, 24, 28], 30)}: the worst part was the gap below 24, and nothing changed there.`,
      },
      {
        t: `Add 4 at the front: ${show([4, 8, 16, 24])}`,
        why: `That makes it ${worstOf([4, 8, 16, 24], 30)}: every later break now costs one more first-board test.`,
      },
      {
        t: `Move 24 down to 23: ${show([8, 16, 23])}`,
        why: `Still ${worstOf([8, 16, 23], 30)}: the gap below 23 shrank, but now 24 to 30 is seven weights after three tests.`,
      },
      {
        t: `Use ${show([9, 17, 24])}`,
        ok: true,
        why: `Worst case ${worstOf([9, 17, 24], 30)}. Work out what a break at each of the three costs, and holding through all three, and compare.`,
      },
    ],
    close:
      'Moving one test changes two parts at once: the gap below it and the gap above it. Try your own edits on the "Two boards" chapter.',
  },
  {
    id: 'which-lower-50',
    tier: 3,
    kind: 'multi',
    tests: 'comparing lists',
    prompt: `n = 50, first board at ${show(L50)}: ${cost(L50, 50)}. Tick every list with a lower worst case.`,
    options: [
      {
        t: show([10, 20, 30, 40]),
        ok: true,
        why: `${cost([10, 20, 30, 40], 50)}: four first-board tests and 41 to 50 after them.`,
      },
      {
        t: show([25]),
        why: `${cost([25], 50)}: one test, but 26 to 50 after it.`,
      },
      {
        t: show([15, 30, 45]),
        ok: true,
        why: `${cost([15, 30, 45], 50)}: a break at 45 costs three tests and 31 to 44.`,
      },
      {
        t: show([20, 40, 45]),
        why: `${cost([20, 40, 45], 50)}: the expensive part, breaking at 40, is untouched.`,
      },
      {
        t: show([20, 35, 45]),
        ok: true,
        why: `${cost([20, 35, 45], 50)}: breaking at 20 is now the worst part.`,
      },
      {
        t: show([10, 40]),
        why: `${cost([10, 40], 50)}: breaking at 40 now leaves 11 to 39.`,
      },
    ],
    close: 'Every one of these was worked out by running the list against all 51 strengths.',
  },
  {
    id: 'add-front',
    tier: 3,
    kind: 'choice',
    tests: 'more tests are not always better',
    prompt: `n = 30. Someone adds 4 to the front of ${show(L30)}, making ${show([4, ...L30])}. What happens to the worst case of ${w30}?`,
    options: [
      {
        t: `It falls to ${w30 - 1}`,
        why: 'Only breaks at 4 and 8 got cheaper, and they were not the worst.',
      },
      {
        t: `It rises to ${worstOf([4, 8, 16, 24], 30)}`,
        ok: true,
        why: 'The gap below 24 is just as long, and the first board now makes four tests before it gets there.',
      },
      {
        t: `It stays at ${w30}`,
        why: 'The extra test is paid for by every break after it.',
      },
    ],
    close:
      'An extra first-board test is paid for by every strength above it, whether or not it helps them.',
  },
];

export const questionsIn = (tier: Tier): Question[] => QUESTIONS.filter((q) => q.tier === tier);
