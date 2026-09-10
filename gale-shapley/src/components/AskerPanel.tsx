import { PartyToken } from './PartyToken';
import { askerKind, receiverKind } from '../content/narration';
import type { EngineState } from '../core/engine';
import type { Instance } from '../core/types';

/**
 * The side doing the asking.
 *
 * The thing to watch here is that the pointer only ever moves one way: down.
 * Nobody on this side ever goes back up their own list. That is half of why the
 * process finishes, and it is visible without being explained.
 */

interface AskerPanelProps {
  readonly instance: Instance;
  readonly state: EngineState;
}

function blurbFor(instance: Instance, id: string, isStudent: boolean): string | undefined {
  return isStudent
    ? instance.students.find((s) => s.id === id)?.reason
    : instance.schools.find((c) => c.id === id)?.note;
}

export function AskerPanel({ instance, state }: AskerPanelProps) {
  const mine = askerKind(state);
  const theirs = receiverKind(state);
  const pending = state.pending;

  return (
    <section className="panel">
      <h2 className="panel__title">
        {mine === 'student' ? 'Students' : 'Schools'} <span className="panel__role">asking</span>
      </h2>

      {state.roster.askers.map((party) => {
        const asker = state.askers[party.id];
        if (!asker) return null;

        const isAsking = pending?.asker === party.id;
        const blurb = blurbFor(instance, party.id, mine === 'student');

        return (
          <article
            key={party.id}
            className={isAsking ? 'row row--active' : 'row'}
            aria-current={isAsking ? 'step' : undefined}
            data-role="asker"
            data-id={party.id}
          >
            <header className="row__head">
              <PartyToken id={party.id} party={mine} size={40} />
              <div className="row__ident">
                <div className="row__name">{party.name}</div>
                {blurb ? <div className="row__blurb">{blurb}</div> : null}
              </div>
              {asker.heldBy === null ? <span className="chip chip--looking">looking</span> : null}
            </header>

            <ol className="ranking">
              {party.prefs.map((receiverId, index) => {
                const held = asker.heldBy === receiverId;
                const asking = isAsking && pending?.receiver === receiverId;
                const passed = index < asker.cursor && !held;
                // The caret marks who they will ask next. While a question is
                // already on the table it would just be pointing at that same
                // question, so it is suppressed.
                const next = asker.heldBy === null && index === asker.cursor && !asking;

                const classes = ['entry'];
                if (held) classes.push('entry--held');
                if (passed) classes.push('entry--passed');
                if (asking) classes.push('entry--asking');
                if (next) classes.push('entry--next');

                return (
                  <li key={receiverId} className={classes.join(' ')}>
                    <PartyToken id={receiverId} party={theirs} size={30} muted={passed} />
                  </li>
                );
              })}
            </ol>
          </article>
        );
      })}
    </section>
  );
}
