import { narrate } from '../content/narration';
import { Sentence } from './Sentence';
import type { EngineState } from '../core/engine';

/**
 * Everything that has happened, oldest first.
 *
 * There is no step-back button, by design. The log is what replaces it: if a
 * moment went past too fast, it is still written down, and rereading it costs
 * nothing. And every line can be clicked to see the board as it was at that
 * moment, which is a step-back that cannot lose the reader's place, because
 * the present is still right here.
 *
 * The log always shows the whole run, even while the board is showing the
 * past. The line being looked at is marked, and everything after it is dimmed
 * so the reader can see how far back they are.
 */

interface NarrationLogProps {
  /** The latest state, so the whole run is listed whatever is being viewed. */
  readonly state: EngineState;
  /** The step being looked at, or null for now. */
  readonly viewStep?: number | null;
  readonly onView?: (step: number) => void;
}

export function NarrationLog({ state, viewStep = null, onView }: NarrationLogProps) {
  if (state.log.length === 0) {
    return (
      <div className="log log--empty">
        Nothing has happened yet. Press <strong>Start</strong>.
      </div>
    );
  }

  return (
    <ol className="log">
      {state.log.map((event, index) => {
        const narration = narrate(state, event);
        const isViewed = viewStep === event.step;
        const isAhead = viewStep !== null && event.step > viewStep;

        const classes = ['log__item', `log__item--${narration.tone}`];
        if (isViewed) classes.push('log__item--viewed');
        if (isAhead) classes.push('log__item--ahead');

        const line = <Sentence narration={narration} size={20} />;

        return (
          <li
            key={`${event.kind}-${event.step}-${index}`}
            className={classes.join(' ')}
            aria-current={isViewed ? 'step' : undefined}
          >
            {onView ? (
              <button
                type="button"
                className="log__button"
                onClick={() => onView(event.step)}
                title="Show the board at this moment"
              >
                {line}
              </button>
            ) : (
              line
            )}
          </li>
        );
      })}
    </ol>
  );
}
