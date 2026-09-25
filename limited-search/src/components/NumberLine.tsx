import { useLayoutEffect, useRef, useState } from 'react';
import type { Knowledge, Test } from '../core/boards';

/**
 * The weights 1 to n in a row, and underneath, optionally, one bar per strength.
 *
 * Column c stands for weight c in the top row and for strength c in the bars,
 * so a strength sits directly under the heaviest weight it holds. Column 0 has
 * no weight, only strength 0: the board that breaks under one pound.
 *
 * The top row is coloured by what is known so far: weights known to hold (up to
 * lo), weights known to break (above hi), and the open stretch between, where
 * the strength still is. Tested weights carry a dot, with the order they were
 * tested in when there is room to print it. The listed first-board weights, if
 * any, are marked above.
 *
 * The drawing is laid out in real pixels at whatever size the board has, so the
 * text stays readable from n = 2 to n = 200 and the bars take the height that
 * is left.
 */

interface NumberLineProps {
  readonly n: number;
  readonly k: Knowledge;
  readonly tests: readonly Test[];
  /** First-board weights to mark above the row. */
  readonly marks?: readonly number[];
  /** Tests on which board count as the "second phase" colour. */
  readonly secondFrom?: number;
  /** The true strength, drawn as a line, or null to keep it hidden. */
  readonly truth?: number | null;
  /** Tests needed for each strength 0..n (null where the strategy fails). */
  readonly bars?: readonly (number | null)[];
  readonly worst?: number;
  /** The strength being replayed, lit in the bars. */
  readonly selected?: number | null;
  readonly onPickStrength?: (s: number) => void;
  readonly onPickWeight?: ((w: number) => void) | undefined;
  readonly label: string;
}

const PL = 40;
const PR = 14;
const MARK_Y = 30;
const ROW_Y = 42;

function tickStep(n: number, room: number): number {
  const fit = Math.max(2, Math.floor(room / 30));
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100]) if (n / s <= fit) return s;
  return 200;
}

