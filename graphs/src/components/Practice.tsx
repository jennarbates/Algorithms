import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { bfs } from '../core/bfs';
import { colour } from '../core/bipartite';
import { dfs } from '../core/dfs';
import { checkOrder } from '../core/directed';
import { edgeKey, hasEdge } from '../core/graph';
import type { Edge, NodeId } from '../core/graph';
import { WALK_LABELS, classifyWalk } from '../core/paths';
import type { WalkKind } from '../core/paths';
import { drawnById, nameOf } from '../content/graphs';
import {
  TIERS,
  TIER_LABELS,
  questionsIn,
  type ColourQuestion,
  type EdgesQuestion,
  type LayersQuestion,
  type NumberQuestion,
  type Option,
  type OrderQuestion,
  type OrdersQuestion,
  type Question,
  type Tier,
  type WalksQuestion,
} from '../content/questions';
import { GraphView } from './GraphView';
import type { EdgeLook, NodeLook } from './GraphView';

/**
 * The practice section.
 *
 * It follows `../gale-shapley`'s practice rules. A question is scored on the
 * first attempt and never marked down after that, so trying the other options
 * to read why they are wrong costs nothing. Anything that can be computed is
 * marked by the engine, never against stored text: the layers come from BFS,
 * the tree from DFS, the verdicts from the two-colour test, the orders from
 * `checkOrder`. A topological order question accepts every valid order,
 * because every valid order is right.
 */

type Result = 'first' | 'after' | 'miss';

export function Practice() {
  const [tier, setTier] = useState<Tier>(1);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Readonly<Record<string, Result>>>({});
  const list = questionsIn(tier);
  const q = list[Math.min(index, list.length - 1)] as Question;

  const record = (id: string, right: boolean) =>
    setResults((r) => {
      const was = r[id];
      if (was === 'first' || was === 'after') return r;
      if (was === 'miss') return right ? { ...r, [id]: 'after' } : r;
      return { ...r, [id]: right ? 'first' : 'miss' };
    });

  const score = (t: Tier) => {
    const qs = questionsIn(t);
    return `${qs.filter((x) => results[x.id] === 'first').length}/${qs.length}`;
  };

  return (
    <div className="practice">
      <nav className="practice__tiers" aria-label="Practice tiers">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            className={t === tier ? 'tier tier--on' : 'tier'}
            aria-pressed={t === tier}
            onClick={() => {
              setTier(t);
              setIndex(0);
            }}
          >
            <span className="tier__num">{t}</span>
            <span className="tier__name">{TIER_LABELS[t]}</span>
            <span className="tier__score" title="Right first time">
              {score(t)}
            </span>
          </button>
        ))}
      </nav>

      <div className="practice__body">
        <ol className="practice__list" aria-label="Questions in this tier">
          {list.map((x, i) => (
            <li key={x.id}>
              <button
                type="button"
                className={`qdot${i === index ? ' qdot--on' : ''}${results[x.id] ? ` qdot--${results[x.id]}` : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Question ${tier}.${i + 1}${results[x.id] ? `, ${results[x.id] === 'miss' ? 'not yet right' : 'right'}` : ''}`}
                aria-current={i === index}
              >
                {tier}.{i + 1}
              </button>
            </li>
          ))}
        </ol>

        <QuestionCard
          key={q.id}
          q={q}
          number={`${tier}.${list.indexOf(q) + 1}`}
          onResult={(right) => record(q.id, right)}
          onNext={index < list.length - 1 ? () => setIndex(index + 1) : undefined}
        />
      </div>
    </div>
  );
}

interface Marked {
  readonly answered: boolean;
  readonly right: boolean;
}

