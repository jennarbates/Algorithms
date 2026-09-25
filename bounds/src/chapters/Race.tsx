import { useState } from 'react';
import { SLIDE_16, factorial, isPolynomial, showGrowth } from '../core/growth';
import { Chart } from '../components/Chart';
import { fmt } from '../components/format';
import type { Series } from '../components/Chart';
import { Segmented } from '../components/Controls';

/**
 * Chapter 4: polynomial or not.
 *
 * Slide 16's nine running times on one chart, with the three that are not
 * polynomial set apart. On a linear axis everything but the exponentials is a
 * flat line at the bottom; on a logarithmic one the polynomials bend over and
 * the exponentials go straight up, which is the picture of "any exponential
 * beats any polynomial". The table beside it turns the numbers into time at a
 * billion steps a second, which is where the definition of efficient comes
 * from.
 *
 * The last card is slide 14: stable matching by brute force against
 * propose-and-reject, n! against n².
 */

const RATE = 1e9;

function seconds(steps: number): string {
  if (!Number.isFinite(steps)) return 'forever';
  const s = steps / RATE;
  if (s < 1e-6) return `${(s * 1e9).toFixed(0)} ns`;
  if (s < 1e-3) return `${(s * 1e6).toFixed(1)} µs`;
  if (s < 1) return `${(s * 1e3).toFixed(1)} ms`;
  if (s < 120) return `${s.toFixed(1)} s`;
  if (s < 7200) return `${(s / 60).toFixed(0)} minutes`;
  if (s < 172800) return `${(s / 3600).toFixed(0)} hours`;
  if (s < 3.15e7 * 2) return `${(s / 86400).toFixed(0)} days`;
  const y = s / 3.15e7;
  return y < 1e6 ? `${fmt(y)} years` : `${fmt(y)} years (the universe is ~1.4·10¹⁰)`;
}

export function Race() {
  const [n, setN] = useState(30);
  const [scale, setScale] = useState<'log' | 'linear'>('log');
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set(SLIDE_16.map((f) => f.id)));

  const series: Series[] = SLIDE_16.map((f) => ({
    id: f.id,
    label: f.label,
    at: f.at,
    tone: shown.has(f.id) ? (isPolynomial(f.growth) ? 'good' : 'bad') : 'faded',
    dashed: !isPolynomial(f.growth),
  }));

  const toggle = (id: string) =>
    setShown((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The race">
        <div className="boardcol__head">
          <label className="pick">
            <span className="seg__label">n up to</span>
            <input
              type="range"
              min={5}
              max={60}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              aria-label="n"
            />
            <b className="pick__value">{n}</b>
          </label>
          <Segmented
            label="y axis"
            value={scale}
            onChange={setScale}
            options={[
              { value: 'log', label: 'Logarithmic' },
              { value: 'linear', label: 'Linear' },
            ]}
          />
        </div>

        <p className="board-status" aria-live="polite">
          {scale === 'log'
            ? 'On a log scale a polynomial bends over and an exponential is a straight line going up. Every straight line eventually passes every curve that bends.'
            : `On a linear scale, by n = ${n} the exponentials make every polynomial look flat. Switch to logarithmic to see them at all.`}
        </p>

        <div className="board">
          <Chart
            series={series}
            xMax={n}
            xMin={1}
            log={scale === 'log'}
            whole
            label={`Nine running times from n = 1 to ${n}`}
          />
          <div className="legend">
            {SLIDE_16.map((f) => (
              <button
                key={f.id}
                type="button"
                className={shown.has(f.id) ? 'chip chip--on' : 'chip'}
                aria-pressed={shown.has(f.id)}
                onClick={() => toggle(f.id)}
              >
                <i className={`key key--${isPolynomial(f.growth) ? 'good' : 'bad key--dashed'}`} />{' '}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">At n = {n}, a billion steps a second</h2>
          <table className="values values--wide">
            <thead>
              <tr>
                <th className="l">running time</th>
                <th className="l">class</th>
                <th>time</th>
              </tr>
            </thead>
            <tbody>
              {SLIDE_16.map((f) => (
                <tr key={f.id} className={isPolynomial(f.growth) ? '' : 'values__bad'}>
                  <td className="l">{f.label}</td>
                  <td className="l">
                    {isPolynomial(f.growth)
                      ? `polynomial, Θ(${showGrowth(f.growth)})`
                      : `not: Θ(${showGrowth(f.growth)})`}
                  </td>
                  <td>{seconds(f.at(n))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="card__note">
            Polynomial time means O(nᵈ) for some constant d. The first six qualify, even 20n² + 2n +
            3 with its big constant. The last three do not, whatever d you pick.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Stable matching, slide 14</h2>
          <p>
            Brute force tries every matching: n! of them. At n = {n} that is{' '}
            <b>{fmt(factorial(n))}</b> matchings, or {seconds(factorial(n))}.
          </p>
          <p>
            Propose-and-reject makes at most n² = <b>{n * n}</b> proposals: {seconds(n * n)}.
          </p>
          <p className="card__note">
            "We must have done something clever." Polynomial time is the line between the two: it
            matches practice, it usually separates a clever algorithm from brute force, and it can
            be refuted.
          </p>
        </div>
      </aside>
    </div>
  );
}
