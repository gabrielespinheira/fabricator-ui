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
# A production deploy first publishes the icon packages and editor-native
# (scripts/publish-icons.sh), since `/init` installs @fabricator-ui/icons by
# default, the native `editor` item installs @fabricator-ui/editor-native, and
# the site must not go live ahead of them. After the site it releases the CLI (scripts/publish.sh): it
# publishes the version in packages/cli/package.json to npm if it is new, and
# tags it with a GitHub release. The site ships first there, so a new CLI never
# points at registry items the site does not serve yet.
#
# Needs the Vercel CLI, logged in to the `sharphaw` team (`vercel login`), and
# for production also `npm login` and `gh auth login`.
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
  # Fail before the long build, not after it.
  npm whoami > /dev/null 2>&1 || { echo "Log in to npm first: npm login" >&2; exit 1; }
  gh auth status > /dev/null 2>&1 || { echo "Log in to GitHub first: gh auth login" >&2; exit 1; }
fi

# Inlined into pages and metadata at build time. The only Vercel variable is
# NEXT_PUBLIC_POSTHOG_KEY, which `vercel pull` below brings into the build.
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://fabricator-ui.vercel.app}"
export NEXT_PUBLIC_V0_URL="${NEXT_PUBLIC_V0_URL:-https://v0.dev}"

[ -f .vercel/project.json ] || vercel link --yes --project fabricator-ui --scope sharphaw

# `${arr[@]+...}` keeps an empty array valid under `set -u` on macOS bash 3.2.
prod_flag=()
[ "$mode" = production ] && prod_flag=(--prod)

bun install --frozen-lockfile

if [ "$mode" = production ]; then
  ./scripts/publish-icons.sh
elif ! npm view @fabricator-ui/icons version > /dev/null 2>&1; then
  echo "Warning: @fabricator-ui/icons isn't on npm, so \`init\` against this preview can't install it." >&2
fi

vercel pull --yes --environment="$mode"
# apps/mobile's typecheck links its node_modules into the native source folders
# (scripts/link-native-types.mjs). The site's `./registry/**/*` trace include
# follows the link, which puts React Native in every function and an absolute
# symlink Vercel rejects at deploy. `outputFileTracingExcludes` doesn't reach
# Turbopack's include, so the links go; the next typecheck recreates them.
for link in apps/web/registry/native/node_modules apps/web/examples/native/node_modules; do
  if [ -L "$link" ]; then rm "$link"; fi
done
vercel build ${prod_flag[@]+"${prod_flag[@]}"}
# The output has ~48k files; Vercel accepts 15k per upload, so send one archive.
vercel deploy --prebuilt --archive=tgz ${prod_flag[@]+"${prod_flag[@]}"}

if [ "$mode" = production ]; then
  ./scripts/publish.sh
fi
