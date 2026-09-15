import { useMemo, useState } from 'react';
import { PartyToken } from './PartyToken';
import { challengePrompt, explainPair } from '../content/narration';
import type { NarrationSegment } from '../content/narration';
import { judgePair } from '../core/stability';
import { matchingOf } from '../core/engine';
import type { EngineState } from '../core/engine';
import type { Instance } from '../core/types';

/**
 * Try to break it.
 *
 * The page does not announce that the finished arrangement holds. It dares the
 * reader to find two people who would both walk, and answers every attempt with
 * one side saying they are happy where they are.
 *
 * That turns a claim a reader is asked to accept into something they personally
 * failed to disprove, five or six times, and understood why each time. It is a
 * different quality of understanding, and it arrives without a definition ever
 * being stated.
 *
 * It is one tab of the work column rather than a section of its own, so the
 * title and the frame belong to the column. What is here is the daring and the
 * answer, next to the board the answer is about.
 */

interface PairChallengeProps {
  readonly instance: Instance;
  readonly state: EngineState;
  /** The pair under test, owned by the page so the proof section can share it. */
  readonly pair: { readonly student: string | null; readonly school: string | null };
  readonly onPick: (kind: 'student' | 'school', id: string) => void;
}

function Detail({ segments }: { segments: readonly NarrationSegment[] }) {
  return (
    <span>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <span className="sentence__token" key={index}>
            <PartyToken id={segment.id} party={segment.party} size={18} />
          </span>
        ),
      )}
    </span>
  );
}

export function PairChallenge({ instance, state, pair, onPick }: PairChallengeProps) {
  const { student, school } = pair;
  const [tested, setTested] = useState<ReadonlySet<string>>(new Set());

  const matching = useMemo(() => matchingOf(state), [state]);

  // Pairs who are already together cannot be a counterexample, so they are not
  // part of what there is to try.
  const worthTesting = useMemo(() => {
    const pairs: string[] = [];
    for (const s of instance.students) {
      for (const c of instance.schools) {
        if (matching[s.id] !== c.id) pairs.push(`${s.id}|${c.id}`);
      }
    }
    return pairs;
  }, [instance, matching]);

  const explanation =
    student && school ? explainPair(judgePair(instance, matching, student, school)) : null;

  function pick(kind: 'student' | 'school', id: string) {
    const nextStudent = kind === 'student' ? id : student;
    const nextSchool = kind === 'school' ? id : school;
    onPick(kind, id);

    if (nextStudent && nextSchool && matching[nextStudent] !== nextSchool) {
      setTested(new Set([...tested, `${nextStudent}|${nextSchool}`]));
    }
  }

  const testedCount = worthTesting.filter((p) => tested.has(p)).length;
  const allTested = testedCount === worthTesting.length && worthTesting.length > 0;

  return (
    <div className="challenge">
      <p className="challenge__prompt">{challengePrompt(state)}</p>

      <div className="challenge__pickers">
        <div className="picker">
          <span className="picker__label">Pick a student</span>
          <div className="picker__row">
            {instance.students.map((s) => (
              <button
                key={s.id}
                type="button"
                className={student === s.id ? 'picker__btn picker__btn--on' : 'picker__btn'}
                onClick={() => pick('student', s.id)}
                aria-pressed={student === s.id}
                aria-label={s.name}
              >
                <PartyToken id={s.id} party="student" size={34} />
              </button>
            ))}
          </div>
        </div>

        <div className="picker">
          <span className="picker__label">and a school</span>
          <div className="picker__row">
            {instance.schools.map((c) => (
              <button
                key={c.id}
                type="button"
                className={school === c.id ? 'picker__btn picker__btn--on' : 'picker__btn'}
                onClick={() => pick('school', c.id)}
                aria-pressed={school === c.id}
                aria-label={c.name}
              >
                <PartyToken id={c.id} party="school" size={34} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {explanation ? (
        <div className="verdict" aria-live="polite">
          {explanation.alreadyTogether ? (
            <p className="verdict__outcome verdict__outcome--void">{explanation.outcome}</p>
          ) : (
            <>
              <div className="bubble">
                <div className="bubble__quote">&ldquo;{explanation.studentQuote}&rdquo;</div>
                <div className="bubble__detail">
                  <Detail segments={explanation.studentDetail} />
                </div>
              </div>

              <div className="bubble">
                <div className="bubble__quote">&ldquo;{explanation.schoolQuote}&rdquo;</div>
                <div className="bubble__detail">
                  <Detail segments={explanation.schoolDetail} />
                </div>
              </div>

              <p
                className={
                  explanation.blocks
                    ? 'verdict__outcome verdict__outcome--breaks'
                    : 'verdict__outcome verdict__outcome--holds'
                }
              >
                {explanation.outcome}
              </p>
            </>
          )}
        </div>
      ) : (
        <p className="challenge__empty">Pick one of each to see what they say.</p>
      )}

      {state.phase === 'done' && testedCount > 0 ? (
        <p className="challenge__tally">
          {allTested ? (
            <strong>
              That is every possible pair, and not one of them works. Nobody here can do better by
              walking away together.
            </strong>
          ) : (
            <>
              {testedCount} of {worthTesting.length} pairs tried. None of them has worked yet.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
