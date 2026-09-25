import { describe, expect, it } from 'vitest';
import { createEngine } from '../src/core/engine';
import { allPerfectMatchings, reportEveryArrangement } from '../src/core/enumerate';
import { blockingPairs, judgePair } from '../src/core/stability';
import {
  fromGroups,
  groupRanks,
  hasTies,
  instabilities,
  judgeTiedPair,
  lean,
  strongInstabilities,
  tiedGroups,
  weakInstabilities,
} from '../src/core/ties';
import { PRESETS } from '../src/content/presets';
import type { BlockingPair, Instance, Matching } from '../src/core/types';
import { randomInstance, randomTiedInstance } from './helpers';

/**
 * Lists with ties, and the two kinds of instability.
 *
 * Three things are checked here. The representation round-trips, so a list
 * written as groups and a list written with tie marks are the same list. The
 * two judgements agree with the definitions, which is checked against a second
 * transcription of them written from scratch in this file, on every arrangement
 * of a few hundred random markets. And on strict lists both collapse to the
 * ordinary blocking pair, which is what lets the rest of the page keep using
 * `core/stability` without either of these ever disagreeing with it.
 */

const key = (p: BlockingPair) => `${p.student}|${p.school}`;
const keys = (ps: readonly BlockingPair[]) => ps.map(key);

/** A small market with ties, worked by hand below. */
function handWorked(): Instance {
  const student = (id: string, groups: string[][]) => ({ id, name: id, ...fromGroups(groups) });
  return {
    id: 'hand-worked',
    title: 'Hand worked',
    teaches: 'Used to check the judgements against a pen-and-paper answer.',
    students: [
      student('priya', [['mit', 'umass'], ['nyu']]),
      student('sam', [['mit'], ['nyu'], ['umass']]),
      student('ravi', [['nyu'], ['mit', 'umass']]),
    ],
    schools: [
      student('mit', [['sam', 'ravi'], ['priya']]),
      student('umass', [['priya'], ['sam'], ['ravi']]),
      student('nyu', [['priya', 'sam', 'ravi']]),
    ],
  };
}

