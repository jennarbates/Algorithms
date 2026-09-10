#!/usr/bin/env bash
#
# Assemble the whole website into one folder, ready to be served as static files.
#
#   site/build.sh            -> writes to _site/
#   site/build.sh out/dir    -> writes somewhere else
#
# The landing page (site/index.html) goes at the root. Then every top-level
# folder that has a package.json with a "build" script is treated as a visual:
# it is installed, built, and its dist/index.html is served at /<folder>/.
# Nothing here has to be edited when a visual is added; only the landing page
# needs a new card.
#
# Each project builds to a single self-contained HTML file (see any project's
# vite.config.ts), which is why only dist/index.html is copied. If a project
# ever emits more than that, copy the whole dist folder instead.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/_site}"

rm -rf "$OUT"
mkdir -p "$OUT"
cp "$ROOT/site/index.html" "$OUT/index.html"
# Tell GitHub Pages not to run Jekyll over the output.
touch "$OUT/.nojekyll"

for pkg in "$ROOT"/*/package.json; do
  [ -f "$pkg" ] || continue
  dir="$(dirname "$pkg")"
  name="$(basename "$dir")"

  if ! node -e 'process.exit(require(process.argv[1]).scripts?.build ? 0 : 1)' "$pkg"; then
    echo "skip  $name (no build script)"
    continue
  fi

  echo "build $name"
  (
    cd "$dir"
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
    npm run build
  )

  if [ ! -f "$dir/dist/index.html" ]; then
    echo "error: $name built but produced no dist/index.html" >&2
    exit 1
  fi

  mkdir -p "$OUT/$name"
  cp "$dir/dist/index.html" "$OUT/$name/index.html"
  echo "  -> /$name/"
done

echo
echo "site assembled in $OUT"
