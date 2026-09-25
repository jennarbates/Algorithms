import { Fragment, useMemo, useState } from 'react';
import { PairLines } from './PairLines';
import type { PairLine } from './PairLines';
import { PartyToken } from './PartyToken';
import { tiedGroups } from '../core/ties';
import type { TiedVerdict } from '../core/ties';
import type { Instance, Matching } from '../core/types';
import type { PartyKind } from '../content/narration';

/**
 * The board for lists with ties: both sides, every list with its ties shown,
 * one arrangement drawn across the middle, and the pairs that could break it.
 *
 * Nothing moves here. There is no run on this board, because the process has
 * no rule for a tie; there is an arrangement the reader picked and a verdict on
 * every pair, and the board is the verdict drawn. Each person's partner is
 * outlined in their own list, so "would rather have X than who they have" can
 * be read off the row without counting.
 */

interface TieBoardProps {
  readonly instance: Instance;
  readonly matching: Matching;
  /** Every pair that is an instability of either kind. */
  readonly verdicts: readonly TiedVerdict[];
  readonly focus?: { readonly student: string; readonly school: string } | null;
}

function TiedRow({
  id,
  name,
  party,
  prefs,
  tiedWithNext,
  partner,
}: {
  readonly id: string;
  readonly name: string;
  readonly party: PartyKind;
  readonly prefs: readonly string[];
  readonly tiedWithNext: readonly boolean[] | undefined;
  readonly partner: string | null;
}) {
  const other: PartyKind = party === 'student' ? 'school' : 'student';
  const groups = tiedGroups(prefs, tiedWithNext);
  return (
    <article className="row row--tied" data-role={party} data-id={id}>
      <header className="row__head">
        <PartyToken id={id} party={party} size={34} />
        <div className="row__ident">
          <div className="row__name">{name}</div>
        </div>
      </header>
      <ol className="tiedlist" aria-label={`${name}'s list, best first`}>
        {groups.map((group, g) => (
          <Fragment key={group.join('|')}>
            {g > 0 ? (
              <li className="tiedlist__sign" aria-hidden="true">
                &gt;
              </li>
            ) : null}
            <li
              className={
                group.length > 1 ? 'tiedlist__group tiedlist__group--tied' : 'tiedlist__group'
              }
            >
              {group.map((otherId, k) => (
                <Fragment key={otherId}>
                  {k > 0 ? (
                    <span className="tiedlist__eq" aria-label="tied with">
                      =
                    </span>
                  ) : null}
                  <span className={otherId === partner ? 'entry entry--partner' : 'entry'}>
                    <PartyToken id={otherId} party={other} size={26} />
                  </span>
                </Fragment>
              ))}
            </li>
          </Fragment>
        ))}
      </ol>
    </article>
  );
}

export function TieBoard({ instance, matching, verdicts, focus = null }: TieBoardProps) {
  const [board, setBoard] = useState<HTMLDivElement | null>(null);

  const lines = useMemo<PairLine[]>(() => {
    const together: PairLine[] = instance.students.flatMap((s) => {
      const school = matching[s.id];
      return school ? [{ student: s.id, school, kind: 'together' as const }] : [];
    });
    const broken: PairLine[] = verdicts.map((v) => ({
      student: v.student,
      school: v.school,
      kind: v.strong ? 'strong' : 'weak',
    }));
    return [...together, ...broken];
  }, [instance, matching, verdicts]);

  const occupant = (schoolId: string) =>
    instance.students.find((s) => matching[s.id] === schoolId)?.id ?? null;

  return (
    <div className="board">
      <div className="board__inner" ref={setBoard}>
        <section className="panel">
          <h2 className="panel__title">Students</h2>
          {instance.students.map((s) => (
            <TiedRow
              key={s.id}
              id={s.id}
              name={s.name}
              party="student"
              prefs={s.prefs}
              tiedWithNext={s.tiedWithNext}
              partner={matching[s.id] ?? null}
            />
          ))}
        </section>
        <section className="panel">
          <h2 className="panel__title">Schools</h2>
          {instance.schools.map((c) => (
            <TiedRow
              key={c.id}
              id={c.id}
              name={c.name}
              party="school"
              prefs={c.prefs}
              tiedWithNext={c.tiedWithNext}
              partner={occupant(c.id)}
            />
          ))}
        </section>
        <PairLines lines={lines} board={board} focus={focus} />
      </div>
    </div>
  );
}
