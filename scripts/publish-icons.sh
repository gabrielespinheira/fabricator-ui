#!/usr/bin/env bash
# Publish the Fabricator Icons packages from this machine: each version in
# packages/icons*/package.json that isn't on npm yet. `scripts/deploy.sh` runs
# this before it ships the site, because `/init` installs @fabricator-ui/icons
# by default: the site must never go live ahead of the package.
#
# Bun packs the tarball and the npm binary that ships with Node uploads it
# (AGENTS.md, contract item 7). npm asks for 2FA in the browser. Needs `npm login`.
set -euo pipefail

cd "$(dirname "$0")/.."

for dir in packages/icons packages/icons-react-native packages/icons-static; do
  name=$(node -p "require('./$dir/package.json').name")
  version=$(node -p "require('./$dir/package.json').version")

  if [ "$version" = 0.0.0 ]; then
    echo "$name is still 0.0.0. Merge the changesets \"version packages\" pull request first." >&2
    exit 1
  fi

  if npm view "$name@$version" version > /dev/null 2>&1; then
    echo "$name@$version is already on npm."
    continue
  fi

  (
    cd "$dir"
    bun run build
    rm -f ./*.tgz
    bun pm pack
    npm publish ./*.tgz --access public
    rm -f ./*.tgz
  )
done
