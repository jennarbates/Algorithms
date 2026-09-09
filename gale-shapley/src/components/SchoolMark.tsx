import { schoolIdentity } from '../content/cast';
import type { MarkShape } from '../content/cast';
import { readableInk } from './contrast';

/**
 * A school's token.
 *
 * American university colours cluster hard around red and navy, so colour alone
 * cannot separate twelve of them. The silhouette does the disambiguating: within
 * every colour family here the shapes differ.
 *
 * These marks are our own. No institutional logo or wordmark is reproduced; only
 * the colours, which are plain facts.
 */

interface SchoolMarkProps {
  readonly schoolId: string;
  readonly size?: number;
  readonly muted?: boolean;
  readonly title?: string;
}

const SHAPES: Record<MarkShape, string> = {
  shield: 'M24 3.5 L43 10.5 V26 C43 36.8 34.2 43.2 24 46 C13.8 43.2 5 36.8 5 26 V10.5 Z',
  circle: 'M24 3 A21 21 0 1 1 23.99 3 Z',
  hexagon: 'M24 3 L42 13.5 V34.5 L24 45 L6 34.5 V13.5 Z',
  'rounded-square':
    'M14 4 H34 A10 10 0 0 1 44 14 V34 A10 10 0 0 1 34 44 H14 A10 10 0 0 1 4 34 V14 A10 10 0 0 1 14 4 Z',
};

export function SchoolMark({ schoolId, size = 48, muted = false, title }: SchoolMarkProps) {
  const identity = schoolIdentity(schoolId);
  const ink = readableInk(identity.color);
  const fontSize = identity.monogram.length >= 3 ? 12 : 15;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title ?? identity.name}
      className={muted ? 'token token--muted' : 'token'}
    >
      <title>{title ?? identity.name}</title>

      <path d={SHAPES[identity.shape]} fill={identity.color} />
      <path
        d={SHAPES[identity.shape]}
        fill="none"
        stroke={identity.accent}
        strokeWidth="2.4"
        opacity="0.9"
      />
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="700"
        letterSpacing="0.4"
        fill={ink}
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      >
        {identity.monogram}
      </text>
    </svg>
  );
}
