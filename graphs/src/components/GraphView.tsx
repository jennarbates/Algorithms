import { useEffect, useRef, useState } from 'react';
import { edgeKey } from '../core/graph';
import type { Edge, NodeId } from '../core/graph';
import type { Drawn } from '../content/graphs';

/**
 * One graph, drawn.
 *
 * Every chapter and every practice question draws through this, and none of
 * them knows about SVG: they say how each node and each edge should look, by
 * tone, and this turns tones into classes. The colours live in the stylesheet,
 * so light and dark mode are handled in one place.
 *
 * Positions can be overridden, which is how the BFS chapter pulls the map into
 * layers and the topological chapter lays the courses out in a line. When they
 * change, nodes glide to their new places rather than jumping, because a node
 * that jumps is a node the reader has to find again.
 */

export type NodeTone =
  | 'idle'
  | 'found'
  | 'current'
  | 'done'
  | 'side0'
  | 'side1'
  | 'faded'
  | 'source'
  | 'placed'
  | 'bad'
  | 'picked'
  | 'right'
  | 'wrong';

export type EdgeTone =
  | 'plain'
  | 'tree'
  | 'non'
  | 'active'
  | 'bad'
  | 'cycle'
  | 'faded'
  | 'ok'
  | 'picked'
  | 'right'
  | 'wrong'
  | 'missed';

export interface NodeLook {
  readonly tone?: NodeTone;
  /** A small tag by the node: a layer number, an in-degree. */
  readonly badge?: string | undefined;
}

export interface EdgeLook {
  readonly tone?: EdgeTone;
}

type Pos = Readonly<Record<NodeId, readonly [number, number]>>;

interface GraphViewProps {
  readonly drawn: Drawn;
  readonly pos?: Pos | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly node?: ((n: NodeId) => NodeLook) | undefined;
  readonly edge?: ((e: Edge) => EdgeLook) | undefined;
  readonly onNode?: ((n: NodeId) => void) | undefined;
  readonly onEdge?: ((e: Edge) => void) | undefined;
  /** Nodes that can be clicked right now, for the pointer cursor and the keyboard. */
  readonly clickable?: ((n: NodeId) => boolean) | undefined;
  /** Draw every edge as an arc above the nodes, for a graph laid out in a line. */
  readonly arcs?: boolean | undefined;
  readonly label: string;
  readonly compact?: boolean | undefined;
  /** What to write on a node, if not its id. */
  readonly text?: ((n: NodeId) => string) | undefined;
}

const DURATION = 480;

/** Which arrowhead each edge tone wears. */
const ARROW: Readonly<Record<EdgeTone, string>> = {
  plain: 'plain',
  tree: 'tree',
  non: 'plain',
  active: 'active',
  bad: 'bad',
  cycle: 'cycle',
  faded: 'faded',
  ok: 'ok',
  picked: 'active',
  right: 'ok',
  wrong: 'bad',
  missed: 'plain',
};

/** Positions that glide from wherever they were to wherever they are asked to be. */
function useGlide(target: Pos): Pos {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const current = useRef(target);
  // Compared by value: callers build positions fresh on every render.
  const signature = JSON.stringify(target);

  useEffect(() => {
    const target = JSON.parse(signature) as Pos;
    const start = performance.now();
    from.current = current.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / DURATION);
      const ease = 1 - (1 - t) ** 3;
      const next: Record<NodeId, readonly [number, number]> = {};
      for (const [n, [x, y]] of Object.entries(target)) {
        const [x0, y0] = from.current[n] ?? [x, y];
        next[n] = [x0 + (x - x0) * ease, y0 + (y - y0) * ease];
      }
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [signature]);

  return shown;
}

const nodeWidth = (label: string) => Math.max(34, 16 + label.length * 9.5);

