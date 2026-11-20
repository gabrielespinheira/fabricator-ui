# Fabricator UI for React web

Install the package into the web app or the workspace that owns your design system.

```sh
bun add @fabricator-ui/react
```

Import the compiled stylesheet once in your app entry or root layout.

```tsx
import "@fabricator-ui/react/styles.css"
```

Import the Base UI components you use by subpath.

```tsx
import { Button } from "@fabricator-ui/react/button"
```

The preview includes Badge, Button, Card, Checkbox, Dialog, Dropdown Menu, Input, Label, Select, Switch, Tabs and Textarea. Bring React 19 and React DOM 19. The package ships its CSS and maintains its implementation dependencies. Override CSS variables in your app stylesheet and use the `.dark` class for dark mode.

Use `fabricator-ui init --distribution package` to set up an existing Next.js App Router or Vite React app. Copy-in remains the CLI default and supports editable source, the App Shell, blocks and the wider catalog. To upgrade a pinned package install, set the new version in the workspace that owns the dependency.
