# Component groups

Status: option 2 selected by Gabs on 2026-11-10. Six groups with shorter labels. A seventh group, Advanced, added on 2026-11-12 (see [Advanced](#advanced)).

## Decision

Use **Basics, Forms, Overlays, Structure, Content, Chat**, in that order, across website docs, the desktop example and the mobile example.

Keep every component in its existing category. The chosen direction shortens the sidebar labels without changing where people find components. The eight-group proposal was not selected.

| Previous label      | Selected label | Shared components |
| ------------------- | -------------- | ----------------: |
| Basics              | Basics         |                20 |
| Forms               | Forms          |                17 |
| Overlays & Menus    | Overlays       |                11 |
| Navigation & Layout | Structure      |                19 |
| Data & Feedback     | Content        |                10 |
| AI & Chat           | Chat           |                 8 |

These counts cover the 85 entries in the shared grouping map. A surface's badge counts reflect its available components, so counts can differ by base and platform.

## Scope

- Rename labels in the shared component grouping map and both platform icon maps.
- Keep the current group order, component membership, alphabetical child order and icons.
- Keep component URLs, registry names, install commands and open component tab identities.
- Preserve existing group navigation IDs. They currently appear in saved navigation preferences; renaming the display text should not reset those preferences.
- Icons and Blocks remain top-level destinations outside the component taxonomy.

## Implementation

1. Add tests for the six names, existing assignments and stable group navigation IDs before changing the implementation.
2. Update `apps/web/lib/component-groups.ts`, shared by docs, desktop, mobile and the homepage gallery.
3. Update group icon keys in `apps/web/lib/explorer-icons.ts` and `apps/mobile/src/nav.ts`.
4. Replace label-derived navigation IDs in `apps/web/lib/component-explorer.ts` with an explicit mapping to the existing IDs. No saved-state migration is needed.
5. Update explorer test fixtures and add a changelog entry.
6. Verify the full 85-entry assignment remains equivalent after applying the label changes. Run lint, types, formatting and tests, including the mobile app's separate typecheck.
7. Inspect the labels in docs and desktop in the browser and in the running mobile example.

## Acceptance

- Exactly six single-word labels appear in the same order across platforms.
- All 85 components retain their previous category; only four category labels change.
- Group IDs and component routes stay stable.
- All generated site icon exports still resolve after regeneration.
- Checks and tests pass. Record any unavailable runtime verification in the result.

## Separate inventory finding

Native Data Table and Typography examples have no corresponding native docs pages. This predates the label change and is outside this implementation.

## Advanced

Added by Gabs on 2026-11-12. A seventh group, **Advanced**, placed last, holds the large, self-contained components that fit no other group well:

| Component          | Previous group |
| ------------------ | -------------- |
| `syntax-highlight` | Content        |
| `editor`           | Forms          |
| `file-tree`        | Structure      |
| `image-compare`    | Content        |
| `video-player`     | Content        |
| `audio-player`     | Content        |

- Its navigation ID is `group-advanced`; the six existing IDs are unchanged, so saved preferences still apply.
- Its icon is `ZapIcon` in `apps/web/lib/explorer-icons.ts` and `apps/mobile/src/nav.ts`.
- Component URLs, registry names and install commands are unchanged; only the group shown in the docs sidebar, homepage filter, desktop explorer and mobile example moves.
