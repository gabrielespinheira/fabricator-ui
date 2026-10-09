#!/usr/bin/env bash
# Build the website on this machine and upload the finished output to Vercel.
#
# Vercel's standard build machine (4 cores, 8 GB) needs ~9 minutes for this
# site, so the build runs here and Vercel only receives it (`--prebuilt`).
# That includes the installable registry under /r/**. Vercel's own Git builds
# are off (apps/web/vercel.json); this script is the only way the site ships.
#
#   bun run deploy              production deploy; only from a clean, pushed `main`
#   bun run deploy -- --preview preview deploy of the current checkout
#
# Needs the Vercel CLI, logged in to the `sharphaw` team (`vercel login`).
# No token is stored in the repo. The first run links `.vercel/` (gitignored).
set -euo pipefail

cd "$(dirname "$0")/.."

mode=production
case "${1:-}" in
  "") ;;
  --preview) mode=preview ;;
  *) echo "usage: scripts/deploy.sh [--preview]" >&2; exit 2 ;;
esac

command -v vercel > /dev/null || { echo "Install the Vercel CLI: bun add -g vercel" >&2; exit 1; }

if [ "$mode" = production ]; then
  branch=$(git branch --show-current)
  [ "$branch" = main ] || { echo "Production deploys come from main (on '$branch')." >&2; exit 1; }
  [ -z "$(git status --porcelain)" ] || { echo "The working tree has uncommitted changes." >&2; exit 1; }
  git fetch --quiet origin main
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] \
    || { echo "main is not at origin/main. Pull or push first." >&2; exit 1; }
fi

# Inlined into pages and metadata at build time. Vercel has no variables set.
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://fabricator-ui.com}"
export NEXT_PUBLIC_V0_URL="${NEXT_PUBLIC_V0_URL:-https://v0.dev}"

[ -f .vercel/project.json ] || vercel link --yes --project fabricator-ui --scope sharphaw

# `${arr[@]+...}` keeps an empty array valid under `set -u` on macOS bash 3.2.
prod_flag=()
[ "$mode" = production ] && prod_flag=(--prod)

bun install --frozen-lockfile
vercel pull --yes --environment="$mode"
vercel build ${prod_flag[@]+"${prod_flag[@]}"}
# The output has ~48k files; Vercel accepts 15k per upload, so send one archive.
vercel deploy --prebuilt --archive=tgz ${prod_flag[@]+"${prod_flag[@]}"}
