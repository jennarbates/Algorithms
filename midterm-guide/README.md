# CS 311 Midterm 1 Learning Guide

The study guide for lectures 1 to 10 as one page: ten lessons, a math toolkit, a
proof cheat sheet and a 12-problem practice exam. Answers stay hidden until you
ask for them, and the guide's algorithms run step by step.

| Part | What it does |
| --- | --- |
| Questions | 116 questions with hidden answers. Mark each one "Got it" or "Review later"; flagged ones collect in a review queue. |
| Simulators | Gale-Shapley, Big-O bounds, BFS, DFS, the bipartite test, topological sort, interval scheduling, lateness, Dijkstra, Kruskal, Prim, the cut property and union-find. Most can quiz you on the next step. |
| Flashcards | 43 cards: definitions, running times and proof patterns. |
| Practice exam | A 2-hour timer, a box for your answers, locked solutions and self-scoring. |

Progress and exam answers stay in the reader's browser.

## Running it

```bash
npm run build
npm test
```

`npm run build` writes the single-file `dist/index.html` that `../site/build.sh`
publishes at `/midterm-guide/`. It needs Python 3 and no packages. `npm test`
holds the simulators to the traces and answers printed in the guide.

## Layout

```
doc.xml            the guide's text, exported from the source document
build.py           turns doc.xml into the page and places each simulator
src/core.js        the algorithms, with no DOM, so test.js can run them
src/widgets.js     draws the simulators
src/app.js         routing, progress, flashcards, review queue, exam
src/style.css      the same tokens as ../graphs
test.js            checks the engines against the guide
```

To change the wording, edit `doc.xml` and rebuild. `build.py` stops with an error
if any question ends up without an answer.
