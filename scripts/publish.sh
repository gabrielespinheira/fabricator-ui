#!/usr/bin/env bash
# Publish the fabricator-ui CLI with npm provenance.
# `bun publish` has no provenance flag, so Bun packs the tarball and the npm
# binary that ships with Node uploads it (AGENTS.md, contract item 7).
# Then `changeset tag` tags the version and prints "New tag: <name>@<version>",
# which changesets/action reads to push the tag and create the GitHub release.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/packages/cli"
name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")

if npm view "${name}@${version}" version > /dev/null 2>&1; then
  echo "${name}@${version} is already published."
else
  # The CLI inlines its version at build time, so build after versioning.
  bun run build
  rm -f ./*.tgz
  bun pm pack
  npm publish ./*.tgz --provenance --access public
  rm -f ./*.tgz
fi

cd "$root"
bunx changeset tag
