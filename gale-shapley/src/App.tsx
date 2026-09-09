import { useCallback, useState } from 'react';
import { createEngine, step } from './core/engine';
import type { EngineState } from './core/engine';
import { presetById } from './content/presets';
import { boardStatus } from './content/narration';
import { ActionBar } from './components/ActionBar';
import { AskerPanel } from './components/AskerPanel';
import { NarrationLog } from './components/NarrationLog';
import { PairChallenge } from './components/PairChallenge';
import { ReceiverPanel } from './components/ReceiverPanel';
import type { Side } from './core/types';

/**
 * Phase 2: the stepping view.
 *
 * One instance, one direction at a time, one proposal per two clicks. Choosing
 * the preset and comparing the two directions side by side come later; what is
 * here is the part that has to work before any of that is worth building.
 *
 * Everything is drawn as tentative until the process finishes, then it snaps
 * solid. That is not decoration. Believing a pairing is settled the moment it
 * is made is the single most common way people misunderstand this algorithm,
 * and the page should make that belief hard to hold.
 */

const INSTANCE = presetById('opener');

export function App() {
  const [askingSide, setAskingSide] = useState<Side>('students');
  const [state, setState] = useState<EngineState>(() => createEngine(INSTANCE, 'students'));
  /** Bumped whenever a fresh run starts, so the challenge forgets what was tried. */
  const [runId, setRunId] = useState(0);

  const onStep = useCallback(() => setState((current) => step(current)), []);

  const onReset = useCallback(() => {
    setState(createEngine(INSTANCE, askingSide));
    setRunId((n) => n + 1);
  }, [askingSide]);

  const switchSide = useCallback((side: Side) => {
    setAskingSide(side);
    setState(createEngine(INSTANCE, side));
    setRunId((n) => n + 1);
  }, []);

  const settled = state.phase === 'done';

  return (
    <main className={settled ? 'page stage-settled' : 'page'}>
      <header className="masthead">
        <h1>Who gets in, and why</h1>
        <p className="lede">
          Everyone here has ranked the other side. Nobody can be talked into anything. Watch what
          happens, and at the end try to find two people who would rather have each other.
        </p>

        <div className="sidepicker" role="group" aria-label="Which side does the asking">
          <span className="sidepicker__label">Who does the asking?</span>
          <button
            type="button"
            className={askingSide === 'students' ? 'pill pill--on' : 'pill'}
            onClick={() => switchSide('students')}
            aria-pressed={askingSide === 'students'}
          >
            Students
          </button>
          <button
            type="button"
            className={askingSide === 'schools' ? 'pill pill--on' : 'pill'}
            onClick={() => switchSide('schools')}
            aria-pressed={askingSide === 'schools'}
          >
            Schools
          </button>
        </div>
      </header>

      <ActionBar state={state} onStep={onStep} onReset={onReset} />

      <p className={settled ? 'board-status board-status--final' : 'board-status'}>
        {boardStatus(state)}
      </p>

      <div className="board">
        <AskerPanel instance={INSTANCE} state={state} />
        <ReceiverPanel instance={INSTANCE} state={state} />
      </div>

      <PairChallenge key={runId} instance={INSTANCE} state={state} />

      <h2 className="section-title">What has happened so far</h2>
      <NarrationLog state={state} />

      <p className="footnote">
        Real schools, real school colours, invented preferences. The marks are our own and no
        institutional logo is reproduced. Nobody here is a real applicant.
      </p>
    </main>
  );
}
