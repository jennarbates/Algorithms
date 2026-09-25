import { useMemo, useState } from 'react';
import { BFS_LINES, bfs, bfsStateAt, edgeSpans } from '../core/bfs';
import type { BfsEvent, BfsState } from '../core/bfs';
import { degree, edgeKey } from '../core/graph';
import type { Edge, NeighbourOrder, NodeId } from '../core/graph';
import { ARPANET } from '../content/graphs';
import { Code, Controls, Segmented } from '../components/Controls';
import { GraphView } from '../components/GraphView';
import type { EdgeLook, NodeLook } from '../components/GraphView';
import { rows } from '../components/layouts';
import { useSteps } from '../hooks/useSteps';

/**
 * Chapter 1: breadth-first search as an expanding wave, on the 1970 Internet.
 *
 * The lecture's picture is the one to earn: the map, pulled into rows, one per
 * layer. So the map can be pulled into rows at any moment, and nodes drop into
 * their row as they are found. Everything else on the page is there to make
 * three facts from the slides checkable rather than stated:
 *
 * - layer i is exactly the nodes at distance i;
 * - every edge joins the same layer or neighbouring layers, never further;
 * - the running time is O(m + n), because each line runs at most n or 2m times,
 *   which the line counts next to the pseudocode show as they happen.
 *
 * And one clicker question from the slides, answered by doing it: reverse the
 * order neighbours are looked at, and the layers stay the same while the tree
 * does not.
 */

const D = ARPANET;
const g = D.graph;

/** Which pseudocode lines an event is. */
function linesOf(e: BfsEvent | undefined): number[] {
  if (!e) return [];
  if (e.k === 'start') return [2];
  if (e.k === 'layer') return e.i === 0 ? [3, 4] : [9, 3, 4];
  if (e.k === 'visit') return [5];
  if (e.k === 'edge') return e.found ? [6, 7, 8] : [6, 7];
  return [9, 3];
}

const list = (ns: readonly NodeId[]) =>
  ns.length === 0
    ? 'nothing'
    : ns.length === 1
      ? (ns[0] as string)
      : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;

function narrate(e: BfsEvent | undefined, s: BfsState, start: NodeId): string {
  if (!e) return '';
  if (e.k === 'start') {
    return `Start at ${start}. It is layer 0, the only node discovered so far. Everything else is undiscovered.`;
  }
  if (e.k === 'layer') {
    const here = s.layers[e.i] ?? [];
    return `Layer ${e.i} is ${list(here)}. Look at every edge out of ${here.length === 1 ? 'it' : 'each of them'}; anything not yet discovered goes into layer ${e.i + 1}.`;
  }
  if (e.k === 'visit') {
    return `Explore ${e.v}, in layer ${e.i}: look along each of its ${degree(g, e.v)} edges.`;
  }
  if (e.k === 'edge') {
    const i = s.layerOf.get(e.v) ?? 0;
    if (e.found) {
      return `${e.v}–${e.w}: ${e.w} is new. It goes into layer ${i + 1}, and ${e.v}–${e.w} becomes a tree edge.`;
    }
    const j = s.layerOf.get(e.w) ?? 0;
    if (s.parent.get(e.v) === e.w) {
      return `${e.v}–${e.w}: ${e.w} is ${e.v}'s parent, discovered already. This is the tree edge ${e.v} was found along, looked at again from the other end.`;
    }
    const where =
      j === i
        ? `in layer ${j}, the same layer as ${e.v}`
        : `in layer ${j}, ${j < i ? 'the layer above' : 'the layer below'}`;
    return `${e.v}–${e.w}: ${e.w} is already discovered, ${where}. Nothing happens, and this edge is not in the tree.`;
  }
  return `Layer ${e.layers} came out empty, so the loop stops. ${s.layerOf.size} nodes reached in ${e.layers} layers, numbered 0 to ${e.layers - 1}.`;
}

