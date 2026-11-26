# Component groups

Every component belongs to exactly one of eight groups. The groups order the homepage filter, desktop explorer, React Native demo, and most entries in the docs sidebar. The source of truth is `apps/web/lib/component-groups.ts`; the decision behind them is in [`plans/component-groups.md`](plans/component-groups.md), and Charts in [`plans/charts.md`](plans/charts.md).

The docs sidebar lists collapsible category rows under Components. App Shell follows Basics. Its row links to the wrapper's overview and expands to show Sidebar, App Nav, Tab Strip, Workspace Switcher, User Menu, and the shared references for the wrapper's exports. `apps/web/lib/docs-explorer.ts` sets the sidebar and pagination order.

Each Advanced component row also links to its overview and expands to show its references. The Advanced badge counts the components available on the selected base or platform. References live under `/docs/advanced/<component>/<topic>` and use the Base UI navigation.

## The groups

In this order:

| Group         | Holds                                                                             | For example                                                               |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Basics**    | The building blocks other components are made of: one control or atom             | `button`, `input`, `checkbox`, `badge`, `avatar`, `separator`, `skeleton` |
| **Forms**     | Composed inputs and pickers for entering a value                                  | `field`, `properties`, `input-group`, `select`, `combobox`, `date-picker`, `search`     |
| **Overlays**  | Surfaces that open above the page from a trigger or a shortcut                    | `dialog`, `record-view`, `sheet`, `popover`, `tooltip`, `dropdown-menu`, `command`       |
| **Structure** | The frame of an app and the arrangement of a page: navigation, layout, containers | `app-shell`, `sidebar`, `tabs`, `breadcrumb`, `accordion`, `card`, `item` |
| **Content**   | Showing data, media and the result of an action                                   | `table`, `alert`, `toast`, `progress`, `empty`, `markdown`                |
| **Charts**    | Numbers drawn as marks: lines, bars, areas, arcs, cells and flows                 | `area-chart`, `bar-chart`, `donut-chart`, `treemap`, `heat-calendar`      |
| **Chat**      | Parts made for a conversation with a person or an assistant                       | `chat-input`, `message`, `bubble`, `model-picker`, `questionnaire`        |
| **Advanced**  | Large, self-contained components that are a small product of their own            | `data-table`, `event-calendar`, `kanban`, `editor`, `file-tree`, `video-player`     |

## Choosing a group

Pick the group a reader would look in when building the screen, in this order:

1. **Advanced** when it is a complete tool rather than a part, with its own state model and controls (`data-table`, `editor`, `file-tree`, `syntax-highlight`, `image-compare`, `video-player`, `audio-player`). The Data Table is one: it loads, sorts, filters, edits and lays itself out. A component that is merely large but still one part of a screen (`app-shell`) stays in its own group.
2. **Charts** when the component draws numbers as marks (lines, bars, areas, arcs, cells, flows) with a scale, a legend or a tooltip. A table of numbers stays Content; a single `Progress` bar stays Content.
3. **Chat** when the component exists for conversations. A general component that chat also uses (`markdown`, `avatar`) stays in its own group.
4. **Overlays** when its main surface floats above the page. A header navigation that stays in place (`navigation-menu`) is Structure.
5. **Basics** when it is one element other components are built from, whatever it shows: a single control (`input`, `toggle`), a label or mark (`badge`, `kbd`, `avatar`), a placeholder (`skeleton`, `spinner`) or a primitive container (`scroll-area`, `aspect-ratio`).
6. **Forms** when it composes controls: a set of them (`button-group`, `toggle-group`) or a way of entering a value (`input-group`, `field`, `search`, and every picker: `select`, `date-picker`, `color-picker`).
7. **Structure** when it frames or arranges other components: app frames, navigation, disclosure, cards, items, carousels, resizable panes.
8. **Content** when it presents data, media, status or the result of an action. Reading a document is Content (`markdown`); writing one is Advanced (`editor`).

When two groups still fit, follow the closest neighbour already in `GROUP_BY_SLUG`. A native-only component (`text`, `fabricator-root`) takes a group like any other.

The React explorer and Tauri mobile consume the same generated group catalog.
Compatibility `form` belongs to Forms; native interface `sounds` belongs to
Content. Blocks appear in a separate gallery collection, outside the eight
component groups.

## Adding a component

1. Add its slug to `GROUP_BY_SLUG` in `apps/web/lib/component-groups.ts`, under its group's comment. The slug is the docs page slug, which is the registry item name.
2. Add its homepage card to `app/(app)/(root)/_components/catalog.tsx` with a card height, unless it is one of the kinds the homepage leaves out ([WEBSITE.md](WEBSITE.md#homepage)).
3. Add the docs slug to `content/docs/components/<base>/meta.json` for every web base. The command menu reads this page tree; a page can render at its URL and in the grouped sidebar while remaining absent from ⌘K. `native:docs` generates the native metadata.
4. Add it to the agent skill's catalogue, `skills/fabricator/components.md`, under the need it answers: when to reach for it and what is worth knowing.
5. Run `bun run test`. `lib/skill-catalog.test.ts` fails for a documented component the skill doesn't name. `getComponentGroup` throws `UngroupedComponentError` for a page without a group, and `lib/explorer-coverage.test.ts` fails while a published native component isn't browsable in a known group.

## Changing the groups

The eight groups are a settled decision. Adding, removing, renaming or reordering one changes every surface at once, so it needs a plan in `docs/plans/` first. When it happens, the change touches:

- `COMPONENT_GROUPS` and the slugs in `apps/web/lib/component-groups.ts`, with `component-groups.test.ts`.
- The group icons in `apps/web/lib/explorer-icons.ts` and `demos/react-native/src/nav.ts`.
- The navigation IDs in `apps/web/lib/component-explorer.ts`. Saved navigation preferences store them, so they never change on a rename (`Structure` keeps `group-navigation-layout`); a new group gets a new ID.
- This file, the root [`DESIGN.md`](../DESIGN.md) if its "Choosing a component" table moves, and a section in the unreleased changelog page.

## Done when

- [ ] The component has a group in `GROUP_BY_SLUG` that follows the order above, and `bun run test` passes.
- [ ] It appears under that group in the homepage filter (when it has a card), the desktop explorer, and the React Native demo when it has a native version. In the docs sidebar, App Shell and Advanced references appear under their owning rows.
