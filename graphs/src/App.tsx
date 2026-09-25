import { useState } from 'react';
import { Forward } from './chapters/Forward';
import { Traverse } from './chapters/Traverse';
import { TwoColours } from './chapters/TwoColours';
import { Wave } from './chapters/Wave';
import { Practice } from './components/Practice';

/**
 * The page: four chapters and a practice mode, in one shell.
 *
 * The chapters follow lectures 4 to 6 in order, and each one is the same
 * shape: the graph on the left, where everything happens, and the work on the
 * right, which is what a person tracing the algorithm by hand would write down
 * (the layers, the call stack, the queue, the line counts). The board never
 * leaves the screen, for the reason `../gale-shapley` gives: every claim on the
 * right is about something drawn on the left.
 *
 * The line under the title is the one fact each chapter is built to earn, and
 * it stays in view the whole time.
 */

type Mode = 'wave' | 'traverse' | 'colours' | 'forward' | 'practice';

const MODES: readonly { readonly id: Mode; readonly label: string; readonly rule: string }[] = [
  { id: 'wave', label: '1 · BFS', rule: 'Layer i is exactly the nodes at distance i' },
  { id: 'traverse', label: '2 · DFS', rule: 'Queue: breadth first. Stack: depth first' },
  { id: 'colours', label: '3 · Two colours', rule: 'Bipartite exactly when there is no odd cycle' },
  {
    id: 'forward',
    label: '4 · Topological order',
    rule: 'A DAG, and only a DAG, has every edge pointing forward',
  },
  { id: 'practice', label: 'Practice', rule: 'Every answer is checked by running the algorithm' },
];

export function App() {
  const [mode, setMode] = useState<Mode>('wave');
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <main className="page">
      <header className="masthead">
        <div className="masthead__left">
          <a className="masthead__back" href="../">
            &larr; All visuals
          </a>
          <h1>How to walk a graph</h1>
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
        {mode === 'wave' && <Wave />}
        {mode === 'traverse' && <Traverse />}
        {mode === 'colours' && <TwoColours />}
        {mode === 'forward' && <Forward />}
        {mode === 'practice' && <Practice />}
      </div>

      <p className="footnote">
        Graphs from COMPSCI 311 lectures 4 to 6; the practice graphs are new. Keys: &rarr; next
        step, &larr; back, PgDn next stage, Home and End.
      </p>
    </main>
  );
}
