import { useMemo, useState } from 'react';
import { evalQ } from '../core/poly';
import { DEEPER, TRIANGLES, boxSize, inBox } from '../core/programs';
import type { TripleLoop } from '../core/programs';
import { Code, Controls, Segmented } from '../components/Controls';
import { useSteps } from '../hooks/useSteps';

/**
 * Chapter 5: three loops deep.
 *
 * Chapter 3's triangle, one loop further in. The (i, j) grid is the same, and
 * each cell now carries a number: how many times the k loop runs for that pair.
 * The count is the sum of those numbers, row by row, and it is computed by
 * running the program, not by the formula. Then the two bounds that need no
 * exact count:
 *
 * - the ceiling lets every loop run to n: n · n · n, work that is not there;
 * - the floor keeps a box of triples, i in one band, j in another, k in a
 *   third, chosen so that every triple in the box really runs. The box's size
 *   is a product of three band widths, each a constant fraction of n.
 *
 * Neither program is from the slides. Both are checked against their formulas
 * for n = 0 to 40, and each box is checked to be all real steps.
 */

const LOOPS: Readonly<Record<string, TripleLoop>> = { triangles: TRIANGLES, deeper: DEEPER };

export function Deep() {
  const [id, setId] = useState('triangles');
  const [n, setN] = useState(7);
  const [show, setShow] = useState<'none' | 'box' | 'ceiling'>('none');
  const P = LOOPS[id] as TripleLoop;
  const steps = useMemo(() => P.run(n), [P, n]);
  // Jumps land at the first k of each (i, j) cell.
  const cellStarts = useMemo(
    () =>
      steps.flatMap((x, t) => {
        const prev = steps[t - 1];
        return !prev || prev.i !== x.i || prev.j !== x.j ? [t + 1] : [];
      }),
    [steps],
  );
  const s = useSteps(steps.length + 1, cellStarts);
  const current = s.step > 0 ? steps[s.step - 1] : undefined;
  const doneIn: Record<string, number> = {};
  for (const x of steps.slice(0, s.step)) {
    const key = `${x.i},${x.j}`;
    doneIn[key] = (doneIn[key] ?? 0) + 1;
  }

  const total = steps.length;
  const formula = Number(evalQ(P.count, n).n);
  const box = P.box(n);
  const kept = boxSize(box);
  const widths = [box.i, box.j, box.k].map((r) => Math.max(0, r.hi - r.lo + 1));
  const kWidth = widths[2] ?? 0;
  const rows = [...Array(n).keys()].map((a) =>
    [...Array(n).keys()].reduce((acc, b) => acc + P.height(n, a + 1, b + 1), 0),
  );
  const boxSteps = steps.filter((x) => inBox(box, x.i ?? 0, x.j ?? 0, x.k ?? 0)).length;
  const floorHolds = n >= P.floor.n0;

  const size = 100 / (n + 2);

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The grid">
        <div className="boardcol__head">
          <Segmented
            label="Program"
            value={id}
            onChange={(v) => {
              setId(v);
              s.go(0);
            }}
            options={[
              { value: 'triangles', label: 'triangles' },
              { value: 'deeper', label: 'deeper' },
            ]}
          />
          <label className="pick">
            <span className="seg__label">n =</span>
            <input
              type="range"
              min={3}
              max={10}
              value={n}
              onChange={(e) => {
                setN(Number(e.target.value));
                s.go(0);
              }}
              aria-label="n"
            />
            <b className="pick__value">{n}</b>
          </label>
          <Segmented
            label="Draw"
            value={show}
            onChange={setShow}
            options={[
              { value: 'none', label: 'Just the run' },
              { value: 'box', label: 'The floor: a box' },
              { value: 'ceiling', label: 'The ceiling: all n³' },
            ]}
          />
        </div>

        <p
          className={s.atEnd ? 'board-status board-status--final' : 'board-status'}
          aria-live="polite"
        >
          {s.step === 0
            ? `Each cell is one pair (i, j), and its number is how many times the k loop runs there. The count is the sum of the numbers. Step through, or jump a cell at a time.`
            : s.atEnd
              ? `Done: the inner line ran ${total} times. The rows add up to ${rows.join(' + ')} = ${total}, and ${P.countText} at n = ${n} is ${formula}.`
              : `i = ${current?.i}, j = ${current?.j}, k = ${current?.k}. ${s.step} of ${total} so far.`}
        </p>

        <div className="board board--split">
          <div className="board__code">
            <Code
              lines={P.lines.map((text, k) => ({ n: k + 1, text }))}
              current={current ? [4] : []}
            />
          </div>
          <div className="board__out">
            <svg
              className="grid grid--sums"
              viewBox={`0 0 100 ${(size * (n + 1)).toFixed(2)}`}
              role="img"
              aria-label={`The ${n} by ${n} grid of (i, j) pairs, each with how many times the k loop runs`}
            >
              {[...Array(n).keys()].map((a) => (
                <text
                  key={`r${a}`}
                  className="grid__label"
                  x={size * 0.5}
                  y={size * (a + 1.5)}
                  textAnchor="middle"
                >
                  {a + 1}
                </text>
              ))}
              {[...Array(n).keys()].map((b) => (
                <text
                  key={`c${b}`}
                  className="grid__label"
                  x={size * (b + 1.5)}
                  y={size * 0.6}
                  textAnchor="middle"
                >
                  {b + 1}
                </text>
              ))}
              <text className="grid__axis" x={size * 0.5} y={size * 0.6} textAnchor="middle">
                i\j
              </text>
              <text className="grid__axis" x={size * (n + 1.5)} y={size * 0.6} textAnchor="middle">
                row
              </text>
              {[...Array(n).keys()].flatMap((a) =>
                [...Array(n).keys()].map((b) => {
                  const i = a + 1;
                  const j = b + 1;
                  const key = `${i},${j}`;
                  const runs = P.reached(n, i, j);
                  const h = P.height(n, i, j);
                  const did = doneIn[key] ?? 0;
                  const now = current?.i === i && current.j === j;
                  const inB =
                    show === 'box' &&
                    i >= box.i.lo &&
                    i <= box.i.hi &&
                    j >= box.j.lo &&
                    j <= box.j.hi;
                  const cls = [
                    'cell',
                    runs ? 'cell--runs' : 'cell--skip',
                    runs && h > 0 && did === h ? 'cell--lit' : '',
                    now ? 'cell--now' : '',
                    inB ? 'cell--square' : '',
                    show === 'ceiling' ? 'cell--ceiling' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const label =
                    show === 'ceiling'
                      ? String(n)
                      : inB
                        ? String(kWidth)
                        : !runs
                          ? ''
                          : did > 0 && did < h
                            ? `${did}/${h}`
                            : String(h);
                  return (
                    <g key={key}>
                      <rect
                        className={cls}
                        x={size * (b + 1) + 0.4}
                        y={size * (a + 1) + 0.4}
                        width={size - 0.8}
                        height={size - 0.8}
                        rx={size * 0.12}
                      />
                      <text
                        className={`cell__h${(runs && h > 0 && did === h) || now ? ' cell__h--on' : ''}${inB ? ' cell__h--box' : ''}`}
                        x={size * (b + 1.5)}
                        y={size * (a + 1.5)}
                        textAnchor="middle"
                        style={{ fontSize: `${size * (label.length > 3 ? 0.3 : 0.42)}px` }}
                      >
                        {label}
                      </text>
                    </g>
                  );
                }),
              )}
              {rows.map((r, a) => (
                <text
                  key={`sum${a}`}
                  className="grid__sum"
                  x={size * (n + 1.5)}
                  y={size * (a + 1.5)}
                  textAnchor="middle"
                  style={{ fontSize: `${size * 0.4}px` }}
                >
                  {r}
                </text>
              ))}
            </svg>
          </div>
        </div>

        <Controls steps={s} jumpLabel="cell" />
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">Exactly: add up the cells</h2>
          <p className="formula">
            {rows.join(' + ')} = <b>{total}</b>
          </p>
          <p className="card__note">
            Those are the row totals, from the run. {P.sumText} At n = {n}, {P.countText} ={' '}
            {formula}, and the tests check the formula against the run for every n up to 40.
          </p>
        </div>

        <div className={show === 'ceiling' ? 'card card--good' : 'card'}>
          <h2 className="card__title">The ceiling: let every loop run to n</h2>
          <p className="formula">
            {total} ≤ {n} · {n} · {n} = {n ** 3}
          </p>
          <p className="card__note">
            Pretend each loop starts at 1 and ends at n. That only adds steps that are not there, so
            the real count is at most n³: O(n³), without adding anything up.
          </p>
        </div>

        <div className={show === 'box' ? 'card card--good' : 'card'}>
          <h2 className="card__title">The floor: keep a box, throw the rest away</h2>
          <p>
            Keep only {P.bands[0]}, {P.bands[1]} and {P.bands[2]}. At n = {n} that is{' '}
            {widths.join(' × ')} = <b>{kept}</b> triples, and the run executes all{' '}
            {boxSteps === kept ? kept : `${boxSteps} (not all!)`} of them.
          </p>
          <p className="card__note">
            {P.boxWhy} Each band is a constant fraction of n, so the box is at least n³/
            {P.floor.den} for every n ≥ {P.floor.n0}
            {floorHolds
              ? ` (here ${kept} ≥ ${n ** 3}/${P.floor.den} ≈ ${(n ** 3 / P.floor.den).toFixed(2)})`
              : ''}
            , checked up to n = 300. That is Ω(n³).
          </p>
          <button type="button" className="button button--small" onClick={() => setShow('box')}>
            Show the box
          </button>
        </div>

        <div className="card">
          <h2 className="card__title">Floor and ceiling together</h2>
          <p className="formula">
            {kept} ≤ {total} ≤ {n ** 3}
          </p>
          <p className="card__note">
            Both sides are constant multiples of n³, so the count is Θ(n³) and neither bound needed
            the exact sum. The recipe works for any loop nest: for the ceiling, stretch every loop
            to its largest range; for the floor, pick a band for each index, narrow enough that
            every triple in the box runs, wide enough that each band is a constant fraction of n.
          </p>
        </div>
      </aside>
    </div>
  );
}
