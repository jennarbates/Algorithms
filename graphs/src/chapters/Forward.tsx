import { useEffect, useMemo, useState } from 'react';
import { countOrders, cycleAmong, inDegrees, sources } from '../core/directed';
import { edgeKey } from '../core/graph';
import type { Edge, NodeId } from '../core/graph';
import { COURSES, COURSES_LOOP, nameOf } from '../content/graphs';
import type { Drawn } from '../content/graphs';
import { Code, Segmented } from '../components/Controls';
import { GraphView } from '../components/GraphView';
import type { EdgeLook, NodeLook } from '../components/GraphView';
import { line } from '../components/layouts';

/**
 * Chapter 4: topological order, done by the reader.
 *
 * The other chapters replay a run. This one hands the run over, because the
 * algorithm has a real choice in it: whenever more than one course has nothing
 * left in front of it, any of them may go next, and all the resulting orders
 * are right. So the reader picks. The page shows every node's in-degree among
 * what is left, lights the ones at zero, and does the deleting.
 *
 * The second graph adds one bad rule and the sort gets stuck. Stuck is a claim;
 * the page backs it with the cycle among what is left, found by walking
 * backwards along incoming edges.
 *
 * Then "in a line" lays the order out left to right, the lecture's picture of
 * what a topological order is: every arrow points forward.
 */

const GRAPHS: Readonly<Record<string, Drawn>> = { courses: COURSES, loop: COURSES_LOOP };

const LINES = [
  { n: 1, text: 'while nodes remain' },
  { n: 2, text: '  find a node v with no incoming edges' },
  { n: 3, text: '  put v next in the order' },
  { n: 4, text: '  delete v and its outgoing edges' },
];

