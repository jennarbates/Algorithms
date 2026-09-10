import { useCallback, useReducer } from 'react';
import {
  advance,
  backToNow,
  createHistory,
  isViewingPast,
  latest,
  viewAt,
  viewing,
} from '../core/history';
import type { RunHistory } from '../core/history';
import type { EngineState } from '../core/engine';
import type { Instance, Side } from '../core/types';

/**
 * The page's one piece of state: a run, and where in it the reader is looking.
 *
 * Everything the reducer does is a pure function from `core/history`, so the
 * rules live in one place and the tests cover them without React.
 */

type Action =
  | { readonly type: 'step' }
  | { readonly type: 'reset' }
  | { readonly type: 'switch-side'; readonly side: Side }
  | { readonly type: 'view'; readonly step: number }
  | { readonly type: 'now' };

interface Store {
  readonly history: RunHistory;
  /** Bumped whenever a fresh run starts, so per-run UI can forget what it had. */
  readonly runId: number;
}

function reduce(store: Store, action: Action): Store {
  const { history } = store;
  switch (action.type) {
    case 'step':
      return { ...store, history: advance(history) };
    case 'reset':
      return {
        history: createHistory(history.instance, history.askingSide),
        runId: store.runId + 1,
      };
    case 'switch-side':
      return { history: createHistory(history.instance, action.side), runId: store.runId + 1 };
    case 'view':
      return { ...store, history: viewAt(history, action.step) };
    case 'now':
      return { ...store, history: backToNow(history) };
  }
}

export interface Run {
  readonly instance: Instance;
  readonly askingSide: Side;
  /** The state the page should draw: a past moment, or the latest. */
  readonly state: EngineState;
  /** The latest state, whatever the page is looking at. */
  readonly current: EngineState;
  readonly stepCount: number;
  readonly viewStep: number | null;
  readonly viewingPast: boolean;
  readonly runId: number;
  readonly step: () => void;
  readonly reset: () => void;
  readonly switchSide: (side: Side) => void;
  readonly viewAt: (step: number) => void;
  readonly backToNow: () => void;
}

export function useRun(instance: Instance, initialSide: Side): Run {
  const [store, dispatch] = useReducer(reduce, undefined, () => ({
    history: createHistory(instance, initialSide),
    runId: 0,
  }));

  const { history, runId } = store;

  const step = useCallback(() => dispatch({ type: 'step' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const switchSide = useCallback((side: Side) => dispatch({ type: 'switch-side', side }), []);
  const view = useCallback((stepIndex: number) => dispatch({ type: 'view', step: stepIndex }), []);
  const now = useCallback(() => dispatch({ type: 'now' }), []);

  const current = latest(history);

  return {
    instance: history.instance,
    askingSide: history.askingSide,
    state: viewing(history),
    current,
    stepCount: current.stepCount,
    viewStep: history.viewStep,
    viewingPast: isViewingPast(history),
    runId,
    step,
    reset,
    switchSide,
    viewAt: view,
    backToNow: now,
  };
}