function QuestionCard({
  q,
  number,
  onResult,
  onNext,
}: {
  readonly q: Question;
  readonly number: string;
  readonly onResult: (right: boolean) => void;
  readonly onNext: (() => void) | undefined;
}) {
  const [marked, setMarked] = useState<Marked>({ answered: false, right: false });
  const mark = (right: boolean) => {
    onResult(right);
    setMarked({ answered: true, right });
  };

  let body: ReactNode;
  if (q.kind === 'layers') body = <LayersWidget q={q} onMark={mark} />;
  else if (q.kind === 'edges') body = <EdgesWidget q={q} onMark={mark} />;
  else if (q.kind === 'walks') body = <WalksWidget q={q} onMark={mark} />;
  else if (q.kind === 'colour') body = <ColourWidget q={q} onMark={mark} />;
  else if (q.kind === 'order') body = <OrderWidget q={q} onMark={mark} />;
  else if (q.kind === 'orders') body = <OrdersWidget q={q} onMark={mark} />;
  else if (q.kind === 'number') body = <NumberWidget q={q} onMark={mark} />;
  else body = <OptionsWidget options={q.options} multi={q.kind === 'multi'} onMark={mark} />;

  const drawsOwnGraph = ['layers', 'edges', 'order', 'colour'].includes(q.kind);
  const d = q.graphId && !drawsOwnGraph ? drawnById(q.graphId) : null;

  return (
    <article className="qcard" aria-labelledby={`q-${q.id}`}>
      <header className="qcard__head">
        <span className="qcard__num">{number}</span>
        <span className="qcard__tests">Checks: {q.tests}</span>
        {q.clicker && <span className="qcard__clicker">Clicker · {q.clicker}</span>}
      </header>
      <div className="qcard__main">
        <div className="qcard__ask">
          <p className="qcard__prompt" id={`q-${q.id}`}>
            {q.prompt}
          </p>
          {q.quote && <pre className="qcard__quote">{q.quote}</pre>}
          {body}
          {marked.answered && marked.right && <p className="qcard__close">{q.close}</p>}
          {marked.answered && marked.right && onNext && (
            <button type="button" className="button button--primary" onClick={onNext}>
              Next question &rarr;
            </button>
          )}
        </div>
        {d && (
          <div className="qcard__graph">
            <GraphView
              drawn={d}
              compact
              label={d.title}
              text={(n) => (d.graph.id === 'courses' ? nameOf(d, n) : n)}
            />
          </div>
        )}
      </div>
    </article>
  );
}

type OnMark = (right: boolean) => void;

// --- layers --------------------------------------------------------------------

