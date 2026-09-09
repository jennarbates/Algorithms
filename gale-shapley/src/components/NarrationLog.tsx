import { narrate } from '../content/narration';
import { Sentence } from './Sentence';
import type { EngineState } from '../core/engine';

/**
 * Everything that has happened, oldest first.
 *
 * There is no step-back button, by design. The log is what replaces it: if a
 * moment went past too fast, it is still written down, and rereading it costs
 * nothing.
 */
export function NarrationLog({ state }: { state: EngineState }) {
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
        return (
          <li
            key={`${event.kind}-${event.step}-${index}`}
            className={`log__item log__item--${narration.tone}`}
          >
            <Sentence narration={narration} size={20} />
          </li>
        );
      })}
    </ol>
  );
}
