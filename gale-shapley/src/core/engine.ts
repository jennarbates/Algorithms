import type { Instance, Matching, SchoolId, Side, StudentId } from './types';

/**
 * The Gale-Shapley process, as a pure state machine.
 *
 * Two design choices drive everything in this file.
 *
 * 1. `step` is pure: `(state) => state`, never mutating. That makes stepping
 *    backwards, replaying, and running to completion inside a test all trivial,
 *    and it is what lets the UI render straight from state.
 *
 * 2. The internals are side-agnostic. Rather than writing the process twice,
 *    once for students asking and once for schools asking, the instance is
 *    normalised into "askers" and "receivers" and the process is written once.
 *    `matchingOf` converts back to student-to-school orientation so the two
 *    directions can be compared.
 */

// ---------------------------------------------------------------------------
// Normalised parties
// ---------------------------------------------------------------------------

export interface Party {
  readonly id: string;
  readonly name: string;
  /** Ids of the other side, most wanted first. */
  readonly prefs: readonly string[];
  /** Position of each other-side id in `prefs`. 0 is most wanted. */
  readonly rankOf: Readonly<Record<string, number>>;
}

export interface Roster {
  readonly askingSide: Side;
  readonly askers: readonly Party[];
  readonly receivers: readonly Party[];
}

function toParty(id: string, name: string, prefs: readonly string[]): Party {
  const rankOf: Record<string, number> = {};
  prefs.forEach((otherId, index) => {
    rankOf[otherId] = index;
  });
  return { id, name, prefs, rankOf };
}

