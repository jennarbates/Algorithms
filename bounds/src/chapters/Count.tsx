import { useMemo, useState } from 'react';
import { poly as grows, relates, showGrowth } from '../core/growth';
import type { Relation } from '../core/growth';
import { evalQ } from '../core/poly';
import { BAR, FOO, PRINT1, PRINT2, countOf } from '../core/programs';
import type { Program } from '../core/programs';
import { Code, Controls, Segmented } from '../components/Controls';
import { useSteps } from '../hooks/useSteps';

/**
 * Chapter 2: count every step, then bound the count.
 *
 * The lecture's bonus clickers, run for real. Pick a program and an n, step
 * through it one executed statement at a time, and watch the output and the
 * counter build up. The count is then set against the closed form, for every n
 * up to 10, and the bounds the clickers offer are each marked true or false.
 *
 * foo and bar are here too, from slide 4: both are O(n³), which is true and
 * misleading, and running them side by side at the same n is the quickest way
 * to see why the lecture needs Θ.
 */

const PROGS: Readonly<Record<string, Program>> = {
  print1: PRINT1,
  print2: PRINT2,
  foo: FOO,
  bar: BAR,
};

const CLAIMS: readonly { readonly rel: Relation; readonly a: number; readonly b?: number }[] = [
  { rel: 'Ω', a: 0.5 },
  { rel: 'Θ', a: 1 },
  { rel: 'Θ', a: 2 },
  { rel: 'Θ', a: 3 },
  { rel: 'O', a: 3 },
  { rel: 'O', a: 4 },
];

export function Count() {
  const [id, setId] = useState('print1');
  const [n, setN] = useState(4);
  const P = PROGS[id] as Program;
  const steps = useMemo(() => P.run(n), [P, n]);
  const s = useSteps(steps.length + 1);
  // Step 0 is "before anything runs"; step k shows the first k statements.
  const done = steps.slice(0, s.step);
  const current = s.step > 0 ? steps[s.step - 1] : undefined;
  const counted = done.filter((x) => x.counted).length;
  const total = countOf(P, n);
  const lineRuns: Record<number, number> = {};
  for (const x of done) lineRuns[x.line] = (lineRuns[x.line] ?? 0) + 1;

  const printed = done.map((x) => x.out ?? '').join('');
  const isPrint = P === PRINT1 || P === PRINT2;
  const maxN = P === BAR ? 5 : 8;

  const vars = current
    ? ['i', 'j', 'k']
        .filter((v) => current[v as 'i' | 'j' | 'k'] !== undefined)
        .map((v) => `${v} = ${current[v as 'i' | 'j' | 'k']}`)
        .join(', ')
    : '';

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The run">
        <div className="boardcol__head">
          <Segmented
            label="Program"
            value={id}
            onChange={(v) => {
              setId(v);
              setN((k) => Math.min(k, v === 'bar' ? 5 : 8));
              s.go(0);
            }}
            options={[
              { value: 'print1', label: 'Print1' },
              { value: 'print2', label: 'Print2' },
              { value: 'foo', label: 'foo' },
              { value: 'bar', label: 'bar' },
            ]}
          />
          <label className="pick">
            <span className="seg__label">n =</span>
            <input
              type="range"
              min={1}
              max={maxN}
              value={n}
              onChange={(e) => {
                setN(Number(e.target.value));
                s.go(0);
              }}
              aria-label="n"
            />
            <b className="pick__value">{n}</b>
          </label>
        </div>

        <p
          className={s.atEnd ? 'board-status board-status--final' : 'board-status'}
          aria-live="polite"
        >
          {s.step === 0
            ? `${P.title} with n = ${n}. Nothing has run yet.`
            : s.atEnd
              ? `Done: ${total} ${P.unit}. The formula ${P.countText} at n = ${n} gives ${Number(evalQ(P.count, n).n)}.`
              : `Line ${current?.line}${vars ? `, with ${vars}` : ''}${current?.out ? `: prints ${current.out}` : ''}.`}
        </p>

        <div className="board board--split">
          <div className="board__code">
            <Code
              lines={P.lines.map((text, k) => ({ n: k + 1, text }))}
              current={current ? [current.line] : []}
              counts={lineRuns}
            />
          </div>
          <div className="board__out">
            {isPrint ? (
              <div className="tape" aria-label="What has been printed">
                {[...printed].map((ch, k) => (
                  <span
                    key={k}
                    className={`tape__ch tape__ch--${ch}${k === printed.length - 1 ? ' tape__ch--new' : ''}`}
                  >
                    {ch}
                  </span>
                ))}
                {printed.length === 0 && <span className="muted">nothing printed yet</span>}
              </div>
            ) : (
              <div className="dots" aria-label="Times the inner line has run">
                {[...Array(total).keys()].map((k) => (
                  <span
                    key={k}
                    className={
                      k < counted ? (k === counted - 1 ? 'dot dot--new' : 'dot dot--on') : 'dot'
                    }
                  />
                ))}
              </div>
            )}
            <p className="counter">
              <b>{counted}</b> of {total} {P.unit}
            </p>
          </div>
        </div>

        <Controls steps={s} />
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">The count, for every n</h2>
          <table className="values">
            <thead>
              <tr>
                <th>n</th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
                  <th key={k} className={k === n ? 'values__on' : ''}>
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>ran</th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
                  <td key={k} className={k === n ? 'values__on' : ''}>
                    {countOf(P, k)}
                  </td>
                ))}
              </tr>
              <tr>
                <th>{P.countText}</th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
                  <td key={k} className={k === n ? 'values__on' : ''}>
                    {Number(evalQ(P.count, k).n)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="card__note">
            The top row is counted by running the program. The bottom row is the formula. They agree
            at every n, and the tests check them up to n = 40.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Which bounds are true?</h2>
          <ul className="claims">
            {CLAIMS.map((c) => {
              const g = grows(c.a, c.b ?? 0);
              const ok = relates(P.growth, c.rel, g);
              const tight = c.rel === 'Θ' && ok;
              return (
                <li key={`${c.rel}${c.a}`} className={ok ? 'claims__ok' : 'claims__no'}>
                  <span className="claims__mark">{ok ? '✓' : '✗'}</span>
                  {P.countText} = {c.rel}({showGrowth(g)})
                  {tight && <span className="claims__tight"> tight</span>}
                </li>
              );
            })}
          </ul>
          <p className="card__note">
            Several are true at once, and only one of them is tight. "The running time is O(n⁴)" is
            a correct sentence about Print1, just not a useful one.
          </p>
        </div>

        {(P === FOO || P === BAR) && (
          <div className="card">
            <h2 className="card__title">foo against bar</h2>
            <p>
              At n = {n}: foo runs {countOf(FOO, n)} times, bar {countOf(BAR, n)}. Both are O(n³).
            </p>
            <p className="card__note">
              O(n³) is true of both and says nothing about which is faster, because O is only a
              ceiling. foo is Θ(n²) and bar is Θ(n³): different, which is what the slide's "what is
              wrong?" is after.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
