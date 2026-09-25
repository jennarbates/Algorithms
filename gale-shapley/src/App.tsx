import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { presetById } from './content/presets';
import { boardStatus, pastStatus } from './content/narration';
import { FinishesBody } from './components/FinishesBody';
import { HoldsBody } from './components/HoldsBody';
import type { Pair } from './components/HoldsBody';
import { LeftOutBody } from './components/LeftOutBody';
import { AskerPanel } from './components/AskerPanel';
import { MatchLines } from './components/MatchLines';
import { PairChallenge } from './components/PairChallenge';
import { Practice } from './components/Practice';
import { ReceiverPanel } from './components/ReceiverPanel';
import { WhyItWorks } from './components/WhyItWorks';
import { WorkColumn } from './components/WorkColumn';
import { useRun } from './hooks/useRun';
import type { Run } from './hooks/useRun';

/**
 * The page.
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
 *
 * The page has a second mode. Watching a run is not the same as being able to
 * work one, and the gap between them is where a problem set lives, so the
 * practice section takes the whole page over rather than sitting underneath the
 * board: a reader who can still see the answer cannot be asked for it.
 *
 * What this file owns is the shell: a header that holds still, a footnote that
 * holds still, and one growing area between them that is handed the rest of the
 * height. In the walkthrough that area is the board on the left and the work on
 * the right, and the split is the point rather than the decoration: every
 * argument the page makes is about people drawn on the board, so the board is
 * the one thing that never leaves the screen. The README has the rules that
 * keeps and the ways they break.
 */

const INSTANCE = presetById('opener');

type Ghost = { asker: string; receiver: string } | null;

export function App() {
  const run = useRun(INSTANCE, 'students');
  const boardRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'walk' | 'practice'>('walk');

  const settled = run.state.phase === 'done';

  // The pair under test, shared between the challenge and the third claim,
  // and the would-be pairing the claim draws on the board while replaying.
  const [pair, setPair] = useState<Pair>({ student: null, school: null });
  const [ghost, setGhost] = useState<Ghost>(null);
  const pick = useCallback((kind: 'student' | 'school', id: string) => {
    setPair((p) => (kind === 'student' ? { ...p, student: id } : { ...p, school: id }));
    setGhost(null);
  }, []);

  /**
   * The arrow keys, as the Big-O visual binds them: they belong to whichever
   * mode is on screen, and never to a text field.
   *
   * Left does not undo anything. There is no step-back on this page by design,
   * because a run that can be rewound invites the reader to treat a pairing as
   * decided and then undecided, which is the misreading the whole page is built
   * against. Left looks at an earlier moment, exactly as clicking a line of the
   * log does, and the run stays where it was. Escape comes back to it.
   */
  const { step, viewAt, backToNow, viewingPast, viewStep, stepCount } = run;
  const phase = run.state.phase;

  useEffect(() => {
    if (mode !== 'walk') return;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (event.key === 'ArrowRight') {
        if (viewingPast || phase === 'done') return;
        step();
      } else if (event.key === 'ArrowLeft') {
        const from = viewStep ?? stepCount;
        if (from <= 0) return;
        viewAt(from - 1);
      } else if (event.key === 'Escape') {
        if (!viewingPast) return;
        backToNow();
      } else {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, step, viewAt, backToNow, viewingPast, viewStep, stepCount, phase]);

  return (
    <main className={settled && mode === 'walk' ? 'page page--settled' : 'page'}>
      <header className="masthead">
        <div className="masthead__left">
          <a className="masthead__back" href="../">
            &larr; All visuals
          </a>
          <h1>Who gets in, and why</h1>

          <span className="modes" role="group" aria-label="Walkthrough or practice">
            <button type="button" onClick={() => setMode('walk')} aria-pressed={mode === 'walk'}>
              Walkthrough
            </button>
            <button
              type="button"
              onClick={() => setMode('practice')}
              aria-pressed={mode === 'practice'}
            >
              Practice
            </button>
          </span>
        </div>

        <div className="masthead__rule">
          <span className="masthead__rule-label">What we want</span>
          <span className="masthead__rule-text">
            No two people who would both rather have each other
          </span>
        </div>
      </header>

      <div className="deck">
        {mode === 'practice' ? (
          <Practice onLeave={() => setMode('walk')} />
        ) : (
          <Walkthrough
            run={run}
            boardRef={boardRef}
            pair={pair}
            ghost={ghost}
            onPick={pick}
            onGhost={setGhost}
          />
        )}
      </div>

      <p className="footnote">
        Real schools, real school colours, invented preferences. The marks are our own and no
        institutional logo is reproduced. Nobody here is a real applicant.
      </p>
    </main>
  );
}

interface WalkthroughProps {
  readonly run: Run;
  readonly boardRef: RefObject<HTMLDivElement | null>;
  readonly pair: Pair;
  readonly ghost: Ghost;
  readonly onPick: (kind: 'student' | 'school', id: string) => void;
  readonly onGhost: Dispatch<SetStateAction<Ghost>>;
}

function Walkthrough({ run, boardRef, pair, ghost, onPick, onGhost }: WalkthroughProps) {
  const { state, askingSide, viewingPast } = run;
  const settled = state.phase === 'done';

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The board">
        <div className="boardcol__head">
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
              title="Lecture 1 has the colleges do the asking. That is this setting."
            >
              Schools
            </button>
          </div>
        </div>

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

        <div className={viewingPast ? 'board board--past' : 'board'}>
          <div className="board__inner" ref={boardRef}>
            <AskerPanel instance={INSTANCE} state={state} />
            <ReceiverPanel instance={INSTANCE} state={state} />
            <MatchLines state={state} boardRef={boardRef} ghost={viewingPast ? ghost : null} />
          </div>
        </div>
      </section>

      <WorkColumn
        run={run}
        challenge={
          <PairChallenge
            key={run.runId}
            instance={INSTANCE}
            state={state}
            pair={pair}
            onPick={onPick}
          />
        }
        why={
          <WhyItWorks
            key={run.runId}
            run={run}
            bodies={{
              finishes: <FinishesBody run={run} />,
              'nobody-left-out': <LeftOutBody run={run} />,
              holds: (
                <HoldsBody
                  run={run}
                  instance={INSTANCE}
                  pair={pair}
                  onPick={onPick}
                  onGhost={onGhost}
                />
              ),
            }}
          />
        }
      />
    </div>
  );
}
