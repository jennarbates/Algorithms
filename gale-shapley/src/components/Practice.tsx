import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { matchingOf, run } from '../core/engine';
import { blockingPairs } from '../core/stability';
import { presetById } from '../content/presets';
import {
  QUESTIONS,
  TIERS,
  TIER_LABELS,
  FORMAL_TERMS,
  questionsIn,
  type ArrangementsQuestion,
  type Option,
  type PairingQuestion,
  type ProofQuestion,
  type Question,
  type Tier,
} from '../content/questions';
import type { Instance, Matching } from '../core/types';

/**
 * The practice section.
 *
 * The walkthrough is watched. This is worked, and the difference shows up in
 * three decisions.
 *
 * **Wrong answers are not punished.** A question is scored on the first answer
 * and the score is never downgraded afterwards, so opening the other options to
 * read why they are wrong costs nothing. Every option carries its own reason,
 * including the ones nobody picked, because "you got it right" teaches less than
 * "here is what the other three would have meant".
 *
 * **Nothing with a computable answer is compared against stored text.** The
 * pairing questions run the engine. The arrangement questions call `isStable`
 * through `blockingPairs`, and the sentence naming the two people who would both
 * switch is generated from the verdict. Editing a preference list moves these
 * answers with it.
 *
 * **The board is not here.** A reader who can see the run cannot be asked to
 * work it, so the practice panel replaces the stage rather than sitting under
 * it, the way the pen replaces the animation on a problem set.
 */

interface PracticeProps {
  readonly onLeave: () => void;
}

type Verdict = 'first' | 'after' | 'miss';

/** What the reader has put down for one question, kept while they step away. */
type Working =
  | { readonly kind: 'seen'; readonly seen: readonly number[] }
  | { readonly kind: 'ticked'; readonly on: ReadonlySet<number>; readonly checked: boolean }
  | {
      readonly kind: 'placed';
      readonly at: Readonly<Record<string, string>>;
      readonly checked: boolean;
    }
  | {
      readonly kind: 'lines';
      readonly on: Readonly<Record<number, number>>;
      readonly checked: boolean;
    };

const EMPTY_SEEN: Working = { kind: 'seen', seen: [] };
const EMPTY_TICKED: Working = { kind: 'ticked', on: new Set(), checked: false };
const EMPTY_PLACED: Working = { kind: 'placed', at: {}, checked: false };
const EMPTY_LINES: Working = { kind: 'lines', on: {}, checked: false };

function blankFor(q: Question): Working {
  if (q.kind === 'choice') return EMPTY_SEEN;
  if (q.kind === 'multi' || q.kind === 'arrangements') return EMPTY_TICKED;
  if (q.kind === 'pairing') return EMPTY_PLACED;
  return EMPTY_LINES;
}

/** The answer to a pairing question, worked out rather than written down. */
function answerFor(q: PairingQuestion): { instance: Instance; matching: Matching } {
  const instance = presetById(q.instanceId);
  return { instance, matching: matchingOf(run(instance, q.side)) };
}

/**
 * Why an arrangement does not hold, in names. Generated from the verdict so that
 * it cannot disagree with the tick beside it, and so that editing a list changes
 * the sentence as well as the answer.
 */
function breakage(instance: Instance, pairs: Readonly<Record<string, string>>): string | null {
  const matching: Matching = pairs;
  const blocking = blockingPairs(instance, matching);
  const first = blocking[0];
  if (!first) return null;

  const student = instance.students.find((s) => s.id === first.student);
  const school = instance.schools.find((c) => c.id === first.school);
  if (!student || !school) return null;

  const theirSchoolId = matching[student.id];
  const theirSchool = instance.schools.find((c) => c.id === theirSchoolId);
  const itsStudentId = instance.students.find((s) => matching[s.id] === school.id)?.id;
  const itsStudent = instance.students.find((s) => s.id === itsStudentId);

  const rest =
    blocking.length > 1
      ? ` There ${blocking.length === 2 ? 'is one more pair' : `are ${blocking.length - 1} more pairs`} like it.`
      : '';
  return (
    `${student.name} and ${school.name} would both switch: ${student.name} wants ${school.name} ` +
    `more than ${theirSchool ? theirSchool.name : 'nowhere'}, and ${school.name} wants ${student.name} ` +
    `more than ${itsStudent ? itsStudent.name : 'nobody'}.${rest}`
  );
}