function LayersWidget({ q, onMark }: { readonly q: LayersQuestion; readonly onMark: OnMark }) {
  const d = drawnById(q.graphId);
  const g = d.graph;
  const truth = useMemo(() => bfs(g, q.start).layerOf, [g, q.start]);
  const [picked, setPicked] = useState<Readonly<Record<NodeId, number>>>({ [q.start]: 0 });
  const [checked, setChecked] = useState(false);
  const top = Math.min(g.nodes.length - 1, 6);
  const ready = g.nodes.every((n) => picked[n] !== undefined);
  const wrong = g.nodes.filter((n) => picked[n] !== truth.get(n));

  const node = (n: NodeId): NodeLook => {
    const p = picked[n];
    const badge = p === undefined ? undefined : String(p);
    if (checked) return { tone: picked[n] === truth.get(n) ? 'right' : 'wrong', badge };
    return { tone: n === q.start ? 'current' : p === undefined ? 'idle' : 'found', badge };
  };

  return (
    <>
      <div className="qgraph">
        <GraphView drawn={d} node={node} compact label={d.title} />
      </div>
      <div className="layerpick">
        {g.nodes.map((n) => (
          <label key={n} className="layerpick__row">
            <span className="layerpick__node">{n}</span>
            <select
              value={picked[n] ?? ''}
              disabled={n === q.start || (checked && wrong.length === 0)}
              onChange={(e) => {
                setChecked(false);
                setPicked((p) => ({ ...p, [n]: Number(e.target.value) }));
              }}
            >
              <option value="" disabled>
                layer?
              </option>
              {[...Array(top + 1).keys()].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <CheckRow
        ready={ready}
        checked={checked}
        onCheck={() => {
          setChecked(true);
          onMark(wrong.length === 0);
        }}
        verdict={
          wrong.length === 0
            ? 'Every layer right.'
            : `${wrong.length} not right: ${wrong.map((n) => `${n} is in layer ${truth.get(n)}`).join(', ')}. A node's layer is its distance from ${q.start}; find a shortest path to check.`
        }
        right={wrong.length === 0}
      />
    </>
  );
}

// --- edges -----------------------------------------------------------------------

function EdgesWidget({ q, onMark }: { readonly q: EdgesQuestion; readonly onMark: OnMark }) {
  const d = drawnById(q.graphId);
  const g = d.graph;
  const k = (e: Edge) => edgeKey(e[0], e[1], g.directed);
  const truth = useMemo(() => {
    const es = q.pick === 'bfs-non-tree' ? bfs(g, q.start).nonTree : dfs(g, [q.start]).tree;
    return new Set(es.map(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, q]);
  const [on, setOn] = useState<ReadonlySet<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const toggle = (e: Edge) => {
    setChecked(false);
    setOn((s) => {
      const next = new Set(s);
      if (next.has(k(e))) next.delete(k(e));
      else next.add(k(e));
      return next;
    });
  };
  const extra = [...on].filter((x) => !truth.has(x));
  const missed = [...truth].filter((x) => !on.has(x));
  const right = extra.length === 0 && missed.length === 0;
  const pretty = (key: string) => key.replace('|', '–');

  const edge = (e: Edge): EdgeLook => {
    const picked = on.has(k(e));
    if (!checked) return { tone: picked ? 'picked' : 'plain' };
    if (picked) return { tone: truth.has(k(e)) ? 'right' : 'wrong' };
    return { tone: truth.has(k(e)) ? 'missed' : 'plain' };
  };

  return (
    <>
      <div className="qgraph">
        <GraphView
          drawn={d}
          edge={edge}
          node={(n) => ({ tone: n === q.start ? 'current' : 'idle' })}
          onEdge={toggle}
          compact
          label={`${d.title}: click edges to tick them`}
        />
      </div>
      <p className="hint">Click an edge on the drawing, or its name here, to tick it.</p>
      <div className="chips">
        {g.edges.map((e) => (
          <button
            key={k(e)}
            type="button"
            className={on.has(k(e)) ? 'chip chip--on' : 'chip'}
            aria-pressed={on.has(k(e))}
            onClick={() => toggle(e)}
          >
            {e[0]}–{e[1]}
          </button>
        ))}
      </div>
      <CheckRow
        ready={on.size > 0}
        checked={checked}
        onCheck={() => {
          setChecked(true);
          onMark(right);
        }}
        right={right}
        verdict={
          right
            ? `All ${truth.size} and nothing else.`
            : [
                extra.length ? `Ticked but should not be: ${extra.map(pretty).join(', ')}.` : '',
                missed.length
                  ? `Missed (dashed on the drawing): ${missed.map(pretty).join(', ')}.`
                  : '',
              ].join(' ')
        }
      />
    </>
  );
}

// --- walks -----------------------------------------------------------------------

const KINDS: readonly WalkKind[] = ['not-a-path', 'path', 'simple-path', 'cycle'];

function walkReason(q: WalksQuestion, w: readonly NodeId[], kind: WalkKind): string {
  const g = drawnById(q.graphId).graph;
  if (kind === 'not-a-path') {
    const i = w.findIndex((_, j) => j > 0 && !hasEdge(g, w[j - 1] as NodeId, w[j] as NodeId));
    return `${w[i - 1]}–${w[i]} is not an edge.`;
  }
  if (kind === 'simple-path') return 'Every step is an edge and no node repeats.';
  if (kind === 'cycle') return `Back to ${w[0]}, and nothing else repeats.`;
  const seen = new Set<NodeId>();
  const again = w.find((n) => (seen.has(n) ? true : (seen.add(n), false)));
  return `${again} comes up twice${w[0] === w[w.length - 1] ? ', and not just as the start and end' : ''}.`;
}

function WalksWidget({ q, onMark }: { readonly q: WalksQuestion; readonly onMark: OnMark }) {
  const d = drawnById(q.graphId);
  const truth = q.walks.map((w) => classifyWalk(d.graph, w));
  const [picked, setPicked] = useState<readonly (WalkKind | null)[]>(q.walks.map(() => null));
  const [checked, setChecked] = useState(false);
  const right = picked.every((p, i) => p === truth[i]);

  return (
    <>
      <div className="walks">
        {q.walks.map((w, i) => (
          <div key={i} className="walks__row">
            <span className="walks__seq">{w.join(' – ')}</span>
            <span className="walks__opts" role="group" aria-label={`Name ${w.join(' ')}`}>
              {KINDS.map((kind) => {
                const on = picked[i] === kind;
                const cls =
                  checked && on ? (kind === truth[i] ? ' pill--right' : ' pill--wrong') : '';
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`pill${on ? ' pill--on' : ''}${cls}`}
                    aria-pressed={on}
                    onClick={() => {
                      setChecked(false);
                      setPicked((p) => p.map((x, j) => (j === i ? kind : x)));
                    }}
                  >
                    {WALK_LABELS[kind]}
                  </button>
                );
              })}
            </span>
            {checked && picked[i] !== truth[i] && (
              <span className="walks__why">
                {WALK_LABELS[truth[i] as WalkKind]}: {walkReason(q, w, truth[i] as WalkKind)}
              </span>
            )}
          </div>
        ))}
      </div>
      <CheckRow
        ready={picked.every((p) => p !== null)}
        checked={checked}
        onCheck={() => {
          setChecked(true);
          onMark(right);
        }}
        right={right}
        verdict={
          right
            ? 'All named right.'
            : 'Not all right yet: the reasons are under each one that is off.'
        }
      />
    </>
  );
}

// --- colour ----------------------------------------------------------------------

function ColourWidget({ q, onMark }: { readonly q: ColourQuestion; readonly onMark: OnMark }) {
  const graphs = q.graphIds.map(drawnById);
  const truth = graphs.map((d) => colour(d.graph));
  const [picked, setPicked] = useState<readonly (boolean | null)[]>(graphs.map(() => null));
  const [checked, setChecked] = useState(false);
  const right = picked.every((p, i) => p === truth[i]?.ok);

  return (
    <>
      <div className="minis">
        {graphs.map((d, i) => {
          const t = truth[i];
          const cycle = new Set<string>();
          if (checked && t && !t.ok) {
            for (let j = 1; j < t.cycle.length; j++) {
              cycle.add(edgeKey(t.cycle[j - 1] as NodeId, t.cycle[j] as NodeId, false));
            }
          }
          const node = (n: NodeId): NodeLook =>
            checked && t?.ok ? { tone: t.side.get(n) === 0 ? 'side0' : 'side1' } : { tone: 'idle' };
          const edge = (e: Edge): EdgeLook =>
            cycle.has(edgeKey(e[0], e[1], false)) ? { tone: 'cycle' } : { tone: 'plain' };
          const mine = picked[i];
          const verdictCls =
            checked && mine !== null ? (mine === t?.ok ? ' mini--right' : ' mini--wrong') : '';
          return (
            <div key={d.graph.id} className={`mini${verdictCls}`}>
              <GraphView drawn={d} node={node} edge={edge} compact label={d.title} />
              <div className="mini__foot">
                <span className="mini__name">{d.title}</span>
                <span className="mini__opts" role="group" aria-label={`Is ${d.title} bipartite?`}>
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      className={mine === v ? 'pill pill--on' : 'pill'}
                      aria-pressed={mine === v}
                      onClick={() => {
                        setChecked(false);
                        setPicked((p) => p.map((x, j) => (j === i ? v : x)));
                      }}
                    >
                      {v ? 'Bipartite' : 'Not'}
                    </button>
                  ))}
                </span>
              </div>
              {checked && t && (
                <p className="mini__why">
                  {t.ok
                    ? 'Bipartite: the two colours are shown.'
                    : `Odd cycle, ${t.cycle.length - 1} edges: ${t.cycle.join(' – ')}.`}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <CheckRow
        ready={picked.every((p) => p !== null)}
        checked={checked}
        onCheck={() => {
          setChecked(true);
          onMark(right);
        }}
        right={right}
        verdict={
          right
            ? 'All right. Each verdict comes with its evidence.'
            : 'Not all right. Each graph shows its evidence now.'
        }
      />
    </>
  );
}

// --- order -----------------------------------------------------------------------

function OrderWidget({ q, onMark }: { readonly q: OrderQuestion; readonly onMark: OnMark }) {
  const d = drawnById(q.graphId);
  const g = d.graph;
  const [order, setOrder] = useState<readonly NodeId[]>([]);
  const [checked, setChecked] = useState(false);
  const result = checkOrder(g, order);
  const bad = checked && !result.ok && result.reason === 'backward' ? result.edge : null;
  const at = new Map(order.map((n, i) => [n, i + 1]));
  const name = (n: NodeId) => nameOf(d, n);

  return (
    <>
      <div className="qgraph">
        <GraphView
          drawn={d}
          node={(n) => ({
            tone: at.has(n) ? 'found' : 'idle',
            badge: at.has(n) ? `#${at.get(n)}` : undefined,
          })}
          edge={(e) => ({ tone: bad && e[0] === bad[0] && e[1] === bad[1] ? 'bad' : 'plain' })}
          onNode={(n) => {
            setChecked(false);
            setOrder((o) => (o.includes(n) ? o : [...o, n]));
          }}
          clickable={(n) => !at.has(n)}
          compact
          label={`${d.title}: click the jobs in order`}
        />
      </div>
      <p className="hint">Click the nodes in the order you would do them.</p>
      <ol className="order-strip">
        {order.map((n) => (
          <li key={n}>{name(n)}</li>
        ))}
        {order.length < g.nodes.length && <li className="order-strip__gap">…</li>}
      </ol>
      <div className="row">
        <button
          type="button"
          className="button"
          onClick={() => setOrder((o) => o.slice(0, -1))}
          disabled={order.length === 0}
        >
          Take back
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setOrder([])}
          disabled={order.length === 0}
        >
          Clear
        </button>
      </div>
      <CheckRow
        ready={order.length === g.nodes.length}
        checked={checked}
        onCheck={() => {
          setChecked(true);
          onMark(result.ok);
        }}
        right={result.ok}
        verdict={
          result.ok
            ? 'Valid: every arrow points forward. It does not have to match anybody else’s; any valid order is right.'
            : bad
              ? `${name(bad[0])} → ${name(bad[1])} points backward: ${name(bad[1])} is before ${name(bad[0])}, but has to wait for it.`
              : 'Every job has to be in the order exactly once.'
        }
      />
    </>
  );
}

function OrdersWidget({ q, onMark }: { readonly q: OrdersQuestion; readonly onMark: OnMark }) {
  const d = drawnById(q.graphId);
  const truth = q.candidates.map((c) => checkOrder(d.graph, c));
  const [on, setOn] = useState<readonly boolean[]>(q.candidates.map(() => false));
  const [checked, setChecked] = useState(false);
  const right = on.every((v, i) => v === truth[i]?.ok);
  const name = (n: NodeId) => nameOf(d, n);

  return (
    <>
      <div className="cands">
        {q.candidates.map((c, i) => {
          const t = truth[i];
          const cls = checked ? (on[i] === t?.ok ? ' cand--right' : ' cand--wrong') : '';
          return (
            <label key={i} className={`cand${cls}`}>
              <input
                type="checkbox"
                checked={on[i] ?? false}
                onChange={() => {
                  setChecked(false);
                  setOn((o) => o.map((x, j) => (j === i ? !x : x)));
                }}
              />
              <span className="cand__seq">{c.map(name).join(', ')}</span>
              {checked && t && (
                <span className="cand__why">
                  {t.ok
                    ? 'Valid: every arrow points forward.'
                    : t.reason === 'backward'
                      ? `${name(t.edge[0])} → ${name(t.edge[1])} points backward.`
                      : 'Not every course is in it.'}
                </span>
              )}
            </label>
          );
        })}
      </div>
      <CheckRow
        ready
        checked={checked}
        onCheck={() => {
          setChecked(true);
          onMark(right);
        }}
        right={right}
        verdict={
          right ? 'Right: each verdict is named beside it.' : 'Not quite. Each one now says why.'
        }
      />
    </>
  );
}

// --- number ----------------------------------------------------------------------

function NumberWidget({ q, onMark }: { readonly q: NumberQuestion; readonly onMark: OnMark }) {
  const [value, setValue] = useState('');
  const [tried, setTried] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const right = tried === q.answer;
  const near = q.near.find((n) => n.v === tried);

  return (
    <>
      <form
        className="numrow"
        onSubmit={(e) => {
          e.preventDefault();
          const v = Number(value);
          if (value.trim() === '' || !Number.isFinite(v)) return;
          setTried(v);
          onMark(v === q.answer);
        }}
      >
        <label className="numrow__label">
          {q.unit}{' '}
          <input
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={right}
            aria-label={q.unit}
          />
        </label>
        <button
          type="submit"
          className="button button--primary"
          disabled={right || value.trim() === ''}
        >
          Check
        </button>
      </form>
      {tried !== null && (
        <div
          className={right ? 'feedback feedback--right' : 'feedback feedback--wrong'}
          role="status"
        >
          {right ? (
            <p>
              <b>Right.</b> {q.why}
            </p>
          ) : (
            <>
              <p>
                <b>Not {tried}.</b> {near ? near.why : 'Try again.'}
              </p>
              {!shown ? (
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => setShown(true)}
                >
                  Show the answer
                </button>
              ) : (
                <p>
                  It is <b>{q.answer}</b>. {q.why}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

// --- choice and multi ------------------------------------------------------------

function OptionsWidget({
  options,
  multi,
  onMark,
}: {
  readonly options: readonly Option[];
  readonly multi: boolean;
  readonly onMark: OnMark;
}) {
  const [seen, setSeen] = useState<readonly number[]>([]);
  const [on, setOn] = useState<ReadonlySet<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const found = !multi && seen.some((i) => options[i]?.ok);
  const multiRight = options.every((o, i) => Boolean(o.ok) === on.has(i));

  if (!multi) {
    return (
      <div className="opts">
        {options.map((o, i) => {
          const open = seen.includes(i) || found;
          const mark = open ? (o.ok ? 'right' : seen.includes(i) ? 'wrong' : 'quiet') : '';
          return (
            <button
              key={i}
              type="button"
              className={`opt${mark ? ` opt--${mark}` : ''}`}
              onClick={() => {
                if (seen.includes(i)) return;
                if (seen.length === 0 || !found) onMark(Boolean(o.ok));
                setSeen((s) => [...s, i]);
              }}
            >
              <span className="opt__letter">{'ABCDEF'[i]}</span>
              <span className="opt__text">{o.t}</span>
              {open && <span className="opt__why">{o.why}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="opts">
        {options.map((o, i) => (
          <label
            key={i}
            className={`opt opt--tick${checked ? (Boolean(o.ok) === on.has(i) ? ' opt--right' : ' opt--wrong') : ''}`}
          >
            <input
              type="checkbox"
              checked={on.has(i)}
              onChange={() => {
                setChecked(false);
                setOn((s) => {
                  const next = new Set(s);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                });
              }}
            />
            <span className="opt__text">{o.t}</span>
            {checked && <span className="opt__why">{o.why}</span>}
          </label>
        ))}
      </div>
      <CheckRow
        ready
        checked={checked}
        onCheck={() => {
          setChecked(true);
          onMark(multiRight);
        }}
        right={multiRight}
        verdict={multiRight ? 'All right.' : 'Not quite: every option now says why.'}
      />
    </>
  );
}

// --- shared ----------------------------------------------------------------------

function CheckRow({
  ready,
  checked,
  onCheck,
  right,
  verdict,
}: {
  readonly ready: boolean;
  readonly checked: boolean;
  readonly onCheck: () => void;
  readonly right: boolean;
  readonly verdict: string;
}) {
  return (
    <div className="checkrow">
      <button
        type="button"
        className="button button--primary"
        onClick={onCheck}
        disabled={!ready || (checked && right)}
      >
        Check
      </button>
      {checked && (
        <p
          className={right ? 'feedback feedback--right' : 'feedback feedback--wrong'}
          role="status"
        >
          {verdict}
        </p>
      )}
    </div>
  );
}
