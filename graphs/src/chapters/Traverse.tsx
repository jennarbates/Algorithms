import { useMemo, useState } from 'react';
import { dfs, dfsStateAt, isAncestor } from '../core/dfs';
import type { DfsEvent, DfsState } from '../core/dfs';
import { degree, edgeKey } from '../core/graph';
import type { Edge, NodeId } from '../core/graph';
import { traverse, traverseStateAt } from '../core/traverse';
import type { Discipline, TraverseEvent, TraverseState } from '../core/traverse';
import { EIGHT, ISLANDS } from '../content/graphs';
import type { Drawn } from '../content/graphs';
import { Code, Controls, Segmented } from '../components/Controls';
import { GraphView } from '../components/GraphView';
import type { EdgeLook, NodeLook } from '../components/GraphView';
import { rows, treeRows } from '../components/layouts';
import { useSteps } from '../hooks/useSteps';

/**
 * Chapter 2: depth first, and the one word between it and breadth first.
 *
 * Three ways to walk the same graph. Recursive DFS is the lecture's version,
 * with its call stack on show. Then the generic traversal, with A a queue and
 * then a stack: the queue reproduces BFS's order, the stack goes deep. The
 * reader can flip between the three on the same graph and the same start and
 * see exactly what the choice changes, and what it cannot (which nodes are
 * found).
 *
 * The recursive version always runs the loop that finds every component, so on
 * the three islands it starts over twice. The generic traversal is one search
 * from one start, as on the slide, and on the islands it stops at the shore.
 */

type Method = 'dfs' | Discipline;

const GRAPHS: Readonly<Record<string, Drawn>> = { eight: EIGHT, islands: ISLANDS };

const DFS_LINES = [
  { n: 1, text: 'while some node s is unexplored' },
  { n: 2, text: '  DFS(s)              (one per component)' },
  { n: 3, text: 'DFS(u)' },
  { n: 4, text: '  mark u explored' },
  { n: 5, text: '  for each edge (u, v)' },
  { n: 6, text: '    if v is not explored' },
  { n: 7, text: '      add (u, v) to T; DFS(v)' },
];

const GENERIC_LINES = [
  { n: 1, text: 'put s in A' },
  { n: 2, text: 'while A is not empty' },
  { n: 3, text: '  take a node v from A' },
  { n: 4, text: '  if v is not marked explored' },
  { n: 5, text: '    mark v explored' },
  { n: 6, text: '    for each edge (v, w)' },
  { n: 7, text: '      put w in A' },
];

function dfsLines(e: DfsEvent | undefined): number[] {
  if (!e) return [];
  if (e.k === 'root') return [1, 2];
  if (e.k === 'enter') return [3, 4];
  if (e.k === 'edge') return e.kind === 'tree' ? [5, 6, 7] : [5, 6];
  if (e.k === 'done') return [1];
  return [];
}

function genericLines(e: TraverseEvent | undefined, first: boolean): number[] {
  if (!e) return [];
  if (e.k === 'put') return first ? [1] : [6, 7];
  if (e.k === 'take') return e.fresh ? [2, 3, 4, 5] : [2, 3, 4];
  return [2];
}

function narrateDfs(e: DfsEvent | undefined, s: DfsState): string {
  if (!e) return '';
  if (e.k === 'root') {
    return e.component === 0
      ? `Nothing is explored. Start DFS at ${e.s}.`
      : `Everything reachable so far is explored, but ${e.s} is not. That makes a new component, number ${e.component + 1}: start DFS again at ${e.s}.`;
  }
  if (e.k === 'enter') {
    return e.from === null
      ? `DFS(${e.u}): mark ${e.u} explored.`
      : `DFS(${e.u}), called from ${e.from}: mark ${e.u} explored. The stack is now ${s.stack.length} calls deep.`;
  }
  if (e.k === 'edge') {
    if (e.kind === 'tree')
      return `${e.u}–${e.v}: ${e.v} is unexplored. Add ${e.u}–${e.v} to the tree and call DFS(${e.v}). ${e.u}'s own loop waits.`;
    if (e.kind === 'parent')
      return `${e.u}–${e.v}: that is the tree edge ${e.u} was reached along. ${e.v} is explored; skip it.`;
    if (e.kind === 'ancestor')
      return `${e.u}–${e.v}: ${e.v} is explored and still on the call stack, so it is an ancestor of ${e.u}. A non-tree edge, pointing back up the branch.`;
    return `${e.u}–${e.v}: ${e.v} was explored inside DFS(${e.u}) already, so it is below ${e.u} on this branch. The same non-tree edge, met from its top end.`;
  }
  if (e.k === 'exit') {
    const top = s.stack[s.stack.length - 1];
    return `Every edge out of ${e.u} has been looked at. DFS(${e.u}) returns${top ? `, and DFS(${top}) carries on where it left off` : ''}.`;
  }
  return `Every node is explored, in ${e.components} ${e.components === 1 ? 'component' : 'components'}.`;
}