function pairsLine(instance: Instance, pairs: Readonly<Record<string, string>>): string {
  return instance.students
    .map((s) => {
      const schoolId = pairs[s.id];
      const school = instance.schools.find((c) => c.id === schoolId);
      return `${s.name} – ${school ? school.name : '?'}`;
    })
    .join('  ·  ');
}

/** What one question looks like right now, whichever way it is answered. */
interface View {
  readonly body: ReactNode;
  /** True once the answer is final, which is when the closing note appears. */
  readonly answered: boolean;
  readonly right: boolean;
  readonly lead: string;
  /** Said before the closing note when something went wrong, and otherwise absent. */
  readonly note: string | null;
  /** Absent for the formats that score on each click rather than on a Check. */
  readonly check: { readonly ready: boolean; readonly run: () => void } | null;
  readonly retry: boolean;
}

/** One answer row: the whole row is the target, and the keyboard gets it free. */
function OptionRow({
  label,
  mark,
  verdict,
  why,
  onPick,
}: {
  readonly label: string;
  readonly mark: '' | 'right' | 'wrong' | 'missed' | 'picked';
  readonly verdict?: string | undefined;
  readonly why?: string | undefined;
  readonly onPick?: (() => void) | undefined;
}) {
  const tick = mark === 'right' || mark === 'missed' ? '✓' : mark === 'wrong' ? '✗' : '';
  return (
    <button
      type="button"
      className={mark ? `qopt qopt--${mark}` : 'qopt'}
      onClick={onPick}
      disabled={!onPick}
    >
      <span className="qopt__line">
        <span className="qopt__tick" aria-hidden="true">
          {tick}
        </span>
        <span className="qopt__text">{label}</span>
      </span>
      {why ? (
        <span className="qopt__why">
          {verdict ? <b>{verdict} </b> : null}
          {why}
        </span>
      ) : null}
    </button>
  );
}

