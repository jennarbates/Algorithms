import type { Instance } from '../src/core/types';

/** Small deterministic PRNG, so a failing random case can always be reproduced. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) throw new Error('shuffle index out of range');
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** A random market of the given size with strict, complete preferences. */
export function randomInstance(n: number, seed: number): Instance {
  const rnd = mulberry32(seed);
  const studentIds = Array.from({ length: n }, (_, i) => `s${i}`);
  const schoolIds = Array.from({ length: n }, (_, i) => `c${i}`);

  return {
    id: `random-${n}-${seed}`,
    title: `Random ${n} by ${n}`,
    teaches: 'Nothing in particular; used to check the engine against brute force.',
    students: studentIds.map((id) => ({ id, name: id, prefs: shuffled(schoolIds, rnd) })),
    schools: schoolIds.map((id) => ({ id, name: id, prefs: shuffled(studentIds, rnd) })),
  };
}
