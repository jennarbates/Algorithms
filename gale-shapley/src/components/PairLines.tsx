import { useLayoutEffect, useState } from 'react';

/**
 * Lines between a student's card and a school's card, for the ties board.
 *
 * The same drawing as `MatchLines`, measured the same way and for the same
 * reason: the cards are not all one height, so the lines are measured from the
 * rendered cards after every change and again on every resize, and not drawn at
 * all once the columns stack. What differs is what the lines mean. There is no
 * run here, only an arrangement and the pairs that could break it, so there are
 * three kinds:
 *
 *   - together, green and solid: who is with whom in the arrangement;
 *   - strong, red and solid: both would strictly rather switch;
 *   - weak, red and dashed: one would strictly rather switch, and the other
 *     does not mind. Drawn only for pairs that are weak and not strong, since a
 *     strong line already says weak as well.
 *
 * Solid against dashed carries the difference without relying on colour.
 */

export type PairLineKind = 'together' | 'strong' | 'weak';

export interface PairLine {
  readonly student: string;
  readonly school: string;
  readonly kind: PairLineKind;
}

interface PairLinesProps {
  readonly lines: readonly PairLine[];
  /**
   * The box the lines are positioned against. Passed as the element itself,
   * held in the parent's state, rather than as a ref: this component mounts
   * inside that box, and a parent's ref is not attached yet when a child's
   * layout effect first runs, so a ref would measure nothing until something
   * else happened to change.
   */
  readonly board: HTMLElement | null;
  /** A pair to bring forward; every other red line fades while it is set. */
  readonly focus?: { readonly student: string; readonly school: string } | null;
}

interface Drawn extends PairLine {
  readonly key: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

function anchor(board: DOMRect, card: HTMLElement, edge: 'left' | 'right') {
  const rect = card.getBoundingClientRect();
  const head = card.querySelector<HTMLElement>('.row__head')?.getBoundingClientRect() ?? rect;
  return {
    x: (edge === 'right' ? rect.right : rect.left) - board.left,
    y: head.top + head.height / 2 - board.top,
  };
}

function measure(board: HTMLElement, lines: readonly PairLine[]): Drawn[] {
  const rect = board.getBoundingClientRect();
  const out: Drawn[] = [];
  for (const line of lines) {
    const from = board.querySelector<HTMLElement>(
      `[data-role="student"][data-id="${CSS.escape(line.student)}"]`,
    );
    const to = board.querySelector<HTMLElement>(
      `[data-role="school"][data-id="${CSS.escape(line.school)}"]`,
    );
    if (!from || !to) continue;
    const a = anchor(rect, from, 'right');
    const b = anchor(rect, to, 'left');
    if (b.x <= a.x) continue;
    out.push({
      ...line,
      key: `${line.kind}:${line.student}->${line.school}`,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
    });
  }
  return out;
}

function pathFor(line: Drawn): string {
  const bend = (line.x2 - line.x1) / 2;
  return `M ${line.x1} ${line.y1} C ${line.x1 + bend} ${line.y1}, ${line.x2 - bend} ${line.y2}, ${line.x2} ${line.y2}`;
}

export function PairLines({ lines, board, focus = null }: PairLinesProps) {
  const [drawn, setDrawn] = useState<readonly Drawn[]>([]);

  useLayoutEffect(() => {
    if (!board) return;

    const update = () => setDrawn(measure(board, lines));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(board);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [board, lines]);

  return (
    <svg className="matchlines" aria-hidden="true" focusable="false">
      {drawn.map((line) => {
        const focused = focus?.student === line.student && focus.school === line.school;
        const classes = ['pairline', `pairline--${line.kind}`];
        if (focus && line.kind !== 'together') {
          classes.push(focused ? 'pairline--focus' : 'pairline--faded');
        }
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