export function Practice({ onLeave }: PracticeProps) {
  const [tier, setTier] = useState<Tier>(1);
  const [at, setAt] = useState(0);
  const [scores, setScores] = useState<Readonly<Record<string, Verdict>>>({});
  const [working, setWorking] = useState<Readonly<Record<string, Working>>>({});

  const questions = useMemo(() => questionsIn(tier), [tier]);
  const question = questions[at] ?? questions[0];
  if (!question) throw new Error(`No questions in tier ${tier}`);

  const state = working[question.id] ?? blankFor(question);
  const put = (next: Working) => setWorking((w) => ({ ...w, [question.id]: next }));

  /** Scored on the first answer, and never downgraded, so reading on is free. */
  const score = (right: boolean) =>
    setScores((s) => {
      const had = s[question.id];
      if (had === 'first' || had === 'after') return s;
      return { ...s, [question.id]: right ? (had === 'miss' ? 'after' : 'first') : 'miss' };
    });

  const go = (tierNext: Tier, index: number) => {
    setTier(tierNext);
    setAt(index);
  };

  // ---- the four ways of answering -----------------------------------------

  const renderChoice = (options: readonly Option[]): View => {
    const seen = state.kind === 'seen' ? state.seen : [];
    const found = seen.some((k) => options[k]?.ok);
    return {
      body: (
        <div className="qopts">
          {options.map((o, k) => {
            const open = seen.includes(k);
            return (
              <OptionRow
                key={o.t}
                label={o.t}
                mark={open ? (o.ok ? 'right' : 'wrong') : ''}
                verdict={open ? (o.ok ? 'Yes.' : 'No.') : undefined}
                why={open ? o.why : undefined}
                onPick={
                  open
                    ? undefined
                    : () => {
                        score(!!o.ok);
                        put({ kind: 'seen', seen: [...seen, k] });
                      }
                }
              />
            );
          })}
        </div>
      ),
      answered: seen.length > 0,
      right: found,
      lead: 'Pick one. Whichever you pick will say why it is right or wrong, and the others stay open to read.',
      note:
        seen.length > 0 && !found
          ? 'Keep going: the others are still open, and each one says what is wrong with it.'
          : null,
      check: null,
      retry: false,
    };
  };

  const renderMulti = (options: readonly Option[]): View => {
    const on = state.kind === 'ticked' ? state.on : new Set<number>();
    const checked = state.kind === 'ticked' ? state.checked : false;
    const exact = options.every((o, k) => !!o.ok === on.has(k));
    return {
      body: (
        <div className="qopts">
          {options.map((o, k) => {
            const ticked = on.has(k);
            const mark = checked
              ? ticked && o.ok
                ? 'right'
                : ticked && !o.ok
                  ? 'wrong'
                  : !ticked && o.ok
                    ? 'missed'
                    : ''
              : ticked
                ? 'picked'
                : '';
            const verdict = checked
              ? ticked && o.ok
                ? 'Yes, and you ticked it.'
                : ticked && !o.ok
                  ? 'No, but you ticked it.'
                  : !ticked && o.ok
                    ? 'Yes, and you left it out.'
                    : 'No, and you left it out.'
              : undefined;
            return (
              <OptionRow
                key={o.t}
                label={o.t}
                mark={mark}
                verdict={verdict}
                why={checked ? o.why : undefined}
                onPick={
                  checked
                    ? undefined
                    : () => {
                        const next = new Set(on);
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        put({ kind: 'ticked', on: next, checked: false });
                      }
                }
              />
            );
          })}
        </div>
      ),
      answered: checked,
      right: exact,
      lead: 'Tick every one that applies, then check. Partly right counts as wrong here, which is the point: each row is its own claim.',
      note:
        checked && !exact
          ? 'A dashed row belongs and was left out. A solid red one does not belong.'
          : null,
      check: checked
        ? null
        : {
            ready: on.size > 0,
            run: () => {
              put({ kind: 'ticked', on, checked: true });
              score(exact);
            },
          },
      retry: checked,
    };
  };

  const renderArrangements = (q: ArrangementsQuestion): View => {
    const instance = presetById(q.instanceId);
    const holds = q.candidates.map((c) => breakage(instance, c.pairs) === null);
    const on = state.kind === 'ticked' ? state.on : new Set<number>();
    const checked = state.kind === 'ticked' ? state.checked : false;
    const exact = holds.every((h, k) => h === on.has(k));
    return {
      body: (
        <div className="qopts">
          {q.candidates.map((c, k) => {
            const ticked = on.has(k);
            const good = holds[k] ?? false;
            const mark = checked
              ? ticked && good
                ? 'right'
                : ticked && !good
                  ? 'wrong'
                  : !ticked && good
                    ? 'missed'
                    : ''
              : ticked
                ? 'picked'
                : '';
            const broken = checked ? breakage(instance, c.pairs) : null;
            return (
              <OptionRow
                key={pairsLine(instance, c.pairs)}
                label={pairsLine(instance, c.pairs)}
                mark={mark}
                verdict={checked ? (good ? 'This one holds.' : 'This one breaks.') : undefined}
                why={
                  checked
                    ? `${broken ? `${broken} ` : 'Nothing breaks it: for any two who are not together, at least one of them prefers where they are. '}${c.note}`
                    : undefined
                }
                onPick={
                  checked
                    ? undefined
                    : () => {
                        const next = new Set(on);
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        put({ kind: 'ticked', on: next, checked: false });
                      }
                }
              />
            );
          })}
        </div>
      ),
      answered: checked,
      right: exact,
      lead: 'Tick every one that holds, then check. Partly right counts as wrong: each arrangement is its own claim.',
      note:
        checked && !exact
          ? 'A dashed row holds and was left out. A solid red one was ticked and can be broken.'
          : null,
      check: checked
        ? null
        : {
            ready: on.size > 0,
            run: () => {
              put({ kind: 'ticked', on, checked: true });
              score(exact);
            },
          },
      retry: checked,
    };
  };

  const renderPairing = (q: PairingQuestion): View => {
    const { instance, matching } = answerFor(q);
    const at2 = state.kind === 'placed' ? state.at : {};
    const checked = state.kind === 'placed' ? state.checked : false;
    const complete = instance.students.every((s) => at2[s.id]);
    const exact = instance.students.every((s) => at2[s.id] === matching[s.id]);

    return {
      body: (
        <div className="qpair">
          {instance.students.map((student) => {
            const choice = at2[student.id];
            const truth = matching[student.id];
            const right = choice === truth;
            return (
              <div
                key={student.id}
                className={checked ? (right ? 'qrow qrow--right' : 'qrow qrow--wrong') : 'qrow'}
              >
                <span className="qrow__who">{student.name}</span>
                <span className="qrow__seats">
                  {instance.schools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      className={
                        checked && school.id === truth
                          ? 'qseat qseat--truth'
                          : choice === school.id
                            ? 'qseat qseat--on'
                            : 'qseat'
                      }
                      aria-pressed={choice === school.id}
                      onClick={
                        checked
                          ? undefined
                          : () =>
                              put({
                                kind: 'placed',
                                at: { ...at2, [student.id]: school.id },
                                checked: false,
                              })
                      }
                      disabled={checked}
                    >
                      {school.name}
                    </button>
                  ))}
                </span>
                {checked ? (
                  <span className="qrow__why">
                    <b>{right ? 'Yes. ' : 'No. '}</b>
                    {q.rows[student.id] ?? ''}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ),
      answered: checked,
      right: exact,
      lead: 'Work the run on paper first, then put everybody somewhere and check. Every seat has to be right.',
      note:
        checked && !exact
          ? 'The outlined seat in each row is where that person actually ends up.'
          : null,
      check: checked
        ? null
        : {
            ready: complete,
            run: () => {
              put({ kind: 'placed', at: at2, checked: true });
              score(exact);
            },
          },
      retry: checked,
    };
  };

  const renderProof = (q: ProofQuestion): View => {
    const on = state.kind === 'lines' ? state.on : {};
    const checked = state.kind === 'lines' ? state.checked : false;
    const complete = q.steps.every((_, i) => on[i] !== undefined);
    const whole = q.steps.every((st, i) => {
      const taken = on[i];
      return taken !== undefined && !!st.options[taken]?.ok;
    });

    return {
      body: (
        <div className="qproof">
          {q.steps.map((step, i) => {
            const taken = on[i];
            const stepRight = taken !== undefined && !!step.options[taken]?.ok;
            return (
              <div
                key={step.lead}
                className={
                  checked ? (stepRight ? 'qstep qstep--right' : 'qstep qstep--wrong') : 'qstep'
                }
              >
                <p className="qstep__lead">
                  <span className="qstep__num">{i + 1}</span>
                  {step.lead}
                </p>
                <div className="qopts">
                  {step.options.map((o, k) => {
                    const took = taken === k;
                    const mark = checked
                      ? took && o.ok
                        ? 'right'
                        : took && !o.ok
                          ? 'wrong'
                          : !took && o.ok
                            ? 'missed'
                            : ''
                      : took
                        ? 'picked'
                        : '';
                    const verdict = checked
                      ? took && o.ok
                        ? 'Yes, and you took it.'
                        : took && !o.ok
                          ? 'No, and you took it.'
                          : !took && o.ok
                            ? 'This is the line that belongs.'
                            : 'No, and you left it.'
                      : undefined;
                    return (
                      <OptionRow
                        key={o.t}
                        label={o.t}
                        mark={mark}
                        verdict={verdict}
                        why={checked ? o.why : undefined}
                        onPick={
                          checked
                            ? undefined
                            : () => put({ kind: 'lines', on: { ...on, [i]: k }, checked: false })
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ),
      answered: checked,
      right: whole,
      lead: 'Pick one line for each step, then check. The argument is judged whole: a proof with one broken line proves nothing.',
      note:
        checked && !whole
          ? 'Where you did not take it, the line that belongs is marked instead.'
          : null,
      check: checked
        ? null
        : {
            ready: complete,
            run: () => {
              put({ kind: 'lines', on, checked: true });
              score(whole);
            },
          },
      retry: checked,
    };
  };

  const view =
    question.kind === 'choice'
      ? renderChoice(question.options)
      : question.kind === 'multi'
        ? renderMulti(question.options)
        : question.kind === 'arrangements'
          ? renderArrangements(question)
          : question.kind === 'pairing'
            ? renderPairing(question)
            : renderProof(question);

  const { check, retry } = view;

  const tally = (v: Verdict) => questions.filter((q) => scores[q.id] === v).length;
  const lastTier = TIERS[TIERS.length - 1] ?? 1;

  return (
    <section className="practice">
      <div className="practice__panel">
        <div className="practice__head">
          <span>{TIER_LABELS[tier]}</span>
          <span>
            Question {at + 1} of {questions.length}
          </span>
        </div>

        <div className="practice__body">
          <p className="qtests">Testing: {question.tests}</p>
          <h2 className="qprompt">{question.prompt}</h2>
          {question.quote ? <pre className="qquote">{question.quote}</pre> : null}
          <p className="qlead">{view.lead}</p>

          {view.body}

          {view.answered ? (
            <div className={view.right ? 'qverdict qverdict--ok' : 'qverdict qverdict--no'}>
              <h3>{view.right ? 'What this was testing' : 'What this is testing'}</h3>
              <p>{view.note ?? question.close}</p>
              {view.note ? <p>{question.close}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="practice__controls">
          <button
            type="button"
            className="button"
            onClick={() => setAt((k) => Math.max(0, k - 1))}
            disabled={at === 0}
          >
            Back
          </button>
          {check ? (
            <button
              type="button"
              className="button button--primary"
              onClick={check.run}
              disabled={!check.ready}
            >
              Check
            </button>
          ) : null}
          <button
            type="button"
            className={check ? 'button' : 'button button--primary'}
            onClick={() => {
              if (at < questions.length - 1) setAt(at + 1);
              else if (tier < lastTier) go((tier + 1) as Tier, 0);
              else setAt(0);
            }}
          >
            {at === questions.length - 1
              ? tier < lastTier
                ? `On to tier ${tier + 1}`
                : 'Back to question 1'
              : 'Next question'}
          </button>
          {retry ? (
            <button
              type="button"
              className="button button--small"
              onClick={() => put(blankFor(question))}
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>

      <aside className="practice__side">
        <div>
          <span className="practice__cap">Three tiers</span>
          <div className="tierpick">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                className={t === tier ? 'tierpick__on' : undefined}
                aria-pressed={t === tier}
                onClick={() => go(t, 0)}
              >
                {TIER_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="practice__cap">Questions</span>
          <div className="qmap">
            {questions.map((q, k) => (
              <button
                key={q.id}
                type="button"
                aria-label={`Question ${k + 1}`}
                className={[scores[q.id] ? `qmap__${scores[q.id]}` : '', k === at ? 'qmap__at' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setAt(k)}
              >
                {k + 1}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="practice__cap">Where you are</span>
          <p className="qtally">
            <b>
              {tally('first')} of {questions.length}
            </b>{' '}
            right first time
            {tally('after') ? `, ${tally('after')} after a miss` : ''}
            {tally('miss') ? `, ${tally('miss')} not right yet` : ''}.
          </p>
        </div>

        {tier > 1 ? (
          <div>
            <span className="practice__cap">The words this tier uses</span>
            <dl className="glossary">
              {FORMAL_TERMS.map((t) => (
                <div key={t.term}>
                  <dt>{t.term}</dt>
                  <dd>{t.replaces}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <p className="practice__back">
          {QUESTIONS.length} questions, on instances you can work by hand.
          <button type="button" onClick={onLeave}>
            Back to the walkthrough
          </button>
        </p>
      </aside>
    </section>
  );
}
