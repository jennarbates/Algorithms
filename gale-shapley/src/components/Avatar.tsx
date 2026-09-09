import { useId } from 'react';
import { studentIdentity } from '../content/cast';
import type { HairStyle } from '../content/cast';

/**
 * A student's token.
 *
 * The same student appears in their own list and inside every school's list at
 * once, so following one person has to be recognition rather than reading. That
 * is what this is for. Colour carries most of it, hair shape backs colour up for
 * anyone who cannot separate hues, and the name is always shown alongside.
 */

interface AvatarProps {
  readonly studentId: string;
  readonly size?: number;
  /** Dim the token when this person has been passed over or is out of play. */
  readonly muted?: boolean;
  readonly title?: string;
}

function Hair({ style, color }: { style: HairStyle; color: string }) {
  // The cap is the top half of the head circle, centred at (24, 19) with r 10.5.
  const cap = 'M13.5 19 A10.5 10.5 0 0 1 34.5 19 Z';

  switch (style) {
    case 'buzz':
      return <path d="M14.6 17.2 A10.5 10.5 0 0 1 33.4 17.2 Z" fill={color} />;
    case 'short':
      return <path d={cap} fill={color} />;
    case 'bun':
      return (
        <g fill={color}>
          <path d={cap} />
          <circle cx="24" cy="6.5" r="4.6" />
        </g>
      );
    case 'curls':
      return (
        <g fill={color}>
          <path d={cap} />
          <circle cx="16.5" cy="12.5" r="5.2" />
          <circle cx="24" cy="9.4" r="5.6" />
          <circle cx="31.5" cy="12.5" r="5.2" />
        </g>
      );
    case 'wavy':
      return (
        <g fill={color}>
          <path d={cap} />
          <path d="M13.2 15.5 q4 4.5 8 0 q4 -4.5 8 0 q3 3.4 5.6 0 V21 H13.2 Z" />
        </g>
      );
    case 'long':
      return (
        <g fill={color}>
          <path d={cap} />
          <rect x="11.6" y="14" width="5.2" height="23" rx="2.6" />
          <rect x="31.2" y="14" width="5.2" height="23" rx="2.6" />
        </g>
      );
  }
}

export function Avatar({ studentId, size = 48, muted = false, title }: AvatarProps) {
  const identity = studentIdentity(studentId);
  const clipId = useId();

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
      <defs>
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="22.5" />
        </clipPath>
      </defs>

      <circle cx="24" cy="24" r="22.5" fill={identity.color} opacity={0.18} />

      <g clipPath={`url(#${clipId})`}>
        {/* Shoulders first, so the head sits in front of them. */}
        <path d="M4 48 C4 36.5 12.6 31 24 31 C35.4 31 44 36.5 44 48 Z" fill={identity.shirt} />
        <circle cx="24" cy="19" r="10.5" fill={identity.skin} />
        <Hair style={identity.hairStyle} color={identity.hair} />
      </g>

      <circle cx="24" cy="24" r="22.5" fill="none" stroke={identity.color} strokeWidth="2.6" />
    </svg>
  );
}
