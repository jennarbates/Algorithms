import { useMemo, useState } from 'react';
import { PartyToken } from './PartyToken';
import { askerKind, receiverKind } from '../content/narration';
import { LEFT_OUT } from '../content/proofs';
import { askGrid, askOrdinals, cellKey } from '../core/asks';
import { askedBy, firstHolds } from '../core/holds';
import type { Run } from '../hooks/useRun';

/**
 * Claim two, nobody is left out: pick anyone on the asking side and suppose
 * they had run out of list.
 *
 * Running out means having asked everyone. So the body goes down the other
 * side one by one and shows, for each of them, the moment they were first
 * asked by anybody: that is the moment their "nobody yet" chip vanished, and
 * it never comes back. Each beat is a button that scrubs the board to that
 * moment, so the reader can watch the chip go rather than be told it did.
 *
 * Then it counts. Everyone on the other side is holding somebody, that is n
 * people held, and there are only n people who could be held. The picked
 * person has to be one of them. The board confirms it: there they are.
 *
 * The picked person's own list is drawn with everyone they actually asked
 * crossed off, the same way their row on the board draws it, so the reader
 * can see how far down they got and that they never needed the rest.
 */

interface LeftOutBodyProps {
  readonly run: Run;
}

export function LeftOutBody({ run }: LeftOutBodyProps) {
  const { state, current, askingSide } = run;
  const [picked, setPicked] = useState<string | null>(null);

  const askerParty = askerKind(state);
  const receiverParty = receiverKind(state);
  const n = state.roster.askers.length;

  // The whole run: who was first asked when, and which questions were whose.
  const holds = useMemo(() => firstHolds(current), [current]);
  const grid = useMemo(() => askGrid(current), [current]);
  const ordinals = useMemo(() => askOrdinals(grid), [grid]);

  const nameOf = (id: string) =>
    [...state.roster.askers, ...state.roster.receivers].find((p) => p.id === id)?.name ?? id;

  const pickedParty = picked ? state.roster.askers.find((a) => a.id === picked) : undefined;
  const pickedAsked = picked ? askedBy(current, picked) : [];

  return (
    <div className="leftout">
      <div className="picker">
        <span className="picker__label">{LEFT_OUT.pick(askingSide)}</span>
        <div className="picker__row">
          {state.roster.askers.map((a) => (
            <button
              key={a.id}
              type="button"
              className={picked === a.id ? 'picker__btn picker__btn--on' : 'picker__btn'}
              onClick={() => setPicked(a.id)}
              aria-pressed={picked === a.id}
              aria-label={a.name}
            >
              <PartyToken id={a.id} party={askerParty} size={34} />
            </button>
          ))}
        </div>
      </div>

      {!pickedParty ? (
        <p className="leftout__empty">{LEFT_OUT.empty(askingSide)}</p>
      ) : (
        <>
          <p className="leftout__suppose">{LEFT_OUT.suppose(pickedParty.name, n, askingSide)}</p>

          <div className="leftout__list">
            <span className="picker__label">{LEFT_OUT.listLabel(pickedParty.name)}</span>
            <ol className="ranking ranking--flat">
              {pickedParty.prefs.map((receiverId) => {
                const asked = pickedAsked.includes(receiverId);
                return (
                  <li key={receiverId} className={asked ? 'entry entry--passed' : 'entry'}>
                    <PartyToken
                      id={receiverId}
                      party={receiverParty}
                      size={30}
                      muted={asked}
                      title={nameOf(receiverId)}
                    />
                  </li>
                );
              })}
            </ol>
          </div>

          <ol className="beats">
            {state.roster.receivers.map((r) => {
              const hold = holds.get(r.id);
              const step = grid.get(cellKey(pickedParty.id, r.id));
              const question = step === undefined ? undefined : ordinals.get(step);
              const isViewed =
                run.viewingPast && hold !== undefined && run.viewStep === hold.heldStep;
              const finalHold = current.receivers[r.id]?.holding ?? null;

              return (
                <li key={r.id} className={isViewed ? 'beat beat--viewed' : 'beat'}>
                  <PartyToken id={r.id} party={receiverParty} size={34} title={r.name} />
                  <div className="beat__text">
                    <div className="beat__line beat__line--picked">
                      {question === undefined
                        ? LEFT_OUT.notAskedByPicked(pickedParty.name, r.name)
                        : LEFT_OUT.askedByPicked(pickedParty.name, r.name, question)}
                    </div>
                    <div className="beat__line">
                      {hold === undefined
                        ? LEFT_OUT.neverAsked(r.name)
                        : LEFT_OUT.firstHeld(
                            r.name,
                            nameOf(hold.firstAsker),
                            hold.askedStep,
                            askingSide,
                          )}
                      {finalHold !== null
                        ? ` ${LEFT_OUT.endsWith(r.name, nameOf(finalHold))}`
                        : null}
                    </div>
                  </div>
                  {hold !== undefined ? (
                    <button
                      type="button"
                      className="button button--small beat__look"
                      onClick={() => run.viewAt(hold.heldStep)}
                      aria-current={isViewed ? 'step' : undefined}
                    >
                      {LEFT_OUT.look}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {current.phase === 'done' ? (
            <p className="leftout__conclusion">
              {LEFT_OUT.conclusion(
                pickedParty.name,
                n,
                nameOf(current.askers[pickedParty.id]?.heldBy ?? ''),
                askingSide,
              )}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
