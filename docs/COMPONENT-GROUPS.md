# Component groups

Every component belongs to exactly one of seven groups. The groups order the docs sidebar, the homepage filter, the desktop explorer and the React Native example, so a component is found in the same place on every surface. The source of truth is `apps/web/lib/component-groups.ts`; the decision behind them is in [`plans/component-groups.md`](plans/component-groups.md).

## The groups

In this order:

| Group         | Holds                                                                             | For example                                                               |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Basics**    | The building blocks other components are made of: one control or atom             | `button`, `input`, `checkbox`, `badge`, `avatar`, `separator`, `skeleton` |
| **Forms**     | Composed inputs and pickers for entering a value                                  | `field`, `input-group`, `select`, `combobox`, `date-picker`, `search`     |
| **Overlays**  | Surfaces that open above the page from a trigger or a shortcut                    | `dialog`, `sheet`, `popover`, `tooltip`, `dropdown-menu`, `command`       |
| **Structure** | The frame of an app and the arrangement of a page: navigation, layout, containers | `app-shell`, `sidebar`, `tabs`, `breadcrumb`, `accordion`, `card`, `item` |
| **Content**   | Showing data, media and the result of an action                                   | `table`, `alert`, `toast`, `progress`, `empty`, `markdown`                |
| **Chat**      | Parts made for a conversation with a person or an assistant                       | `chat-input`, `message`, `bubble`, `model-picker`, `questionnaire`        |
| **Advanced**  | Large, self-contained components that are a small product of their own            | `data-table`, `editor`, `file-tree`, `syntax-highlight`, `video-player`   |

## Choosing a group

Pick the group a reader would look in when building the screen, in this order:

1. **Advanced** when it is a complete tool rather than a part, with its own state model and controls (`data-table`, `editor`, `file-tree`, `syntax-highlight`, `image-compare`, `video-player`, `audio-player`). The Data Table is one: it loads, sorts, filters, edits and lays itself out. A component that is merely large but still one part of a screen (`app-shell`) stays in its own group.
2. **Chat** when the component exists for conversations. A general component that chat also uses (`markdown`, `avatar`) stays in its own group.
3. **Overlays** when its main surface floats above the page. A header navigation that stays in place (`navigation-menu`) is Structure.
4. **Basics** when it is one element other components are built from, whatever it shows: a single control (`input`, `toggle`), a label or mark (`badge`, `kbd`, `avatar`), a placeholder (`skeleton`, `spinner`) or a primitive container (`scroll-area`, `aspect-ratio`).
5. **Forms** when it composes controls: a set of them (`button-group`, `toggle-group`) or a way of entering a value (`input-group`, `field`, `search`, and every picker: `select`, `date-picker`, `color-picker`).
6. **Structure** when it frames or arranges other components: app frames, navigation, disclosure, cards, items, carousels, resizable panes.
7. **Content** when it presents data, media, status or the result of an action. Reading a document is Content (`markdown`); writing one is Advanced (`editor`).

When two groups still fit, follow the closest neighbour already in `GROUP_BY_SLUG`. A native-only component (`text`, `fabricator-root`) takes a group like any other.

## Adding a component

1. Add its slug to `GROUP_BY_SLUG` in `apps/web/lib/component-groups.ts`, under its group's comment. The slug is the docs page slug, which is the registry item name.
2. Add its homepage card to `app/(app)/(root)/_components/catalog.tsx` with a card height, unless it is one of the kinds the homepage leaves out ([WEBSITE.md](WEBSITE.md#homepage)).
3. Add the docs slug to `content/docs/components/<base>/meta.json` for every web base. The command menu reads this page tree; a page can render at its URL and in the grouped sidebar while remaining absent from ⌘K. `native:docs` generates the native metadata.
4. Run `bun run test`. `getComponentGroup` throws `UngroupedComponentError` for a page without a group, and `lib/explorer-coverage.test.ts` fails while a published native component isn't browsable in a known group.

## Changing the groups

The seven groups are a settled decision. Adding, removing, renaming or reordering one changes every surface at once, so it needs a plan in `docs/plans/` first. When it happens, the change touches:

- `COMPONENT_GROUPS` and the slugs in `apps/web/lib/component-groups.ts`, with `component-groups.test.ts`.
- The group icons in `apps/web/lib/explorer-icons.ts` and `apps/mobile/src/nav.ts`.
- The navigation IDs in `apps/web/lib/component-explorer.ts`. Saved navigation preferences store them, so they never change on a rename (`Structure` keeps `group-navigation-layout`); a new group gets a new ID.
- This file, the root [`DESIGN.md`](../DESIGN.md) if its "Choosing a component" table moves, and a changelog entry.

## Done when

- [ ] The component has a group in `GROUP_BY_SLUG` that follows the order above, and `bun run test` passes.
- [ ] It appears under that group in the docs sidebar, the homepage filter (when it has a card) and the desktop explorer, and in the React Native example when it has a native version.