export function Wave() {
  const [start, setStart] = useState<NodeId>('MIT');
  const [order, setOrder] = useState<NeighbourOrder>('listed');
  const [view, setView] = useState<'map' | 'layers'>('map');

  const run = useMemo(() => bfs(g, start, order), [start, order]);
  const other = useMemo(
    () => bfs(g, start, order === 'listed' ? 'reversed' : 'listed'),
    [start, order],
  );
  const jumps = useMemo(
    () => run.events.flatMap((e, i) => (e.k === 'layer' || e.k === 'done' ? [i] : [])),
    [run],
  );
  const steps = useSteps(run.events.length, jumps);
  const s = bfsStateAt(run.events, steps.step, g.directed);
  const event = run.events[steps.step];

  const treeKey = (u: NodeId, v: NodeId) => edgeKey(u, v, false);
  const isTree = (u: NodeId, v: NodeId) => s.parent.get(v) === u || s.parent.get(u) === v;

  const node = (n: NodeId): NodeLook => {
    const layer = s.layerOf.get(n);
    const badge = layer === undefined ? undefined : String(layer);
    if (n === s.visiting) return { tone: 'current', badge };
    if (s.edge?.w === n && s.edge.found) return { tone: 'found', badge };
    if (s.explored.has(n)) return { tone: 'done', badge };
    if (layer !== undefined) return { tone: 'found', badge };
    return { tone: 'idle' };
  };

  const edge = ([u, v]: Edge): EdgeLook => {
    if (s.edge && treeKey(s.edge.v, s.edge.w) === treeKey(u, v)) return { tone: 'active' };
    if (isTree(u, v)) return { tone: 'tree' };
    if (s.looked.has(treeKey(u, v))) return { tone: 'non' };
    return { tone: 'plain' };
  };

  // GraphView compares positions by value, so building them fresh each render is fine.
  const pos =
    view === 'layers'
      ? rows(
          D,
          s.layers.filter((l) => l.length > 0),
        )
      : undefined;

  const pick = (n: NodeId) => {
    setStart(n);
    steps.go(0);
  };

  const spans = s.done ? edgeSpans(g, s.layerOf) : [];
  const same = spans.filter((x) => x.span === 0).length;
  const next = spans.filter((x) => x.span === 1).length;
  const far = spans.filter((x) => x.span > 1).length;

  const moved = g.nodes.filter((n) => run.parent.get(n) !== other.parent.get(n));
  const n = g.nodes.length;
  const m = g.edges.length;

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The board">
        <div className="boardcol__head">
          <Segmented
            label="Draw it as"
            value={view}
            onChange={setView}
            options={[
              { value: 'map', label: 'The map' },
              { value: 'layers', label: 'Layers' },
            ]}
          />
          <Segmented
            label="Neighbours in"
            value={order}
            onChange={(o) => {
              setOrder(o);
            }}
            options={[
              { value: 'listed', label: 'Listed order' },
              { value: 'reversed', label: 'Reverse order' },
            ]}
          />
          <span className="hint">Click any site to start from there.</span>
        </div>

        <p
          className={s.done ? 'board-status board-status--final' : 'board-status'}
          aria-live="polite"
        >
          {narrate(event, s, start)}
        </p>

        <div className="board">
          <GraphView
            drawn={D}
            pos={pos}
            node={node}
            edge={edge}
            onNode={pick}
            label={`The 1970 Internet, BFS from ${start}`}
          />
          <Legend />
        </div>

        <Controls steps={steps} jumpLabel="layer" />
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">The layers</h2>
          <ol className="layers">
            {s.layers.map((layer, i) => (
              <li key={i} className={s.layer === i ? 'layers__row layers__row--on' : 'layers__row'}>
                <span className="layers__name">
                  L<sub>{i}</sub>
                </span>
                <span className="layers__nodes">
                  {layer.length === 0 ? <em className="muted">empty so far</em> : layer.join('  ')}
                </span>
              </li>
            ))}
          </ol>
          <p className="card__note">
            L<sub>i</sub> is every node at distance exactly i from {start}: the fewest edges on any
            path to it. No node is in two layers, and a node in no layer cannot be reached.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">What it costs</h2>
          <Code lines={BFS_LINES} current={linesOf(event)} counts={s.lines} />
          <p className="card__note">
            n = {n} nodes, m = {m} edges. The two inner lines run once per edge per end, 2m ={' '}
            {2 * m} times in all{s.done ? '' : ` (${s.lines[6] ?? 0} so far)`}, and no line runs
            more often than that. That is the whole O(m + n) proof.
          </p>
        </div>

        <div className={s.done ? 'card' : 'card card--waiting'}>
          <h2 className="card__title">No edge skips a layer</h2>
          {s.done ? (
            <>
              <p>
                Of the {m} edges, <b>{next}</b> join neighbouring layers and <b>{same}</b> join two
                nodes in the same layer. <b>{far}</b> jump further.
              </p>
              <p className="card__note">
                It is always none. If x is found first, in layer i, then exploring x puts every
                undiscovered neighbour into layer i + 1, so the other end is in i or i + 1 already.
              </p>
            </>
          ) : (
            <p className="card__note">Run it to the end to count.</p>
          )}
        </div>

        <div className="card">
          <h2 className="card__title">What the order changes</h2>
          <p>
            {moved.length === 0 ? (
              <>From {start}, reversing the order changes nothing at all here.</>
            ) : (
              <>
                From {start}, the {order === 'listed' ? 'reverse' : 'listed'} order gives the same
                layers, but {moved.length} {moved.length === 1 ? 'node hangs' : 'nodes hang'} from a
                different parent:{' '}
                {moved
                  .map((x) => `${x} (${run.parent.get(x)} → ${other.parent.get(x)})`)
                  .join(', ')}
                .
              </>
            )}
          </p>
          <p className="card__note">
            Layers are distances, so no order can move them. The tree is whichever parent got there
            first. Switch the order above and watch.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend" aria-hidden="true">
      <span className="legend__item">
        <i className="swatch swatch--current" /> exploring
      </span>
      <span className="legend__item">
        <i className="swatch swatch--found" /> discovered
      </span>
      <span className="legend__item">
        <i className="swatch swatch--done" /> explored
      </span>
      <span className="legend__item">
        <i className="line line--tree" /> tree edge
      </span>
      <span className="legend__item">
        <i className="line line--non" /> non-tree edge
      </span>
      <span className="legend__item">
        <i className="badge">2</i> layer
      </span>
    </div>
  );
}
