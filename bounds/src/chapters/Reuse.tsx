import { useMemo, useState } from 'react';
import { relates, showGrowth } from '../core/growth';
import { evalQ, mul, q, showQ } from '../core/poly';
import type { Q } from '../core/poly';
import { POWERS_FAST, POWERS_SLOW, TIMES_TABLE, X, countOf, written } from '../core/programs';
import type { Program } from '../core/programs';
import { Chart } from '../components/Chart';
import type { Series } from '../components/Chart';
import { Code, Segmented } from '../components/Controls';

/**
 * Chapter 6: same answer, less work.
 *
 * A table of the powers x¹ to xⁿ, made two ways. The slow one builds every
 * power from scratch, k multiplications for xᵏ, n(n + 1)/2 in all. The fast
 * one notices that xᵏ is xᵏ⁻¹ times x, and xᵏ⁻¹ is the entry it has just
 * written: n multiplications. Both tables are shown, from real runs, and they
 * are the same.
 *
 * "Strictly faster" is read off the ratio: g(n)/f(n) = 2/(n + 1), which goes to
 * 0, so g is O(f) and not Ω(f). The last card is the other half of the story:
 * how fast can anything be? An algorithm that must write n answers takes at
 * least n steps, so the fast one is already as fast as possible, and a
 * times table, n² answers, is Ω(n²) however it is computed.
 */

const div = (a: Q, b: Q): Q => mul(a, q(b.d, b.n));
const at = (p: Program, n: number): Q => evalQ(p.count, n);

const lineRuns = (p: Program, n: number) => {
  const out: Record<number, number> = {};
  for (const x of p.run(n)) out[x.line] = (out[x.line] ?? 0) + 1;
  return out;
};

