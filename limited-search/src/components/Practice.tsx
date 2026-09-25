import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  TIERS,
  TIER_LABELS,
  questionsIn,
  type NumberQuestion,
  type Option,
  type Question,
  type Tier,
} from '../content/questions';

/**
 * The practice section, copied from `../bounds` without its witness kind:
 * scored on the first attempt and never marked down after, every option
 * explains itself, and every number in the bank was worked out by the engine.
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
  const [right, setRight] = useState(false);
  const mark = (ok: boolean) => {
    onResult(ok);
    if (ok) setRight(true);
  };

  let body: ReactNode;
  if (q.kind === 'number') body = <NumberWidget q={q} onMark={mark} />;
  else body = <OptionsWidget options={q.options} multi={q.kind === 'multi'} onMark={mark} />;

  return (
    <article className="qcard" aria-labelledby={`q-${q.id}`}>
      <header className="qcard__head">
        <span className="qcard__num">{number}</span>
        <span className="qcard__tests">Checks: {q.tests}</span>
      </header>
      <div className="qcard__ask">
        <p className="qcard__prompt" id={`q-${q.id}`}>
          {q.prompt}
        </p>
        {q.quote && <pre className="qcard__quote">{q.quote}</pre>}
        {body}
        {right && <p className="qcard__close">{q.close}</p>}
        {right && onNext && (
          <button type="button" className="button button--primary" onClick={onNext}>
            Next question &rarr;
          </button>
        )}
      </div>
    </article>
  );
}

type OnMark = (right: boolean) => void;

function NumberWidget({ q, onMark }: { readonly q: NumberQuestion; readonly onMark: OnMark }) {
  const [value, setValue] = useState('');
  const [tried, setTried] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const right = tried === q.answer;
  const near = q.near.find((x) => x.v === tried);

  return (
    <>
      <form
        className="numrow"
        onSubmit={(e) => {
          e.preventDefault();
          const v = Number(value.replace(/,/g, ''));
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
                <b>Not {tried.toLocaleString('en-US')}.</b> {near ? near.why : 'Try again.'}
              </p>
              {shown ? (
                <p>
                  It is <b>{q.answer.toLocaleString('en-US')}</b>. {q.why}
                </p>
              ) : (
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => setShown(true)}
                >
                  Show the answer
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

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
  const found = seen.some((i) => options[i]?.ok);
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
                if (!found) onMark(Boolean(o.ok));
                setSeen((s) => [...s, i]);
              }}
            >
              <span className="opt__letter">{'ABCDEFG'[i]}</span>
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
      <div className="checkrow">
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            setChecked(true);
            onMark(multiRight);
          }}
          disabled={checked && multiRight}
        >
          Check
        </button>
        {checked && (
          <p
            className={multiRight ? 'feedback feedback--right' : 'feedback feedback--wrong'}
            role="status"
          >
            {multiRight ? 'All right.' : 'Not quite: every option now says why.'}
          </p>
        )}
      </div>
    </>
  );
}
