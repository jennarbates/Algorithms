import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { EngineState } from '../core/engine';

/**
 * Lines between the two columns, one per pairing.
 *
 * The rankings already carry all of the information, but they carry it one row
 * at a time. What they do not show is the shape of the whole arrangement: who
 * is currently paired with whom, at a glance, without reading. That is what a
 * line does. It connects the asker's card on the left to the receiver's card on
 * the right, so a displacement reads as one line vanishing and another taking
 * its place, and a settled board reads as a full set of lines that nothing can
 * cross.
 *
 * Two kinds of line:
 *
 *   - a hold, dashed and grey while the run is going, solid and green once it
 *     has settled. Same rule as the entries in the rankings, for the same
 *     reason: nothing here is decided until everything is.
 *   - the live ask, gold, drawn while a question is on the table and before it
 *     resolves into a hold, a displacement or a turn-away.
 *   - a ghost, red, for a pairing that is not on the board. The proof section
 *     draws one while replaying why a pair cannot break the arrangement.
 *
 * The lines are measured from the rendered cards rather than computed from row
 * indices, because the cards are not all the same height and the two columns
 * do not line up. Measuring happens in a layout effect after every state change
 * and again whenever the board is resized. When the columns stack into one on
 * a narrow screen the cards no longer sit side by side, and the lines are not
 * drawn at all rather than drawn badly.
 */

interface MatchLinesProps {
  readonly state: EngineState;
  readonly boardRef: RefObject<HTMLElement | null>;
  /**
   * A pairing that is not on the board and would have to be for it to break,
   * drawn in red. The proof section sets it while replaying a pair.
   */
  readonly ghost?: { readonly asker: string; readonly receiver: string } | null;
}

interface Line {
  readonly key: string;
  readonly kind: 'hold' | 'ask' | 'ghost';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Selects the card for one party by the data attributes the panels set. */
function cardFor(board: HTMLElement, role: 'asker' | 'receiver', id: string): HTMLElement | null {
  return board.querySelector<HTMLElement>(`[data-role="${role}"][data-id="${CSS.escape(id)}"]`);
}

/** Where a line should attach to a card: its outer edge, level with the head. */
function anchor(
  board: DOMRect,
  card: HTMLElement,
  edge: 'left' | 'right',
): { readonly x: number; readonly y: number } {
  const rect = card.getBoundingClientRect();
  const head = card.querySelector<HTMLElement>('.row__head')?.getBoundingClientRect() ?? rect;
  return {
    x: (edge === 'right' ? rect.right : rect.left) - board.left,
    y: head.top + head.height / 2 - board.top,
  };
}

function measure(board: HTMLElement, state: EngineState, ghost: MatchLinesProps['ghost']): Line[] {
  const rect = board.getBoundingClientRect();
  const lines: Line[] = [];

  const pairs: {
    readonly kind: Line['kind'];
    readonly asker: string;
    readonly receiver: string;
  }[] = [];

  for (const asker of Object.values(state.askers)) {
    if (asker.heldBy !== null) {
      pairs.push({ kind: 'hold', asker: asker.id, receiver: asker.heldBy });
    }
  }
  if (state.pending) {
    pairs.push({ kind: 'ask', asker: state.pending.asker, receiver: state.pending.receiver });
  }
  if (ghost) {
    pairs.push({ kind: 'ghost', asker: ghost.asker, receiver: ghost.receiver });
  }

  for (const pair of pairs) {
    const from = cardFor(board, 'asker', pair.asker);
    const to = cardFor(board, 'receiver', pair.receiver);
    if (!from || !to) continue;

    const a = anchor(rect, from, 'right');
    const b = anchor(rect, to, 'left');

    // Stacked columns: the receiver card is not to the right of the asker card,
    // so there is no gap to draw across.
    if (b.x <= a.x) continue;

    lines.push({
      key: `${pair.kind}:${pair.asker}->${pair.receiver}`,
      kind: pair.kind,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
    });
  }

  return lines;
}

/** A gentle S-curve: leaves the left card flat, arrives at the right card flat. */
function pathFor(line: Line): string {
  const bend = (line.x2 - line.x1) / 2;
  return `M ${line.x1} ${line.y1} C ${line.x1 + bend} ${line.y1}, ${line.x2 - bend} ${line.y2}, ${line.x2} ${line.y2}`;
}

export function MatchLines({ state, boardRef, ghost = null }: MatchLinesProps) {
  const [lines, setLines] = useState<readonly Line[]>([]);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const update = () => setLines(measure(board, state, ghost));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(board);
    return () => observer.disconnect();
  }, [boardRef, state, ghost]);

  const settled = state.phase === 'done';

  return (
    <svg className="matchlines" aria-hidden="true" focusable="false">
      {lines.map((line) => {
        const classes = ['matchline', `matchline--${line.kind}`];
        if (settled) classes.push('matchline--settled');
        return (
          <g key={line.key} className={classes.join(' ')}>
            <path className="matchline__path" d={pathFor(line)} />
            <circle className="matchline__end" cx={line.x1} cy={line.y1} r={3.5} />
            <circle className="matchline__end" cx={line.x2} cy={line.y2} r={3.5} />
          </g>
        );
      })}
    </svg>
  );
}
