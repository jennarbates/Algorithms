import { useEffect, useMemo, useState } from 'react';
import { andList, evaluate, firstBoardList, log2Ceil, parseList, phaseOf } from '../core/boards';
import { Chart } from '../components/Chart';
import type { Dot, Series } from '../components/Chart';
import { Replay } from '../components/Replay';

/**
 * Chapter 3: two boards, the sandbox.
 *
 * The reader writes the first board's weights, the page adds the only safe way
 * to use the second, and every strength from 0 to n is run to find the worst
 * case. Strategies can be saved, at any n, and are plotted against the one-board
 * line n and the plenty-of-boards line log₂ n.
 *
 * This page deliberately offers no clever starting lists. The starting points
 * are there to be improved on, and the problem is the reader's.
 */

interface Saved {
  readonly n: number;
  readonly list: readonly number[];
  readonly worst: number;
}

const STORE = 'limited-search:saved';

function load(): Saved[] {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (d): d is Saved =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as Saved).n === 'number' &&
        Array.isArray((d as Saved).list) &&
        typeof (d as Saved).worst === 'number',
    );
  } catch {
    return [];
  }
}

function store(saved: readonly Saved[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(saved));
  } catch {
    /* not kept between visits, which is fine */
  }
}

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

export function TwoBoards() {
  const [n, setN] = useState(100);
  const [nText, setNText] = useState('100');
  const [text, setText] = useState('25, 50, 75');
  const [s, setS] = useState(60);
  const [saved, setSaved] = useState<readonly Saved[]>(load);

  useEffect(() => store(saved), [saved]);

  const parsed = useMemo(() => parseList(text, n), [text, n]);
  // While the text does not parse, keep running the last list that did.
  const [kept, setKept] = useState<readonly number[]>([25, 50, 75]);
  const list = useMemo(
    () => (parsed.ok ? parsed.list : kept.filter((w) => w <= n)),
    [parsed, kept, n],
  );
  const edit = (v: string) => {
    setText(v);
    const p = parseList(v, n);
    if (p.ok) setKept(p.list);
  };

  const strategy = useMemo(() => firstBoardList(list), [list]);
  const ev = useMemo(() => evaluate(strategy, n), [strategy, n]);
  const strength = Math.min(s, n);
  const top = list[list.length - 1] ?? 0;

  const setNumber = (v: string) => {
    setNText(v);
    const x = Number(v);
    if (Number.isInteger(x) && x >= 2 && x <= 200) setN(x);
  };

  const starts: readonly { label: string; list: () => number[] }[] = [
    { label: 'No list (one board)', list: () => [] },
    { label: 'One test in the middle', list: () => [Math.ceil(n / 2)] },
    {
      label: 'Quarters',
      list: () => [...new Set([1, 2, 3].map((q) => Math.round((q * n) / 4)))].filter((w) => w >= 1),
    },
  ];

  const isSaved = saved.some((x) => x.n === n && x.list.join() === list.join());
  const xMax = Math.max(10, n, ...saved.map((x) => x.n)) * 1.06;
  const series: Series[] = [
    { id: 'n', label: 'n (one board)', at: (x) => x, tone: 'plain', dashed: true },
    { id: 'log', label: 'log₂ n (plenty of boards)', at: (x) => Math.log2(x), tone: 'lower' },
  ];
  const dots: Dot[] = [
    ...saved.map((x) => ({
      n: x.n,
      v: x.worst,
      label: `n = ${x.n}: ${x.list.join(', ') || 'no list'}, worst case ${x.worst}`,
      tone: 'saved' as const,
    })),
    { n, v: ev.worst, label: `this list: worst case ${ev.worst}`, tone: 'live' },
  ];

  return (
    <div className="walk">
      <section className="boardcol" aria-label="Two boards">
        <div className="boardcol__head">
          <label className="field field--row">
            <span className="seg__label">n</span>
            <input
              className="input--n"
              inputMode="numeric"
              value={nText}
              onChange={(e) => setNumber(e.target.value)}
              aria-label="n, the number of weights, 2 to 200"
            />
          </label>
          <label className={`field field--row field--grow${parsed.ok ? '' : ' field--bad'}`}>
            <span className="seg__label">first board</span>
            <input
              className="input--list"
              value={text}
              onChange={(e) => edit(e.target.value)}
              aria-label="The first board's test weights, in increasing order"
              placeholder="e.g. 10, 25, 40"
              spellCheck={false}
            />
          </label>
          <label className="pick">
            <span className="seg__label">strength</span>
            <input
              type="range"
              min={0}
              max={n}
              value={strength}
              onChange={(e) => setS(Number(e.target.value))}
              aria-label="The board's true strength"
            />
            <b className="pick__value">{strength}</b>
          </label>
        </div>
        <div className="row">
          <span className="seg__label">start from</span>
          {starts.map((x) => (
            <button
              key={x.label}
              type="button"
              className="pill"
              onClick={() => edit(x.list().join(', '))}
            >
              {x.label}
            </button>
          ))}
          {!parsed.ok && (
            <span className="hint hint--bad">{parsed.why} Showing the last list that worked.</span>
          )}
        </div>
        <Replay
          key={`${n}-${list.join()}-${strength}`}
          strategy={strategy}
          n={n}
          s={strength}
          onPick={setS}
          ev={ev}
          marks={list}
          phase={(t) => {
            const p = phaseOf(list, t);
            return p === 'list'
              ? 'first board, from your list'
              : p === 'after'
                ? 'first board, one at a time after the list'
                : 'second board, one at a time';
          }}
        />
      </section>

      <aside className="work" aria-label="The work">
        <div className="card card--good">
          <h2 className="card__title">Worst case, checked against all {n + 1} strengths</h2>
          <p className="bigstat">
            <b>{ev.worst}</b> tests{' '}
            <span className="bigstat__ratio">= {pct(ev.worst / n)} of n</span>
          </p>
          <p>
            {ev.worstAt.length <= 8
              ? `At strength${ev.worstAt.length === 1 ? '' : 's'} ${andList(ev.worstAt)}.`
              : `${ev.worstAt.length} strengths tie for it.`}{' '}
            For comparison, at n = {n}: one board needs {n}, plenty of boards {log2Ceil(n)}.
          </p>
          <div className="row">
            <button
              type="button"
              className="button button--primary"
              disabled={isSaved}
              onClick={() => setSaved((xs) => [...xs, { n, list, worst: ev.worst }])}
            >
              {isSaved ? 'Saved' : 'Save this strategy'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="card__title">How your list is run</h2>
          <ol className="rules">
            <li>
              The first board is tested at your weights, in order, until it breaks.
              {top > 0 &&
                top < n &&
                ` If it holds at ${top}, it carries on one weight at a time: ${top + 1}, ${top + 2}, …`}
            </li>
            <li>
              Once it breaks, the second board starts just above the last weight that held and goes
              up one weight at a time.
            </li>
          </ol>
          <p className="card__note">
            The second step is not a choice. With one board left, skipping a weight and breaking the
            board would leave two strengths you can never tell apart (chapter 1). Your list is the
            only thing you get to decide.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Saved strategies against n and log₂ n</h2>
          <div className="minichart">
            <Chart
              series={series}
              xMin={1}
              xMax={xMax}
              dots={dots}
              width={360}
              height={230}
              label="Worst-case tests of each saved strategy, at its n, against the lines n and log₂ n"
            />
          </div>
          <div className="legend" aria-hidden="true">
            {series.map((x) => (
              <span key={x.id} className="legend__item">
                <i className={`key key--${x.tone}${x.dashed ? ' key--dashed' : ''}`} /> {x.label}
              </span>
            ))}
            <span className="legend__item">
              <i className="dotkey dotkey--saved" /> saved
            </span>
            <span className="legend__item">
              <i className="dotkey dotkey--live" /> this list
            </span>
          </div>
          {saved.length > 0 ? (
            <table className="values">
              <thead>
                <tr>
                  <th>n</th>
                  <th className="l">first board</th>
                  <th>worst</th>
                  <th>worst / n</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...saved]
                  .map((x, i) => ({ x, i }))
                  .sort((a, b) => a.x.n - b.x.n || a.x.worst - b.x.worst)
                  .map(({ x, i }) => (
                    <tr key={i}>
                      <td>{x.n}</td>
                      <td className="l">
                        <button
                          type="button"
                          className="linkish"
                          title="Load this one"
                          onClick={() => {
                            setNumber(String(x.n));
                            setText(x.list.join(', '));
                            setKept(x.list);
                          }}
                        >
                          {x.list.join(', ') || 'no list'}
                        </button>
                      </td>
                      <td>{x.worst}</td>
                      <td>{pct(x.worst / x.n)}</td>
                      <td>
                        <button
                          type="button"
                          className="linkish"
                          aria-label="Remove"
                          onClick={() => setSaved((xs) => xs.filter((_, j) => j !== i))}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="card__note">
              Nothing saved yet. Save lists at different n and see how worst / n moves.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
