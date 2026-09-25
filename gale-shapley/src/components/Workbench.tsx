import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AskerPanel } from './AskerPanel';
import { FinishesBody } from './FinishesBody';
import { ListEditor } from './ListEditor';
import { MatchLines } from './MatchLines';
import { NarrationLog } from './NarrationLog';
import { ReceiverPanel } from './ReceiverPanel';
import { TieBoard } from './TieBoard';
import {
  BENCH,
  BENCH_MAX,
  TIES_MAX,
  TIE_CHANCE,
  arrangementText,
  explainTied,
  shuffledMarket,
} from '../content/bench';
import { actionLabel, boardStatus } from '../content/narration';
import { askTally } from '../core/asks';
import { run as runToEnd } from '../core/engine';
import { reportEveryArrangement } from '../core/enumerate';
import { useRun } from '../hooks/useRun';
import type { Instance, Side } from '../core/types';

/**
 * The workbench: the reader's own lists, checked.
 *
 * The walkthrough shows one market and the practice section asks about a few
 * more, all of them chosen for the reader. A problem set sooner or later asks
 * the reader to choose: write lists that make something happen, or find out
 * whether some lists can. That is a loop of guess, check, adjust, and this is
 * somewhere to run it, with two instruments.
 *
 * **Ties.** Lists that may rank two people level, an arrangement the reader
 * picks, and every pair that could break it, marked strong or weak and drawn on
 * the board. Every arrangement of the market is listed with its counts, so a
 * question about all of them can be settled by looking. There is no run here:
 * the process has no rule for a tie, so this side only judges.
 *
 * **Counting asks.** Strict lists, the real process run on them, and the number
 * of asks it takes, with n and n² beside it for scale. Change a list and the run
 * starts again.
 *
 * The two keep separate lists. They are different questions about different
 * kinds of market, and a change made for one should not quietly move the other.
 *
 * The layout is the walkthrough's, class for class, so the one-screen rules and
 * the escape hatch that the README describes apply here unchanged: the board on
 * the left in a frame that scrolls if it must, the work on the right with one
 * scrolling body and the controls pinned under it.
 */

type Lens = 'ties' | 'count';
type Tab = 'lists' | 'result';

/** A stable string for a market, so the run can start over whenever it changes. */
function signature(market: Instance): string {
  return JSON.stringify([market.students.map((s) => s.prefs), market.schools.map((c) => c.prefs)]);
}

export function Workbench() {
  const [lens, setLens] = useState<Lens>('ties');
  const [tab, setTab] = useState<Tab>('result');
  const [seed, setSeed] = useState(3);
  const [tiesMarket, setTiesMarket] = useState<Instance>(() => shuffledMarket(3, 1, TIE_CHANCE));
  const [countMarket, setCountMarket] = useState<Instance>(() => shuffledMarket(4, 2));
  const [side, setSide] = useState<Side>('students');

  const lensPicker = (
    <div className="sidepicker" role="group" aria-label="What to look at">
      <span className="sidepicker__label">Look at</span>
      <button
        type="button"
        className={lens === 'ties' ? 'pill pill--on' : 'pill'}
        aria-pressed={lens === 'ties'}
        onClick={() => setLens('ties')}
      >
        Ties
      </button>
      <button
        type="button"
        className={lens === 'count' ? 'pill pill--on' : 'pill'}
        aria-pressed={lens === 'count'}
        onClick={() => setLens('count')}
      >
        Counting asks
      </button>
    </div>
  );

  const editor = (
    <ListEditor
      market={lens === 'ties' ? tiesMarket : countMarket}
      onChange={lens === 'ties' ? setTiesMarket : setCountMarket}
      max={lens === 'ties' ? TIES_MAX : BENCH_MAX}
      allowTies={lens === 'ties'}
      seed={seed}
      onSeed={setSeed}
    />
  );

  return lens === 'ties' ? (
    <TiesLens market={tiesMarket} tab={tab} onTab={setTab} picker={lensPicker} editor={editor} />
  ) : (
    <CountLens
      key={`${signature(countMarket)}:${side}`}
      market={countMarket}
      side={side}
      onSide={setSide}
      tab={tab}
      onTab={setTab}
      picker={lensPicker}
      editor={editor}
    />
  );
}

// ---------------------------------------------------------------------------
// The frame both lenses share
// ---------------------------------------------------------------------------

interface ShellProps {
  readonly head: ReactNode;
  readonly status: ReactNode;
  readonly board: ReactNode;
  readonly tab: Tab;
  readonly onTab: (tab: Tab) => void;
  readonly resultLabel: string;
  readonly resultHead: ReactNode;
  readonly result: ReactNode;
  readonly editor: ReactNode;
  readonly controls: ReactNode;
  readonly hint: string;
  readonly settled?: boolean;
}

