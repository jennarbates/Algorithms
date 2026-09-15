import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CLAIMS, SECTION } from '../content/proofs';
import type { Claim as ClaimContent } from '../content/proofs';
import type { Run } from '../hooks/useRun';

/**
 * Why this works.
 *
 * Three claims about the finished board, each one an expander with the same
 * four parts top to bottom: the claim in one plain sentence, a body driven by
 * the run the reader has just watched, the sketch of why it holds in general,
 * and a toggle to the textbook wording.
 *
 * The section shows rather than states. The bodies scrub the board to
 * particular moments of the run, so the argument is always about people the
 * reader can see rather than about variables. Those bodies are built per claim
 * and slotted in here; what this file owns is the shell they share, and the
 * rule that none of it is usable until the run is over, because all three
 * arguments are about the finished board.
 *
 * The claims are usable alone. This is not a guided mode, and there is no
 * order to open them in. Which one is open is this component's only state, and
 * the page keys it on the run, so starting a fresh run closes whatever was
 * open: the arguments are about a particular finished board, and that board has
 * just stopped existing. But only one is open at a time, and that is not a
 * matter of taste: three open at once ran to nearly two thousand pixels in this
 * column. An argument that has to be scrolled away from to see the board it is
 * about is an argument the reader cannot follow, and every one of these
 * arguments is about the board.
 */

interface WhyItWorksProps {
  readonly run: Run;
  /** The body for each claim, by id. A claim with no body yet shows the sketch alone. */
  readonly bodies?: Partial<Record<ClaimContent['id'], ReactNode>>;
}

export function WhyItWorks({ run, bodies = {} }: WhyItWorksProps) {
  const settled = run.current.phase === 'done';
  const [openId, setOpenId] = useState<ClaimContent['id'] | null>(null);

  return (
    <section className={settled ? 'why' : 'why why--not-yet'}>
      {openId === null ? <p className="why__intro">{SECTION.intro}</p> : null}

      {settled ? null : (
        <p className="why__not-yet" role="status">
          {SECTION.notYet}
        </p>
      )}

      <div className="why__claims">
        {CLAIMS.map((claim, index) => (
          <Claim
            key={`${claim.id}-${run.runId}`}
            index={index + 1}
            claim={claim}
            run={run}
            enabled={settled}
            open={openId === claim.id}
            onToggle={() => setOpenId((current) => (current === claim.id ? null : claim.id))}
          >
            {bodies[claim.id]}
          </Claim>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One claim
// ---------------------------------------------------------------------------

interface ClaimProps {
  readonly index: number;
  readonly claim: ClaimContent;
  readonly run: Run;
  readonly enabled: boolean;
  readonly open: boolean;
  readonly onToggle: () => void;
  /** The run-driven body. Optional, so a claim can ship its words before its picture. */
  readonly children?: ReactNode;
}

/**
 * The skeleton every claim shares.
 *
 * A native disclosure rather than a hand-rolled one: it is keyboard-accessible
 * for free, and a reader who opens it gets the claim, the body, the sketch and
 * the toggle in that order, every time, for every claim. Sameness across the
 * three is what lets the reader stop noticing the shell and attend to the
 * argument.
 *
 * Which one is open is owned above, so that opening one closes the others. The
 * summary's own click has to be cancelled for that: left alone the element
 * toggles itself, and it would fight the state that is trying to keep only one
 * of them open.
 *
 * Before the run is settled the header is rendered as text rather than as a
 * disclosure, so there is nothing to click and nothing to explain.
 */
export function Claim({ index, claim, run, enabled, open, onToggle, children }: ClaimProps) {
  const [formal, setFormal] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);
  const bodyId = `claim-${claim.id}-body`;

  // An opened claim takes itself to the top of the column, because it is about
  // to need all of the room below it: with a pair picked, the third one runs to
  // twelve hundred pixels in a column that is under five hundred.
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: 'start' });
  }, [open]);

  const header = (
    <>
      <span className="claim__index" aria-hidden="true">
        {index}
      </span>
      <span className="claim__title">{claim.title}</span>
    </>
  );

  if (!enabled) {
    return (
      <div className="claim claim--off" aria-disabled="true">
        <div className="claim__summary">{header}</div>
      </div>
    );
  }

  return (
    <details className="claim" open={open} ref={ref}>
      <summary
        className="claim__summary"
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        {header}
      </summary>

      <div className="claim__inner" id={bodyId}>
        <p className="claim__claim">{formal ? claim.formal.claim : claim.plain.claim}</p>

        {children ? <div className="claim__body">{children}</div> : null}

        <p className="claim__sketch">
          {formal ? claim.formal.sketch : claim.plain.sketch(run.askingSide)}
        </p>

        {formal ? (
          <div className="claim__terms">
            <p className="claim__terms-heading">{SECTION.termsHeading}</p>
            <dl className="claim__terms-list">
              {claim.formal.terms.map((t) => (
                <div className="claim__term" key={t.term}>
                  <dt>{t.term}</dt>
                  <dd>{t.replaces}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <button
          type="button"
          className="button button--small claim__toggle"
          onClick={() => setFormal((f) => !f)}
          aria-pressed={formal}
          aria-controls={bodyId}
        >
          {formal ? SECTION.toggleOff : SECTION.toggleOn}
        </button>
      </div>
    </details>
  );
}
