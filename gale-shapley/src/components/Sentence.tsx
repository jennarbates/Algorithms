import { Fragment } from 'react';
import { PartyToken } from './PartyToken';
import type { Narration } from '../content/narration';

/** Renders one narrated sentence with people's tokens drawn inline. */
export function Sentence({ narration, size = 22 }: { narration: Narration; size?: number }) {
  return (
    <span className="sentence">
      {narration.segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.kind === 'text' ? (
            segment.text
          ) : (
            <span className="sentence__token">
              <PartyToken id={segment.id} party={segment.party} size={size} />
            </span>
          )}
        </Fragment>
      ))}
    </span>
  );
}
