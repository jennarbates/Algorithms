import { useMemo } from 'react';
import { explain, range, run, start } from '../core/boards';
import { boardsIn, sayTest } from './say';
import type { Evaluation, Strategy, Test } from '../core/boards';
import { useSteps } from '../hooks/useSteps';
import { Controls } from './Controls';
import { NumberLine } from './NumberLine';

/**
 * One strategy at one n, run against one chosen strength and replayed a test at
 * a time, with the tests every strength needs drawn underneath. Clicking a bar
 * replays that strength instead. Shared by the first three chapters.
 *
 * Remount it (with a key) when the strategy, n or strength changes: the replay
 * opens at the end of the run, so the whole picture shows first.
 */

export function Replay({
  strategy,
  n,
  s,
  onPick,
  ev,
  marks,
  phase,
}: {
  readonly strategy: Strategy;
  readonly n: number;
  readonly s: number;
  readonly onPick: (s: number) => void;
  readonly ev: Evaluation;
  readonly marks?: readonly number[];
  /** A name for the phase a test belongs to, if the strategy has phases. */
  readonly phase?: (t: Test) => string;
}) {
  const r = useMemo(() => run(strategy, n, s), [strategy, n, s]);
  const steps = useSteps(r.tests.length + 1, [], true, r.tests.length);
  const shown = r.tests.slice(0, steps.step);
  const k = shown[shown.length - 1]?.after ?? start(n, strategy.boards);
  const t = shown[shown.length - 1];

  const failed = r.outcome.kind !== 'found';
  const status =
    steps.step === 0
      ? `Before any test: the strength is ${range(0, n)}, with ${boardsIn(strategy.boards)}.`
      : `${t ? sayTest(t, steps.step - 1, phase?.(t)) : ''}${steps.atEnd && failed ? ` ${explain(r)}` : ''}`;

  return (
    <>
      <p
        className={`board-status${steps.atEnd ? (failed ? ' board-status--bad' : ' board-status--final') : ''}`}
        aria-live="polite"
      >
        {status}
      </p>
      <div className="board">
        <NumberLine
          n={n}
          k={k}
          tests={shown}
          marks={marks ?? []}
          truth={s}
          bars={ev.perStrength}
          worst={ev.worst}
          selected={s}
          onPickStrength={onPick}
          label={`Weights 1 to ${n}, the tests made so far against a board of strength ${s}, and the tests every strength needs`}
        />
        <div className="legend" aria-hidden="true">
          <span className="legend__item">
            <i className="sw sw--held" /> known to hold
          </span>
          <span className="legend__item">
            <i className="sw sw--open" /> strength is somewhere here
          </span>
          <span className="legend__item">
            <i className="sw sw--broke" /> known to break
          </span>
          {marks && (
            <span className="legend__item">
              <i className="sw sw--mark" /> first-board list
            </span>
          )}
          <span className="legend__item">
            <i className="sw sw--worst" /> worst case
          </span>
          <span className="legend__item">
            <i className="sw sw--on" /> strength replayed
          </span>
          <span className="legend__hint">Click a bar to replay that strength</span>
        </div>
      </div>
      <Controls steps={steps} />
    </>
  );
}
