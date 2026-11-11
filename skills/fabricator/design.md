# Designing with Fabricator UI

Read for screen design, layout changes or a project design guide. These defaults are distilled from the library's DESIGN.md for use outside its repository. Existing product decisions and the user's brief take precedence. API details belong to installed source and component docs.

## Resolve the design before building

Write a short working brief: who uses the screen, the task, what they need to see first, and the primary action. Identify the frame, title, toolbar, body and optional panel. Choose a pattern below and list the components for each region. This can stay in the response or working notes unless a design document was requested.

Pick the mode per region:

| Mode                         | Density  | Motion            | Frame                                      |
| ---------------------------- | -------- | ----------------- | ------------------------------------------ |
| App                          | Default  | Default or snappy | AppShell when workspace behavior is needed |
| Tool, editor, dense data     | Compact  | Snappy or instant | AppShell with compact toolbars             |
| Website, touch-first content | Spacious | Smooth            | Site header and content container          |

Density belongs on the widest region it describes, with a nested provider for exceptions. `DensityProvider` carries density into portalled overlays; a bare data attribute does not provide that context. Avoid resizing every component to simulate density. Read the installed provider's API before using it.

## Visual language

- Neutral surfaces and type carry the screen. Brand colour enters through the theme's primary role; statuses keep their meaning. Use semantic roles in both themes.
- Give each region one primary action. Place rare actions in a menu. Establish hierarchy through position, space, type size and weight before adding colour.
- Group with space first, then headings and separators. Use cards for discrete objects. Feature text, settings sections and every dashboard number do not each need a card.
- Surfaces follow the library's elevation ladder. Components already supply their edges and shadows; leave additional borders, generic shadows and overlay z-index out of their layout classes.
- Keep title, toolbar and body on one start edge. Align numbers to the end and use tabular figures. Keep related controls closer than separate groups.
- Use the project's typeface and radius. Fabricator defaults to small, precise UI type: 13px body at default density, 12px compact, 15px spacious. Component typography follows density. Reading content uses Markdown/Editor roles rather than shrinking with the toolbar.
- Use sentence case and concrete action labels. Errors explain how to recover. Use realistic names, numbers and long strings while laying out the page.
- Components own selection, hover and press feedback. Custom motion follows the installed motion roles and reduced-motion setting. App pages and rows appear in place; entrance choreography is reserved for a website when it helps the story.
- Icons clarify actions and object types. Use one icon per meaning consistently, with the configured library. Keep important or unfamiliar actions labelled.

Typical layout starting points: 8px between related app controls, 16px between content groups, 32–40px between app sections, 16px phone padding and 24px desktop padding. Websites use more space, often 64–96px between sections. Adjust for the content and existing product, not by overriding component internals.

Forms and settings usually cap near 672px; ordinary app content near 896px; dashboards and website containers near 1152px. Tables, boards, editors and transcripts fill the main column. Prefer the AppShell's content sizes where available.

## Choose a pattern

| Task                  | Regions and components                                                                | Small-screen behavior                                                      |
| --------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Scan records          | Title/action, Search and filters, Table or ItemGroup, Pagination                      | Hide secondary columns or use items; keep identity, status and main action |
| Inspect a record      | Breadcrumb, title/actions, main content, optional details Sheet                       | Stack supporting content; details can become Drawer                        |
| Work through a queue  | Searchable list beside selected detail, shared actions                                | List opens a detail screen with a clear way back                           |
| Change settings       | Section headings, horizontal Fields, descriptions, grouped controls                   | Labels above controls; preserve reading order                              |
| Create or edit        | One capped FieldGroup, errors beside fields, submit/cancel                            | Single column; preserve entered data after errors                          |
| Monitor a system      | Summary, comparison, recent activity, drill-down actions                              | Rank summaries; keep the important comparison readable                     |
| Work across documents | AppShell, TabStrip, main editor, resizable inspector                                  | Reduce visible chrome; panel becomes overlay or separate view              |
| Chat                  | Conversation list if needed, MessageScroller, Message/Bubble, composer                | One conversation; composer remains reachable with the keyboard open        |
| Explain a product     | Header, one promise and CTA, product demonstration, proof, supporting sections, close | Reflow media and text; keep the CTA clear                                  |

Search for a matching block before constructing a new frame. `app-shell-01` through `app-shell-05` cover workspace, workbench, SaaS, desktop and mobile-first shells. Inspect a candidate's docs and source; remove irrelevant demo content. Reuse an existing app frame instead of nesting another shell.

A website's structure follows its product and evidence. Show real UI or meaningful media, give neighboring sections different compositions, and make repeated CTAs use consistent words. Avoid substituting a generic grid of feature cards for the product's story.

## Design the states with the content

| Condition               | Response                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Initial loading         | Render the frame immediately; Skeleton matches content shape                           |
| Refresh or submit       | Keep existing content; Spinner in the initiating control, prevent duplicate submission |
| First use               | Empty names what belongs here and provides a first action                              |
| No search results       | Empty includes the query or filter context and a reset action                          |
| Invalid field           | Field message associated with the control; invalid state follows the base's API        |
| Partial failure         | Alert in the failed region with Retry; retain successful regions and input             |
| No access               | Explain the restriction and route to access when available                             |
| Destructive action      | AlertDialog names the object and consequence                                           |
| Reversible action       | Visible result with Undo where supported                                               |
| Long or missing content | Truncate names with a way to read them; preserve numbers/statuses and stable layout    |

## Create or improve a project's DESIGN.md

When asked for a design guide, write a product-specific document. Inspect existing screens, theme CSS, typography, installed components and brand references first. Preserve an existing guide's useful decisions and change only the requested scope. A new screen alone does not require creating a guide.

Use the following as an outline, keeping only sections the product needs:

1. **Product and tasks:** audience, recurring jobs, what the interface should make easiest. Name actual screens and objects.
2. **Direction:** describe the look in observable terms, the existing brand choices and why they suit the work.
3. **Foundations:** theme/token source paths, type roles, surface ladder, radius, regional density and motion. Reference implemented values; label proposed changes separately.
4. **Frame and hierarchy:** navigation, content widths, scroll ownership, action placement, panels and small-screen transformations.
5. **Screen patterns:** map the product's real routes to regions, Fabricator components and variants. Include one representative screen with its job, component map and states.
6. **Icons:** configured package, recurring action-to-icon mapping, brand/file handling, icon-only labeling and animation policy.
7. **States and content:** loading, empty, errors, permissions, destructive actions, long values and terminology using the product's own examples.
8. **Verification:** observable light/dark, responsive, keyboard, focus, contrast and reduced-motion checks.

A useful guide settles choices. Replace vague phrases such as “modern dashboard” with decisions such as “a compact queue table with a persistent details panel; on phones a row opens a detail view.” Separate facts verified in the code from proposals and open questions. Link component APIs instead of copying a catalogue of props or freezing a second set of theme values.

## Review the rendered screen

- Can the target user identify the task and primary action immediately?
- Do the title, controls and content align, with clear grouping and appropriate density?
- Does the composition fit the content rather than wrapping everything in cards?
- Do both themes retain readable hierarchy and meaningful status colours?
- Can keyboard users reach every action, see focus, operate overlays and return to the trigger?
- Do phone and desktop layouts work with long labels, empty data and errors?
- Do icon-only controls have accessible names and tooltips, and do touch targets fit the platform?
- Do reduced motion and automated accessibility checks pass where supported?

Report visual checks separately from static checks. If the app cannot run, state what prevented inspection.
