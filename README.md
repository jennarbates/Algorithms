# Algorithms

Working implementations of algorithms worth understanding properly, each one
self-contained in its own folder with its own tooling.

| Folder | What it is | Status |
| --- | --- | --- |
| [`gale-shapley/`](./gale-shapley) | Stable matching, as an interactive page that explains itself to someone with no maths background | In progress |

## Conventions

Each project is independent. There is no shared build at the root, because the
collection is meant to stay polyglot: a project here can be TypeScript, Python or
anything else without dragging the others into its toolchain. Shared editor and
CI config lives at the root, everything else lives in the project folder.

CI runs per project, from `.github/workflows/`.
