import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightIcon,
  SyntaxHighlightLanguage,
  SyntaxHighlightTitle,
} from "@/styles/base-fabricator/ui/syntax-highlight"

// The language comes from each file's name.
const files = [
  {
    filename: "package.json",
    code: `{
  "name": "acme-dashboard",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build" },
  "dependencies": { "fabricator-ui": "^0.6.0" }
}`,
  },
  {
    filename: "app/globals.css",
    code: `@import "tailwindcss";

:root {
  --radius: 0.5rem;
}

.card:hover {
  background-color: var(--surface-3);
}`,
  },
  {
    filename: "scripts/release.sh",
    code: `#!/usr/bin/env bash
set -euo pipefail

# Ship only from a clean main.
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION" && git push --tags
echo "Released v$VERSION"`,
  },
  {
    filename: "seed.py",
    code: `from dataclasses import dataclass

@dataclass
class Member:
    email: str
    is_admin: bool = False

def seed() -> list[Member]:
    return [Member("gabs@fabricator.dev", is_admin=True)]`,
  },
  {
    filename: ".github/workflows/ci.yml",
    code: `name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bun install && bun run test`,
  },
  {
    filename: "README.md",
    code: `# Acme Dashboard

Built with **Fabricator UI**. Run \`bun dev\` and open
[localhost:3000](http://localhost:3000).

- Light and dark themes
- _Every_ component from the registry`,
  },
]

export function SyntaxHighlightLanguages() {
  return (
    <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
      {files.map((file) => (
        <SyntaxHighlight
          key={file.filename}
          code={file.code}
          filename={file.filename}
        >
          <SyntaxHighlightHeader>
            <SyntaxHighlightIcon />
            <SyntaxHighlightTitle />
            <SyntaxHighlightLanguage />
            <SyntaxHighlightCopy />
          </SyntaxHighlightHeader>
          <SyntaxHighlightContent />
        </SyntaxHighlight>
      ))}
    </div>
  )
}
