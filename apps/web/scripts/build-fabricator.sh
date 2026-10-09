#!/usr/bin/env bash
# Rebuild the compiled Fabricator styles (styles/*-fabricator) under a lock, so
# parallel workers never run the registry build at the same time.
# Usage: scripts/build-fabricator.sh [base|radix|aria|all]   (default: all)
set -euo pipefail
cd "$(dirname "$0")/.."
LOCK="${TMPDIR:-/tmp}/fabricator-registry-build.lock"
until mkdir "$LOCK" 2>/dev/null; do sleep 2; done
trap 'rmdir "$LOCK"' EXIT
target="${1:-all}"
if [ "$target" = "all" ]; then
  for base in base radix aria; do bun ./scripts/build-registry.mts --style "$base-fabricator"; done
else
  bun ./scripts/build-registry.mts --style "$target-fabricator"
fi
