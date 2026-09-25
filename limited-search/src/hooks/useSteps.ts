import { useCallback, useEffect, useState } from 'react';

/**
 * A position in a recorded run, and the keys that move it.
 *
 * Every chapter's run is a list of events, and the picture is a replay of the
 * first `step + 1` of them. So going back is as cheap as going forward and
 * there is nothing to undo: right and left arrow keys, Home and End.
 *
 * `jumps` are the events worth stopping at when the reader wants to move a
 * whole stage at once (the start of the next BFS layer, say); PageDown and
 * PageUp go between them. `initial` is where a fresh run opens; this page opens
 * a run at its end, so the whole picture is there before stepping back through.
 */
export interface Steps {
  readonly step: number;
  readonly last: number;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly go: (step: number) => void;
  readonly next: () => void;
  readonly back: () => void;
  readonly nextJump: () => void;
  readonly prevJump: () => void;
}

export function useSteps(
  count: number,
  jumps: readonly number[] = [],
  active = true,
  initial = 0,
): Steps {
  const last = Math.max(0, count - 1);
  const [raw, setStep] = useState(initial);
  const step = Math.min(raw, last);

  const go = useCallback((s: number) => setStep(Math.max(0, Math.min(last, s))), [last]);
  const next = useCallback(() => go(step + 1), [go, step]);
  const back = useCallback(() => go(step - 1), [go, step]);
  const nextJump = useCallback(
    () => go(jumps.find((j) => j > step) ?? last),
    [go, jumps, step, last],
  );
  const prevJump = useCallback(
    () => go([...jumps].reverse().find((j) => j < step) ?? 0),
    [go, jumps, step],
  );

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') back();
      else if (event.key === 'PageDown') nextJump();
      else if (event.key === 'PageUp') prevJump();
      else if (event.key === 'Home') go(0);
      else if (event.key === 'End') go(last);
      else return;
      event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, next, back, nextJump, prevJump, go, last]);

  return {
    step,
    last,
    atStart: step === 0,
    atEnd: step === last,
    go,
    next,
    back,
    nextJump,
    prevJump,
  };
}
