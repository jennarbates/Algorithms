import { useState } from 'react';
import { Count } from './chapters/Count';
import { Deep } from './chapters/Deep';
import { Floors } from './chapters/Floors';
import { Race } from './chapters/Race';
import { Reuse } from './chapters/Reuse';
import { Triangle } from './chapters/Triangle';
import { Practice } from './components/Practice';

/**
 * The page: lecture 3 in four chapters, two more that practise the same
 * skills on new programs, and a practice mode.
 *
 * The same shell as `../graphs`: the thing being argued about on the left, the
 * working on the right, and the one fact each chapter earns under the title.
 * `../big-o` is the ceiling on its own; this page is the floor, the two
 * together, and where the numbers they bound come from.
 */

type Mode = 'floors' | 'count' | 'triangle' | 'race' | 'deep' | 'reuse' | 'practice';

const MODES: readonly { readonly id: Mode; readonly label: string; readonly rule: string }[] = [
  { id: 'floors', label: '1 · Ω and Θ', rule: 'Ω is a floor, O a ceiling, Θ both at once' },
  {
    id: 'count',
    label: '2 · Count every step',
    rule: 'Count exactly first; the bound is read off the count',
  },
  { id: 'triangle', label: '3 · The triangle', rule: 'Floors come from throwing work away' },
  { id: 'race', label: '4 · Polynomial or not', rule: 'Efficient means O(nᵈ) for some constant d' },
  {
    id: 'deep',
    label: '5 · Three loops deep',
    rule: 'Stretch every loop for a ceiling; keep a box for a floor',
  },
  {
    id: 'reuse',
    label: '6 · Same answer, less work',
    rule: 'Keep what you computed; the output is a floor',
  },
  { id: 'practice', label: 'Practice', rule: 'Any witness that really holds is right' },
];

export function App() {
  const [mode, setMode] = useState<Mode>('floors');
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <main className="page">
      <header className="masthead">
        <div className="masthead__left">
          <a className="masthead__back" href="../">
            &larr; All visuals
          </a>
          <h1>Floors and ceilings</h1>
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
        {mode === 'floors' && <Floors />}
        {mode === 'count' && <Count />}
        {mode === 'triangle' && <Triangle />}
        {mode === 'race' && <Race />}
        {mode === 'deep' && <Deep />}
        {mode === 'reuse' && <Reuse />}
        {mode === 'practice' && <Practice />}
      </div>

      <p className="footnote">
        COMPSCI 311 lecture 3, with the Big-O building's own example. Every verdict is checked
        exactly, in fractions, at whole numbers. Keys: &rarr; next step, &larr; back, Home and End.
      </p>
    </main>
  );
}
