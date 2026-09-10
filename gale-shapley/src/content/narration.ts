import type { EngineState, StepEvent } from '../core/engine';
import type { PairVerdict } from '../core/stability';
import type { Instance } from '../core/types';

/**
 * Turns an engine event into one plain sentence.
 *
 * This is where the vocabulary rule is enforced. Nothing here says "proposes",
 * "tentatively accepts", "rejects" or "terminates". It says asks, holds, lets
 * go, and settled. The formal words live behind expanders, and each expander
 * introduces its term by naming the plain phrase it replaces.
 *
 * The sentences come back as segments rather than strings so that a person's
 * token can be drawn inline, which is what lets the reader follow the story by
 * recognising faces instead of re-reading names.
 */

export type PartyKind = 'student' | 'school';

export type NarrationSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'party'; readonly id: string; readonly party: PartyKind };

export interface Narration {
  readonly segments: readonly NarrationSegment[];
  /** Drives the accent on the log entry. */
  readonly tone: 'neutral' | 'good' | 'bad' | 'final';
}

function text(value: string): NarrationSegment {
  return { kind: 'text', text: value };
}

/** Which side the asker is on, so tokens are drawn with the right component. */
export function askerKind(state: EngineState): PartyKind {
  return state.roster.askingSide === 'students' ? 'student' : 'school';
}

export function receiverKind(state: EngineState): PartyKind {
  return state.roster.askingSide === 'students' ? 'school' : 'student';
}

export function narrate(state: EngineState, event: StepEvent): Narration {
  const asker = askerKind(state);
  const receiver = receiverKind(state);

  const A = (id: string): NarrationSegment => ({ kind: 'party', id, party: asker });
  const R = (id: string): NarrationSegment => ({ kind: 'party', id, party: receiver });

  switch (event.kind) {
    case 'ask':
      return {
        tone: 'neutral',
        segments: [A(event.asker), text(' asks '), R(event.receiver), text('.')],
      };

    case 'accepted-empty':
      return {
        tone: 'good',
        segments: [
          R(event.receiver),
          text(' has nobody yet, so '),
          A(event.asker),
          text(' is in. For now.'),
        ],
      };

    case 'displaced':
      return {
        tone: 'bad',
        segments: [
          R(event.receiver),
          text(' was holding '),
          A(event.displaced),
          text(', but likes '),
          A(event.asker),
          text(' better. '),
          A(event.asker),
          text(' is in. '),
          A(event.displaced),
          text(' is back to looking.'),
        ],
      };

    case 'turned-away':
      return {
        tone: 'bad',
        segments: [
          R(event.receiver),
          text(' is holding '),
          A(event.keeping),
          text(', and likes '),
          A(event.keeping),
          text(' better. '),
          A(event.asker),
          text(' is turned away.'),
        ],
      };

    case 'settled':
      return {
        tone: 'final',
        segments: [text('Everyone is settled. Nothing here is a maybe any more.')],
      };
  }
}

/**
 * The same sentence as plain text, with names where the tokens would be.
 *
 * Used for the live region that announces each step to a screen reader, and by
 * the test that enforces the vocabulary rule.
 */
