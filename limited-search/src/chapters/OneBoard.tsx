import { useMemo, useState } from 'react';
import { andList, evaluate, scan, stride } from '../core/boards';
import { Segmented } from '../components/Controls';
import { Replay } from '../components/Replay';

/**
 * Chapter 1: one board.
 *
 * The forced strategy, 1, 2, 3, …, run against every strength, and the
 * obvious shortcut, going up two or three at a time, run the same way so the
 * page can show exactly where it fails. The worst case of the safe way is n,
 * at strengths n − 1 and n.
 */

type Step = '1' | '2' | '3';

export function OneBoard() {
  const [n, setN] = useState(12);
  const [step, setStep] = useState<Step>('1');
  const [s, setS] = useState(5);
  const strategy = useMemo(() => (step === '1' ? scan() : stride(Number(step))), [step]);
  const ev = useMemo(() => evaluate(strategy, n), [strategy, n]);
  const strength = Math.min(s, n);

  return (
    <div className="walk">
      <section className="boardcol" aria-label="One board">
        <div className="boardcol__head">
          <label className="pick">
            <span className="seg__label">n</span>
            <input
              type="range"
              min={2}
              max={40}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              aria-label="n, the number of weights"
            />
            <b className="pick__value">{n}</b>
          </label>
          <Segmented
            label="go up by"
            value={step}
            onChange={setStep}
            options={[
              { value: '1', label: '1 at a time' },
              { value: '2', label: '2 (skip one)' },
              { value: '3', label: '3 (skip two)' },
            ]}
          />
          <label className="pick">
            <span className="seg__label">strength</span>
            <input
              type="range"
              min={0}
              max={n}
              value={strength}
              onChange={(e) => setS(Number(e.target.value))}
              aria-label="The board's true strength"
            />
            <b className="pick__value">{strength}</b>
          </label>
        </div>
        <Replay
          key={`${n}-${step}-${strength}`}
          strategy={strategy}
          n={n}
          s={strength}
          onPick={setS}
          ev={ev}
        />
      </section>

      <aside className="work" aria-label="The work">
        {ev.ok ? (
          <div className="card card--good">
            <h2 className="card__title">Worst case, checked against all {n + 1} strengths</h2>
            <p className="bigstat">
              <b>{ev.worst}</b> tests
            </p>
            <p>
              Strengths {andList(ev.worstAt)} need them all: {n - 1} breaks on weight {n}, the last
              test, and {n} holds every weight there is.
            </p>
          </div>
        ) : (
          <div className="card card--bad">
            <h2 className="card__title">It does not always work</h2>
            <p>
              At strength <b>{ev.failure?.s}</b>: {ev.failure?.why}
            </p>
            <p className="card__note">
              {ev.perStrength.filter((c) => c === null).length} of the {n + 1} possible strengths
              are never pinned down. The bars that reach the top in the warning colour are the
              strengths it fails on.
            </p>
          </div>
        )}

        <div className="card">
          <h2 className="card__title">Why one at a time is forced</h2>
          <p>
            Put the only board under weight w and it breaks. Now you know the strength is below w,
            but not where, and you have nothing left to test with. That is only fine if every weight
            below w has already held.
          </p>
          <p>
            So with one board the next test is always one more than the last weight that held. No
            choices, and the worst case is n tests.
          </p>
          <p className="card__note">
            Try going up by 2: the bars show which strengths it can no longer tell apart.
          </p>
        </div>

        <div className="card">
          <h2 className="card__title">The conventions</h2>
          <p className="card__note">
            The strength is the heaviest weight the board holds: 0 if it breaks under one pound, {n}{' '}
            if it holds all {n}. That is {n + 1} possibilities. A test is one weight on one board;
            the test that breaks a board counts. A board that holds can be used again.
          </p>
        </div>
      </aside>
    </div>
  );
}
