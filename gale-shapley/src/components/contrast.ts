/**
 * Picks readable text for a coloured background.
 *
 * School colours are real, and some of them are light, so a hardcoded white
 * monogram would be unreadable on a few of them. This picks per colour instead.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** White or near-black, whichever has more contrast against `background`. */
export function readableInk(background: string): string {
  return relativeLuminance(background) > 0.4 ? '#141414' : '#FFFFFF';
}
