import { Avatar } from './Avatar';
import { SchoolMark } from './SchoolMark';
import type { PartyKind } from '../content/narration';

/**
 * One token, drawn as a person or as a school depending on which side it is on.
 *
 * Everything on the page goes through this, so a given person looks identical
 * in their own row, inside somebody else's ranking, in the question at the top
 * and in the log at the bottom. That sameness is the whole point: it is what
 * lets a reader follow one person across the page without reading a name four
 * times.
 */

interface PartyTokenProps {
  readonly id: string;
  readonly party: PartyKind;
  readonly size?: number;
  readonly muted?: boolean;
  readonly title?: string;
}

export function PartyToken({ id, party, size = 28, muted = false, title }: PartyTokenProps) {
  const props = title === undefined ? { size, muted } : { size, muted, title };
  return party === 'student' ? (
    <Avatar studentId={id} {...props} />
  ) : (
    <SchoolMark schoolId={id} {...props} />
  );
}
