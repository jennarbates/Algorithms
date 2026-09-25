import { useState } from 'react';
import { bestN0, check } from '../core/bounds';
import type { Kind, Witness } from '../core/bounds';
import { evalF, evalQ, parseQ, polyScale, showPoly, showQ, cmp } from '../core/poly';
import { EXAMPLES } from '../content/examples';
import type { Example } from '../content/examples';
import { Chart, Legend } from '../components/Chart';
import type { Marker, Series } from '../components/Chart';
import { Segmented } from '../components/Controls';

/**
 * Chapter 1: a floor, a ceiling, or both.
 *
 * The reader picks a pair from the slides, picks O, Ω or Θ, and types the
 * constants and n₀. The page answers from the definition, exactly: either the
 * inequality holds at every whole n from n₀ on, or it names the first n where
 * it breaks, and whether any n₀ at all could have saved that constant. The
 * chart shades n ≥ n₀ and marks the break, so the verdict is something the
 * reader can see rather than take on trust.
 *
 * The one fact the chapter is built to earn: Ω is the same kind of claim as O,
 * turned upside down, and Θ is the two at once.
 */

const SUB = { lower: 'c₁', upper: 'c₂' } as const;

function first(): Example {
  const e = EXAMPLES[0];
  if (!e) throw new Error('no examples');
  return e;
}
const FIRST = first();