export function createRoster(instance: Instance, askingSide: Side): Roster {
  const students = instance.students.map((s) => toParty(s.id, s.name, s.prefs));
  const schools = instance.schools.map((c) => toParty(c.id, c.name, c.prefs));
  return askingSide === 'students'
    ? { askingSide, askers: students, receivers: schools }
    : { askingSide, askers: schools, receivers: students };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface AskerState {
  readonly id: string;
  /** Index into their preference list: who they ask next. */
  readonly cursor: number;
  /** The receiver holding them, or null while they are still looking. */
  readonly heldBy: string | null;
}

export interface ReceiverState {
  readonly id: string;
  /** Who they are holding as a maybe, or null if nobody has asked yet. */
  readonly holding: string | null;
  /**
   * Everyone who has ever asked, in arrival order.
   *
   * The algorithm does not need this. It is kept because it is the clearest
   * possible evidence for why a receiver can never do worse over time: their
   * hold is always the best of a set that only grows.
   */
  readonly seen: readonly string[];
}

/**
 * `ask` means a proposal is about to be made and nothing has been decided.
 * `resolve` means a proposal is on the table and its outcome is the next step.
 * Splitting them gives a person a beat to predict the answer before seeing it.
 */
export type Phase = 'ask' | 'resolve' | 'done';

export type StepEvent =
  | {
      readonly kind: 'ask';
      readonly step: number;
      readonly asker: string;
      readonly receiver: string;
    }
  | {
      readonly kind: 'accepted-empty';
      readonly step: number;
      readonly asker: string;
      readonly receiver: string;
    }
  | {
      readonly kind: 'displaced';
      readonly step: number;
      readonly asker: string;
      readonly receiver: string;
      /** The asker who was being held and is now looking again. */
      readonly displaced: string;
    }
  | {
      readonly kind: 'turned-away';
      readonly step: number;
      readonly asker: string;
      readonly receiver: string;
      /** The asker the receiver is keeping instead. */
      readonly keeping: string;
    }
  | { readonly kind: 'settled'; readonly step: number };

export interface EngineState {
  readonly roster: Roster;
  readonly askers: Readonly<Record<string, AskerState>>;
  readonly receivers: Readonly<Record<string, ReceiverState>>;
  readonly phase: Phase;
  readonly pending: { readonly asker: string; readonly receiver: string } | null;
  readonly log: readonly StepEvent[];
  /** Number of `step` calls applied so far. Two per proposal. */
  readonly stepCount: number;
}

// ---------------------------------------------------------------------------
// Lookup helpers
//
// `noUncheckedIndexedAccess` is on, so every lookup is checked. These throw
// rather than returning undefined: a missing party is a programming error, not
// a state the UI should try to render around.
// ---------------------------------------------------------------------------

function partyById(parties: readonly Party[], id: string): Party {
  const found = parties.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown party id: ${id}`);
  return found;
}

function askerState(state: EngineState, id: string): AskerState {
  const found = state.askers[id];
  if (!found) throw new Error(`Unknown asker id: ${id}`);
  return found;
}

function receiverState(state: EngineState, id: string): ReceiverState {
  const found = state.receivers[id];
  if (!found) throw new Error(`Unknown receiver id: ${id}`);
  return found;
}

function rankOf(party: Party, otherId: string): number {
  const rank = party.rankOf[otherId];
  if (rank === undefined) {
    throw new Error(`${party.id} has no ranking for ${otherId}; preferences must be complete`);
  }
  return rank;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createEngine(instance: Instance, askingSide: Side): EngineState {
  const roster = createRoster(instance, askingSide);

  const askers: Record<string, AskerState> = {};
  for (const a of roster.askers) {
    askers[a.id] = { id: a.id, cursor: 0, heldBy: null };
  }

  const receivers: Record<string, ReceiverState> = {};
  for (const r of roster.receivers) {
    receivers[r.id] = { id: r.id, holding: null, seen: [] };
  }

  return {
    roster,
    askers,
    receivers,
    phase: 'ask',
    pending: null,
    log: [],
    stepCount: 0,
  };
}

// ---------------------------------------------------------------------------
// The process
// ---------------------------------------------------------------------------

/**
 * The next asker who is still looking and still has someone left to ask.
 *
 * Lowest index first, so runs are reproducible. The choice does not affect the
 * final result: Gale-Shapley reaches the same arrangement whatever order free
 * askers are served in. That independence is worth demonstrating in the UI, and
 * it is asserted in the test suite.
 */
export function nextFreeAsker(state: EngineState): Party | null {
  for (const party of state.roster.askers) {
    const asker = askerState(state, party.id);
    if (asker.heldBy === null && asker.cursor < party.prefs.length) return party;
  }
  return null;
}

export function step(state: EngineState): EngineState {
  if (state.phase === 'done') return state;
  return state.phase === 'ask' ? beginAsk(state) : resolveAsk(state);
}

function beginAsk(state: EngineState): EngineState {
  const asker = nextFreeAsker(state);
  const stepCount = state.stepCount + 1;

  if (!asker) {
    return {
      ...state,
      phase: 'done',
      pending: null,
      log: [...state.log, { kind: 'settled', step: stepCount }],
      stepCount,
    };
  }

  const cursor = askerState(state, asker.id).cursor;
  const receiverId = asker.prefs[cursor];
  if (receiverId === undefined) {
    throw new Error(`${asker.id} was selected to ask but has nobody left to ask`);
  }

  return {
    ...state,
    phase: 'resolve',
    pending: { asker: asker.id, receiver: receiverId },
    log: [...state.log, { kind: 'ask', step: stepCount, asker: asker.id, receiver: receiverId }],
    stepCount,
  };
}

function resolveAsk(state: EngineState): EngineState {
  const pending = state.pending;
  if (!pending) throw new Error('resolve phase reached with no pending proposal');

  const { asker: askerId, receiver: receiverId } = pending;
  const receiverParty = partyById(state.roster.receivers, receiverId);
  const receiver = receiverState(state, receiverId);
  const asker = askerState(state, askerId);
  const stepCount = state.stepCount + 1;

  /** The asker crosses this receiver off whatever the answer is. */
  const advanced: AskerState = { ...asker, cursor: asker.cursor + 1 };
  const seen = [...receiver.seen, askerId];

  // Nobody is being held, so the answer is a maybe.
  if (receiver.holding === null) {
    return {
      ...state,
      askers: { ...state.askers, [askerId]: { ...advanced, heldBy: receiverId } },
      receivers: { ...state.receivers, [receiverId]: { ...receiver, holding: askerId, seen } },
      phase: 'ask',
      pending: null,
      log: [
        ...state.log,
        { kind: 'accepted-empty', step: stepCount, asker: askerId, receiver: receiverId },
      ],
      stepCount,
    };
  }

  const current = receiver.holding;
  const prefersNewcomer = rankOf(receiverParty, askerId) < rankOf(receiverParty, current);

  // The newcomer is better, so the current hold goes back to looking.
  if (prefersNewcomer) {
    const displaced = askerState(state, current);
    return {
      ...state,
      askers: {
        ...state.askers,
        [askerId]: { ...advanced, heldBy: receiverId },
        [current]: { ...displaced, heldBy: null },
      },
      receivers: { ...state.receivers, [receiverId]: { ...receiver, holding: askerId, seen } },
      phase: 'ask',
      pending: null,
      log: [
        ...state.log,
        {
          kind: 'displaced',
          step: stepCount,
          asker: askerId,
          receiver: receiverId,
          displaced: current,
        },
      ],
      stepCount,
    };
  }

  // The current hold is better, so the newcomer is turned away.
  return {
    ...state,
    askers: { ...state.askers, [askerId]: { ...advanced, heldBy: null } },
    receivers: { ...state.receivers, [receiverId]: { ...receiver, seen } },
    phase: 'ask',
    pending: null,
    log: [
      ...state.log,
      {
        kind: 'turned-away',
        step: stepCount,
        asker: askerId,
        receiver: receiverId,
        keeping: current,
      },
    ],
    stepCount,
  };
}

/**
 * Runs to completion. The step cap is a guard against an engine bug turning
 * into a hung browser tab, not a real limit: the process cannot exceed one
 * proposal per (asker, receiver) pair, so 2 * n * n + 2 steps is generous.
 */
export function runToCompletion(initial: EngineState): EngineState {
  const n = initial.roster.askers.length;
  const cap = 2 * n * n + 2;

  let state = initial;
  for (let i = 0; i < cap && state.phase !== 'done'; i += 1) {
    state = step(state);
  }

  if (state.phase !== 'done') {
    throw new Error(`Process did not settle within ${cap} steps; the engine has a bug`);
  }
  return state;
}

export function run(instance: Instance, askingSide: Side): EngineState {
  return runToCompletion(createEngine(instance, askingSide));
}

// ---------------------------------------------------------------------------
// Reading results
// ---------------------------------------------------------------------------

/**
 * The current arrangement, always oriented student to school regardless of
 * which side was asking, so that the two directions can be compared directly.
 */
export function matchingOf(state: EngineState): Matching {
  const matching: Record<StudentId, SchoolId | null> = {};

  if (state.roster.askingSide === 'students') {
    for (const student of state.roster.askers) {
      matching[student.id] = askerState(state, student.id).heldBy;
    }
  } else {
    for (const student of state.roster.receivers) {
      matching[student.id] = receiverState(state, student.id).holding;
    }
  }

  return matching;
}

/** How far down their own list a party ended up. 0 is their first choice. */
export function rankAchieved(
  instance: Instance,
  matching: Matching,
  side: Side,
  id: string,
): number | null {
  if (side === 'students') {
    const student = instance.students.find((s) => s.id === id);
    if (!student) throw new Error(`Unknown student id: ${id}`);
    const school = matching[id];
    if (school == null) return null;
    const rank = student.prefs.indexOf(school);
    return rank === -1 ? null : rank;
  }

  const school = instance.schools.find((c) => c.id === id);
  if (!school) throw new Error(`Unknown school id: ${id}`);
  const student = Object.keys(matching).find((studentId) => matching[studentId] === id);
  if (student === undefined) return null;
  const rank = school.prefs.indexOf(student);
  return rank === -1 ? null : rank;
}
