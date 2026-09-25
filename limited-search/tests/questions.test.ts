import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUESTIONS, TIERS, questionsIn, worstAtOf, worstOf } from '../src/content/questions.ts';
import type { Question } from '../src/content/questions.ts';

/**
 * The bank, checked rather than trusted, and the page checked for spoilers.
 * Computed answers are recomputed here a second, plainer way: walking a
 * first-board list by hand rather than running the engine's strategy.
 */

const byId = (id: string): Question => {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(id);
  return q;
};
const answer = (id: string) => {
  const q = byId(id);
  if (q.kind !== 'number') throw new Error(id);
  return q.answer;
};
const options = (id: string) => {
  const q = byId(id);
  if (q.kind === 'number') throw new Error(id);
  return q.options;
};

/** Tests a list needs at strength s, by walking it. */
function walk(list: readonly number[], n: number, s: number): number {
  let tests = 0;
  let held = 0;
  for (const w of list) {
    tests++;
    if (w > s) {
      for (let v = held + 1; v < w; v++) {
        tests++;
        if (v > s) break;
      }
      return tests;
    }
    held = w;
  }
  for (let v = held + 1; v <= n; v++) {
    tests++;
    if (v > s) break;
  }
  return tests;
}
const slowWorst = (list: readonly number[], n: number) =>
  Math.max(...Array.from({ length: n + 1 }, (_, s) => walk(list, n, s)));

describe('shape', () => {
  it('the right option moves around, so it cannot be found by position', () => {
    const places = QUESTIONS.filter((q) => q.kind === 'choice').map((q) =>
      q.kind === 'choice' ? q.options.findIndex((o) => o.ok) : -1,
    );
    expect(new Set(places).size).toBeGreaterThan(2);
  });

  it('ids unique, every tier populated, 8 to 12 questions', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const t of TIERS) expect(questionsIn(t).length).toBeGreaterThanOrEqual(3);
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(8);
    expect(QUESTIONS.length).toBeLessThanOrEqual(12);
  });

  it('choices have one right option, multis at least one', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'choice')
        expect(
          q.options.filter((o) => o.ok),
          q.id,
        ).toHaveLength(1);
      if (q.kind === 'multi')
        expect(
          q.options.some((o) => o.ok),
          q.id,
        ).toBe(true);
    }
  });

  it('near misses are wrong and distinct, and no text failed to compute', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'number') {
        const vs = q.near.map((x) => x.v);
        expect(vs, q.id).not.toContain(q.answer);
        expect(new Set(vs).size).toBe(vs.length);
      }
      expect(JSON.stringify(q), q.id).not.toMatch(/undefined|NaN|need \?| \? /);
    }
  });
});

describe('numbers, the slow way', () => {
  it('one board, n = 20', () => {
    expect(answer('one-board-20')).toBe(slowWorst([], 20));
    expect(answer('one-board-20')).toBe(20);
  });

  it('halving, n = 100: the smallest t with 2^t >= 101', () => {
    let t = 0;
    while (2 ** t < 101) t++;
    expect(answer('halving-100')).toBe(t);
  });

  it('halving with two boards: 0 to 24 left', () => {
    expect(answer('halving-two')).toBe(25);
  });

  it('the given lists', () => {
    expect(answer('list-30')).toBe(slowWorst([8, 16, 24], 30));
    expect(answer('list-50')).toBe(slowWorst([20, 40], 50));
    expect(answer('list-fives')).toBe(slowWorst([5, 10, 15, 20, 25], 30));
    expect(worstAtOf([8, 16, 24], 30)).toEqual([22, 23]);
    expect(worstAtOf([5, 10, 15, 20, 25], 30)).toEqual([29, 30]);
  });
});

describe('written claims', () => {
  it('which-lowers-30: only the right option lowers the worst case', () => {
    const base = slowWorst([8, 16, 24], 30);
    const lists = [
      [8, 16, 24, 28],
      [4, 8, 16, 24],
      [8, 16, 23],
      [9, 17, 24],
    ];
    const opts = options('which-lowers-30');
    lists.forEach((l, i) => {
      expect(worstOf(l, 30)).toBe(slowWorst(l, 30));
      expect(slowWorst(l, 30) < base, l.join()).toBe(Boolean(opts[i]?.ok));
    });
  });

  it('which-lower-50: ticked exactly when lower', () => {
    const base = slowWorst([20, 40], 50);
    const lists = [[10, 20, 30, 40], [25], [15, 30, 45], [20, 40, 45], [20, 35, 45], [10, 40]];
    const opts = options('which-lower-50');
    lists.forEach((l, i) => {
      expect(opts[i]?.t).toBe(l.join(', '));
      expect(slowWorst(l, 50) < base, l.join()).toBe(Boolean(opts[i]?.ok));
    });
  });

  it('add-front: 4 at the front raises the worst case', () => {
    expect(slowWorst([4, 8, 16, 24], 30)).toBeGreaterThan(slowWorst([8, 16, 24], 30));
  });

  it('list-30-where: the counts quoted in the options', () => {
    expect(walk([8, 16, 24], 30, 0)).toBe(2);
    expect(walk([8, 16, 24], 30, 7)).toBe(8);
    expect(walk([8, 16, 24], 30, 30)).toBe(9);
  });
});

/**
 * The page is a sandbox for a problem the reader is working on, and must not
 * hand over the answer. These phrases name the known sublinear two-board
 * strategy or its growth rate; none of them may appear anywhere in the source,
 * the bank, the page shell or the README.
 */
describe('no spoilers', () => {
  const root = join(import.meta.dirname, '..');
  const files: string[] = [];
  const collect = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) collect(p);
      else if (/\.(ts|tsx|css|html|md)$/.test(name)) files.push(p);
    }
  };
  collect(join(root, 'src'));
  files.push(join(root, 'index.html'), join(root, 'README.md'));

  const banned = [
    /√/,
    /sqrt/i,
    /square[- ]root/i,
    /jump(s|ing)? by/i,
    /blocks? of size/i,
    /egg/i,
    /triangular/i,
    /n\s*\^\s*\(?\s*1\s*\/\s*2/,
    /n\^0?\.5/,
    /n\s*\*\*\s*0?\.5/,
    /k\s*\(\s*k\s*[+-]\s*1\s*\)\s*\/\s*2/,
  ];

  it('checks every page file', () => {
    expect(files.length).toBeGreaterThan(8);
  });

  for (const re of banned) {
    it(`nothing matches ${re.source}`, () => {
      for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(re);
    });
  }
});
