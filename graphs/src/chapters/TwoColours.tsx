import { useMemo, useState } from 'react';
import { bfsStateAt } from '../core/bfs';
import { colourRun } from '../core/bipartite';
import type { ColourEvent } from '../core/bipartite';
import { edgeKey } from '../core/graph';
import type { Edge, NodeId } from '../core/graph';
import { APPLICATIONS, ARPANET, CUBE, PENTAGON } from '../content/graphs';
import type { Drawn } from '../content/graphs';
import { Code, Controls, Segmented } from '../components/Controls';
import { GraphView } from '../components/GraphView';
import type { EdgeLook, NodeLook } from '../components/GraphView';
import { rows } from '../components/layouts';
import { useSteps } from '../hooks/useSteps';

/**
 * Chapter 3: the bipartite test.
 *
 * BFS again, with one change to the picture: even layers blue, odd layers
 * orange. Then every edge is checked. An edge between neighbouring layers joins
 * two colours and is fine; BFS promises no edge skips a layer; so the only way
 * to fail is an edge inside one layer. When that happens the page does what the
 * proof does: walks both ends up the tree to where they meet and draws the odd
 * cycle, with its length worked out from the two layer numbers.
 *
 * Four graphs: two that pass and two that fail, and one of each is the kind you
 * would not guess by looking. The 1970 Internet fails, on SDC–RAND.
 */

const GRAPHS: Readonly<Record<string, Drawn>> = {
  arpanet: ARPANET,
  cube: CUBE,
  applications: APPLICATIONS,
  pentagon: PENTAGON,
};

const LINES = [
  { n: 1, text: 'run BFS from any node s' },
  { n: 2, text: 'colour even layers blue, odd layers orange' },
  { n: 3, text: 'for each edge (x, y)' },
  { n: 4, text: '  if x and y are in the same layer' },
  { n: 5, text: '    return "not bipartite"' },
  { n: 6, text: 'return "bipartite"' },
];

const colourName = (layer: number) => (layer % 2 === 0 ? 'blue' : 'orange');

