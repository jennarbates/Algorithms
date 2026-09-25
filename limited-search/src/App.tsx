import { useState } from 'react';
import { ManyBoards } from './chapters/ManyBoards';
import { OneBoard } from './chapters/OneBoard';
import { Play } from './chapters/Play';
import { TwoBoards } from './chapters/TwoBoards';
import { Practice } from './components/Practice';

/**
 * The page: finding a board's bending strength, in four chapters and a
 * practice mode.
 *
 * The same shell as `../bounds` and `../graphs`. The first two chapters are
 * the lecture's two ends, one board and plenty of boards. The third is a
 * sandbox for the two-board problem, which the page states and does not solve:
 * the reader brings the strategy, the page checks it against every strength.
 */

type Mode = 'one' | 'many' | 'two' | 'play' | 'practice';

const MODES: readonly { readonly id: Mode; readonly label: string; readonly rule: string }[] = [
  { id: 'one', label: '1 · One board', rule: 'The last board can only go up one weight at a time' },
  { id: 'many', label: '2 · Plenty of boards', rule: 'Spare boards buy the right to test high' },
  { id: 'two', label: '3 · Two boards', rule: 'Your list, run against every possible strength' },
  { id: 'play', label: '4 · Play it', rule: 'You pick the weights; the board answers' },
  { id: 'practice', label: 'Practice', rule: 'Particular lists, worked out exactly' },
];

export function App() {
  const [mode, setMode] = useState<Mode>('one');
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <main className="page">
      <header className="masthead">
        <div className="masthead__left">
          <a className="masthead__back" href="../">
            &larr; All visuals
          </a>
          <h1>Breaking boards</h1>
          <nav className="modes" aria-label="Chapters and practice">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={m.id === 'practice' ? 'modes__practice' : undefined}
              >
                {m.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="masthead__rule">
          <span className="masthead__rule-label">The idea</span>
          <span className="masthead__rule-text">{current?.rule}</span>
        </div>
      </header>

      <div className="deck">
        {mode === 'one' && <OneBoard />}
        {mode === 'many' && <ManyBoards />}
        {mode === 'two' && <TwoBoards />}
        {mode === 'play' && <Play />}
        {mode === 'practice' && <Practice />}
      </div>

      <p className="footnote">
        An optional COMPSCI 311 problem, left open. The strength is the heaviest weight a board
        holds, 0 to n; a test is one weight on one board, and a board that holds can be used again.
        Every count is the strategy run against all n + 1 strengths. Keys: &rarr; next test, &larr;
        back, Home and End.
      </p>
    </main>
  );
}
