import type { ReactNode } from 'react';
import type { Steps } from '../hooks/useSteps';

/**
 * The step buttons every chapter shares. The keys do the same things, and the
 * footnote says which keys.
 */
export function Controls({
  steps,
  jumpLabel,
  children,
}: {
  readonly steps: Steps;
  /** The name of a whole stage, "layer" or "call", for the jump buttons. */
  readonly jumpLabel?: string | undefined;
  readonly children?: ReactNode;
}) {
  return (
    <div className="controls" role="group" aria-label="Step through the run">
      <button type="button" className="button" onClick={() => steps.go(0)} disabled={steps.atStart}>
        Restart
      </button>
      <button type="button" className="button" onClick={steps.back} disabled={steps.atStart}>
        &larr; Back
      </button>
      <button
        type="button"
        className="button button--primary"
        onClick={steps.next}
        disabled={steps.atEnd}
      >
        Next &rarr;
      </button>
      {jumpLabel && (
        <button type="button" className="button" onClick={steps.nextJump} disabled={steps.atEnd}>
          Next {jumpLabel} &#8677;
        </button>
      )}
      <button
        type="button"
        className="button"
        onClick={() => steps.go(steps.last)}
        disabled={steps.atEnd}
      >
        To the end
      </button>
      <span className="controls__count" aria-live="polite">
        step {steps.step + 1} of {steps.last + 1}
      </span>
      {children}
    </div>
  );
}

/** A small segmented choice, for the settings above a board. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (v: T) => void;
}) {
  return (
    <span className="seg" role="group" aria-label={label}>
      <span className="seg__label">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'pill pill--on' : 'pill'}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

/** Pseudocode, with the line being run lit and how often each line has run so far. */
export function Code({
  lines,
  current,
  counts,
}: {
  readonly lines: readonly { readonly n: number; readonly text: string }[];
  readonly current?: readonly number[] | undefined;
  readonly counts?: Readonly<Record<number, number>> | undefined;
}) {
  return (
    <div className="code" role="table" aria-label="Pseudocode">
      {counts && (
        <div className="code__row code__row--head" role="row">
          <span role="columnheader">code</span>
          <span role="columnheader" className="code__count">
            runs
          </span>
        </div>
      )}
      {lines.map((l) => (
        <div
          key={l.n}
          role="row"
          className={current?.includes(l.n) ? 'code__row code__row--on' : 'code__row'}
        >
          <span role="cell" className="code__text">
            {l.text}
          </span>
          {counts && (
            <span role="cell" className="code__count">
              {counts[l.n] ?? ''}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