export function Floors() {
  const [id, setId] = useState(FIRST.id);
  const ex = EXAMPLES.find((e) => e.id === id) ?? FIRST;
  const [kind, setKind] = useState<Kind>(ex.kind);
  const [lowerText, setLower] = useState(ex.lower ?? '1');
  const [upperText, setUpper] = useState(ex.upper ?? '1');
  const [n0Text, setN0] = useState('0');

  const choose = (next: string) => {
    const e = EXAMPLES.find((x) => x.id === next);
    if (!e) return;
    setId(next);
    setKind(e.kind);
    setLower(e.lower ?? '1');
    setUpper(e.upper ?? e.lower ?? '1');
    setN0('0');
  };

  const lower = parseQ(lowerText);
  const upper = parseQ(upperText);
  const n0 = Number.parseInt(n0Text, 10);
  const needsLower = kind !== 'O';
  const needsUpper = kind !== 'Ω';
  const valid =
    (!needsLower || (lower !== null && lower.n > 0n)) &&
    (!needsUpper || (upper !== null && upper.n > 0n)) &&
    Number.isInteger(n0) &&
    n0 >= 0 &&
    !(kind === 'Θ' && lower && upper && cmp(lower, upper) > 0);

  const w: Witness = {
    n0: Number.isInteger(n0) ? Math.max(0, n0) : 0,
    ...(needsLower && lower ? { lower } : {}),
    ...(needsUpper && upper ? { upper } : {}),
  };
  const verdict = valid ? check(ex.T, ex.f, kind, w) : null;
  const best = valid ? bestN0(ex.T, ex.f, kind, w) : null;
  const failAt = verdict && !verdict.ok && verdict.side !== 'constant' ? verdict.at : null;

  const interesting = Math.max(w.n0, best ?? 0, failAt ?? 0);
  const xMax = Math.max(12, Math.ceil(interesting * 1.6 + 2));

  const series: Series[] = [
    { id: 'T', label: `T(n) = ${showPoly(ex.T)}`, at: (n) => evalF(ex.T, n), tone: 'T' },
  ];
  if (needsUpper && upper) {
    series.push({
      id: 'upper',
      label: `ceiling ${showQ(upper)}·${showPoly(ex.f)}`,
      at: (n) => evalF(polyScale(ex.f, upper), n),
      tone: 'upper',
    });
  }
  if (needsLower && lower) {
    series.push({
      id: 'lower',
      label: `floor ${showQ(lower)}·${showPoly(ex.f)}`,
      at: (n) => evalF(polyScale(ex.f, lower), n),
      tone: 'lower',
    });
  }

  // From n₀ on: fine up to the first break, broken until the smallest n₀ that
  // works (or for good), fine again after that.
  const shade: { from: number; to: number; tone: 'good' | 'bad' }[] = [];
  if (verdict?.ok) shade.push({ from: w.n0, to: xMax, tone: 'good' });
  else if (failAt !== null) {
    shade.push({ from: w.n0, to: failAt, tone: 'good' });
    shade.push({ from: failAt, to: best ?? xMax, tone: 'bad' });
    if (best !== null) shade.push({ from: best, to: xMax, tone: 'good' });
  }

  const markers: Marker[] = [{ n: w.n0, label: `n₀ = ${w.n0}`, tone: 'live' }];
  if (failAt !== null && verdict && !verdict.ok && verdict.side !== 'constant') {
    markers.push({ n: failAt, label: `breaks at n = ${failAt}`, tone: 'bad', on: verdict.side });
  }

  const relation = `${showPoly(ex.T)} = ${kind}(${showPoly(ex.f)})`;
  const status = (() => {
    if (!valid) {
      return kind === 'Θ' && lower && upper && cmp(lower, upper) > 0
        ? 'The floor constant c₁ has to be at most the ceiling constant c₂.'
        : 'Give each constant as a positive number (0.99, 1/2, 1e6 all work) and n₀ as a whole number.';
    }
    if (!verdict) return '';
    if (verdict.ok)
      return `It holds: at every whole n ≥ ${w.n0}. That is a proof that ${relation}.`;
    if (verdict.side === 'constant') return verdict.why;
    const which = verdict.side === 'upper' ? 'the ceiling' : 'the floor';
    if (verdict.hopeless) {
      return `It breaks at n = ${verdict.at}, and no n₀ can save this constant: ${which} is crossed for good. ${verdict.side === 'upper' ? 'T(n) outgrows it.' : 'It outgrows T(n).'}`;
    }
    return `It breaks at n = ${verdict.at}: ${which} is crossed there. This constant does work from n₀ = ${best ?? '?'} on.`;
  })();

  const gap = (n: number) => {
    const t = evalQ(ex.T, n);
    return {
      t,
      up: upper ? evalQ(polyScale(ex.f, upper), n) : null,
      lo: lower ? evalQ(polyScale(ex.f, lower), n) : null,
    };
  };
  const around = [
    ...new Set([w.n0, failAt ?? w.n0, best ?? w.n0].flatMap((c) => [c - 1, c, c + 1])),
  ]
    .filter((n) => n >= 0)
    .sort((a, b) => a - b)
    .slice(0, 9);

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The chart">
        <div className="boardcol__head">
          <label className="pick">
            <span className="seg__label">Pair</span>
            <select value={id} onChange={(e) => choose(e.target.value)}>
              {EXAMPLES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <Segmented
            label="Claim"
            value={kind}
            onChange={(k) => {
              setKind(k);
              if (k === 'Θ' && !ex.upper) setUpper(ex.lower ?? '1');
            }}
            options={[
              { value: 'O', label: 'O: ceiling' },
              { value: 'Ω', label: 'Ω: floor' },
              { value: 'Θ', label: 'Θ: both' },
            ]}
          />
        </div>

        <div className="witness" role="group" aria-label="Constants and threshold">
          {needsLower && (
            <ConstantField
              name={kind === 'Θ' ? SUB.lower : 'c'}
              hint="floor"
              value={lowerText}
              onChange={setLower}
            />
          )}
          {needsUpper && (
            <ConstantField
              name={kind === 'Θ' ? SUB.upper : 'c'}
              hint="ceiling"
              value={upperText}
              onChange={setUpper}
            />
          )}
          <label className="field">
            <span className="field__name">n₀</span>
            <input
              inputMode="numeric"
              value={n0Text}
              onChange={(e) => setN0(e.target.value)}
              aria-label="n zero"
            />
          </label>
          <button
            type="button"
            className="button"
            disabled={best === null || !valid}
            onClick={() => best !== null && setN0(String(best))}
          >
            Smallest n₀ for these constants
          </button>
        </div>

        <p
          className={
            verdict?.ok
              ? 'board-status board-status--final'
              : verdict
                ? 'board-status board-status--bad'
                : 'board-status'
          }
          aria-live="polite"
        >
          {status}
        </p>

        <div className="board">
          <Chart
            series={series}
            xMax={xMax}
            shade={shade}
            markers={markers}
            label={`${relation}: the chart from n = 0 to ${xMax}`}
          />
          <Legend series={series} />
        </div>
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">The claim</h2>
          <p className="formula">
            {kind === 'O' && `T(n) ≤ c·f(n) for all n ≥ n₀`}
            {kind === 'Ω' && `T(n) ≥ c·f(n) for all n ≥ n₀`}
            {kind === 'Θ' && `c₁·f(n) ≤ T(n) ≤ c₂·f(n) for all n ≥ n₀`}
          </p>
          <p className="card__note">
            {kind === 'O' &&
              'A ceiling: some constant multiple of f stays on or above T from n₀ on.'}
            {kind === 'Ω' &&
              'A floor: some constant multiple of f stays on or below T from n₀ on. The same definition as O, with the inequality turned round.'}
            {kind === 'Θ' &&
              'Both at once: T is pinned between two multiples of the same f. Tight: f is the right shape, not just a safe one.'}
          </p>
          <p className="card__note">
            <b>{ex.slide}.</b> {ex.note}
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Checked at whole numbers, exactly</h2>
          <table className="values">
            <thead>
              <tr>
                <th>n</th>
                {needsLower && lower && <th>{kind === 'Θ' ? 'c₁' : 'c'}·f(n)</th>}
                <th>T(n)</th>
                {needsUpper && upper && <th>{kind === 'Θ' ? 'c₂' : 'c'}·f(n)</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {valid &&
                around.map((n) => {
                  const g = gap(n);
                  const okUp = !needsUpper || !g.up || cmp(g.t, g.up) <= 0;
                  const okLo = !needsLower || !g.lo || cmp(g.t, g.lo) >= 0;
                  const ok = okUp && okLo;
                  return (
                    <tr key={n} className={n < w.n0 ? 'values__before' : ok ? '' : 'values__bad'}>
                      <td>{n}</td>
                      {needsLower && g.lo && <td>{showQ(g.lo)}</td>}
                      <td>{showQ(g.t)}</td>
                      {needsUpper && g.up && <td>{showQ(g.up)}</td>}
                      <td>{n < w.n0 ? 'before n₀' : ok ? '✓' : '✗'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <p className="card__note">
            No rounding anywhere: 0.99 is 99/100 and every comparison is between fractions. At the
            clicker's c = 0.99 the two sides meet at exactly n = 1000, which rounding would get
            wrong one way or the other.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">How to find a witness by hand</h2>
          <p className="card__note">
            <b>Ceiling:</b> round every term up to the biggest shape. 32n² + 17n + 1 ≤ 32n² + 17n² +
            n² = 50n² once n ≥ 1.
          </p>
          <p className="card__note">
            <b>Floor:</b> throw positive terms away. 4n + 10 ≥ 4n at every n. For a negative term,
            give up a little of the constant: n − 10 ≥ ½n once ½n ≥ 10, so from n = 20.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ConstantField({
  name,
  hint,
  value,
  onChange,
}: {
  readonly name: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
}) {
  const ok = parseQ(value) !== null;
  return (
    <label className={ok ? 'field' : 'field field--bad'}>
      <span className="field__name">
        {name} <span className="muted">({hint})</span>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${name}, the ${hint} constant`}
      />
    </label>
  );
}
