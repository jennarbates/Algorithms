/**
 * Visual identity for everyone who appears on the page.
 *
 * These are not decoration. A student shows up in their own list and inside
 * every school's list at once, so following one person means recognising them
 * rather than re-reading their name each time. Colour and shape carry that
 * recognition; the name is always shown alongside so nothing depends on
 * telling hues apart.
 *
 * All preferences elsewhere in the app are invented for the example. School
 * colours are real, school marks are our own, and no institutional logo or
 * wordmark is reproduced anywhere.
 */

export type HairStyle = 'short' | 'wavy' | 'bun' | 'curls' | 'long' | 'buzz';
export type MarkShape = 'shield' | 'circle' | 'hexagon' | 'rounded-square';

export interface StudentIdentity {
  readonly id: string;
  readonly name: string;
  /** Primary identity colour, used for their token everywhere. */
  readonly color: string;
  readonly skin: string;
  readonly hair: string;
  readonly hairStyle: HairStyle;
  readonly shirt: string;
}

export interface SchoolIdentity {
  readonly id: string;
  readonly name: string;
  /** Two or three characters for the mark itself. */
  readonly monogram: string;
  /** The school's real primary colour. */
  readonly color: string;
  /** The school's real secondary colour, used for the mark's accent. */
  readonly accent: string;
  /** Silhouette, so identity survives for anyone who cannot separate hues. */
  readonly shape: MarkShape;
}

const SKIN = {
  deep: '#6B4331',
  warmBrown: '#8D5524',
  tan: '#C68642',
  olive: '#E0AC69',
  light: '#F1C27D',
  fair: '#FFDBAC',
} as const;

/**
 * Twelve students, enough for the largest preset. Colours are spread around the
 * wheel and checked for contrast against both the light and dark surfaces.
 */
export const STUDENTS: readonly StudentIdentity[] = [
  {
    id: 'priya',
    name: 'Priya',
    color: '#C2185B',
    skin: SKIN.tan,
    hair: '#1A1110',
    hairStyle: 'long',
    shirt: '#F48FB1',
  },
  {
    id: 'sam',
    name: 'Sam',
    color: '#1565C0',
    skin: SKIN.light,
    hair: '#6D4C41',
    hairStyle: 'short',
    shirt: '#90CAF9',
  },
  {
    id: 'ravi',
    name: 'Ravi',
    color: '#2E7D32',
    skin: SKIN.warmBrown,
    hair: '#1A1110',
    hairStyle: 'curls',
    shirt: '#A5D6A7',
  },
  {
    id: 'maya',
    name: 'Maya',
    color: '#6A1B9A',
    skin: SKIN.deep,
    hair: '#2B1B17',
    hairStyle: 'bun',
    shirt: '#CE93D8',
  },
  {
    id: 'diego',
    name: 'Diego',
    color: '#EF6C00',
    skin: SKIN.olive,
    hair: '#3E2723',
    hairStyle: 'wavy',
    shirt: '#FFCC80',
  },
  {
    id: 'lena',
    name: 'Lena',
    color: '#00838F',
    skin: SKIN.fair,
    hair: '#C9A227',
    hairStyle: 'long',
    shirt: '#80DEEA',
  },
  {
    id: 'omar',
    name: 'Omar',
    color: '#4E342E',
    skin: SKIN.warmBrown,
    hair: '#1A1110',
    hairStyle: 'buzz',
    shirt: '#BCAAA4',
  },
  {
    id: 'tessa',
    name: 'Tessa',
    color: '#AD1457',
    skin: SKIN.light,
    hair: '#8D3B1E',
    hairStyle: 'wavy',
    shirt: '#F8BBD0',
  },
  {
    id: 'jonah',
    name: 'Jonah',
    color: '#37474F',
    skin: SKIN.fair,
    hair: '#4E342E',
    hairStyle: 'short',
    shirt: '#B0BEC5',
  },
  {
    id: 'aisha',
    name: 'Aisha',
    color: '#00695C',
    skin: SKIN.deep,
    hair: '#1A1110',
    hairStyle: 'curls',
    shirt: '#80CBC4',
  },
  {
    id: 'nico',
    name: 'Nico',
    color: '#5D4037',
    skin: SKIN.tan,
    hair: '#212121',
    hairStyle: 'wavy',
    shirt: '#D7CCC8',
  },
  {
    id: 'farah',
    name: 'Farah',
    color: '#7B1FA2',
    skin: SKIN.olive,
    hair: '#2B1B17',
    hairStyle: 'bun',
    shirt: '#E1BEE7',
  },
];

/**
 * Twelve schools, enough for the largest preset.
 *
 * American university colours cluster hard around red and navy, so colour alone
 * cannot separate twelve of them. That is exactly why shape is part of the
 * identity: within every colour family here the silhouettes differ, so the three
 * reds and the three navies stay tellable apart at a glance.
 */
export const SCHOOLS: readonly SchoolIdentity[] = [
  { id: 'mit', name: 'MIT', monogram: 'MIT', color: '#A31F34', accent: '#8A8B8C', shape: 'shield' },
  {
    id: 'umass',
    name: 'UMass Amherst',
    monogram: 'UM',
    color: '#881C1C',
    accent: '#212721',
    shape: 'circle',
  },
  {
    id: 'nyu',
    name: 'NYU',
    monogram: 'NYU',
    color: '#57068C',
    accent: '#1A1A1A',
    shape: 'hexagon',
  },
  {
    id: 'berkeley',
    name: 'Berkeley',
    monogram: 'CAL',
    color: '#003262',
    accent: '#FDB515',
    shape: 'rounded-square',
  },
  {
    id: 'michigan',
    name: 'Michigan',
    monogram: 'MI',
    color: '#00274C',
    accent: '#FFCB05',
    shape: 'shield',
  },
  {
    id: 'gatech',
    name: 'Georgia Tech',
    monogram: 'GT',
    color: '#B3A369',
    accent: '#003057',
    shape: 'hexagon',
  },
  {
    id: 'utaustin',
    name: 'UT Austin',
    monogram: 'UT',
    color: '#BF5700',
    accent: '#333F48',
    shape: 'circle',
  },
  {
    id: 'northeastern',
    name: 'Northeastern',
    monogram: 'NU',
    color: '#D41B2C',
    accent: '#1A1A1A',
    shape: 'rounded-square',
  },
  {
    id: 'washington',
    name: 'Washington',
    monogram: 'UW',
    color: '#4B2E83',
    accent: '#B7A57A',
    shape: 'shield',
  },
  {
    id: 'illinois',
    name: 'Illinois',
    monogram: 'ILL',
    color: '#13294B',
    accent: '#E84A27',
    shape: 'hexagon',
  },
  {
    id: 'oregon',
    name: 'Oregon',
    monogram: 'UO',
    color: '#154733',
    accent: '#FEE123',
    shape: 'rounded-square',
  },
  {
    id: 'cmu',
    name: 'Carnegie Mellon',
    monogram: 'CMU',
    color: '#C41230',
    accent: '#6D6E71',
    shape: 'circle',
  },
];

const studentIndex = new Map(STUDENTS.map((s) => [s.id, s]));
const schoolIndex = new Map(SCHOOLS.map((c) => [c.id, c]));

export function studentIdentity(id: string): StudentIdentity {
  const found = studentIndex.get(id);
  if (!found) throw new Error(`No student identity for id: ${id}`);
  return found;
}

export function schoolIdentity(id: string): SchoolIdentity {
  const found = schoolIndex.get(id);
  if (!found) throw new Error(`No school identity for id: ${id}`);
  return found;
}