export function narrationText(instance: Instance, narration: Narration): string {
  return narration.segments
    .map((segment) => {
      if (segment.kind === 'text') return segment.text;
      const found =
        segment.party === 'student'
          ? instance.students.find((s) => s.id === segment.id)
          : instance.schools.find((c) => c.id === segment.id);
      return found?.name ?? segment.id;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// The challenge
// ---------------------------------------------------------------------------

/**
 * Two speech bubbles and a verdict, for any pair a reader picks.
 *
 * This is the page's centrepiece. Rather than announcing that the result holds,
 * the page dares the reader to break it, and every attempt comes back with one
 * side saying they are happy where they are.
 *
 * "It takes two" is the whole definition of the thing, in three words, with no
 * vocabulary to learn first. Everything else about the concept follows from it.
 */
export interface PairExplanation {
  readonly studentQuote: string;
  readonly studentDetail: readonly NarrationSegment[];
  readonly schoolQuote: string;
  readonly schoolDetail: readonly NarrationSegment[];
  readonly outcome: string;
  readonly blocks: boolean;
  readonly alreadyTogether: boolean;
}

export function explainPair(verdict: PairVerdict): PairExplanation {
  const S = (id: string): NarrationSegment => ({ kind: 'party', id, party: 'student' });
  const C = (id: string): NarrationSegment => ({ kind: 'party', id, party: 'school' });

  if (verdict.alreadyTogether) {
    return {
      studentQuote: '',
      studentDetail: [],
      schoolQuote: '',
      schoolDetail: [],
      outcome: 'These two already have each other. Pick two who do not.',
      blocks: false,
      alreadyTogether: true,
    };
  }

  const studentDetail: NarrationSegment[] =
    verdict.studentsSchool === null
      ? [S(verdict.student), text(' has nowhere yet, so anywhere is an improvement.')]
      : verdict.studentWouldSwitch
        ? [
            S(verdict.student),
            text(' is at '),
            C(verdict.studentsSchool),
            text(', and would rather have '),
            C(verdict.school),
            text('.'),
          ]
        : [
            S(verdict.student),
            text(' is at '),
            C(verdict.studentsSchool),
            text(', and puts it above '),
            C(verdict.school),
            text('.'),
          ];

  const schoolDetail: NarrationSegment[] =
    verdict.schoolsStudent === null
      ? [C(verdict.school), text(' has nobody yet, so anyone is an improvement.')]
      : verdict.schoolWouldSwitch
        ? [
            C(verdict.school),
            text(' has '),
            S(verdict.schoolsStudent),
            text(', and would rather have '),
            S(verdict.student),
            text('.'),
          ]
        : [
            C(verdict.school),
            text(' has '),
            S(verdict.schoolsStudent),
            text(', and puts them above '),
            S(verdict.student),
            text('.'),
          ];

  return {
    studentQuote: verdict.studentWouldSwitch ? 'I would go.' : 'I am happy where I am.',
    schoolQuote: verdict.schoolWouldSwitch
      ? 'We would take them.'
      : 'We are happy with who we have.',
    studentDetail,
    schoolDetail,
    outcome: verdict.blocks
      ? 'Both of them would move. This pairing can still come apart.'
      : 'Nothing happens. It takes two.',
    blocks: verdict.blocks,
    alreadyTogether: false,
  };
}

/** The framing above the challenge, which changes once the process is over. */
export function challengePrompt(state: EngineState): string {
  return state.phase === 'done'
    ? 'Now try to break it. Find two people who would BOTH rather have each other than what they ended up with.'
    : 'Test any pair while this is still running. Right now some of them really would come apart.';
}

/**
 * The prompt on the button, which doubles as the invitation to predict.
 *
 * Splitting a question from its answer across two clicks is the whole reason
 * this page teaches anything. The beat in between is where a reader works out
 * what they think happens, and finds out whether they were right.
 */
export function actionLabel(state: EngineState): string {
  switch (state.phase) {
    case 'ask':
      return state.stepCount === 0 ? 'Start' : 'Next question';
    case 'resolve':
      return 'What happens?';
    case 'done':
      return 'Everyone is settled';
  }
}

/** A one-line hint under the button, in the same register as the narration. */
export function actionHint(state: EngineState): string {
  switch (state.phase) {
    case 'ask':
      return state.stepCount === 0
        ? 'Nothing has happened yet.'
        : 'Still going. Nothing is final until everyone is settled.';
    case 'resolve':
      return 'Before you click: what do you think they say?';
    case 'done':
      return 'Every pairing below is final.';
  }
}

/**
 * The banner over the board.
 *
 * Believing a pairing is settled the moment it is made is the single most
 * common way people misread this process, so the page states the opposite in
 * plain words for the whole run and only changes its mind at the very end.
 */
export function boardStatus(state: EngineState): string {
  return state.phase === 'done'
    ? 'Everyone is settled. These pairings are final.'
    : 'Every pairing below is only a maybe. Any of them can still come apart.';
}

/**
 * The banner while the reader is looking at a past moment.
 *
 * It has to say two things at once: this is the past, and the present has not
 * gone anywhere. The count is how far back they are.
 */
export function pastStatus(viewed: EngineState, current: EngineState): string {
  const behind = current.stepCount - viewed.stepCount;
  const where =
    viewed.stepCount === 0
      ? 'the start, before anything happened'
      : `step ${viewed.stepCount} of ${current.stepCount}`;
  const back = behind === 1 ? 'one click back' : `${behind} clicks back`;
  return `You are looking at ${where}. That is ${back}. Nothing has changed since.`;
}
