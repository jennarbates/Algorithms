import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { actionHint, actionLabel, narrate } from '../content/narration';
import { SECTION } from '../content/proofs';
import { NarrationLog } from './NarrationLog';
import { Sentence } from './Sentence';
import type { Run } from '../hooks/useRun';

/**
 * The column beside the board: what there is to do, and the one place the
 * reader acts.
 *
 * There are three things to do here and they are not a sequence. Watching the
 * run, trying to break the result and reading why it cannot be broken are three
 * ways at the same object, and a reader who wants the third one first should
 * have it. So they are tabs, not steps, and nothing is locked behind anything.
 *
 * One at a time, though, and that part is not a preference. All three open at
 * once came to nearly two thousand pixels in this column, which is three
 * screens of scrolling in the one place on the page where scrolling costs the
 * most: the arguments in "Why this works" work by scrubbing the board, so an
 * argument the reader has to scroll away from is an argument they cannot see
 * the point of.
 *
 * The shape is fixed whichever tab is showing. A head that holds still, a body
 * that scrolls, and the controls pinned under it. The controls do not change
 * between tabs either, because the run is the same run from all three: a reader
 * who switches to the claims halfway through can finish the run without going
 * back for the button.
 */

type Stage = 'run' | 'break' | 'why';

const STAGES: readonly { readonly id: Stage; readonly label: string }[] = [
  { id: 'run', label: 'The run' },
  { id: 'break', label: 'Try to break it' },
  { id: 'why', label: 'Why it works' },
];

interface WorkColumnProps {
  readonly run: Run;
  /** The pair challenge, built by the page so the claims can share its pickers. */
  readonly challenge: ReactNode;
  readonly why: ReactNode;
}

export function WorkColumn({ run, challenge, why }: WorkColumnProps) {
  const [stage, setStage] = useState<Stage>('run');
  const bodyRef = useRef<HTMLDivElement>(null);
  const { state, viewingPast } = run;

  // A new tab starts at its own beginning rather than wherever the last one
  // happened to be left.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [stage]);

  return (
    <aside className="side">
      <div className="side__switch" role="group" aria-label="What to work on">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === stage ? 'side__tab side__tab--on' : 'side__tab'}
            onClick={() => setStage(s.id)}
            aria-pressed={s.id === stage}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="side__head">
        {stage === 'run' ? <RunHead run={run} /> : null}
        {stage === 'break' ? <h2 className="side__title">Try to break it</h2> : null}
        {stage === 'why' ? <h2 className="side__title">{SECTION.title}</h2> : null}
      </div>

      <div className="side__body" ref={bodyRef}>
        {stage === 'run' ? <RunBody run={run} /> : null}
        {stage === 'break' ? challenge : null}
        {stage === 'why' ? why : null}
      </div>

      <div className="side__controls">
        <button
          type="button"
          className="button button--primary"
          onClick={run.step}
          disabled={viewingPast || state.phase === 'done'}
        >
          {actionLabel(state)}
        </button>
        <button type="button" className="button" onClick={run.reset}>
          Start over
        </button>
      </div>

      <p className="side__hint">
        {viewingPast ? 'You are looking back. Go back to now to carry on.' : actionHint(state)}
        <span className="side__keys">
          Arrow keys step the run and look back at it. Escape returns to now.
        </span>
      </p>
    </aside>
  );
}

/**
 * The count and the sentence, held still above the log.
 *
 * The number is the run's own step count rather than a position in a fixed
 * list, because there is no fixed list: how many questions get asked depends on
 * the preferences, which is the whole point of the first claim.
 */
function RunHead({ run }: { readonly run: Run }) {
  const { state } = run;
  const latest = state.log[state.log.length - 1];
  const done = state.phase === 'done';

  return (
    <>
      <div className="side__step">
        <span className="side__stepnum">{state.stepCount}</span>
        <span className="side__steplabel">
          {done ? (state.stepCount === 1 ? 'step in all' : 'steps in all') : 'so far'}
        </span>
      </div>

      <div className="side__headline" aria-live="polite">
        {latest ? (
          <Sentence narration={narrate(state, latest)} size={26} />
        ) : (
          <span className="sentence sentence--intro">
            Three students, three schools, one seat left at each.
          </span>
        )}
      </div>
    </>
  );
}

/**
 * The log, or the invitation to start one.
 *
 * The opening words used to sit at the top of the page and stay there all run.
 * They are the empty state: they say what to expect before anything has
 * happened, and the moment something has, the record of it is the more useful
 * thing to be looking at.
 */
function RunBody({ run }: { readonly run: Run }) {
  if (run.current.log.length === 0) {
    return (
      <p className="lede">
        Everyone here has ranked the other side. Nobody can be talked into anything. Watch what
        happens, and at the end try to find two people who would rather have each other.
      </p>
    );
  }

  return <NarrationLog state={run.current} viewStep={run.viewStep} onView={run.viewAt} />;
}
