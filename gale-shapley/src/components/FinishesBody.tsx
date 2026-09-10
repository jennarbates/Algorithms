import { useMemo } from 'react';
import { PartyToken } from './PartyToken';
import { askerKind, receiverKind } from '../content/narration';
import { FINISHES, finishesLegend, finishesTally } from '../content/proofs';
import { askGrid, askOrdinals, askTally, cellKey, latestAskStep } from '../core/asks';
import type { Run } from '../hooks/useRun';

/**
 * Claim one, it finishes: the run as a grid of questions.
 *
 * One row per asker, one column per person they could ask, so n by n cells. A
 * cell fills at the step its ask happened, and the grid fills in step with the
 * board as the reader scrubs through the run. What they can see, without being
 * told, is that the same cell never fills twice and that there are only so
 * many cells.
 *
 * The grid is also a scrubber. Every cell that fills at some point in the run
 * is a button that shows the board at that moment, so a reader can go from
 * "that square" to "that question" in one click. Cells ahead of the moment
 * being looked at are drawn faint, so the reader can see what is still to
 * come and jump to it. The number in a cell is which question it was, first
 * to last, so it agrees with the count above; the step number, which is what
 * the log counts in, is in the tooltip.
 *
 * Past about six on a side the cells get too small to carry a number, and the
 * grid gives way to the count alone. The count was always the argument; the
 * grid is what makes the count believable.
 */

/** Above this many on a side, draw the count and not the grid. */
const GRID_LIMIT = 6;

interface FinishesBodyProps {
  readonly run: Run;
}

export function FinishesBody({ run }: FinishesBodyProps) {
  const { state, current, askingSide } = run;

  // The whole run, so cells ahead of the viewed moment can be drawn faint.
  const fullGrid = useMemo(() => askGrid(current), [current]);
  const ordinals = useMemo(() => askOrdinals(fullGrid), [fullGrid]);
  const tally = askTally(state);
  const settled = current.phase === 'done';
  const viewedAsk = latestAskStep(state);
  const askerParty = askerKind(state);
  const receiverParty = receiverKind(state);

  const nameOf = (id: string) =>
    [...state.roster.askers, ...state.roster.receivers].find((p) => p.id === id)?.name ?? id;

  return (
    <div className="asks">
      <p className="asks__tally" aria-live="polite">
        {finishesTally(tally.used, tally.total, settled && !run.viewingPast)}
      </p>

      {tally.n > GRID_LIMIT ? (
        <p className="asks__toobig">{FINISHES.tooBig}</p>
      ) : (
        <>
          <p className="asks__legend">{finishesLegend(askingSide)}</p>

          <table className="asks__grid" aria-label={FINISHES.gridLabel}>
            <thead>
              <tr>
                <td className="asks__corner" />
                {state.roster.receivers.map((r) => (
                  <th key={r.id} scope="col" className="asks__head">
                    <PartyToken id={r.id} party={receiverParty} size={26} title={r.name} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.roster.askers.map((a) => (
                <tr key={a.id}>
                  <th scope="row" className="asks__head asks__head--row">
                    <PartyToken id={a.id} party={askerParty} size={26} title={a.name} />
                  </th>
                  {state.roster.receivers.map((r) => {
                    const step = fullGrid.get(cellKey(a.id, r.id));
                    const askerName = nameOf(a.id);
                    const askedName = nameOf(r.id);

                    if (step === undefined) {
                      return (
                        <td key={r.id} className="asks__cell asks__cell--never">
                          <span
                            className="asks__square"
                            title={FINISHES.cellNever(askerName, askedName)}
                          />
                        </td>
                      );
                    }

                    const filled = step <= state.stepCount;
                    const isViewed = run.viewingPast && filled && step === viewedAsk;
                    const classes = [
                      'asks__cell',
                      filled ? 'asks__cell--filled' : 'asks__cell--ahead',
                    ];
                    if (isViewed) classes.push('asks__cell--viewed');
                    const title = filled
                      ? FINISHES.cell(askerName, askedName, step)
                      : FINISHES.cellAhead(askerName, askedName, step);

                    return (
                      <td key={r.id} className={classes.join(' ')}>
                        <button
                          type="button"
                          className="asks__square asks__square--button"
                          onClick={() => run.viewAt(step)}
                          title={title}
                          aria-label={title}
                          aria-current={isViewed ? 'step' : undefined}
                        >
                          {ordinals.get(step)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
