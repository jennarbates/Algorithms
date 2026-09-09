import { PartyToken } from './PartyToken';
import { askerKind, receiverKind } from '../content/narration';
import type { EngineState } from '../core/engine';
import type { Instance } from '../core/types';

/**
 * The side being asked.
 *
 * The thing to watch here is the mirror image of the other panel: whoever is
 * being held only ever moves UP this side's list, and once somebody is held,
 * somebody is always held. Nobody on this side ever goes back to empty.
 *
 * The dimmed entries are people who asked and were let go. Keeping them visible
 * is what makes the second invariant obvious: the person being held is always
 * the best of a set that only ever grows.
 */

interface ReceiverPanelProps {
  readonly instance: Instance;
  readonly state: EngineState;
}

function blurbFor(instance: Instance, id: string, isStudent: boolean): string | undefined {
  return isStudent
    ? instance.students.find((s) => s.id === id)?.reason
    : instance.schools.find((c) => c.id === id)?.note;
}

export function ReceiverPanel({ instance, state }: ReceiverPanelProps) {
  const mine = receiverKind(state);
  const theirs = askerKind(state);
  const pending = state.pending;

  return (
    <section className="panel">
      <h2 className="panel__title">
        {mine === 'student' ? 'Students' : 'Schools'}{' '}
        <span className="panel__role">being asked</span>
      </h2>

      {state.roster.receivers.map((party) => {
        const receiver = state.receivers[party.id];
        if (!receiver) return null;

        const isBeingAsked = pending?.receiver === party.id;
        const blurb = blurbFor(instance, party.id, mine === 'student');

        return (
          <article
            key={party.id}
            className={isBeingAsked ? 'row row--active' : 'row'}
            aria-current={isBeingAsked ? 'step' : undefined}
          >
            <header className="row__head">
              <PartyToken id={party.id} party={mine} size={40} />
              <div className="row__ident">
                <div className="row__name">{party.name}</div>
                {blurb ? <div className="row__blurb">{blurb}</div> : null}
              </div>
              {receiver.holding === null ? <span className="chip">nobody yet</span> : null}
            </header>

            <ol className="ranking">
              {party.prefs.map((askerId) => {
                const held = receiver.holding === askerId;
                const asking = isBeingAsked && pending?.asker === askerId;
                const letGo = !held && receiver.seen.includes(askerId);

                const classes = ['entry'];
                if (held) classes.push('entry--held');
                if (letGo) classes.push('entry--passed');
                if (asking) classes.push('entry--asking');

                return (
                  <li key={askerId} className={classes.join(' ')}>
                    <PartyToken id={askerId} party={theirs} size={30} muted={letGo} />
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