function narrateGeneric(
  e: TraverseEvent | undefined,
  s: TraverseState,
  d: Discipline,
  g: Drawn,
): string {
  if (!e) return '';
  const end = d === 'queue' ? 'front' : 'top';
  if (e.k === 'put') {
    const { node, by } = e.entry;
    if (by === null) return `Put ${node} in A. A is a ${d}, so nodes come out of the ${end}.`;
    return s.explored.has(node)
      ? `Put ${node} in A, as a neighbour of ${by}. ${node} is explored already, but the code puts every neighbour in; this copy will be skipped when it comes out.`
      : `Put ${node} in A, as a neighbour of ${by}.`;
  }
  if (e.k === 'take') {
    const { node, by } = e.entry;
    return e.fresh
      ? `Take ${node} from the ${end} of A. Not explored yet: mark it explored${by ? `, with ${by}–${node} as its tree edge` : ''}, then put its ${degree(g.graph, node)} neighbours in A.`
      : `Take ${node} from the ${end} of A. Already explored, so skip it.`;
  }
  const missed = g.graph.nodes.length - s.order.length;
  return `A is empty. ${s.order.length} nodes explored, in the order ${s.order.join(', ')}.${missed > 0 ? ` ${missed} never reached: one search only covers its own component.` : ''}`;
}

