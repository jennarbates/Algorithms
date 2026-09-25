import { edgeKey, graph } from '../core/graph.ts';
import type { Graph, NodeId } from '../core/graph.ts';

/**
 * Every graph the page draws, with where to draw it.
 *
 * The first few are the lectures' own: the 1970 Internet from lectures 4 and 5,
 * the 8-node graph from the DFS slide, and the course prerequisites from
 * lecture 6. They are drawn the way the slides draw them, so a reader moving
 * between the page and the notes recognises the picture. The rest are new,
 * for practice, because a question about a graph the page has already
 * animated is a memory test.
 *
 * Positions are in the graph's own box, `width` by `height`, and the page
 * scales the box to fit. `bends` curves an edge through a point, for the one
 * or two edges a straight line would draw through a node.
 */

export interface Drawn {
  readonly graph: Graph;
  readonly title: string;
  /** One line on where it comes from or what it is for. */
  readonly blurb: string;
  readonly width: number;
  readonly height: number;
  readonly pos: Readonly<Record<NodeId, readonly [number, number]>>;
  /** Longer names, where the node id is an abbreviation. */
  readonly names?: Readonly<Record<NodeId, string>>;
  readonly bends?: Readonly<Record<string, readonly [number, number]>>;
}

function drawn(d: Drawn): Drawn {
  for (const n of d.graph.nodes)
    if (!d.pos[n]) throw new Error(`${d.graph.id}: no position for ${n}`);
  for (const key of Object.keys(d.bends ?? {})) {
    const known = d.graph.edges.some(([u, v]) => edgeKey(u, v, d.graph.directed) === key);
    if (!known) throw new Error(`${d.graph.id}: bend for an edge that does not exist, ${key}`);
  }
  return d;
}

/**
 * The 1970 Internet, the ARPANET: 13 sites and 17 links.
 *
 * Node order is chosen so that "neighbours in node order" reproduces the BFS
 * tree on the lecture's slide from MIT: MIT's neighbours come out as UTAH, BBN,
 * LINC, and layer 2 as SRI, SDC, RAND, HARV, CASE.
 */
export const ARPANET = drawn({
  graph: graph(
    'arpanet',
    [
      'MIT',
      'UTAH',
      'BBN',
      'LINC',
      'SRI',
      'SDC',
      'RAND',
      'HARV',
      'CASE',
      'UCSB',
      'STAN',
      'UCLA',
      'CARN',
    ],
    [
      ['MIT', 'UTAH'],
      ['MIT', 'BBN'],
      ['MIT', 'LINC'],
      ['UTAH', 'SRI'],
      ['UTAH', 'SDC'],
      ['BBN', 'RAND'],
      ['BBN', 'HARV'],
      ['LINC', 'CASE'],
      ['SDC', 'RAND'],
      ['SRI', 'UCSB'],
      ['SRI', 'STAN'],
      ['SRI', 'UCLA'],
      ['RAND', 'UCLA'],
      ['HARV', 'CARN'],
      ['CASE', 'CARN'],
      ['STAN', 'UCLA'],
      ['UCSB', 'UCLA'],
    ],
  ),
  title: 'The Internet in 1970',
  blurb: 'The ARPANET from lectures 4 and 5: 13 sites, 17 links.',
  width: 990,
  height: 400,
  pos: {
    SRI: [200, 70],
    UTAH: [360, 70],
    UCSB: [90, 210],
    STAN: [290, 200],
    SDC: [460, 210],
    UCLA: [200, 330],
    RAND: [360, 330],
    MIT: [640, 160],
    BBN: [640, 270],
    LINC: [770, 70],
    CASE: [900, 160],
    CARN: [900, 270],
    HARV: [770, 340],
  },
  names: {
    MIT: 'MIT',
    UTAH: 'Utah',
    BBN: 'BBN',
    LINC: 'Lincoln Lab',
    SRI: 'SRI',
    SDC: 'SDC',
    RAND: 'RAND',
    HARV: 'Harvard',
    CASE: 'Case Western',
    UCSB: 'UC Santa Barbara',
    STAN: 'Stanford',
    UCLA: 'UCLA',
    CARN: 'Carnegie',
  },
});

/** The 8-node graph from the DFS slide in lecture 5, n = 8 and m = 11. */
export const EIGHT = drawn({
  graph: graph(
    'eight',
    ['1', '2', '3', '4', '5', '6', '7', '8'],
    [
      ['1', '2'],
      ['1', '3'],
      ['2', '3'],
      ['2', '4'],
      ['2', '5'],
      ['3', '5'],
      ['3', '7'],
      ['3', '8'],
      ['4', '5'],
      ['5', '6'],
      ['7', '8'],
    ],
  ),
  title: 'The 8-node graph',
  blurb: 'From the DFS slide in lecture 5: 8 nodes, 11 edges.',
  width: 420,
  height: 400,
  pos: {
    '1': [180, 50],
    '7': [330, 50],
    '2': [100, 160],
    '3': [260, 160],
    '4': [40, 260],
    '5': [180, 260],
    '8': [330, 260],
    '6': [180, 360],
  },
});