export function GraphView({
  drawn,
  pos,
  width,
  height,
  node,
  edge,
  onNode,
  onEdge,
  clickable,
  arcs = false,
  label,
  compact = false,
  text,
}: GraphViewProps) {
  const say = (n: NodeId) => text?.(n) ?? n;
  const target = pos ?? drawn.pos;
  const at = useGlide(target);
  const g = drawn.graph;
  const W = width ?? drawn.width;
  const H = height ?? drawn.height;

  /** The control point of a curved edge, or null for a straight one. */
  const control = ([u, v]: Edge): readonly [number, number] | null => {
    const [x1, y1] = at[u] ?? [0, 0];
    const [x2, y2] = at[v] ?? [0, 0];
    if (arcs) {
      const lift = Math.min(H * 0.4, 30 + Math.abs(x2 - x1) * 0.3);
      return [(x1 + x2) / 2, Math.min(y1, y2) - lift * 2];
    }
    if (!pos) return drawn.bends?.[edgeKey(u, v, g.directed)] ?? null;
    // Laid out in rows, an edge along a row would run straight through any node
    // between its ends. Bow it below the row instead, as the slides draw it.
    if (Math.abs(y1 - y2) < 1) {
      const lo = Math.min(x1, x2);
      const hi = Math.max(x1, x2);
      const between = g.nodes.some((n) => {
        const [x, y] = at[n] ?? [0, 0];
        return n !== u && n !== v && Math.abs(y - y1) < 1 && x > lo && x < hi;
      });
      if (between) return [(x1 + x2) / 2, y1 + 34 + (hi - lo) * 0.12];
    }
    return null;
  };

  /**
   * The edge as a path. A directed edge stops at the outline of the node it
   * points into, so its arrowhead is seen rather than buried under the node.
   */
  const path = (e: Edge): string => {
    const [x1, y1] = at[e[0]] ?? [0, 0];
    let [x2, y2] = at[e[1]] ?? [0, 0];
    const c = control(e);
    if (g.directed) {
      const [fx, fy] = c ?? [x1, y1];
      const dx = x2 - fx;
      const dy = y2 - fy;
      const half = nodeWidth(say(e[1])) / 2 + 3;
      const tx = Math.abs(dx) > 0.01 ? half / Math.abs(dx) : Infinity;
      const ty = Math.abs(dy) > 0.01 ? 20 / Math.abs(dy) : Infinity;
      const t = Math.min(tx, ty, 0.95);
      x2 -= dx * t;
      y2 -= dy * t;
    }
    return c ? `M ${x1} ${y1} Q ${c[0]} ${c[1]} ${x2} ${y2}` : `M ${x1} ${y1} L ${x2} ${y2}`;
  };

  return (
    <svg
      className={compact ? 'graph graph--compact' : 'graph'}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {(['plain', 'tree', 'active', 'bad', 'ok', 'faded', 'cycle'] as const).map((tone) => (
          <marker
            key={tone}
            id={`arrow-${g.id}-${tone}`}
            className={`arrow arrow--${tone}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth="15"
            markerHeight="15"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        ))}
      </defs>

      <g className="graph__edges">
        {g.edges.map((e) => {
          const look = edge?.(e) ?? {};
          const tone = look.tone ?? 'plain';
          const key = edgeKey(e[0], e[1], g.directed);
          const d = path(e);
          const marker = g.directed ? `url(#arrow-${g.id}-${ARROW[tone]})` : undefined;
          return (
            <g key={key} className={`edge edge--${tone}`}>
              <path className="edge__line" d={d} markerEnd={marker} />
              {onEdge && (
                <path
                  className="edge__hit"
                  d={d}
                  onClick={() => onEdge(e)}
                  role="button"
                  aria-label={`Edge ${e[0]} to ${e[1]}`}
                />
              )}
            </g>
          );
        })}
      </g>

      <g className="graph__nodes">
        {g.nodes.map((n) => {
          const [x, y] = at[n] ?? [0, 0];
          const look = node?.(n) ?? {};
          const tone = look.tone ?? 'idle';
          const w = nodeWidth(say(n));
          const can = clickable ? clickable(n) : Boolean(onNode);
          return (
            <g
              key={n}
              className={`node node--${tone}${can ? ' node--click' : ''}`}
              transform={`translate(${x} ${y})`}
              onClick={can && onNode ? () => onNode(n) : undefined}
              onKeyDown={
                can && onNode
                  ? (ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        onNode(n);
                      }
                    }
                  : undefined
              }
              tabIndex={can && onNode ? 0 : undefined}
              role={can && onNode ? 'button' : undefined}
              aria-label={can && onNode ? say(n) : undefined}
            >
              <rect className="node__body" x={-w / 2} y={-17} width={w} height={34} rx={17} />
              <text className="node__label" dy="0.35em">
                {say(n)}
              </text>
              {look.badge !== undefined && (
                <g className="node__badge" transform={`translate(${w / 2 - 2} -17)`}>
                  <circle r="11" />
                  <text dy="0.35em">{look.badge}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