export function Traverse() {
  const [graphId, setGraphId] = useState<'eight' | 'islands'>('eight');
  const [method, setMethod] = useState<Method>('dfs');
  const [view, setView] = useState<'map' | 'tree'>('map');
  const D = GRAPHS[graphId] as Drawn;
  const g = D.graph;
  const [start, setStart] = useState<NodeId>('1');

  const dfsRun = useMemo(() => dfs(g, [start]), [g, start]);
  const genRun = useMemo(
    () => (method === 'dfs' ? null : traverse(g, start, method)),
    [g, start, method],
  );
  const events: readonly (DfsEvent | TraverseEvent)[] = genRun ? genRun.events : dfsRun.events;
  const jumps = useMemo(
    () =>
      genRun
        ? genRun.events.flatMap((e, i) => (e.k === 'take' && e.fresh ? [i] : []))
        : dfsRun.events.flatMap((e, i) => (e.k === 'enter' || e.k === 'done' ? [i] : [])),
    [genRun, dfsRun],
  );
  const steps = useSteps(events.length, jumps);

  const ds = method === 'dfs' ? dfsStateAt(g, dfsRun.events, steps.step) : null;
  const gs = genRun && method !== 'dfs' ? traverseStateAt(genRun.events, method, steps.step) : null;

  const order: readonly NodeId[] = ds
    ? dfsRun.events.slice(0, steps.step + 1).flatMap((e) => (e.k === 'enter' ? [e.u] : []))
    : (gs?.order ?? []);
  const parent = ds ? ds.parent : (gs?.parent ?? new Map<NodeId, NodeId>());
  const rank = new Map(order.map((n, i) => [n, i + 1]));

  const current: NodeId | null = ds
    ? (ds.stack[ds.stack.length - 1] ?? null)
    : gs?.last?.k === 'take' && gs.last.fresh
      ? gs.last.entry.node
      : null;
  const activeEdge: Edge | null = ds?.edge
    ? [ds.edge.u, ds.edge.v]
    : gs?.last?.k === 'put' && gs.last.entry.by !== null
      ? [gs.last.entry.by, gs.last.entry.node]
      : null;

  const inA = new Set(gs?.A.map((x) => x.node));
  const node = (n: NodeId): NodeLook => {
    const badge = rank.has(n) ? String(rank.get(n)) : undefined;
    if (n === current) return { tone: 'current', badge };
    if (ds) {
      if (ds.finished.has(n)) return { tone: 'done', badge };
      if (ds.explored.has(n)) return { tone: 'found', badge };
      return { tone: 'idle' };
    }
    if (gs?.explored.has(n)) return { tone: 'done', badge };
    if (inA.has(n)) return { tone: 'found' };
    return { tone: 'idle' };
  };

  const k = (u: NodeId, v: NodeId) => edgeKey(u, v, false);
  const edge = ([u, v]: Edge): EdgeLook => {
    if (activeEdge && k(activeEdge[0], activeEdge[1]) === k(u, v)) return { tone: 'active' };
    if (parent.get(v) === u || parent.get(u) === v) return { tone: 'tree' };
    if (ds?.back.has(k(u, v))) return { tone: 'non' };
    return { tone: 'plain' };
  };

  const pos = view === 'tree' ? rows(D, treeRows(order, parent)) : undefined;

  const choose = (id: 'eight' | 'islands') => {
    setGraphId(id);
    setStart(id === 'eight' ? '1' : 'A');
    steps.go(0);
  };

  const event = events[steps.step];
  const text = ds
    ? narrateDfs(event as DfsEvent, ds)
    : gs
      ? narrateGeneric(event as TraverseEvent, gs, method as Discipline, D)
      : '';
  const done = ds ? ds.done : Boolean(gs?.done);

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The board">
        <div className="boardcol__head">
          <Segmented
            label="Graph"
            value={graphId}
            onChange={choose}
            options={[
              { value: 'eight', label: '8 nodes' },
              { value: 'islands', label: 'Three islands' },
            ]}
          />
          <Segmented
            label="Walk it with"
            value={method}
            onChange={(m) => {
              setMethod(m);
              steps.go(0);
            }}
            options={[
              { value: 'dfs', label: 'Recursive DFS' },
              { value: 'queue', label: 'A = queue' },
              { value: 'stack', label: 'A = stack' },
            ]}
          />
          <Segmented
            label="Draw it as"
            value={view}
            onChange={setView}
            options={[
              { value: 'map', label: 'The graph' },
              { value: 'tree', label: 'The tree' },
            ]}
          />
        </div>

        <p
          className={done ? 'board-status board-status--final' : 'board-status'}
          aria-live="polite"
        >
          {text}
        </p>

        <div className="board">
          <GraphView
            drawn={D}
            pos={pos}
            node={node}
            edge={edge}
            onNode={(n) => {
              setStart(n);
              steps.go(0);
            }}
            label={`${D.title}, ${method === 'dfs' ? 'depth-first search' : `traversal with a ${method}`} from ${start}`}
          />
          <div className="legend" aria-hidden="true">
            <span className="legend__item">
              <i className="swatch swatch--current" /> {ds ? 'running now' : 'just taken'}
            </span>
            <span className="legend__item">
              <i className="swatch swatch--found" /> {ds ? 'on the call stack' : 'waiting in A'}
            </span>
            <span className="legend__item">
              <i className="swatch swatch--done" /> {ds ? 'finished' : 'explored'}
            </span>
            <span className="legend__item">
              <i className="line line--tree" /> tree edge
            </span>
            {ds && (
              <span className="legend__item">
                <i className="line line--non" /> non-tree edge
              </span>
            )}
            <span className="legend__item">
              <i className="badge">3</i> order explored
            </span>
            <span className="legend__item legend__hint">Click a node to start there.</span>
          </div>
        </div>

        <Controls steps={steps} jumpLabel={ds ? 'call' : 'node'} />
      </section>

      <aside className="work" aria-label="The work">
        {ds ? (
          <DfsWork s={ds} g={D} step={steps.step} events={dfsRun.events} />
        ) : gs ? (
          <GenericWork s={gs} g={D} d={method as Discipline} start={start} />
        ) : null}
        <div className="card">
          <h2 className="card__title">The code</h2>
          <Code
            lines={ds ? DFS_LINES : GENERIC_LINES}
            current={
              ds
                ? dfsLines(event as DfsEvent)
                : genericLines(event as TraverseEvent, steps.step === 0)
            }
          />
          <p className="card__note">
            {ds
              ? 'O(m + n) across all the calls together: each node gets one call, and each call looks along its own edges, 2m looks in all.'
              : 'BFS if A is a queue (first in, first out). DFS if A is a stack (last in, first out). Nothing else in the code changes.'}
          </p>
        </div>
      </aside>
    </div>
  );
}