/** Three pieces, for the loop that finds every component. */
export const ISLANDS = drawn({
  graph: graph(
    'islands',
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    [
      ['A', 'B'],
      ['A', 'C'],
      ['B', 'C'],
      ['C', 'D'],
      ['E', 'F'],
      ['F', 'G'],
      ['E', 'H'],
      ['G', 'H'],
      ['I', 'J'],
    ],
  ),
  title: 'Three islands',
  blurb: 'A graph in three pieces. One search cannot reach them all.',
  width: 620,
  height: 360,
  pos: {
    A: [70, 70],
    B: [200, 60],
    C: [140, 180],
    D: [90, 300],
    E: [320, 90],
    F: [450, 70],
    G: [470, 200],
    H: [330, 220],
    I: [320, 320],
    J: [520, 320],
  },
});

/** A cube's corners and edges. Bipartite, but not drawn to look it. */
export const CUBE = drawn({
  graph: graph(
    'cube',
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'a'],
      ['e', 'f'],
      ['f', 'g'],
      ['g', 'h'],
      ['h', 'e'],
      ['a', 'e'],
      ['b', 'f'],
      ['c', 'g'],
      ['d', 'h'],
    ],
  ),
  title: 'A cube',
  blurb: 'Eight corners, twelve edges. Is there an odd cycle anywhere?',
  width: 420,
  height: 400,
  pos: {
    a: [60, 130],
    b: [240, 130],
    c: [240, 330],
    d: [60, 330],
    e: [170, 40],
    f: [360, 40],
    g: [360, 240],
    h: [170, 240],
  },
});

/**
 * Who applied where. Stable matching's graph, from lecture 6: every edge joins
 * a student to a college, so the two sides are the two colours. Drawn mixed up
 * so the colouring has to be found rather than read off.
 */
export const APPLICATIONS = drawn({
  graph: graph(
    'applications',
    ['Ada', 'MIT', 'Ben', 'NYU', 'Cy', 'Yale', 'Dee'],
    [
      ['Ada', 'MIT'],
      ['Ada', 'NYU'],
      ['Ben', 'MIT'],
      ['Ben', 'Yale'],
      ['Cy', 'NYU'],
      ['Cy', 'Yale'],
      ['Dee', 'MIT'],
      ['Dee', 'Yale'],
    ],
  ),
  title: 'Who applied where',
  blurb: 'Students and colleges, an edge for each application.',
  width: 460,
  height: 380,
  pos: {
    Ada: [80, 90],
    MIT: [230, 60],
    Ben: [380, 110],
    NYU: [90, 280],
    Cy: [230, 330],
    Yale: [380, 290],
    Dee: [240, 190],
  },
});

/** Five in a ring: the smallest odd cycle worth drawing. */
export const PENTAGON = drawn({
  graph: graph(
    'pentagon',
    ['p', 'q', 'r', 's', 't'],
    [
      ['p', 'q'],
      ['q', 'r'],
      ['r', 's'],
      ['s', 't'],
      ['t', 'p'],
    ],
  ),
  title: 'Five in a ring',
  blurb: 'A cycle of length five.',
  width: 360,
  height: 340,
  pos: { p: [180, 40], q: [320, 140], r: [270, 300], s: [90, 300], t: [40, 140] },
});

/**
 * The course prerequisites from lecture 6. An edge u -> v says u has to come
 * before v. Node order is the one the slide's ordering comes out of when the
 * sort always takes the first source available.
 */
export const COURSES = drawn({
  graph: graph(
    'courses',
    ['M132', 'C187', 'C220', 'C240', 'C250', 'C311', 'C383'],
    [
      ['C187', 'C220'],
      ['C187', 'C240'],
      ['C187', 'C250'],
      ['M132', 'C240'],
      ['M132', 'C250'],
      ['C220', 'C383'],
      ['C240', 'C383'],
      ['C250', 'C311'],
    ],
    true,
  ),
  title: 'Course prerequisites',
  blurb: 'From lecture 6: an arrow from a course to one that needs it first.',
  width: 720,
  height: 380,
  pos: {
    C187: [250, 60],
    M132: [500, 60],
    C220: [110, 190],
    C240: [360, 190],
    C250: [590, 190],
    C383: [240, 320],
    C311: [590, 320],
  },
  names: {
    M132: 'Math 132',
    C187: 'CS 187',
    C220: 'CS 220',
    C240: 'CS 240',
    C250: 'CS 250',
    C311: 'CS 311',
    C383: 'CS 383',
  },
});

/** The same, with one bad rule added: CS 383 required before CS 187. */
export const COURSES_LOOP = drawn({
  ...COURSES,
  graph: graph(
    'courses-loop',
    COURSES.graph.nodes,
    [...COURSES.graph.edges, ['C383', 'C187']],
    true,
  ),
  title: 'Prerequisites, with a loop',
  blurb: 'One bad rule added: CS 383 before CS 187.',
  bends: { 'C383>C187': [-160, 190] },
});

