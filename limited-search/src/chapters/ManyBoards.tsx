import { useMemo, useState } from 'react';
import { UNLIMITED, andList, evaluate, halving, log2Ceil } from '../core/boards';
import { Segmented } from '../components/Controls';
import { Replay } from '../components/Replay';

/**
 * Chapter 2: plenty of boards.
 *
 * Binary search, as in lecture: test the middle of the strengths still
 * possible, and throw away half of them either way. With boards to spare that
 * is ⌈log₂(n + 1)⌉ tests. Then the same procedure with a fixed number of
 * boards, so the reader can watch it run out and see exactly what is left
 * unknown when it does.
 */

type Boards = 'many' | '3' | '2' | '1';

export function ManyBoards() {
  const [n, setN] = useState(100);
  const [boards, setBoards] = useState<Boards>('many');
  const [s, setS] = useState(37);
  const b = boards === 'many' ? UNLIMITED : Number(boards);
  const strategy = useMemo(() => halving(b), [b]);
  const ev = useMemo(() => evaluate(strategy, n), [strategy, n]);
  const strength = Math.min(s, n);
  const failing = ev.perStrength.filter((c) => c === null).length;

  return (
    <div className="walk">
      <section className="boardcol" aria-label="Plenty of boards">
        <div className="boardcol__head">
          <label className="pick">
            <span className="seg__label">n</span>
            <input
              type="range"
              min={2}
              max={200}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              aria-label="n, the number of weights"
            />
            <b className="pick__value">{n}</b>
          </label>
          <Segmented
            label="boards"
            value={boards}
            onChange={setBoards}
            options={[
              { value: 'many', label: 'As many as you like' },
              { value: '3', label: '3' },
              { value: '2', label: '2' },
              { value: '1', label: '1' },
            ]}
          />
          <label className="pick">
            <span className="seg__label">strength</span>
            <input
              type="range"
              min={0}
              max={n}
              value={strength}
              onChange={(e) => setS(Number(e.target.value))}
              aria-label="The board's true strength"
            />
            <b className="pick__value">{strength}</b>
          </label>
        </div>
        <Replay
          key={`${n}-${boards}-${strength}`}
          strategy={strategy}
          n={n}
          s={strength}
          onPick={setS}
          ev={ev}
        />
      </section>

      <aside className="work" aria-label="The work">
        {ev.ok ? (
          <div className="card card--good">
            <h2 className="card__title">Worst case, checked against all {n + 1} strengths</h2>
            <p className="bigstat">
              <b>{ev.worst}</b> tests
            </p>
            <p>
              {n + 1} possible strengths, and each test keeps at most half of them (rounding up).
              After t tests at most ⌈(n + 1)/2ᵗ⌉ are left, so it takes ⌈log₂(n + 1)⌉ = {log2Ceil(n)}{' '}
              tests to get down to one.
            </p>
            <p className="card__note">
              {ev.worstAt.length <= 8
                ? `The worst case happens at strength${ev.worstAt.length === 1 ? '' : 's'} ${andList(ev.worstAt)}.`
                : `${ev.worstAt.length} of the ${n + 1} strengths need all ${ev.worst}.`}{' '}
              One board would need {n}.
            </p>
          </div>
        ) : (
          <div className="card card--bad">
            <h2 className="card__title">It runs out of boards</h2>
            <p>
              At strength <b>{ev.failure?.s}</b>: {ev.failure?.why}
            </p>
            <p className="card__note">
              It fails for {failing} of the {n + 1} strengths: the tall bars in the warning colour.
              Halving breaks a board every time the middle is too heavy, and it never checks how
              many it has left.
            </p>
          </div>
        )}

        <div className="card">
          <h2 className="card__title">What spare boards buy</h2>
          <p>
            With one board, a break is the end, so every test has to be safe. With boards to spare,
            a break just means the strength is lower, so you can test anywhere, and the middle
            throws away the most either way.
          </p>
          <p className="card__note">
            Set the boards to 2 and pick a low strength, then a high one. High strengths are found
            without a single break; low ones use up both boards early.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Between the two</h2>
          <p>
            One board costs n tests. Enough boards cost about log₂ n. The problem this page is built
            around asks what two boards can do: is there a way to use two that needs a vanishing
            fraction of n tests as n grows? The next chapter is a place to try your ideas.
          </p>
        </div>
      </aside>
    </div>
  );
}