export function TwoColours() {
  const [id, setId] = useState('arpanet');
  const [view, setView] = useState<'map' | 'layers'>('map');
  const D = GRAPHS[id] as Drawn;
  const g = D.graph;
  const start = g.nodes[0] as NodeId;

  const { run, events, verdict } = useMemo(() => colourRun(g, start), [g, start]);
  const bfsCount = run.events.length;
  const jumps = useMemo(
    () => [...events.flatMap((e, i) => (e.k === 'layer' ? [i] : [])), bfsCount, events.length - 1],
    [events, bfsCount],
  );
  const steps = useSteps(events.length, jumps);
  const inBfs = steps.step < bfsCount;
  const s = bfsStateAt(run.events, Math.min(steps.step, bfsCount - 1));
  const checks = events.slice(bfsCount, steps.step + 1) as Extract<ColourEvent, { k: 'check' }>[];
  const checked = new Set(checks.map((c) => edgeKey(c.edge[0], c.edge[1], false)));
  const current = inBfs ? null : (checks[checks.length - 1] ?? null);
  const failed = !verdict.ok && steps.atEnd ? verdict : null;
  const cycleEdges = new Set<string>();
  if (failed) {
    for (let i = 1; i < failed.cycle.length; i++) {
      cycleEdges.add(edgeKey(failed.cycle[i - 1] as NodeId, failed.cycle[i] as NodeId, false));
    }
  }
  const finalOk = verdict.ok && steps.atEnd;

  const node = (n: NodeId): NodeLook => {
    const layer = s.layerOf.get(n);
    if (layer === undefined) return { tone: 'idle' };
    const badge = String(layer);
    if (failed && n === failed.lca) return { tone: 'current', badge: 'z' };
    if (inBfs && n === s.visiting) return { tone: 'current', badge };
    return { tone: layer % 2 === 0 ? 'side0' : 'side1', badge };
  };

  const edge = ([u, v]: Edge): EdgeLook => {
    const key = edgeKey(u, v, false);
    if (failed && edgeKey(failed.edge[0], failed.edge[1], false) === key) return { tone: 'bad' };
    if (cycleEdges.has(key)) return { tone: 'cycle' };
    if (inBfs && s.edge && edgeKey(s.edge.v, s.edge.w, false) === key) return { tone: 'active' };
    if (current && edgeKey(current.edge[0], current.edge[1], false) === key) {
      return { tone: current.same ? 'bad' : 'active' };
    }
    if (checked.has(key)) return { tone: 'ok' };
    if (s.parent.get(u) === v || s.parent.get(v) === u) return { tone: 'tree' };
    return { tone: 'plain' };
  };

  const pos =
    view === 'layers'
      ? rows(
          D,
          s.layers.filter((l) => l.length > 0),
        )
      : undefined;

  const text = (() => {
    const e = events[steps.step];
    if (!e) return '';
    if (e.k === 'start')
      return `Run BFS from ${start}, colouring as it goes. ${start} is layer 0: blue.`;
    if (e.k === 'layer')
      return `Layer ${e.i}: ${(s.layers[e.i] ?? []).join(', ')}, all ${colourName(e.i)}. Their new neighbours will be layer ${e.i + 1}, ${colourName(e.i + 1)}.`;
    if (e.k === 'visit') return `Explore ${e.v}.`;
    if (e.k === 'edge') {
      const i = s.layerOf.get(e.v) ?? 0;
      return e.found
        ? `${e.w} is new: layer ${i + 1}, so ${colourName(i + 1)}.`
        : `${e.v}–${e.w}: ${e.w} is already coloured.`;
    }
    if (e.k === 'done') return 'BFS is done and every node has a colour. Now check every edge.';
    const [x, y] = e.edge;
    const a = s.layerOf.get(x) ?? 0;
    const b = s.layerOf.get(y) ?? 0;
    if (!e.same) {
      const last = steps.atEnd && verdict.ok;
      return `${x}–${y}: layers ${a} and ${b}, ${colourName(a)} and ${colourName(b)}. Fine.${last ? ' That was the last edge: every edge joins two colours, so the graph is bipartite.' : ''}`;
    }
    return `${x}–${y}: both in layer ${a}, both ${colourName(a)}. Not bipartite, and the proof is drawn: the odd cycle through their lowest common ancestor, z.`;
  })();

  return (
    <div className="walk">
      <section className="boardcol" aria-label="The board">
        <div className="boardcol__head">
          <Segmented
            label="Graph"
            value={id}
            onChange={(v) => {
              setId(v);
              steps.go(0);
            }}
            options={[
              { value: 'arpanet', label: '1970 Internet' },
              { value: 'cube', label: 'Cube' },
              { value: 'applications', label: 'Applications' },
              { value: 'pentagon', label: 'Five in a ring' },
            ]}
          />
          <Segmented
            label="Draw it as"
            value={view}
            onChange={setView}
            options={[
              { value: 'map', label: 'The graph' },
              { value: 'layers', label: 'Layers' },
            ]}
          />
        </div>

        <p
          className={
            failed
              ? 'board-status board-status--bad'
              : finalOk
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
            node={node}
            edge={edge}
            label={`${D.title}, coloured by BFS layer`}
          />
          <div className="legend" aria-hidden="true">
            <span className="legend__item">
              <i className="swatch swatch--side0" /> even layer
            </span>
            <span className="legend__item">
              <i className="swatch swatch--side1" /> odd layer
            </span>
            <span className="legend__item">
              <i className="line line--ok" /> checked, two colours
            </span>
            <span className="legend__item">
              <i className="line line--bad" /> same colour
            </span>
            <span className="legend__item">
              <i className="line line--cycle" /> the odd cycle
            </span>
          </div>
        </div>

        <Controls steps={steps} jumpLabel="stage" />
      </section>

      <aside className="work" aria-label="The work">
        <div className="card">
          <h2 className="card__title">The test</h2>
          <Code lines={LINES} current={inBfs ? [1, 2] : failed ? [4, 5] : finalOk ? [6] : [3, 4]} />
          <p className="card__note">
            {checks.length} of {g.edges.length} edges checked. Only one kind of edge can fail: BFS
            never lets an edge skip a layer, so an edge joins neighbouring layers (two colours) or
            one layer (one colour).
          </p>
        </div>

        {failed ? (
          <div className="card card--bad">
            <h2 className="card__title">Why no colouring can work</h2>
            <p>
              {failed.edge[0]} and {failed.edge[1]} are both in layer {failed.layer}. Walk each up
              the tree until they meet: at z = {failed.lca}, in layer {failed.lcaLayer}.
            </p>
            <p className="formula">
              {failed.layer - failed.lcaLayer} + {failed.layer - failed.lcaLayer} + 1 = 2(
              {failed.layer} − {failed.lcaLayer}) + 1 = <b>{failed.cycle.length - 1}</b>
            </p>
            <p>
              The cycle {failed.cycle.join(' → ')} has {failed.cycle.length - 1} edges. Going round
              it, the colour has to switch at every step, and an odd number of switches cannot get
              back to where it started.
            </p>
          </div>
        ) : finalOk && verdict.ok ? (
          <div className="card card--good">
            <h2 className="card__title">Bipartite</h2>
            <p>
              Blue: {g.nodes.filter((n) => verdict.side.get(n) === 0).join(', ')}.
              <br />
              Orange: {g.nodes.filter((n) => verdict.side.get(n) === 1).join(', ')}.
            </p>
            <p className="card__note">
              {id === 'applications'
                ? 'Students on one side, colleges on the other, just as in stable matching. Every edge is an application, and nobody applies to a student.'
                : id === 'cube'
                  ? 'Plenty of cycles, every one of them even. That is all bipartite needs.'
                  : 'Every edge joins the two sides.'}
            </p>
          </div>
        ) : (
          <div className="card card--waiting">
            <h2 className="card__title">The verdict</h2>
            <p className="card__note">Step through, or jump to the end.</p>
          </div>
        )}

        <div className="card">
          <h2 className="card__title">The theorem</h2>
          <p>
            A graph is bipartite <b>exactly when</b> it has no odd cycle.
          </p>
          <p className="card__note">
            One direction is easy: colours alternate round any cycle, so a cycle in a bipartite
            graph is even. The other direction is this algorithm. Whenever it says "not bipartite",
            it has the odd cycle in hand.
          </p>
        </div>
      </aside>
    </div>
  );
}
