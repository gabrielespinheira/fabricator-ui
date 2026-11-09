import { Example, ExampleWrapper } from "@/examples/native/example"

import {
  Markdown,
  type MarkdownComponents,
} from "@/registry/native/ui/markdown"
import { Text } from "@/registry/native/ui/text"

const notes = `## Release notes

Fabricator **0.6** brings a *Markdown* preview and an editor that writes it back. Read the [changelog](https://fabricator-ui.vercel.app/docs/changelog) for the rest.

- Headings, lists and \`inline code\`
- Tables and task lists
  - Nested items keep their place

> Unedited files save byte for byte.

\`\`\`ts
import { Markdown } from "@/components/ui/markdown"
\`\`\`

- [x] Parser
- [ ] Native editor
`

const sizes = `### Weekly sync

Review the *editor* with **design** on Friday.

1. Typography
2. Keyboard bar
`

const table = `| Item | Owner | Status |
| :--- | :---: | ---: |
| Markdown preview | Gabs | Shipped |
| Native editor | Acme Inc | In review |
| Android view | gabs@fabricator.dev | Planned |

---

<details>raw HTML stays as its source</details>
`

const links = `Questions go to [the team](mailto:gabs@fabricator.dev), or read [the docs](https://fabricator-ui.vercel.app/docs).`

// A link through the app's own handling: here it only shows where it goes.
const components: MarkdownComponents = {
  a: ({ href, children }) => (
    <Text className="font-medium text-primary-text">
      {children}
      <Text className="text-muted-foreground">{` (${href})`}</Text>
    </Text>
  ),
}

function MarkdownExample() {
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Markdown>{notes}</Markdown>
      </Example>
      <Example title="Size sm">
        <Markdown size="sm">{sizes}</Markdown>
      </Example>
      <Example title="Size lg">
        <Markdown size="lg">{sizes}</Markdown>
      </Example>
      <Example title="Tables, dividers and raw Markdown">
        <Markdown>{table}</Markdown>
      </Example>
      <Example title="Custom links">
        <Markdown components={components}>{links}</Markdown>
      </Example>
    </ExampleWrapper>
  )
}

export { MarkdownExample }