export function Forward() {
  const [id, setId] = useState<'courses' | 'loop'>('courses');
  const [placed, setPlaced] = useState<NodeId[]>([]);
  const [view, setView] = useState<'map' | 'line'>('map');
  const D = GRAPHS[id] as Drawn;
  const g = D.graph;

  const removed = useMemo(() => new Set(placed), [placed]);
  const deg = inDegrees(g, removed);
  const available = sources(g, removed);
  const left = g.nodes.filter((n) => !removed.has(n));
  const finished = left.length === 0;
  const stuck = !finished && available.length === 0;
  const cycle = stuck ? cycleAmong(g, left) : [];
  const cycleEdges = new Set<string>();
  for (let i = 1; i < cycle.length; i++) {
    cycleEdges.add(edgeKey(cycle[i - 1] as NodeId, cycle[i] as NodeId, true));
  }
  const total = useMemo(() => countOrders(COURSES.graph), []);
  const at = new Map(placed.map((n, i) => [n, i]));
  // Where each node sits in the line: placed ones in order, then the rest as listed.
  const lineAt = new Map([...placed, ...left].map((n, i) => [n, i]));

  const place = (n: NodeId) => {
    if (available.includes(n)) setPlaced((p) => [...p, n]);
  };

  // Right takes the first source, left puts the last one back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight' && available[0])
        setPlaced((p) => [...p, available[0] as NodeId]);
      else if (event.key === 'ArrowLeft') setPlaced((p) => p.slice(0, -1));
      else return;
      event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [available]);

  const node = (n: NodeId): NodeLook => {
    if (removed.has(n)) return { tone: 'placed', badge: `#${(at.get(n) ?? 0) + 1}` };
    if (stuck && cycle.includes(n)) return { tone: 'bad', badge: String(deg.get(n) ?? 0) };
    if (available.includes(n)) return { tone: 'source', badge: '0' };
    return { tone: 'idle', badge: String(deg.get(n) ?? 0) };
  };

  const edge = ([u, v]: Edge): EdgeLook => {
    if (cycleEdges.has(edgeKey(u, v, true))) return { tone: 'cycle' };
    if (view === 'line') {
      return { tone: (lineAt.get(u) ?? 0) < (lineAt.get(v) ?? 0) ? 'ok' : 'bad' };
    }
    if (removed.has(u)) return { tone: 'faded' };
    return { tone: 'plain' };
  };

  const pos = useMemo(() => (view === 'line' ? line(D, placed) : undefined), [view, D, placed]);

  const name = (n: NodeId) => nameOf(D, n);
  const names = (ns: readonly NodeId[]) =>
    ns.length === 1
      ? name(ns[0] as NodeId)
      : `${ns.slice(0, -1).map(name).join(', ')} and ${name(ns[ns.length - 1] as NodeId)}`;

  const text = finished
    ? `All ${g.nodes.length} placed. Every arrow points from earlier to later: this is a topological order.`
    : stuck
      ? `Stuck. Every course left has something in front of it: ${cycle.map(name).join(' → ')} goes round in a circle, so none of them can ever go first.`
      : placed.length === 0
        ? `Nothing points into ${names(available)}. ${available.length > 1 ? 'Either can go first. Click one.' : 'It goes first. Click it.'}`
        : `Placed ${name(placed[placed.length - 1] as NodeId)} and deleted its arrows. Now nothing points into ${names(available)}. ${available.length > 1 ? 'Any of them can go next.' : ''}`;

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The board">
        <div className="boardcol__head">
          <Segmented
            label="Graph"
            value={id}
            onChange={(v) => {
              setId(v);
              setPlaced([]);
            }}
            options={[
              { value: 'courses', label: 'Prerequisites' },
              { value: 'loop', label: 'With a bad rule' },
            ]}
          />
          <Segmented
            label="Draw it as"
            value={view}
            onChange={setView}
            options={[
              { value: 'map', label: 'The graph' },
              { value: 'line', label: 'In a line' },
            ]}
          />
        </div>

        <p
          className={
            stuck
              ? 'board-status board-status--bad'
              : finished
                ? 'board-status board-status--final'
                : 'board-status'
          }
          aria-live="polite"
        >
          {text}
        </p>

        <div className="board">
          <GraphView
            drawn={D}
            pos={pos}
            arcs={view === 'line'}
            node={node}
            edge={edge}
            onNode={place}
            clickable={(n) => available.includes(n)}
            text={name}
            label={`${D.title}: ${placed.length} of ${g.nodes.length} placed`}
          />
          <div className="legend" aria-hidden="true">
            <span className="legend__item">
              <i className="swatch swatch--source" /> nothing points in: can go next
            </span>
            <span className="legend__item">
              <i className="swatch swatch--placed" /> placed
            </span>
            <span className="legend__item">
              <i className="badge">2</i> arrows still pointing in
            </span>
            {id === 'loop' && (
              <span className="legend__item">
                <i className="line line--cycle" /> a cycle
              </span>
            )}
          </div>
        </div>

        <div className="controls" role="group" aria-label="Place courses">
          <button
            type="button"
            className="button"
            onClick={() => setPlaced([])}
            disabled={placed.length === 0}
          >
            Restart
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setPlaced((p) => p.slice(0, -1))}
            disabled={placed.length === 0}
          >
            &larr; Take back
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => available[0] && place(available[0])}
            disabled={available.length === 0}
          >
            Place {available[0] ? name(available[0]) : 'next'} &rarr;
          </button>
          <span className="controls__count">
            {placed.length} of {g.nodes.length} placed
          </span>
        </div>
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">The order so far</h2>
          <ol className="order-strip">
            {placed.map((n) => (
              <li key={n}>{name(n)}</li>
            ))}
            {!finished && <li className="order-strip__gap">{stuck ? 'stuck' : '…'}</li>}
          </ol>
          <Code lines={LINES} current={finished ? [1] : stuck ? [2] : [1, 2, 3, 4]} />
        </div>

        {id === 'courses' ? (
          <div className="card">
            <h2 className="card__title">Is it the right order?</h2>
            <p>
              There are <b>{total}</b> valid orders of these seven courses. Any of them is right,
              which is why the page lets you choose.
            </p>
            <p className="card__note">
              So to mark an answer, check it: every arrow has to point forward. Try "In a line" once
              you are done. The slide's order, Math 132, CS 187, CS 220, CS 240, CS 250, CS 311, CS
              383, is the one "always take the first" gives.
            </p>
          </div>
        ) : (
          <div className="card">
            <h2 className="card__title">When there is a cycle</h2>
            <p>
              No node on a cycle can ever reach in-degree 0: each one waits for the one before it.
              So the sort gets stuck exactly when there is a cycle.
            </p>
            <p className="card__note">
              And the other way round: if there is no cycle there is always a node with nothing
              pointing in. Walk backwards along incoming edges; without a source the walk would
              repeat a node, and that is a cycle.
            </p>
          </div>
        )}

        <div className="card">
          <h2 className="card__title">The theorem</h2>
          <p>
            G has a topological order <b>exactly when</b> G is a DAG (no directed cycle).
          </p>
          <p className="card__note">
            An order with every edge forward cannot contain a cycle, since a cycle has to come back.
            And on a DAG this algorithm never gets stuck, and with the right data structures it runs
            in O(m + n).
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">Beyond DAGs: strong components</h2>
          <p className="card__note">
            In a directed graph, a strongly connected component is a largest set of nodes that can
            all reach each other. Squash each one to a single node and what is left is always a DAG:
            a cycle through two components would make them one. Tarjan (1972) finds them all in O(m
            + n).
          </p>
        </div>
      </aside>
    </div>
  );
}
