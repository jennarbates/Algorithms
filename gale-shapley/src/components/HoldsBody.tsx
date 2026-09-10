import { useMemo } from 'react';
import { PartyToken } from './PartyToken';
import { HOLDS } from '../content/proofs';
import { askGrid, askOrdinals } from '../core/asks';
import { stabilityReplay } from '../core/replay';
import type { Run } from '../hooks/useRun';
import type { Instance } from '../core/types';

/**
 * Claim three, it holds: replay what happened between any two who are not
 * together.
 *
 * This reuses the challenge's pair, and is the reason the section sits under
 * it. The challenge answers "would these two both walk?" with what each of
 * them says at the end. This body answers the follow-up, "but why is that
 * always the answer?", by scrubbing the board to the three moments the
 * argument turns on: the ask that had to happen, what the asked side did with
 * it, and the end, where the asked side is holding somebody it likes better.
 *
 * The pair is always a student and a school, whichever side is asking. Which
 * of the two is "the asker" for the argument follows from the run.
 */

export interface Pair {
  readonly student: string | null;
  readonly school: string | null;
}

interface HoldsBodyProps {
  readonly run: Run;
  readonly instance: Instance;
  readonly pair: Pair;
  readonly onPick: (kind: 'student' | 'school', id: string) => void;
  /** Draw or clear the would-be pairing on the board. */
  readonly onGhost: (ghost: { asker: string; receiver: string } | null) => void;
}