describe('lists with ties', () => {
  it('reads groups off the tie marks and writes them back the same', () => {
    const prefs = ['a', 'b', 'c', 'd', 'e'];
    const marks = [true, false, true, true];
    expect(tiedGroups(prefs, marks)).toEqual([
      ['a', 'b'],
      ['c', 'd', 'e'],
    ]);
    expect(fromGroups(tiedGroups(prefs, marks))).toEqual({ prefs, tiedWithNext: marks });
    expect(groupRanks(prefs, marks)).toEqual({ a: 0, b: 0, c: 1, d: 1, e: 1 });
  });

  it('treats a list with no marks as strict', () => {
    const prefs = ['a', 'b', 'c'];
    expect(tiedGroups(prefs, undefined)).toEqual([['a'], ['b'], ['c']]);
    expect(groupRanks(prefs, [false, false])).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('says better, same or worse, with nobody the worst of all', () => {
    const prefs = ['a', 'b', 'c'];
    const marks = [true, false];
    expect(lean(prefs, marks, 'a', 'c')).toBe('better');
    expect(lean(prefs, marks, 'a', 'b')).toBe('same');
    expect(lean(prefs, marks, 'b', 'a')).toBe('same');
    expect(lean(prefs, marks, 'c', 'b')).toBe('worse');
    expect(lean(prefs, marks, 'c', null)).toBe('better');
    expect(lean(prefs, marks, 'c', 'c')).toBe('same');
  });

  it('finds no ties in any preset, so the rest of the page is untouched', () => {
    for (const preset of PRESETS) expect(hasTies(preset), preset.id).toBe(false);
  });

  it('is refused by the process, which is only defined on strict lists', () => {
    expect(() => createEngine(handWorked(), 'students')).toThrow(/strict/);
    expect(() => createEngine(handWorked(), 'schools')).toThrow(/strict/);
  });

  it('is refused by the ordinary blocking-pair check, which would misread it', () => {
    const m: Matching = { priya: 'nyu', sam: 'umass', ravi: 'mit' };
    expect(() => blockingPairs(handWorked(), m)).toThrow(/ties/);
    expect(() => judgePair(handWorked(), m, 'priya', 'mit')).toThrow(/ties/);
  });
});

describe('one arrangement, worked by hand', () => {
  // Priya at NYU, Sam at UMass Amherst, Ravi at MIT.
  //
  //   priya–mit    Priya would rather; MIT ranks Priya below Ravi.   neither
  //   priya–umass  Priya would rather; UMass ranks Priya above Sam.  strong
  //   sam–mit      Sam would rather; MIT has Sam and Ravi level.     weak only
  //   sam–nyu      Sam would rather; NYU has everybody level.        weak only
  //   ravi–umass   Ravi has MIT and UMass level; UMass prefers Sam.  neither
  //   ravi–nyu     Ravi would rather; NYU has everybody level.       weak only
  const instance = handWorked();
  const m: Matching = { priya: 'nyu', sam: 'umass', ravi: 'mit' };

  it('finds the one strong instability', () => {
    expect(keys(strongInstabilities(instance, m))).toEqual(['priya|umass']);
  });

  it('finds all four weak ones, the strong one among them', () => {
    expect(keys(weakInstabilities(instance, m))).toEqual([
      'priya|umass',
      'sam|mit',
      'sam|nyu',
      'ravi|nyu',
    ]);
  });

  it('says why the two that are neither are neither', () => {
    const pm = judgeTiedPair(instance, m, 'priya', 'mit');
    expect([pm.studentLean, pm.schoolLean, pm.weak]).toEqual(['better', 'worse', false]);
    const ru = judgeTiedPair(instance, m, 'ravi', 'umass');
    expect([ru.studentLean, ru.schoolLean, ru.weak]).toEqual(['same', 'worse', false]);
  });

  it('never counts a pair who are already together', () => {
    for (const [s, c] of Object.entries(m)) {
      const v = judgeTiedPair(instance, m, s, c as string);
      expect(v.alreadyTogether).toBe(true);
      expect(v.weak).toBe(false);
    }
  });
});

/**
 * The definitions again, transcribed a second time from the groups rather than
 * the tie marks, so that a mistake in one transcription is not repeated in the
 * other.
 */
function byDefinition(instance: Instance, m: Matching) {
  const position = (groups: string[][], who: string) => groups.findIndex((g) => g.includes(who));
  const holder: Record<string, string> = {};
  for (const [s, c] of Object.entries(m)) if (c) holder[c] = s;

  const strong: string[] = [];
  const weak: string[] = [];
  for (const s of instance.students) {
    for (const c of instance.schools) {
      if (m[s.id] === c.id) continue;
      const sg = tiedGroups(s.prefs, s.tiedWithNext);
      const cg = tiedGroups(c.prefs, c.tiedWithNext);
      const sHas = m[s.id] as string;
      const cHas = holder[c.id] as string;
      const sDiff = position(sg, sHas) - position(sg, c.id);
      const cDiff = position(cg, cHas) - position(cg, s.id);
      if (sDiff > 0 && cDiff > 0) strong.push(`${s.id}|${c.id}`);
      if ((sDiff > 0 && cDiff >= 0) || (cDiff > 0 && sDiff >= 0)) weak.push(`${s.id}|${c.id}`);
    }
  }
  return { strong, weak };
}

describe('the two judgements, on every arrangement of random markets', () => {
  const sizes = [2, 3, 4];
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

  it('agree with the ordinary blocking pair, both of them, when nothing is tied', () => {
    for (const n of sizes) {
      for (const seed of seeds) {
        const instance = randomInstance(n, seed);
        for (const m of allPerfectMatchings(instance)) {
          const ordinary = keys(blockingPairs(instance, m));
          expect(keys(strongInstabilities(instance, m)), `${instance.id}`).toEqual(ordinary);
          expect(keys(weakInstabilities(instance, m)), `${instance.id}`).toEqual(ordinary);
        }
      }
    }
  });

  it('agree with the ordinary check on a strict list written with explicit false marks', () => {
    for (const seed of seeds) {
      const instance = randomTiedInstance(3, seed, 0);
      expect(hasTies(instance)).toBe(false);
      for (const m of allPerfectMatchings(instance)) {
        const ordinary = keys(blockingPairs(instance, m));
        expect(keys(strongInstabilities(instance, m))).toEqual(ordinary);
        expect(keys(weakInstabilities(instance, m))).toEqual(ordinary);
      }
    }
  });

  it('match the definitions, transcribed a second time, when lists do have ties', () => {
    for (const n of sizes) {
      for (const seed of seeds) {
        const instance = randomTiedInstance(n, seed, 0.4);
        for (const m of allPerfectMatchings(instance)) {
          const expected = byDefinition(instance, m);
          expect(keys(strongInstabilities(instance, m)), instance.id).toEqual(expected.strong);
          expect(keys(weakInstabilities(instance, m)), instance.id).toEqual(expected.weak);
        }
      }
    }
  });

  it('never find a strong instability that is not also weak', () => {
    for (const seed of seeds) {
      const instance = randomTiedInstance(4, seed, 0.5);
      for (const m of allPerfectMatchings(instance)) {
        const weak = new Set(keys(weakInstabilities(instance, m)));
        for (const p of strongInstabilities(instance, m)) expect(weak.has(key(p))).toBe(true);
      }
    }
  });

  it('never count a pair where both sides are indifferent', () => {
    for (const seed of seeds) {
      const instance = randomTiedInstance(3, seed, 0.6);
      for (const m of allPerfectMatchings(instance)) {
        for (const v of instabilities(instance, m)) {
          expect(v.studentLean === 'same' && v.schoolLean === 'same').toBe(false);
        }
      }
    }
  });
});

describe('the report on every arrangement', () => {
  it('lists every arrangement once, with what the judgements find in each', () => {
    const instance = handWorked();
    const report = reportEveryArrangement(instance);
    expect(report).toHaveLength(6);
    for (const row of report) {
      expect(row.strong.map(key)).toEqual(keys(strongInstabilities(instance, row.matching)));
      expect(row.weak.map(key)).toEqual(keys(weakInstabilities(instance, row.matching)));
    }
  });

  it('reports the ordinary blocking pairs, twice over, for a strict market', () => {
    for (const seed of [1, 2, 3]) {
      const instance = randomInstance(4, seed);
      const report = reportEveryArrangement(instance);
      expect(report).toHaveLength(24);
      for (const row of report) {
        const ordinary = keys(blockingPairs(instance, row.matching));
        expect(row.strong.map(key)).toEqual(ordinary);
        expect(row.weak.map(key)).toEqual(ordinary);
      }
    }
  });
});
