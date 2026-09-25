import { range } from '../core/boards';
import type { Test } from '../core/boards';

/** Sentences about boards and tests, shared by the replay and the play mode. */

export function boardsLeft(b: number): string {
  if (!Number.isFinite(b)) return 'boards to spare';
  return b === 0 ? 'no boards left' : b === 1 ? 'one board left' : `${b} boards left`;
}

/** "one board", "2 boards", "as many boards as you like". */
export function boardsIn(b: number): string {
  if (!Number.isFinite(b)) return 'as many boards as you like';
  return b === 1 ? 'one board' : `${b} boards`;
}

/** "Test 3: weight 24 on board 1. It breaks." */
export function sayTest(t: Test, i: number, phase?: string): string {
  const k = t.after;
  const what = t.broke ? 'It breaks' : 'It holds';
  const left =
    k.lo === k.hi
      ? `The strength is ${k.lo}.`
      : `The strength is ${range(k.lo, k.hi)}; ${boardsLeft(k.boards)}.`;
  return `Test ${i + 1}: weight ${t.w} on board ${t.board}${phase ? ` (${phase})` : ''}. ${what}. ${left}`;
}