export function HoldsBody({ run, instance, pair, onPick, onGhost }: HoldsBodyProps) {
  const { current, askingSide } = run;

  const askerId = askingSide === 'students' ? pair.student : pair.school;
  const receiverId = askingSide === 'students' ? pair.school : pair.student;

  const grid = useMemo(() => askGrid(current), [current]);
  const ordinals = useMemo(() => askOrdinals(grid), [grid]);

  const nameOf = (id: string) =>
    [...current.roster.askers, ...current.roster.receivers].find((p) => p.id === id)?.name ?? id;

  const replay =
    current.phase === 'done' && askerId && receiverId
      ? stabilityReplay(current, askerId, receiverId)
      : null;

  const receiverParty = receiverId
    ? current.roster.receivers.find((r) => r.id === receiverId)
    : undefined;
  const askerParty = askingSide === 'students' ? 'student' : 'school';

  function look(step: number, ghost: boolean) {
    run.viewAt(step);
    onGhost(ghost && askerId && receiverId ? { asker: askerId, receiver: receiverId } : null);
  }

  function lookEnd() {
    run.backToNow();
    onGhost(null);
  }

  return (
    <div className="holds">
      <p className="holds__pick">{HOLDS.pick}</p>

      <div className="challenge__pickers">
        <div className="picker">
          <span className="picker__label">Student</span>
          <div className="picker__row">
            {instance.students.map((s) => (
              <button
                key={s.id}
                type="button"
                className={pair.student === s.id ? 'picker__btn picker__btn--on' : 'picker__btn'}
                onClick={() => onPick('student', s.id)}
                aria-pressed={pair.student === s.id}
                aria-label={s.name}
              >
                <PartyToken id={s.id} party="student" size={34} />
              </button>
            ))}
          </div>
        </div>
        <div className="picker">
          <span className="picker__label">School</span>
          <div className="picker__row">
            {instance.schools.map((c) => (
              <button
                key={c.id}
                type="button"
                className={pair.school === c.id ? 'picker__btn picker__btn--on' : 'picker__btn'}
                onClick={() => onPick('school', c.id)}
                aria-pressed={pair.school === c.id}
                aria-label={c.name}
              >
                <PartyToken id={c.id} party="school" size={34} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {!replay || !askerId || !receiverId ? (
        <p className="leftout__empty">{HOLDS.empty}</p>
      ) : replay.kind === 'together' ? (
        <p className="verdict__outcome verdict__outcome--void">{HOLDS.together}</p>
      ) : replay.kind === 'asker-content' ? (
        <p className="verdict__outcome verdict__outcome--void">
          {HOLDS.askerContent(
            nameOf(askerId),
            nameOf(receiverId),
            nameOf(replay.askerEndedWith),
            askingSide,
          )}
        </p>
      ) : (
        <>
          <ol className="beats beats--numbered">
            <li className={run.viewStep === replay.askStep ? 'beat beat--viewed' : 'beat'}>
              <span className="beat__num" aria-hidden="true">
                1
              </span>
              <div className="beat__text">
                <div className="beat__line beat__line--picked">
                  {HOLDS.beatOneTitle(nameOf(askerId), nameOf(receiverId))}
                </div>
                <div className="beat__line">
                  {HOLDS.beatOne(
                    nameOf(askerId),
                    nameOf(receiverId),
                    nameOf(replay.askerEndedWith),
                    ordinals.get(replay.askStep) ?? 0,
                    replay.askStep,
                  )}
                </div>
              </div>
              <button
                type="button"
                className="button button--small beat__look"
                onClick={() => look(replay.askStep, true)}
                aria-current={run.viewStep === replay.askStep ? 'step' : undefined}
              >
                {HOLDS.look}
              </button>
            </li>

            <li className={run.viewStep === replay.answerStep ? 'beat beat--viewed' : 'beat'}>
              <span className="beat__num" aria-hidden="true">
                2
              </span>
              <div className="beat__text">
                <div className="beat__line beat__line--picked">
                  {HOLDS.beatTwoTitle(nameOf(receiverId), nameOf(askerId))}
                </div>
                <div className="beat__line">
                  {replay.answer === 'held'
                    ? HOLDS.beatTwoHeld(nameOf(receiverId), nameOf(askerId))
                    : HOLDS.beatTwoTurnedAway(
                        nameOf(receiverId),
                        nameOf(askerId),
                        nameOf(keepingAt(current, replay.answerStep)),
                        askingSide,
                      )}
                </div>
              </div>
              <button
                type="button"
                className="button button--small beat__look"
                onClick={() => look(replay.answerStep, true)}
                aria-current={run.viewStep === replay.answerStep ? 'step' : undefined}
              >
                {HOLDS.look}
              </button>
            </li>

            <li className={!run.viewingPast ? 'beat beat--viewed' : 'beat'}>
              <span className="beat__num" aria-hidden="true">
                3
              </span>
              <div className="beat__text">
                <div className="beat__line beat__line--picked">
                  {HOLDS.beatThreeTitle(nameOf(receiverId))}
                </div>
                <div className="beat__line">
                  {HOLDS.beatThree(
                    nameOf(receiverId),
                    nameOf(askerId),
                    nameOf(replay.receiverEndedWith),
                    askingSide,
                  )}
                </div>
                {receiverParty ? (
                  <div className="holds__list">
                    <span className="picker__label">{HOLDS.listLabel(nameOf(receiverId))}</span>
                    <ol className="ranking ranking--flat">
                      {receiverParty.prefs.map((id) => {
                        const classes = ['entry'];
                        if (id === replay.receiverEndedWith) classes.push('entry--held');
                        if (id === askerId) classes.push('entry--spurned');
                        return (
                          <li key={id} className={classes.join(' ')}>
                            <PartyToken
                              id={id}
                              party={askerParty}
                              size={30}
                              title={nameOf(id)}
                              muted={id !== replay.receiverEndedWith && id !== askerId}
                            />
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="button button--small beat__look"
                onClick={lookEnd}
                aria-current={!run.viewingPast ? 'step' : undefined}
              >
                {HOLDS.lookEnd}
              </button>
            </li>
          </ol>

          <p className="verdict__outcome verdict__outcome--holds">
            {HOLDS.conclusion(nameOf(askerId), nameOf(receiverId))}
          </p>
        </>
      )}
    </div>
  );
}

/** Who the receiver was keeping when it turned somebody away at this step. */
function keepingAt(final: Run['current'], step: number): string {
  const event = final.log.find((e) => e.step === step);
  if (event?.kind === 'turned-away') return event.keeping;
  throw new Error(`No turn-away at step ${step}`);
}
