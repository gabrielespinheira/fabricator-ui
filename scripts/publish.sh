#!/usr/bin/env bash
# Publish the fabricator-ui CLI with npm provenance.
# `bun publish` has no provenance flag, so Bun packs the tarball and the npm
# binary that ships with Node uploads it (AGENTS.md, contract item 7).
set -euo pipefail

cd "$(dirname "$0")/../packages/cli"
name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")

if npm view "${name}@${version}" version > /dev/null 2>&1; then
  echo "${name}@${version} is already published."
  exit 0
fi

rm -f ./*.tgz
bun pm pack
npm publish ./*.tgz --provenance --access public
rm -f ./*.tgz
