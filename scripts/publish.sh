#!/usr/bin/env bash
# Release the fabricator-ui CLI from this machine: publish the version in
# packages/cli/package.json to npm, then tag it and create its GitHub release
# with that version's section of the root CHANGELOG.md, which `/release` writes.
# Each step is skipped when already done, so reruns are safe. `scripts/deploy.sh`
# runs this after a production deploy.
#
# Bun packs the tarball and the npm binary that ships with Node uploads it
# (AGENTS.md, contract item 7). npm asks for 2FA in the browser.
# Needs `npm login` and the GitHub CLI (`gh auth login`).
set -euo pipefail

cd "$(dirname "$0")/.."

name=$(node -p "require('./packages/cli/package.json').name")
version=$(node -p "require('./packages/cli/package.json').version")
tag="${name}@${version}"

# The version's section of the changelog: from "## [<version>]" to the next "## [".
notes=$(awk -v heading="## [$version]" '
  index($0, heading) == 1 { found = 1; next }
  found && /^## \[/ { exit }
  found { print }
' CHANGELOG.md)
# Stop before publishing anything: a version without notes was never cut.
[ -n "$notes" ] || { echo "CHANGELOG.md has no section for $version. Cut the release with /release first." >&2; exit 1; }
bun run release:check

if npm view "$tag" version > /dev/null 2>&1; then
  echo "$tag is already on npm."
else
  # The CLI inlines its version at build time, so build after versioning.
  bun run cli:build
  (
    cd packages/cli
    rm -f ./*.tgz
    bun pm pack
    npm publish ./*.tgz --access public
    rm -f ./*.tgz
  )
fi

if git ls-remote --exit-code --tags origin "refs/tags/$tag" > /dev/null; then
  echo "Tag $tag already exists."
else
  git tag -a "$tag" -m "$tag"
  git push origin "refs/tags/$tag"
fi

if gh release view "$tag" > /dev/null 2>&1; then
  echo "GitHub release $tag already exists."
else
  gh release create "$tag" --verify-tag --title "$tag" --notes "$notes"
fi
