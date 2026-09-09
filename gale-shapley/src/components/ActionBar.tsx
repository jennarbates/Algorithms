import { actionHint, actionLabel, narrate } from '../content/narration';
import { Sentence } from './Sentence';
import type { EngineState } from '../core/engine';

/**
 * The centre of the page: what just happened, and the one button that moves
 * things on.
 *
 * A proposal takes two clicks, not one. The first shows the question and stops.
 * The second shows the answer. That pause is deliberate and it is where the
 * page does its teaching, because it is the moment a reader has to decide what
 * they think will happen.
 */

interface ActionBarProps {
  readonly state: EngineState;
  readonly onStep: () => void;
  readonly onReset: () => void;
}

export function ActionBar({ state, onStep, onReset }: ActionBarProps) {
  const latest = state.log[state.log.length - 1];

  return (
    <div className="stage">
      <div className="stage__headline" aria-live="polite">
        {latest ? (
          <Sentence narration={narrate(state, latest)} size={30} />
        ) : (
          <span className="sentence sentence--intro">
            Three students, three schools, one seat left at each.
          </span>
        )}
      </div>

      <div className="stage__controls">
        <button
          type="button"
          className="button button--primary"
          onClick={onStep}
          disabled={state.phase === 'done'}
        >
          {actionLabel(state)}
        </button>
        <button type="button" className="button" onClick={onReset}>
          Start over
        </button>
      </div>

      <p className="stage__hint">{actionHint(state)}</p>
    </div>
  );
}
