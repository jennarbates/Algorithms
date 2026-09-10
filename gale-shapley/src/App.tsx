import { useCallback, useRef, useState } from 'react';
import { presetById } from './content/presets';
import { boardStatus, pastStatus } from './content/narration';
import { ActionBar } from './components/ActionBar';
import { FinishesBody } from './components/FinishesBody';
import { HoldsBody } from './components/HoldsBody';
import type { Pair } from './components/HoldsBody';
import { LeftOutBody } from './components/LeftOutBody';
import { AskerPanel } from './components/AskerPanel';
import { MatchLines } from './components/MatchLines';
import { NarrationLog } from './components/NarrationLog';
import { PairChallenge } from './components/PairChallenge';
import { ReceiverPanel } from './components/ReceiverPanel';
import { WhyItWorks } from './components/WhyItWorks';
import { useRun } from './hooks/useRun';

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
 *
 * The whole run is kept, not just the latest moment, and the page can look at
 * any step of it. The board, the headline and the log all draw from whichever
 * moment is being looked at; only the step button cares about the latest.
 */

const INSTANCE = presetById('opener');

export function App() {
  const run = useRun(INSTANCE, 'students');
  const boardRef = useRef<HTMLDivElement>(null);

  const { state, askingSide, viewingPast } = run;
  const settled = state.phase === 'done';

  // The pair under test, shared between the challenge and the third claim,
  // and the would-be pairing the claim draws on the board while replaying.
  const [pair, setPair] = useState<Pair>({ student: null, school: null });
  const [ghost, setGhost] = useState<{ asker: string; receiver: string } | null>(null);
  const pick = useCallback((kind: 'student' | 'school', id: string) => {
    setPair((p) => (kind === 'student' ? { ...p, student: id } : { ...p, school: id }));
    setGhost(null);
  }, []);

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
            onClick={() => run.switchSide('students')}
            aria-pressed={askingSide === 'students'}
          >
            Students
          </button>
          <button
            type="button"
            className={askingSide === 'schools' ? 'pill pill--on' : 'pill'}
            onClick={() => run.switchSide('schools')}
            aria-pressed={askingSide === 'schools'}
          >
            Schools
          </button>
        </div>
      </header>

      <ActionBar state={state} locked={viewingPast} onStep={run.step} onReset={run.reset} />

      {viewingPast ? (
        <div className="board-status board-status--past" role="status">
          <span>{pastStatus(state, run.current)}</span>
          <button type="button" className="button button--small" onClick={run.backToNow}>
            Back to now
          </button>
        </div>
      ) : (
        <p className={settled ? 'board-status board-status--final' : 'board-status'}>
          {boardStatus(state)}
        </p>
      )}

      <div className={viewingPast ? 'board board--past' : 'board'} ref={boardRef}>
        <AskerPanel instance={INSTANCE} state={state} />
        <ReceiverPanel instance={INSTANCE} state={state} />
        <MatchLines state={state} boardRef={boardRef} ghost={viewingPast ? ghost : null} />
      </div>

      <PairChallenge key={run.runId} instance={INSTANCE} state={state} pair={pair} onPick={pick} />

      <WhyItWorks
        run={run}
        bodies={{
          finishes: <FinishesBody run={run} />,
          'nobody-left-out': <LeftOutBody run={run} />,
          holds: (
            <HoldsBody run={run} instance={INSTANCE} pair={pair} onPick={pick} onGhost={setGhost} />
          ),
        }}
      />

      <h2 className="section-title">What has happened so far</h2>
      <NarrationLog state={run.current} viewStep={run.viewStep} onView={run.viewAt} />

      <p className="footnote">
        Real schools, real school colours, invented preferences. The marks are our own and no
        institutional logo is reproduced. Nobody here is a real applicant.
      </p>
    </main>
  );
}
