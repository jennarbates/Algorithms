import { useState } from 'react';
import {
  UNLIMITED,
  adversary,
  apply,
  candidates,
  isFound,
  isStranded,
  isUseful,
  range,
  start,
} from '../core/boards';
import type { Knowledge, Test } from '../core/boards';
import { Segmented } from '../components/Controls';
import { NumberLine } from '../components/NumberLine';
import { boardsIn, boardsLeft, sayTest } from '../components/say';

/**
 * Chapter 4: play it.
 *
 * The reader picks every weight. The board answers either from a strength
 * drawn at random and kept hidden, or from an adversary that decides as it goes
 * (see `adversary` in the core): any answer it gives is consistent with some
 * strength, so it is as fair as a real board, only unlucky on purpose.
 */

type Boards = '1' | '2' | '3' | 'many';
type Opponent = 'hidden' | 'adversary';

interface Game {
  readonly k: Knowledge;
  readonly tests: readonly Test[];
  readonly hidden: number;
}

const draw = (n: number) => Math.floor(Math.random() * (n + 1));
const fresh = (n: number, b: number): Game => ({ k: start(n, b), tests: [], hidden: draw(n) });

export function Play() {
  const [n, setN] = useState(20);
  const [boards, setBoards] = useState<Boards>('2');
  const [opponent, setOpponent] = useState<Opponent>('adversary');
  const b = boards === 'many' ? UNLIMITED : Number(boards);
  const [game, setGame] = useState<Game>(() => fresh(20, 2));
  const [typed, setTyped] = useState('');

  const restart = (nn = n, bb = b) => {
    setGame(fresh(nn, bb));
    setTyped('');
  };

  const { k, tests } = game;
  const found = isFound(k);
  const stranded = isStranded(k);
  const over = found || stranded;

  const test = (w: number) => {
    if (over || !isUseful(k, w)) return;
    const broke = opponent === 'adversary' ? adversary(k, w) : w > game.hidden;
    const after = apply(k, w, broke);
    setGame({ ...game, k: after, tests: [...tests, { w, broke, board: k.broken + 1, after }] });
    setTyped('');
  };

  const last = tests[tests.length - 1];
  const truth = !over ? null : found ? k.lo : opponent === 'hidden' ? game.hidden : null;

  let status: string;
  if (found)
    status = `Found: the strength is ${k.lo}, in ${tests.length} test${tests.length === 1 ? '' : 's'}.${opponent === 'adversary' ? ' The adversary had to settle on it.' : ''}`;
  else if (stranded)
    status = `Out of boards, and the strength could still be ${range(k.lo, k.hi)}.${opponent === 'hidden' ? ` It was ${game.hidden}.` : ' The adversary never has to say which.'}`;
  else if (last) status = sayTest(last, tests.length - 1);
  else
    status = `The strength is ${range(0, n)}. You have ${boardsIn(b)}. Click a weight in the open stretch to test it.`;

  return (
    <div className="walk">
      <section className="boardcol" aria-label="Play it">
        <div className="boardcol__head">
          <label className="pick">
            <span className="seg__label">n</span>
            <input
              type="range"
              min={2}
              max={60}
              value={n}
              onChange={(e) => {
                const v = Number(e.target.value);
                setN(v);
                restart(v, b);
              }}
              aria-label="n, the number of weights"
            />
            <b className="pick__value">{n}</b>
          </label>
          <Segmented
            label="boards"
            value={boards}
            onChange={(v) => {
              setBoards(v);
              restart(n, v === 'many' ? UNLIMITED : Number(v));
            }}
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: 'many', label: 'Plenty' },
            ]}
          />
          <Segmented
            label="the board"
            value={opponent}
            onChange={(v) => {
              setOpponent(v);
              restart();
            }}
            options={[
              { value: 'adversary', label: 'Adversary' },
              { value: 'hidden', label: 'Random, hidden' },
            ]}
          />
        </div>

        <p
          className={`board-status${found ? ' board-status--final' : stranded ? ' board-status--bad' : ''}`}
          aria-live="polite"
        >
          {status}
        </p>

        <div className="board">
          <NumberLine
            n={n}
            k={k}
            tests={tests}
            truth={truth}
            onPickWeight={over ? undefined : test}
            label={`Weights 1 to ${n}, coloured by what your tests have shown`}
          />
          <div className="legend" aria-hidden="true">
            <span className="legend__item">
              <i className="sw sw--held" /> known to hold
            </span>
            <span className="legend__item">
              <i className="sw sw--open" /> strength is somewhere here: click to test
            </span>
            <span className="legend__item">
              <i className="sw sw--broke" /> known to break
            </span>
          </div>
        </div>

        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            test(Number(typed));
          }}
        >
          <label className="field field--row">
            <span className="seg__label">test weight</span>
            <input
              className="input--n"
              inputMode="numeric"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={over}
              aria-label="Weight to test"
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={over || !isUseful(k, Number(typed))}
          >
            Test
          </button>
          <button type="button" className="button" onClick={() => restart()}>
            New game
          </button>
          <span className="controls__count">
            {tests.length} test{tests.length === 1 ? '' : 's'}, {boardsLeft(k.boards)}
          </span>
        </form>
      </section>

      <aside className="work" aria-label="The work">
        <div className={`card${found ? ' card--good' : stranded ? ' card--bad' : ''}`}>
          <h2 className="card__title">Where you stand</h2>
          <p className="bigstat">
            <b>{tests.length}</b> tests
          </p>
          <p>
            {candidates(k) === 1
              ? `One strength left: ${k.lo}.`
              : `${candidates(k)} strengths still possible: ${range(k.lo, k.hi)}.`}{' '}
            {boardsLeft(k.boards).replace(/^./, (c) => c.toUpperCase())}.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Your tests</h2>
          {tests.length === 0 ? (
            <p className="card__note">None yet.</p>
          ) : (
            <ol className="log">
              {tests.map((t, i) => (
                <li key={i} className={t.broke ? 'log__broke' : 'log__held'}>
                  {t.w} on board {t.board}: {t.broke ? 'breaks' : 'holds'}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card">
          <h2 className="card__title">About the adversary</h2>
          <p className="card__note">
            It has not picked a strength. It answers each test however it likes, as long as some
            strength fits every answer so far. It breaks your last board whenever that would leave
            two or more strengths, and otherwise leaves you the bigger half. It only looks one test
            ahead, so a strategy that beats it is not proven; a strategy that loses to it is beaten.
            The chapter before checks a strategy against every strength.
          </p>
        </div>
      </aside>
    </div>
  );
}
