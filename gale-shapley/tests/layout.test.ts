import { describe, expect, it } from 'vitest';
import CSS from '../src/styles/global.css?raw';

/**
 * The rules behind the one-screen lock, checked against the stylesheet.
 *
 * What this suite cannot do is check that the lock holds. That is a layout
 * outcome: whether the controls are above the fold depends on how a real engine
 * sizes real boxes, and there is no layout engine here. Even under jsdom there
 * would not be one, because jsdom does not lay anything out and every rectangle
 * it reports is zero. Only a browser can answer that question, and the README
 * says how to ask it by hand.
 *
 * What this suite can do is check the rules the lock is built from, which is
 * where the silent failures actually come from. Every one of the four ways the
 * README says this breaks is visible right here in the source: a missing zero
 * minimum, a `1fr` that should have been `minmax(0, 1fr)`, a scroll put on the
 * box the pairing lines are positioned against, a new scroller the escape hatch
 * was never told about. None of those look wrong until the content grows, and
 * none of them are things anyone will remember.
 */

// ---------------------------------------------------------------------------
// Just enough CSS parsing to ask questions about rules
// ---------------------------------------------------------------------------

interface Rule {
  readonly selectors: readonly string[];
  readonly body: string;
  /** The `@media` prelude this rule sits inside, or null for the base layer. */
  readonly media: string | null;
}

const withoutComments = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every `prelude { ... }` at the top level of the file, in source order. */
function blocks(text: string): { prelude: string; body: string }[] {
  const out: { prelude: string; body: string }[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth += 1;
      else if (text[j] === '}') depth -= 1;
      j += 1;
    }
    out.push({ prelude: text.slice(i, open).trim(), body: text.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

const TOP = blocks(withoutComments);

const RULES: Rule[] = TOP.flatMap(({ prelude, body }): Rule[] => {
  if (prelude.startsWith('@media')) {
    return blocks(body).map((inner) => ({
      selectors: inner.prelude.split(',').map((s) => s.trim()),
      body: inner.body,
      media: prelude,
    }));
  }
  if (prelude.startsWith('@')) return [];
  return [{ selectors: prelude.split(',').map((s) => s.trim()), body, media: null }];
});

/** The value of one property on one selector, or undefined if it is not set. */
function value(selector: string, property: string, media: string | null = null) {
  for (const rule of RULES) {
    if (rule.media !== media) continue;
    if (!rule.selectors.includes(selector)) continue;
    const match = rule.body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`));
    if (match?.[1] !== undefined) return match[1].trim();
  }
  return undefined;
}

/** The escape hatch's own prelude, found by the widths it names. */
const HATCH =
  RULES.map((r) => r.media).find(
    (m): m is string => !!m && m.includes('max-width: 1180px') && m.includes('max-height'),
  ) ?? null;

// ---------------------------------------------------------------------------

describe('the one-screen lock', () => {
  it('has an escape hatch, and it is the last thing in the file', () => {
    expect(HATCH, 'no media query names both 1180px and a max-height').not.toBeNull();

    // Last, so it beats the locked rules wherever those happen to sit. Anything
    // added after it would win instead, and only on small windows.
    expect(TOP[TOP.length - 1]?.prelude).toBe(HATCH);
  });

  it('stops the document itself from scrolling', () => {
    expect(value('body', 'height')).toBe('100dvh');
    expect(value('body', 'overflow')).toBe('hidden');
    expect(value('body', 'display')).toBe('flex');
  });

  /**
   * A flex item refuses to shrink below its own content unless it is told it
   * may. One missing line here and the lock stops holding, with nothing looking
   * wrong until the content grows past the window.
   */
  it('names a zero minimum on every box that has to be able to shrink', () => {
    const path = [
      '#root',
      '.page',
      '.deck',
      '.walk',
      '.boardcol',
      '.board',
      '.side',
      '.side__body',
      '.practice',
      '.practice__panel',
      '.practice__body',
      '.practice__side',
    ];

    for (const selector of path) {
      expect(value(selector, 'min-height'), `${selector} is missing min-height: 0`).toBe('0');
    }
  });

  /**
   * A `1fr` track will not go below its content's min-content width. The card
   * blurbs are clamped, which makes that width the whole sentence, so a bare
   * `1fr` silently stops the board's two panels being equal and pushes them
   * past its edge.
   */
  it('names a zero minimum on every grid track that carries clamped text', () => {
    for (const selector of ['.walk', '.board__inner', '.practice']) {
      const tracks = value(selector, 'grid-template-columns');
      expect(tracks, `${selector} has no grid-template-columns`).toBeDefined();
      if (tracks === undefined) continue;
      expect(tracks, `${selector} needs minmax(0, 1fr), not a bare 1fr`).toContain('minmax(0,');

      // A bare `1fr` is one that is not already inside a minmax, so the minmax
      // calls come out before looking for what is left.
      const bare = tracks.replace(/minmax\([^)]*\)/g, '');
      expect(bare, `${selector} has a bare 1fr track`).not.toContain('fr');
    }
  });

  /**
   * The pairing lines are an absolutely positioned SVG measured from the cards.
   * Scrolling the box they are positioned against would leave the SVG behind
   * while the cards move under it, so the scroll goes on the frame outside it.
   */
  it('scrolls the board frame, never the box the pairing lines sit in', () => {
    expect(value('.board', 'overflow-y')).toBe('auto');
    expect(value('.board__inner', 'position')).toBe('relative');

    expect(value('.board__inner', 'overflow')).toBeUndefined();
    expect(value('.board__inner', 'overflow-y')).toBeUndefined();
    expect(value('.board', 'position')).toBeUndefined();
  });

  /** The reader must never have to scroll to reach the thing they act with. */
  it('never makes a controls row a scroller', () => {
    for (const selector of ['.side__controls', '.practice__controls']) {
      expect(value(selector, 'flex'), `${selector} must not shrink`).toBe('0 0 auto');
      expect(value(selector, 'overflow-y')).toBeUndefined();
      expect(value(selector, 'overflow')).toBeUndefined();
    }
  });

  /**
   * A scroller that survives into the unlocked layout traps its content in a
   * pane inside a page that is already scrolling, which is the one outcome the
   * hatch exists to prevent.
   */
  it('releases every scroller it creates when the hatch opens', () => {
    const scrollers = RULES.filter(
      (r) => r.media === null && /(?:^|;)\s*overflow-y\s*:\s*auto/.test(r.body),
    ).flatMap((r) => r.selectors);

    expect(
      scrollers.length,
      'found no scrollers at all, so this test proves nothing',
    ).toBeGreaterThan(0);

    for (const selector of scrollers) {
      expect(value(selector, 'overflow', HATCH), `${selector} still scrolls under the hatch`).toBe(
        'visible',
      );
    }
  });
});