function Shell(props: ShellProps) {
  const { tab, onTab } = props;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className={props.settled ? 'walk bench bench--settled' : 'walk bench'}>
      <section className="boardcol" aria-label="The board">
        <div className="boardcol__head">{props.head}</div>
        {props.status}
        {props.board}
      </section>

      <aside className="side">
        <div className="side__switch" role="group" aria-label="What to work on">
          {(
            [
              ['result', props.resultLabel],
              ['lists', 'Edit the lists'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={id === tab ? 'side__tab side__tab--on' : 'side__tab'}
              onClick={() => onTab(id)}
              aria-pressed={id === tab}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="side__head">
          {tab === 'lists' ? <h2 className="side__title">Your lists</h2> : props.resultHead}
        </div>

        <div className="side__body" ref={bodyRef}>
          {tab === 'lists' ? props.editor : props.result}
        </div>

        <div className="side__controls">{props.controls}</div>
        <p className="side__hint">{props.hint}</p>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ties
// ---------------------------------------------------------------------------

interface Picked {
  readonly market: Instance;
  readonly index: number;
  readonly pair: { readonly student: string; readonly school: string };
}

interface TiesLensProps {
  readonly market: Instance;
  readonly tab: Tab;
  readonly onTab: (tab: Tab) => void;
  readonly picker: ReactNode;
  readonly editor: ReactNode;
}

function TiesLens({ market, tab, onTab, picker, editor }: TiesLensProps) {
  const n = market.students.length;
  const fits = n <= TIES_MAX;
  const report = useMemo(() => (fits ? reportEveryArrangement(market) : []), [market, fits]);
  const [picked, setPicked] = useState(0);
  const [picked_, setPicked_] = useState<Picked | null>(null);

  const index = Math.min(picked, Math.max(0, report.length - 1));
  const row = report[index];

  // A highlight belongs to one arrangement of one set of lists. Carried over to
  // another it would point at a pair that may not be there, so it is kept with
  // what it was picked on and ignored anywhere else.
  const focus =
    picked_ && picked_.market === market && picked_.index === index ? picked_.pair : null;
  const setFocus = (pair: Picked['pair'] | null) =>
    setPicked_(pair ? { market, index, pair } : null);

  const status = row ? (
    <p className="board-status">
      Arrangement {index + 1} of {report.length}: {countWords(row.strong.length, 'strong')},{' '}
      {countWords(row.weak.length, 'weak')}.
    </p>
  ) : (
    <p className="board-status">{BENCH.tooBigForTies}</p>
  );

  const result = row ? (
    <div className="bench__result">
      <p className="lede">{BENCH.tiesLead}</p>
      <ul className="bench__key">
        <li>
          <span className="bench__swatch bench__swatch--strong" aria-hidden="true" />
          {BENCH.strongKey}
        </li>
        <li>
          <span className="bench__swatch bench__swatch--weak" aria-hidden="true" />
          {BENCH.weakKey} A strong pair is weak as well, and is drawn once, solid.
        </li>
      </ul>

      <h3 className="bench__cap">This arrangement</h3>
      <p className="bench__pairs">{arrangementText(market, row.matching)}</p>
      {row.weak.length === 0 ? (
        <p className="bench__none">{BENCH.noneHere}</p>
      ) : (
        <ul className="bench__why">
          {[...row.strong, ...row.weak.filter((v) => !v.strong)].map((v) => {
            const on = focus?.student === v.student && focus.school === v.school;
            return (
              <li key={`${v.student}|${v.school}`}>
                <button
                  type="button"
                  className={[
                    'bench__whybtn',
                    v.strong ? 'bench__whybtn--strong' : 'bench__whybtn--weak',
                    on ? 'bench__whybtn--on' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={on}
                  onClick={() => setFocus(on ? null : { student: v.student, school: v.school })}
                >
                  <b>{v.strong ? 'Strong. ' : 'Weak. '}</b>
                  {explainTied(market, v)}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="bench__cap">Every arrangement of these lists</h3>
      <ol className="bench__all">
        {report.map((r, k) => (
          <li key={arrangementText(market, r.matching)}>
            <button
              type="button"
              className={k === index ? 'bench__arr bench__arr--on' : 'bench__arr'}
              aria-pressed={k === index}
              onClick={() => setPicked(k)}
            >
              <span className="bench__arrtext">{arrangementText(market, r.matching)}</span>
              <span className="bench__counts">
                <span className={r.strong.length ? 'bench__n bench__n--strong' : 'bench__n'}>
                  {r.strong.length} strong
                </span>
                <span className={r.weak.length ? 'bench__n bench__n--weak' : 'bench__n'}>
                  {r.weak.length} weak
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  ) : (
    <p className="lede">{BENCH.tooBigForTies}</p>
  );

  return (
    <Shell
      head={picker}
      status={status}
      board={
        row ? (
          <TieBoard instance={market} matching={row.matching} verdicts={row.weak} focus={focus} />
        ) : (
          <div className="board" />
        )
      }
      tab={tab}
      onTab={onTab}
      resultLabel="Instabilities"
      resultHead={<h2 className="side__title">Which pairs could break it</h2>}
      result={result}
      editor={editor}
      controls={
        <>
          <button
            type="button"
            className="button"
            onClick={() => setPicked((k) => Math.max(0, Math.min(k, report.length - 1) - 1))}
            disabled={!row || index === 0}
          >
            Previous arrangement
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => setPicked((k) => Math.min(report.length - 1, k + 1))}
            disabled={!row || index === report.length - 1}
          >
            Next arrangement
          </button>
        </>
      }
      hint="Click an explanation to pick out its line on the board. Solid red is strong, dashed red is weak only."
    />
  );
}

function countWords(count: number, kind: string): string {
  return `${count} ${kind} ${count === 1 ? 'instability' : 'instabilities'}`;
}

// ---------------------------------------------------------------------------
// Counting asks
// ---------------------------------------------------------------------------

interface CountLensProps {
  readonly market: Instance;
  readonly side: Side;
  readonly onSide: (side: Side) => void;
  readonly tab: Tab;
  readonly onTab: (tab: Tab) => void;
  readonly picker: ReactNode;
  readonly editor: ReactNode;
}

function CountLens({ market, side, onSide, tab, onTab, picker, editor }: CountLensProps) {
  const run = useRun(market, side);
  const boardRef = useRef<HTMLDivElement>(null);
  const { state } = run;
  const settled = run.current.phase === 'done';
  const n = market.students.length;
  const sofar = askTally(state).used;

  // Both full runs, worked out up front, so the reader can see the number
  // without stepping to it and compare the two sides without switching.
  const totals = useMemo(
    () => ({
      students: runToEnd(market, 'students').log.filter((e) => e.kind === 'ask').length,
      schools: runToEnd(market, 'schools').log.filter((e) => e.kind === 'ask').length,
    }),
    [market],
  );

  const head = (
    <div className="bench__heads">
      {picker}
      <div className="sidepicker" role="group" aria-label="Which side does the asking">
        <span className="sidepicker__label">Who asks?</span>
        {(['students', 'schools'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={side === s ? 'pill pill--on' : 'pill'}
            aria-pressed={side === s}
            onClick={() => onSide(s)}
          >
            {s === 'students' ? 'Students' : 'Schools'}
          </button>
        ))}
      </div>
    </div>
  );

  const readout = (
    <div className="bench__readout" aria-live="polite">
      <span className="side__stepnum">{sofar}</span>
      <span className="side__steplabel">
        {settled ? (sofar === 1 ? 'ask in all' : 'asks in all') : 'asks so far'}
      </span>
      <span className="bench__scale">
        n = {n} · n² = {n * n}
      </span>
    </div>
  );

  const result = (
    <div className="bench__result">
      <p className="lede">{BENCH.countLead}</p>
      <p className="bench__totals">{boardStatus(state)}</p>
      <FinishesBody run={run} />
      <h3 className="bench__cap">Every step</h3>
      <NarrationLog state={run.current} viewStep={run.viewStep} onView={run.viewAt} />
    </div>
  );

  return (
    <Shell
      settled={settled}
      head={head}
      status={
        <p className={settled ? 'board-status board-status--final' : 'board-status'}>
          {n} a side, so n² = {n * n}. Run to the end, these lists take {totals.students}{' '}
          {totals.students === 1 ? 'ask' : 'asks'} with the students asking and {totals.schools}{' '}
          with the schools asking.
        </p>
      }
      board={
        <div className={run.viewingPast ? 'board board--past' : 'board'}>
          <div className="board__inner" ref={boardRef}>
            <AskerPanel instance={market} state={state} />
            <ReceiverPanel instance={market} state={state} />
            <MatchLines state={state} boardRef={boardRef} />
          </div>
        </div>
      }
      tab={tab}
      onTab={onTab}
      resultLabel="The asks"
      resultHead={readout}
      result={result}
      editor={editor}
      controls={
        <>
          <button
            type="button"
            className="button button--primary"
            onClick={run.step}
            disabled={run.viewingPast || state.phase === 'done'}
          >
            {actionLabel(state)}
          </button>
          <button
            type="button"
            className="button"
            onClick={run.finish}
            disabled={run.viewingPast || settled}
          >
            Run to the end
          </button>
          {run.viewingPast ? (
            <button type="button" className="button" onClick={run.backToNow}>
              Back to now
            </button>
          ) : (
            <button type="button" className="button" onClick={run.reset}>
              Start over
            </button>
          )}
        </>
      }
      hint={
        run.viewingPast
          ? 'You are looking back. Go back to now to carry on.'
          : 'Edit a list and the run starts again from nothing, with the count back at zero.'
      }
    />
  );
}