/** The pixel size of an element, kept up to date. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 640, h: 320 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (width: number, height: number) =>
      setSize({ w: Math.max(200, Math.round(width)), h: Math.max(120, Math.round(height)) });
    const box = el.getBoundingClientRect();
    measure(box.width, box.height);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e) measure(e.contentRect.width, e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function NumberLine({
  n,
  k,
  tests,
  marks = [],
  secondFrom = 2,
  truth = null,
  bars,
  worst = 0,
  selected = null,
  onPickStrength,
  onPickWeight,
  label,
}: NumberLineProps) {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const ROW_H = bars ? 40 : Math.max(40, Math.min(96, H - ROW_Y - 40));
  const TICK_Y = ROW_Y + ROW_H + 16;
  const BAR_TOP = TICK_Y + 34;
  const BAR_H = Math.max(60, H - BAR_TOP - 24);
  const cw = (W - PL - PR) / (n + 1);
  const x = (c: number) => PL + c * cw;
  const step = tickStep(n, W - PL - PR);
  const ticks = Array.from({ length: Math.floor(n / step) + 1 }, (_, i) => i * step);
  const order = new Map(tests.map((t, i) => [t.w, i + 1]));
  const last = tests[tests.length - 1];
  const barMax = Math.max(1, worst, ...(bars ?? []).map((b) => b ?? 0));
  const by = (v: number) => BAR_TOP + BAR_H - (BAR_H * v) / barMax;
  const numbers = cw >= 16;

  return (
    <div className="nl-wrap" ref={ref}>
      <svg
        className="nl"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
      >
        <text
          className="nl__axis-name"
          x={PL - 8}
          y={ROW_Y + ROW_H / 2}
          textAnchor="end"
          dy="0.32em"
        >
          w
        </text>

        {marks
          .filter((m) => m >= 1 && m <= n)
          .map((m) => (
            <path
              key={`m${m}`}
              className="nl__mark"
              d={`M${x(m) + cw / 2 - 5} ${MARK_Y - 8} L${x(m) + cw / 2 + 5} ${MARK_Y - 8} L${x(m) + cw / 2} ${MARK_Y} Z`}
            />
          ))}

        {Array.from({ length: n }, (_, i) => i + 1).map((w) => {
          const state = w <= k.lo ? 'held' : w > k.hi ? 'broke' : 'open';
          const pick = onPickWeight && state === 'open';
          return (
            <rect
              key={`c${w}`}
              className={`nl__cell nl__cell--${state}${pick ? ' nl__cell--pick' : ''}`}
              x={x(w) + 0.5}
              y={ROW_Y}
              width={Math.max(0.5, cw - 1)}
              height={ROW_H}
              rx={Math.min(4, cw / 4)}
              onClick={pick ? () => onPickWeight(w) : undefined}
            >
              <title>
                {state === 'open'
                  ? `weight ${w}: not known yet${pick ? ', click to test it' : ''}`
                  : `weight ${w}: ${state === 'held' ? 'known to hold' : 'known to break'}`}
              </title>
            </rect>
          );
        })}
        <rect
          className="nl__cell nl__cell--zero"
          x={x(0) + 0.5}
          y={ROW_Y}
          width={Math.max(0.5, cw - 1)}
          height={ROW_H}
          rx={Math.min(4, cw / 4)}
        />

        {tests.map((t, i) => {
          const cx = x(t.w) + cw / 2;
          const cls = `nl__test nl__test--${t.broke ? 'broke' : 'held'}${t.board >= secondFrom ? ' nl__test--second' : ''}${t === last ? ' nl__test--last' : ''}`;
          return (
            <g key={`t${i}`} className={cls}>
              <circle cx={cx} cy={ROW_Y + ROW_H / 2} r={Math.max(2.5, Math.min(9, cw * 0.36))} />
              {numbers && order.get(t.w) === i + 1 && (
                <text x={cx} y={ROW_Y - 2} textAnchor="middle">
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}

        {truth !== null && (
          <g className="nl__truth">
            <line x1={x(truth) + cw} x2={x(truth) + cw} y1={4} y2={ROW_Y + ROW_H + 6} />
            <text
              x={x(truth) + cw + (truth > n * 0.8 ? -4 : 4)}
              y={12}
              textAnchor={truth > n * 0.8 ? 'end' : 'start'}
            >
              strength {truth}
            </text>
          </g>
        )}

        <g className="nl__ticks">
          {ticks.map((c) => (
            <text key={`w${c}`} x={x(c) + cw / 2} y={TICK_Y} textAnchor="middle">
              {c}
            </text>
          ))}
        </g>

        {bars && (
          <g>
            <text className="nl__axis-name" x={PL - 8} y={BAR_TOP - 12} textAnchor="end">
              tests
            </text>
            <text className="nl__bars-title" x={PL} y={BAR_TOP - 12}>
              tests needed at each strength s, 0 to {n}
            </text>
            <line
              className="nl__base"
              x1={PL}
              x2={W - PR}
              y1={BAR_TOP + BAR_H}
              y2={BAR_TOP + BAR_H}
            />
            <line className="nl__worst" x1={PL} x2={W - PR} y1={by(worst)} y2={by(worst)} />
            <text className="nl__worst-label" x={PL - 6} y={by(worst)} dy="0.32em" textAnchor="end">
              {worst}
            </text>
            {bars.map((b, s) => {
              const tone =
                b === null ? 'fail' : s === selected ? 'on' : b === worst ? 'worst' : 'plain';
              const top = b === null ? BAR_TOP : by(b);
              return (
                <g key={`b${s}`}>
                  <rect
                    className={`nl__bar nl__bar--${tone}`}
                    x={x(s) + cw * 0.12}
                    y={top}
                    width={Math.max(0.6, cw * 0.76)}
                    height={BAR_TOP + BAR_H - top}
                  />
                  {onPickStrength && (
                    <rect
                      className="nl__hit"
                      x={x(s)}
                      y={BAR_TOP - 4}
                      width={cw}
                      height={BAR_H + 26}
                      onClick={() => onPickStrength(s)}
                    >
                      <title>
                        {b === null
                          ? `strength ${s}: the strategy fails`
                          : `strength ${s}: ${b} test${b === 1 ? '' : 's'}`}
                      </title>
                    </rect>
                  )}
                </g>
              );
            })}
            <g className="nl__ticks">
              {ticks.map((c) => (
                <text key={`s${c}`} x={x(c) + cw / 2} y={BAR_TOP + BAR_H + 16} textAnchor="middle">
                  {c}
                </text>
              ))}
            </g>
            <text className="nl__axis-name" x={PL - 8} y={BAR_TOP + BAR_H + 16} textAnchor="end">
              s
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
