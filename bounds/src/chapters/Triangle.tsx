import { useMemo, useState } from 'react';
import { SUM_PRODUCT, inSquare, squareCount } from '../core/programs';
import { Code, Controls, Segmented } from '../components/Controls';
import { useSteps } from '../hooks/useSteps';

/**
 * Chapter 3: sum-product, and the two ways to get Ω(n²) out of it.
 *
 * Every (i, j) the inner line runs on is a cell in an n × n grid, and the
 * cells it runs on are the triangle j ≥ i. Stepping lights them in the order
 * the loops visit them. Then the two arguments from slide 10 are drawn on top:
 *
 * - the hard way counts the whole triangle, 1 + 2 + … + n = n(n + 1)/2;
 * - the easy way counts only the square with i ≤ n/2 and j ≥ n/2, which is all
 *   inside the triangle, so the program does at least that much work.
 *
 * The easy way's count is shown exactly, ⌊n/2⌋(⌊n/2⌋ + 1), next to the slide's
 * (n/2)², and for odd n the page says plainly that the slide's line is a
 * quarter out, and why the conclusion survives it.
 */

export function Triangle() {
  const [n, setN] = useState(8);
  const [show, setShow] = useState<'none' | 'square' | 'ceiling'>('none');
  const steps = useMemo(() => SUM_PRODUCT.run(n), [n]);
  // Jumps land at the start of each row, where j = i.
  const rowStarts = useMemo(() => steps.flatMap((x, k) => (x.i === x.j ? [k + 1] : [])), [steps]);
  const s = useSteps(steps.length + 1, rowStarts);
  const done = new Set(steps.slice(0, s.step).map((x) => `${x.i},${x.j}`));
  const current = s.step > 0 ? steps[s.step - 1] : undefined;
  const total = steps.length;
  const square = squareCount(n);
  const half = n / 2;
  const slide = half * half;

  const size = 100 / (n + 1);

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The grid">
        <div className="boardcol__head">
          <label className="pick">
            <span className="seg__label">n =</span>
            <input
              type="range"
              min={2}
              max={14}
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
              { value: 'square', label: 'The easy way: a square inside' },
              { value: 'ceiling', label: 'The ceiling: all n²' },
            ]}
          />
        </div>

        <p
          className={s.atEnd ? 'board-status board-status--final' : 'board-status'}
          aria-live="polite"
        >
          {s.step === 0
            ? `Each cell is one pair (i, j). The inner line runs on a cell only when j ≥ i. Step through, or jump to the end.`
            : s.atEnd
              ? `Done: the inner line ran ${total} times, on every cell with j ≥ i. That is 1 + 2 + … + ${n} = ${n}·${n + 1}/2 = ${total}.`
              : `i = ${current?.i}, j = ${current?.j}: sum += A[${current?.i}]·A[${current?.j}]. ${done.size} of ${total} so far.`}
        </p>

        <div className="board board--split">
          <div className="board__code">
            <Code
              lines={SUM_PRODUCT.lines.map((text, k) => ({ n: k + 1, text }))}
              current={current ? [4] : []}
            />
          </div>
          <div className="board__out">
            <svg
              className="grid"
              viewBox="0 0 100 100"
              role="img"
              aria-label={`The ${n} by ${n} grid of (i, j) pairs`}
            >
              {[...Array(n).keys()].map((a) => (
                <text
                  key={`r${a}`}
                  className="grid__label"
                  x={size * 0.5}
                  y={size * (a + 1.6)}
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
                  y={size * 0.7}
                  textAnchor="middle"
                >
                  {b + 1}
                </text>
              ))}
              {[...Array(n).keys()].flatMap((a) =>
                [...Array(n).keys()].map((b) => {
                  const i = a + 1;
                  const j = b + 1;
                  const runs = j >= i;
                  const lit = done.has(`${i},${j}`);
                  const now = current?.i === i && current.j === j;
                  const sq = show === 'square' && inSquare(n, i, j);
                  const cls = [
                    'cell',
                    runs ? 'cell--runs' : 'cell--skip',
                    lit ? 'cell--lit' : '',
                    now ? 'cell--now' : '',
                    sq ? 'cell--square' : '',
                    show === 'ceiling' ? 'cell--ceiling' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <rect
                      key={`${i},${j}`}
                      className={cls}
                      x={size * (b + 1) + 0.4}
                      y={size * (a + 1) + 0.4}
                      width={size - 0.8}
                      height={size - 0.8}
                      rx={size * 0.12}
                    />
                  );
                }),
              )}
              <text className="grid__axis" x={size * 0.5} y={size * 0.7} textAnchor="middle">
                i\j
              </text>
            </svg>
          </div>
        </div>

        <Controls steps={s} jumpLabel="row" />
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">The hard way: count all of it</h2>
          <p className="formula">
            {n <= 8
              ? [...Array(n).keys()].map((k) => n - k).join(' + ')
              : `${n} + ${n - 1} + ${n - 2} + … + 2 + 1`}{' '}
            = {n}·{n + 1}/2 = <b>{total}</b>
          </p>
          <p className="card__note">
            Row i runs n − i + 1 times. Adding the rows gives n(n + 1)/2, which is at least n²/2: so
            Ω(n²), and also at most n², so Θ(n²).
          </p>
        </div>

        <div className={show === 'square' ? 'card card--good' : 'card'}>
          <h2 className="card__title">The easy way: ignore most of it</h2>
          <p>
            Keep only i ≤ n/2 and j ≥ n/2. Those cells all have j ≥ i, so they all really run, and
            there are <b>{square}</b> of them ({Math.floor(n / 2)} rows × {Math.floor(n / 2) + 1}{' '}
            columns).
          </p>
          <p className="card__note">
            {n % 2 === 0
              ? `n is even, so this is at least the slide's (n/2)² = ${slide}. Either way it is a constant times n², which is all Ω(n²) needs.`
              : `n is odd, and here the slide's "at least (n/2)²" is a quarter out: (${n}/2)² = ${slide}, but the square has ${square}. It is still at least ((n − 1)/2)² = ${((n - 1) / 2) ** 2}, a constant times n² for n ≥ 2, so the conclusion Ω(n²) stands.`}
          </p>
          <button type="button" className="button button--small" onClick={() => setShow('square')}>
            Show the square
          </button>
        </div>

        <div className="card">
          <h2 className="card__title">Floor and ceiling together</h2>
          <p className="formula">
            {square} ≤ {total} ≤ {n * n}
          </p>
          <p className="card__note">
            The square is a floor, the full n × n grid a ceiling, and both are constant multiples of
            n². That is Θ(n²) without ever needing the exact count, which is the point of the easy
            way: lower bounds come from throwing work away, upper bounds from adding work that is
            not there.
          </p>
        </div>
      </aside>
    </div>
  );
}
