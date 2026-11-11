# Fabricator Icons

## Select the package and verify the export

Read installed imports, package dependencies and the `@fabricator` registry config. If `config.registries["@fabricator"].params.icons` is `"fabricator"`, use `@fabricator-ui/icons` on web even when `iconLibrary` says `lucide` for compatibility. In React Native use `@fabricator-ui/icons-react-native` and its installed exports. Otherwise preserve the configured library, for example `lucide-react` or `@tabler/icons-react`; adopting Fabricator UI does not imply an icon migration.

For a new project using Fabricator defaults, prefer Fabricator Icons. For an existing product, keep its choice unless a migration was requested. Check actual exports/types before importing an unfamiliar icon. Outline names and aliases follow Lucide, but package versions and specialized sets differ.

Choose one metaphor for each meaning throughout the product. Use outline icons for actions/navigation, brand marks for companies and file icons for file types. Use labels for important or unfamiliar actions. A decorative icon beside text should be hidden from assistive technology; an icon-only control gets its accessible name on the control, plus a tooltip for sighted users.

## Placement and sizing

Components own icon size, spacing and colour. In labelled buttons, mark placement with `data-icon="inline-start"` or `"inline-end"`; omit manual margins and sizing classes. An icon before text names the action; an arrow after text indicates direction.

```tsx
import { ArrowRightIcon, PlusIcon } from "@fabricator-ui/icons"

<Button>
  <PlusIcon data-icon="inline-start" />
  Create project
</Button>
<Button variant="outline">
  Continue
  <ArrowRightIcon data-icon="inline-end" />
</Button>
```

For icon-only buttons, use the installed Button's icon size variant, an accessible name and the base-appropriate Tooltip composition. For standalone icons outside a component's sizing contract, use the region's density-aware icon token. Pass component references to icon props (`icon={PlusIcon}`) when that API accepts a component, rather than inventing a string lookup map.

## Web package entry points

Verify availability in the installed version; React Native exports must be checked separately.

| Need                       | Entry point                     | Selection                                                                    |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| Static outline             | `@fabricator-ui/icons`          | Named imports for known actions                                              |
| Company mark               | `@fabricator-ui/icons/brands`   | Verified brand export; `color="brand"` only when brand colour is appropriate |
| File type                  | `@fabricator-ui/icons/files`    | `FileTypeIcon` resolves a filename; inspect its props before use             |
| Icon name from stored data | `@fabricator-ui/icons/dynamic`  | `DynamicIcon` with a fallback for unknown names                              |
| Icon picker/search         | `@fabricator-ui/icons/catalog`  | `searchIcons` searches names, aliases and tags                               |
| Meaningful icon animation  | `@fabricator-ui/icons/animated` | Optional Motion peer; web only                                               |

```tsx
import { FolderIcon } from "@fabricator-ui/icons"
import { GithubIcon } from "@fabricator-ui/icons/brands"
import { DynamicIcon } from "@fabricator-ui/icons/dynamic"

<Button variant="outline">
  <GithubIcon data-icon="inline-start" />
  Continue with GitHub
</Button>
<DynamicIcon name={project.icon} fallback={<FolderIcon />} />
```

Keep known UI actions as static imports. Reserve DynamicIcon for names that actually come from data; avoid loading the catalog just to render a few fixed icons. Use the official brand set rather than drawing logos. If a mark is unavailable, use a text label or a user-provided official asset. A brand set complements the configured action icon set; it does not require replacing that set.

## Animation

Use animated icons when they communicate feedback, such as a completed copy action. Keep ordinary navigation and dense lists quiet. Check the optional `motion` peer before introducing an animated import; adding it is a dependency decision.

Animated icons can expose an `AnimatedIconHandle` ref with `startAnimation` and `stopAnimation`. For an icon inside a button, the button's interaction can drive that ref so the whole target triggers it. Preserve existing handlers and reduced-motion behavior; verify the installed version's API. Interaction handlers require a client boundary in server-rendered web frameworks.
