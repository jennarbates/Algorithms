import type { Instance, Matching, SchoolId, Side, StudentId } from '../../src/core/types';

/**
 * YOUR IMPLEMENTATION GOES HERE.
 *
 * Do not open `src/core/engine.ts` until `npm run test:exercise` is green.
 *
 * The types below are given, because designing the state shape is not the
 * exercise. Everything that throws `notImplemented` is.
 *
 * The parameters start with a leading underscore only so that an untouched
 * skeleton typechecks. Drop the underscore as you start using each one.
 */

function notImplemented(what: string): never {
  throw new Error(`${what} is not implemented yet`);
}

// ---------------------------------------------------------------------------
// Given: the shapes you are working with
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
  /** Everyone who has ever asked, in arrival order. */
  readonly seen: readonly string[];
}

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
      readonly displaced: string;
    }
  | {
      readonly kind: 'turned-away';
      readonly step: number;
      readonly asker: string;
      readonly receiver: string;
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
  readonly stepCount: number;
}

// ---------------------------------------------------------------------------
// TODO 1
//
// Normalise an instance into askers and receivers, so the process can be
// written once rather than once per direction. Fill in `rankOf` for each party
// while you are here; it saves an indexOf on every comparison later.
// ---------------------------------------------------------------------------

export function createRoster(_instance: Instance, _askingSide: Side): Roster {
  return notImplemented('createRoster');
}

// ---------------------------------------------------------------------------
// TODO 2
//
// The starting state. Everyone is looking, nobody is held, the log is empty,
// and the first thing that will happen is an ask.
// ---------------------------------------------------------------------------

export function createEngine(_instance: Instance, _askingSide: Side): EngineState {
  return notImplemented('createEngine');
}

// ---------------------------------------------------------------------------
// TODO 3
//
// Who goes next: an asker who is still looking AND still has somebody left to
// ask. Return null when there is nobody, which is how the process knows it has
// finished.
//
// Serve them in a fixed order rather than an arbitrary one, so runs reproduce.
// The final answer does not depend on this choice, and one of the tests proves
// that by relabelling the parties and checking the result is unchanged.
// ---------------------------------------------------------------------------

export function nextFreeAsker(_state: EngineState): Party | null {
  return notImplemented('nextFreeAsker');
}

// ---------------------------------------------------------------------------
// TODO 4
//
// One half-move.
//
// From `ask`: pick the next free asker, work out who they ask, record it as
// pending, and move to `resolve`. If nobody is free, the process is `done`.
//
// From `resolve`: apply the pending proposal. Three outcomes, and the receiver
// records the asker in `seen` in all three:
//
//   - nobody is being held  -> hold the newcomer
//   - the newcomer is better -> hold them, and the previous hold goes back to
//                               looking with their cursor untouched
//   - the newcomer is worse   -> turn them away
//
// In every one of the three the asker moves one step down their own list. That
// is the detail people get wrong, and it is why the process finishes.
//
// Return a NEW state. Never mutate the one you were given: a test asserts that.
// ---------------------------------------------------------------------------

export function step(_state: EngineState): EngineState {
  return notImplemented('step');
}

// ---------------------------------------------------------------------------
// TODO 5
//
// Read out the arrangement, always oriented student to school no matter which
// side was asking, so the two directions can be compared.
// ---------------------------------------------------------------------------

export function matchingOf(_state: EngineState): Matching {
  return notImplemented('matchingOf');
}

// ---------------------------------------------------------------------------
// Given: the loops. Nothing to do here.
// ---------------------------------------------------------------------------

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

export type { Instance, Matching, SchoolId, Side, StudentId };