// --- practice graphs, never animated --------------------------------------------

/** A small town's streets, for BFS by hand. */
export const TOWN = drawn({
  graph: graph(
    'town',
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    [
      ['A', 'B'],
      ['A', 'D'],
      ['B', 'C'],
      ['B', 'E'],
      ['C', 'F'],
      ['D', 'E'],
      ['D', 'G'],
      ['E', 'H'],
      ['F', 'I'],
      ['H', 'I'],
      ['G', 'H'],
    ],
  ),
  title: 'A small town',
  blurb: 'Nine corners in a three-by-three grid, with some streets missing.',
  width: 400,
  height: 400,
  pos: {
    A: [60, 60],
    B: [200, 60],
    C: [340, 60],
    D: [60, 200],
    E: [200, 200],
    F: [340, 200],
    G: [60, 340],
    H: [200, 340],
    I: [340, 340],
  },
});

/** Two triangles joined by a bridge, with a tail. For the vocabulary and the cuts. */
export const BOWTIE = drawn({
  graph: graph(
    'bowtie',
    ['P', 'Q', 'R', 'S', 'T', 'U', 'V'],
    [
      ['P', 'Q'],
      ['Q', 'R'],
      ['R', 'P'],
      ['R', 'S'],
      ['S', 'T'],
      ['T', 'U'],
      ['U', 'S'],
      ['U', 'V'],
    ],
  ),
  title: 'Two triangles',
  blurb: 'Two triangles joined by one edge, and a tail.',
  width: 560,
  height: 300,
  pos: {
    P: [60, 70],
    Q: [60, 230],
    R: [190, 150],
    S: [340, 150],
    T: [460, 70],
    U: [460, 230],
    V: [540, 230],
  },
});

/** Nine nodes in four pieces, for counting components by hand. */
export const SCATTER = drawn({
  graph: graph(
    'scatter',
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    [
      ['1', '5'],
      ['5', '9'],
      ['2', '6'],
      ['6', '3'],
      ['3', '2'],
      ['4', '8'],
    ],
  ),
  title: 'Scattered',
  blurb: 'Nine nodes, six edges, drawn so the pieces do not sit together.',
  width: 420,
  height: 380,
  pos: {
    '1': [60, 60],
    '2': [210, 60],
    '3': [360, 60],
    '4': [60, 190],
    '5': [210, 190],
    '6': [360, 190],
    '7': [60, 320],
    '8': [210, 320],
    '9': [360, 320],
  },
  bends: { '2|3': [285, 20] },
});

/** A kitchen, for topological order by hand. */
export const PASTA = drawn({
  graph: graph(
    'pasta',
    ['water', 'boil', 'sauce', 'pasta', 'drain', 'toss', 'serve'],
    [
      ['water', 'boil'],
      ['boil', 'pasta'],
      ['pasta', 'drain'],
      ['drain', 'toss'],
      ['sauce', 'toss'],
      ['toss', 'serve'],
    ],
    true,
  ),
  title: 'Dinner',
  blurb: 'Seven jobs, and which ones have to wait for which.',
  width: 620,
  height: 300,
  pos: {
    water: [60, 70],
    boil: [200, 70],
    pasta: [340, 70],
    drain: [480, 70],
    sauce: [340, 230],
    toss: [480, 230],
    serve: [590, 150],
  },
  names: {
    water: 'Fill the pot',
    boil: 'Boil it',
    sauce: 'Make sauce',
    pasta: 'Cook pasta',
    drain: 'Drain',
    toss: 'Toss together',
    serve: 'Serve',
  },
});

/** A directed path on five nodes, from the reachability clicker. */
export const CHAIN = drawn({
  graph: graph(
    'chain',
    ['v1', 'v2', 'v3', 'v4', 'v5'],
    [
      ['v1', 'v2'],
      ['v2', 'v3'],
      ['v3', 'v4'],
      ['v4', 'v5'],
    ],
    true,
  ),
  title: 'A directed path',
  blurb: 'Five nodes in a line, every edge pointing right.',
  width: 560,
  height: 120,
  pos: { v1: [50, 60], v2: [165, 60], v3: [280, 60], v4: [395, 60], v5: [510, 60] },
});

export const DRAWN: readonly Drawn[] = [
  ARPANET,
  EIGHT,
  ISLANDS,
  CUBE,
  APPLICATIONS,
  PENTAGON,
  COURSES,
  COURSES_LOOP,
  TOWN,
  BOWTIE,
  SCATTER,
  PASTA,
  CHAIN,
];

export function drawnById(id: string): Drawn {
  const d = DRAWN.find((x) => x.graph.id === id);
  if (!d) throw new Error(`No graph called ${id}`);
  return d;
}

export const nameOf = (d: Drawn, n: NodeId): string => d.names?.[n] ?? n;
