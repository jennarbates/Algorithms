import { fmt } from './format';

/**
 * A plain line chart: functions of n on a linear or logarithmic y axis.
 *
 * Kept deliberately small. It draws curves, an optional shaded stretch from n₀
 * on, and markers at particular n, and it picks round tick values itself. The
 * tones are classes, so the stylesheet decides the colours in both themes.
 */

export interface Series {
  readonly id: string;
  readonly label: string;
  readonly at: (n: number) => number;
  readonly tone: 'T' | 'upper' | 'lower' | 'plain' | 'faded' | 'good' | 'bad';
  readonly dashed?: boolean;
}

export interface Marker {
  readonly n: number;
  readonly label: string;
  readonly tone: 'good' | 'bad' | 'live';
  /** Put a dot on this series at n. */
  readonly on?: string;
}

interface ChartProps {
  readonly series: readonly Series[];
  readonly xMax: number;
  readonly xMin?: number;
  readonly log?: boolean;
  /** Stretches of n to shade, where a bound holds or breaks. */
  readonly shade?: readonly {
    readonly from: number;
    readonly to: number;
    readonly tone: 'good' | 'bad';
  }[];
  readonly markers?: readonly Marker[];
  readonly label: string;
  /** Integer n only: plot points at whole numbers. */
  readonly whole?: boolean;
}

const W = 640;
const H = 380;
const L = 64;
const R = 16;
const T = 16;
const B = 40;

function niceStep(span: number, count: number): number {
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag;
}

export function Chart({
  series,
  xMax,
  xMin = 0,
  log = false,
  shade,
  markers = [],
  label,
  whole = false,
}: ChartProps) {
  const samples = 240;
  const xs = [...Array(samples + 1).keys()].map((k) => xMin + ((xMax - xMin) * k) / samples);
  const pts = whole
    ? [...Array(Math.floor(xMax) - Math.ceil(xMin) + 1).keys()].map((k) => Math.ceil(xMin) + k)
    : xs;

  let yMax = 1;
  let yMin = log ? Infinity : 0;
  for (const s of series) {
    if (s.tone === 'faded') continue;
    for (const x of xs) {
      const v = s.at(x);
      if (!Number.isFinite(v)) continue;
      yMax = Math.max(yMax, v);
      if (log && v > 0) yMin = Math.min(yMin, v);
      if (!log) yMin = Math.min(yMin, v);
    }
  }
  if (log) yMin = Math.max(1, Math.min(yMin, 1));
  yMax *= log ? 3 : 1.08;

  const sx = (x: number) => L + ((W - L - R) * (x - xMin)) / (xMax - xMin || 1);
  const ly = (v: number) => Math.log10(Math.max(v, yMin));
  const sy = (v: number) =>
    log
      ? H - B - ((H - B - T) * (ly(v) - ly(yMin))) / (ly(yMax) - ly(yMin) || 1)
      : H - B - ((H - B - T) * (v - yMin)) / (yMax - yMin || 1);
  const clampY = (y: number) => Math.max(T - 40, Math.min(H - B + 40, y));

  const path = (s: Series) =>
    pts
      .map((x) => [x, s.at(x)] as const)
      .filter(([, v]) => Number.isFinite(v) && (!log || v > 0))
      .map(([x, v], k) => `${k === 0 ? 'M' : 'L'}${sx(x).toFixed(1)} ${clampY(sy(v)).toFixed(1)}`)
      .join(' ');

  const xStep = niceStep(xMax - xMin, 6);
  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) xTicks.push(x);
  const yTicks: number[] = [];
  if (log) {
    for (
      let e = Math.ceil(Math.log10(yMin));
      e <= Math.log10(yMax);
      e += Math.max(1, Math.ceil(Math.log10(yMax / yMin) / 7))
    ) {
      yTicks.push(10 ** e);
    }
  } else {
    const ys = niceStep(yMax - yMin, 5);
    for (let y = Math.ceil(yMin / ys) * ys; y <= yMax; y += ys) yTicks.push(y);
  }

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="plot">
          <rect x={L} y={T} width={W - L - R} height={H - B - T} />
        </clipPath>
      </defs>
      {(shade ?? [])
        .filter((z) => z.to > z.from && z.from <= xMax)
        .map((z, k) => (
          <rect
            key={k}
            className={`chart__shade chart__shade--${z.tone}`}
            x={sx(Math.max(xMin, z.from))}
            y={T}
            width={Math.max(0, sx(Math.min(xMax, z.to)) - sx(Math.max(xMin, z.from)))}
            height={H - B - T}
          />
        ))}
      <g className="chart__grid">
        {yTicks.map((y) => (
          <g key={`y${y}`}>
            <line x1={L} x2={W - R} y1={sy(y)} y2={sy(y)} />
            <text x={L - 8} y={sy(y)} dy="0.32em" textAnchor="end">
              {fmt(y)}
            </text>
          </g>
        ))}
        {xTicks.map((x) => (
          <g key={`x${x}`}>
            <line x1={sx(x)} x2={sx(x)} y1={H - B} y2={H - B + 5} />
            <text x={sx(x)} y={H - B + 18} textAnchor="middle">
              {fmt(x)}
            </text>
          </g>
        ))}
        <line className="chart__axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
        <line className="chart__axis" x1={L} x2={L} y1={T} y2={H - B} />
        <text className="chart__axis-label" x={W - R} y={H - 6} textAnchor="end">
          n
        </text>
      </g>
      <g clipPath="url(#plot)">
        {series.map((s) => (
          <path
            key={s.id}
            className={`chart__line chart__line--${s.tone}${s.dashed ? ' chart__line--dashed' : ''}`}
            d={path(s)}
          />
        ))}
        {markers.map((m, k) => {
          const s = series.find((x) => x.id === m.on);
          const y = s ? sy(s.at(m.n)) : null;
          return (
            <g key={k} className={`chart__marker chart__marker--${m.tone}`}>
              <line x1={sx(m.n)} x2={sx(m.n)} y1={T} y2={H - B} />
              {y !== null && <circle cx={sx(m.n)} cy={clampY(y)} r="5" />}
            </g>
          );
        })}
      </g>
      {markers.map((m, k) => (
        <text
          key={`t${k}`}
          className={`chart__marker-label chart__marker-label--${m.tone}`}
          x={Math.min(W - R - 4, Math.max(L + 4, sx(m.n) + 6))}
          y={T + 14 + k * 16}
          textAnchor={sx(m.n) > W - 160 ? 'end' : 'start'}
        >
          {m.label}
        </text>
      ))}
    </svg>
  );
}

export function Legend({ series }: { readonly series: readonly Series[] }) {
  return (
    <div className="legend" aria-hidden="true">
      {series
        .filter((s) => s.tone !== 'faded')
        .map((s) => (
          <span key={s.id} className="legend__item">
            <i className={`key key--${s.tone}${s.dashed ? ' key--dashed' : ''}`} /> {s.label}
          </span>
        ))}
    </div>
  );
}