function DfsWork({
  s,
  g,
  events,
  step,
}: {
  readonly s: DfsState;
  readonly g: Drawn;
  readonly events: readonly DfsEvent[];
  readonly step: number;
}) {
  const components = new Map<number, NodeId[]>();
  for (const [n, c] of s.component) components.set(c, [...(components.get(c) ?? []), n]);
  const back = [...s.back.values()];
  const reached = events.slice(0, step + 1).filter((e) => e.k === 'root').length;

  return (
    <>
      <div className="card">
        <h2 className="card__title">The call stack</h2>
        {s.stack.length === 0 ? (
          <p className="card__note">{s.done ? 'Empty. Every call has returned.' : 'Empty.'}</p>
        ) : (
          <ol className="stack" reversed>
            {[...s.stack].reverse().map((n, i) => (
              <li key={n} className={i === 0 ? 'stack__item stack__item--top' : 'stack__item'}>
                DFS({n})
                {s.parent.get(n) ? (
                  <span className="muted"> called by DFS({s.parent.get(n)})</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        <p className="card__note">
          The deepest call is on top. A call only returns when every edge out of its node has been
          looked at, which is why DFS goes as far as it can before it backs up.
        </p>
      </div>

      <div className="card">
        <h2 className="card__title">Non-tree edges point up</h2>
        {back.length === 0 ? (
          <p className="card__note">None met yet.</p>
        ) : (
          <ul className="facts">
            {back.map(([a, b]) => (
              <li key={edgeKey(a, b, false)}>
                {b}–{a}: {a} is an ancestor of {b}{' '}
                <span className="tick">{isAncestor(s.parent, a, b) ? '✓' : '✗'}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="card__note">
          Every one of them joins a node to its own ancestor. Whichever end is explored first, its
          call looks along the edge before it returns, so the other end is found inside that call.
        </p>
      </div>

      {g.graph.id === 'islands' && (
        <div className="card">
          <h2 className="card__title">Components</h2>
          <ul className="facts">
            {[...components.entries()].map(([c, ns]) => (
              <li key={c}>
                Component {c + 1}: {ns.join(', ')}
              </li>
            ))}
          </ul>
          <p className="card__note">
            {reached} {reached === 1 ? 'search' : 'searches'} started so far. One per component, and
            still O(m + n) in total: each search only pays for its own piece.
          </p>
        </div>
      )}
    </>
  );
}

function GenericWork({
  s,
  g,
  d,
  start,
}: {
  readonly s: TraverseState;
  readonly g: Drawn;
  readonly d: Discipline;
  readonly start: NodeId;
}) {
  const reached = g.graph.nodes.filter((n) => s.puts.has(n));
  return (
    <>
      <div className="card">
        <h2 className="card__title">A, the {d}</h2>
        {s.A.length === 0 ? (
          <p className="card__note">Empty.</p>
        ) : (
          <ol className={`queue queue--${d}`}>
            {s.A.map((x, i) => {
              const next = d === 'queue' ? i === 0 : i === s.A.length - 1;
              const stale = s.explored.has(x.node);
              return (
                <li
                  key={i}
                  className={`queue__item${next ? ' queue__item--next' : ''}${stale ? ' queue__item--stale' : ''}`}
                  title={x.by ? `put in by ${x.by}` : 'the start'}
                >
                  {x.node}
                </li>
              );
            })}
          </ol>
        )}
        <p className="card__note">
          {d === 'queue'
            ? 'Taken from the front (marked), oldest first.'
            : 'Taken from the end (marked), newest first.'}{' '}
          Struck-out copies are of nodes already explored; they will be skipped.
        </p>
      </div>

      <div className="card">
        <h2 className="card__title">Explored, in order</h2>
        <p className="order">
          {s.order.length === 0 ? <em className="muted">nothing yet</em> : s.order.join(' → ')}
        </p>
      </div>

      <div className="card">
        <h2 className="card__title">Times each node went into A</h2>
        <table className="puts">
          <thead>
            <tr>
              <th scope="row">node</th>
              {reached.map((n) => (
                <th key={n} scope="col">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">put in</th>
              {reached.map((n) => (
                <td key={n}>{s.puts.get(n)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">degree</th>
              {reached.map((n) => (
                <td key={n}>{degree(g.graph, n)}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="card__note">
          {s.done
            ? `Done: every node other than ${start} went in exactly degree-many times, once for each neighbour that was explored. ${start} went in once more, at the start.`
            : 'Run it to the end and compare the two rows: that is the lecture 5 clicker.'}
        </p>
      </div>
    </>
  );
}
