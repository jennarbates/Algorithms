import { Fragment } from 'react';
import { PartyToken } from './PartyToken';
import {
  BENCH,
  BENCH_MIN,
  TIE_CHANCE,
  editableCopy,
  moveEarlier,
  shuffledMarket,
  toggleTie,
} from '../content/bench';
import { PRESETS } from '../content/presets';
import type { PartyKind } from '../content/narration';
import type { Instance, School, Student } from '../core/types';

/**
 * The lists, made editable.
 *
 * Two moves and nothing else, so that nothing about the editor needs learning:
 * click a name to move it one place earlier, and, where ties are allowed, click
 * the sign between two names to tie them or untie them. Adjacent swaps reach
 * every order there is, and a tie between neighbours is the only kind a sorted
 * list can have, so the two moves between them reach every list.
 *
 * The size and the starting point sit above the lists. A new size deals fresh
 * shuffled lists rather than some tidy default, because a tidy default is a
 * particular market with particular properties, and the reader should be the
 * one who chooses those.
 */

interface ListEditorProps {
  readonly market: Instance;
  readonly onChange: (next: Instance) => void;
  /** The largest size on offer. */
  readonly max: number;
  readonly allowTies: boolean;
  /** Bumped on every shuffle, so the same size dealt twice gives different lists. */
  readonly seed: number;
  readonly onSeed: (next: number) => void;
}

function EditRow<P extends Student | School>({
  person,
  party,
  allowTies,
  nameOf,
  onChange,
}: {
  readonly person: P;
  readonly party: PartyKind;
  readonly allowTies: boolean;
  readonly nameOf: (id: string) => string;
  readonly onChange: (next: P) => void;
}) {
  const other: PartyKind = party === 'student' ? 'school' : 'student';
  return (
    <div className="editrow">
      <span className="editrow__who">
        <PartyToken id={person.id} party={party} size={24} />
        {person.name}
      </span>
      <span className="editrow__list">
        {person.prefs.map((id, k) => {
          const tied = !!person.tiedWithNext?.[k - 1];
          const before = person.prefs[k - 1];
          return (
            <Fragment key={id}>
              {k > 0 ? (
                allowTies ? (
                  <button
                    type="button"
                    className={tied ? 'editrow__sign editrow__sign--tied' : 'editrow__sign'}
                    onClick={() => onChange(toggleTie(person, k - 1))}
                    aria-pressed={tied}
                    title={tied ? 'Tied. Click to untie.' : 'Click to tie these two.'}
                    aria-label={`${tied ? 'Untie' : 'Tie'} ${nameOf(before ?? '')} and ${nameOf(id)} on ${person.name}'s list`}
                  >
                    {tied ? '=' : '>'}
                  </button>
                ) : (
                  <span className="editrow__sign editrow__sign--fixed" aria-hidden="true">
                    &gt;
                  </span>
                )
              ) : null}
              <button
                type="button"
                className="editrow__name"
                onClick={() => onChange(moveEarlier(person, k))}
                disabled={k === 0}
                title={k === 0 ? 'Already first' : 'Move one place earlier'}
                aria-label={`Move ${nameOf(id)} one place earlier on ${person.name}'s list`}
              >
                <PartyToken id={id} party={other} size={22} title={nameOf(id)} />
              </button>
            </Fragment>
          );
        })}
      </span>
    </div>
  );
}

export function ListEditor({ market, onChange, max, allowTies, seed, onSeed }: ListEditorProps) {
  const n = market.students.length;
  const sizes = Array.from({ length: max - BENCH_MIN + 1 }, (_, i) => BENCH_MIN + i);
  const starts = PRESETS.filter((p) => p.students.length <= max);

  const deal = (size: number) => {
    onSeed(seed + 1);
    onChange(shuffledMarket(size, seed + 1, allowTies ? TIE_CHANCE : 0));
  };

  const nameOf = (id: string) =>
    market.students.find((s) => s.id === id)?.name ??
    market.schools.find((c) => c.id === id)?.name ??
    id;

  const setStudent = (next: Student) =>
    onChange({ ...market, students: market.students.map((s) => (s.id === next.id ? next : s)) });
  const setSchool = (next: School) =>
    onChange({ ...market, schools: market.schools.map((c) => (c.id === next.id ? next : c)) });

  return (
    <div className="editor">
      <div className="editor__bar">
        <span className="sidepicker__label">People a side</span>
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            className={size === n ? 'pill pill--on pill--small' : 'pill pill--small'}
            aria-pressed={size === n}
            onClick={() => deal(size)}
          >
            {size}
          </button>
        ))}
        <button type="button" className="pill pill--small" onClick={() => deal(n)}>
          Shuffle
        </button>
      </div>

      <label className="editor__bar">
        <span className="sidepicker__label">Or start from</span>
        <select
          className="editor__select"
          value=""
          onChange={(e) => {
            const preset = starts.find((p) => p.id === e.target.value);
            if (preset) onChange(editableCopy(preset));
          }}
        >
          <option value="">a set of lists from this page…</option>
          {starts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.students.length} a side)
            </option>
          ))}
        </select>
      </label>

      <p className="editor__hint">{allowTies ? BENCH.editorHint : BENCH.editorHintStrict}</p>

      <h3 className="editor__cap">Each student wants, best first</h3>
      {market.students.map((s) => (
        <EditRow
          key={s.id}
          person={s}
          party="student"
          allowTies={allowTies}
          nameOf={nameOf}
          onChange={setStudent}
        />
      ))}

      <h3 className="editor__cap">Each school wants, best first</h3>
      {market.schools.map((c) => (
        <EditRow
          key={c.id}
          person={c}
          party="school"
          allowTies={allowTies}
          nameOf={nameOf}
          onChange={setSchool}
        />
      ))}
    </div>
  );
}