export function Reuse() {
  const [n, setN] = useState(20);
  const [view, setView] = useState<'counts' | 'ratio'>('counts');
  const slow = countOf(POWERS_SLOW, n);
  const fast = countOf(POWERS_FAST, n);
  const ratio = div(at(POWERS_FAST, n), at(POWERS_SLOW, n));
  const slowRuns = useMemo(() => lineRuns(POWERS_SLOW, n), [n]);
  const fastRuns = useMemo(() => lineRuns(POWERS_FAST, n), [n]);
  const shown = Math.min(n, 6);
  const slowTable = written(POWERS_SLOW, shown);
  const fastTable = written(POWERS_FAST, shown);
  const table = written(TIMES_TABLE, n).length;

  const f = (m: number) => (m * (m + 1)) / 2;
  const series: Series[] =
    view === 'counts'
      ? [
          { id: 'slow', label: 'from scratch, n(n + 1)/2', at: f, tone: 'bad' },
          { id: 'fast', label: 'reusing, n', at: (m) => m, tone: 'good' },
          { id: 'floor', label: 'entries written, n', at: (m) => m, tone: 'lower', dashed: true },
        ]
      : [{ id: 'ratio', label: 'g(n)/f(n) = 2/(n + 1)', at: (m) => 2 / (m + 1), tone: 'T' }];

  const claims = [
    { rel: 'O' as const, ok: relates(POWERS_FAST.growth, 'O', POWERS_SLOW.growth) },
    { rel: 'Ω' as const, ok: relates(POWERS_FAST.growth, 'Ω', POWERS_SLOW.growth) },
    { rel: 'Θ' as const, ok: relates(POWERS_FAST.growth, 'Θ', POWERS_SLOW.growth) },
  ];

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The two programs">
        <div className="boardcol__head">
          <label className="pick">
            <span className="seg__label">n =</span>
            <input
              type="range"
              min={1}
              max={60}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              aria-label="n"
            />
            <b className="pick__value">{n}</b>
          </label>
          <Segmented
            label="Chart"
            value={view}
            onChange={setView}
            options={[
              { value: 'counts', label: 'Multiplications' },
              { value: 'ratio', label: 'The ratio g/f' },
            ]}
          />
        </div>

        <p className="board-status" aria-live="polite">
          {view === 'counts'
            ? `At n = ${n}: from scratch does ${slow} multiplications, reusing does ${fast}. Same table, ${showQ(div(at(POWERS_SLOW, n), at(POWERS_FAST, n)))} times the work.`
            : `g(n)/f(n) = ${fast}/${slow} = ${showQ(ratio)} at n = ${n}. It is 2/(n + 1), and it heads to 0: no constant c > 0 keeps g ≥ c·f.`}
        </p>

        <div className="board board--race">
          <div className="pair">
            <div>
              <p className="pair__title">
                f: {POWERS_SLOW.title}, <b>{slow}</b>
              </p>
              <Code
                lines={POWERS_SLOW.lines.map((text, k) => ({ n: k + 1, text }))}
                counts={slowRuns}
              />
            </div>
            <div>
              <p className="pair__title">
                g: {POWERS_FAST.title}, <b>{fast}</b>
              </p>
              <Code
                lines={POWERS_FAST.lines.map((text, k) => ({ n: k + 1, text }))}
                counts={fastRuns}
              />
            </div>
          </div>
          <Chart
            series={series}
            xMax={Math.max(n, 2)}
            xMin={1}
            whole
            label={
              view === 'counts'
                ? `Multiplications for n = 1 to ${n}, both ways`
                : `The ratio of the two counts for n = 1 to ${n}`
            }
          />
          <div className="legend" aria-hidden="true">
            {series.map((x) => (
              <span key={x.id} className="legend__item">
                <i className={`key key--${x.tone}${x.dashed ? ' key--dashed' : ''}`} /> {x.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">Same table, both ways</h2>
          <table className="values">
            <thead>
              <tr>
                <th className="l">k</th>
                {slowTable.map((_, k) => (
                  <th key={k}>{k + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="l">f writes</th>
                {slowTable.map((v, k) => (
                  <td key={k}>{v}</td>
                ))}
              </tr>
              <tr>
                <th className="l">g writes</th>
                {fastTable.map((v, k) => (
                  <td key={k}>{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="card__note">
            With x = {String(X)}, from real runs of both programs
            {n > shown ? `, the first ${shown} of ${n}` : ''}. The slow one computes xᵏ⁻¹ on its way
            to xᵏ, throws it away, and computes it again next time round. The fast one keeps it:
            that is the whole speed-up.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Strictly faster</h2>
          <table className="values">
            <thead>
              <tr>
                <th>n</th>
                <th>f(n)</th>
                <th>g(n)</th>
                <th>g/f</th>
              </tr>
            </thead>
            <tbody>
              {[10, 100, 1000, 10000].map((m) => (
                <tr key={m}>
                  <td>{m.toLocaleString('en-US')}</td>
                  <td>{Number(at(POWERS_SLOW, m).n).toLocaleString('en-US')}</td>
                  <td>{Number(at(POWERS_FAST, m).n).toLocaleString('en-US')}</td>
                  <td>{showQ(div(at(POWERS_FAST, m), at(POWERS_SLOW, m)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="claims">
            {claims.map((c) => (
              <li key={c.rel} className={c.ok ? 'claims__ok' : 'claims__no'}>
                <span className="claims__mark">{c.ok ? '✓' : '✗'}</span>g = {c.rel}(f), that is n ={' '}
                {c.rel}({showGrowth(POWERS_SLOW.growth)})
              </li>
            ))}
          </ul>
          <p className="card__note">
            g ≤ f is not enough: 2n is less than 3n and no faster in the Big-O sense. Strictly
            faster means the ratio goes to 0. Then g is O(f) but not Ω(f), and no constant factor
            makes up the gap.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">The output is a floor</h2>
          <p>
            Any program that fills P[1..n] writes n entries, so it takes at least n steps: Ω(n).
            Reusing does n multiplications and n writes, so it is Θ(n) and nothing can beat it by
            more than a constant.
          </p>
          <p>
            A {n} × {n} times table has <b>{table}</b> entries. Whatever the method, writing them is
            Ω(n²), so the plain double loop, n² steps, is already as fast as possible.
          </p>
          <p className="card__note">
            The floor can be weak: "does this list have a repeat?" has a one-word answer, so the
            output alone only gives Ω(1). Having to read all n inputs gives Ω(n), and neither says
            whether n² comparisons are necessary. They are not: sort first, then check neighbours.
          </p>
        </div>
      </aside>
    </div>
  );
}
