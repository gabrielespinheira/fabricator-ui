# Icon pack expansion: candidate list

Status: decided 2026-11-04 (section 5). 112 Custom icons are drawn in `sources/outline/`: 24 `ui-*`, 15 AI and agents, and the accounts, deploys, data grid, commerce, and desktop and mobile groups. The rest of this list is proposed. It extends `docs/plans/icon-pack.md`.

## Summary

- The set was Lucide 1.66.0 with no icons of its own. It now has a **Custom** category with 112 icons.
- This list has **277 more Custom icons to draw**: 127 state variants of existing icons and 150 new glyphs. None of them exists in Lucide. 9 more Lucide icons arrive free with a sync, and about 90 brand marks are listed separately.
- State variants are the safest start. They reuse Lucide's geometry, so they sit well beside their relatives. New glyphs need more design work: the proof sheets show which ones failed first time.

## 1. Where the pack stands

| Set      | Today                          | Source                                |
| -------- | ------------------------------ | ------------------------------------- |
| Outline  | 2,015 Lucide icons, 112 Custom | `sources/lucide/`, `sources/outline/` |
| Brands   | 143 ship, 11 held              | `sources/brands/allowlist.json`       |
| Animated | 447 of lucide-animated's 468   | `sources/animated/`                   |
| Duotone  | Pipeline only, 0 icons         | `sources/duotone/` does not exist     |

Lucide's main branch has 22 names we don't. 13 are renames from `-alert` or `-warning` to `-exclamation-point` that keep the old name as an alias, and 9 are new (3.1).

## 2. How new icons stay consistent

The spec stays as it is: Lucide's specification plus the five rules in `icon-pack.md` §5. What the plan doesn't record is the geometry new icons should reuse, so this section adds it, measured from the 2,015 vendored icons.

### Modifier slots

Variants don't invent a modifier. They take one of these parts and cut the base to clear it, which is what Lucide does.

| Slot              | Plus                  | Check            | X                         | Seen on                         |
| ----------------- | --------------------- | ---------------- | ------------------------- | ------------------------------- |
| Bottom right (BR) | `M19 16v6` `M16 19h6` | `m16 19 2 2 4-4` | `m17 17 5 5` `m22 17-5 5` | `mail-*`, `database-plus`       |
| Top right (TR)    | `M18 5v6` `M15 8h6`   | `m15 6 2 2 4-4`  | `m16 3 5 5` `m21 3-5 5`   | `bell-plus`, `globe-check`      |
| Right middle (RM) | `M19 10v6` `M16 13h6` | `m16 13 2 2 4-4` | not seen                  | `tag-plus`, `server-plus`       |
| Centre (C)        | `M12 9v6` `M9 12h6`   | `m9 12 2 2 4-4`  | `m15 9-6 6` `m9 9 6 6`    | `shield-plus`, `calendar-check` |

Other parts:

- **Off:** `m2 2 20 20`, with the base cut around it. 87 of 91 `-off` icons use this diagonal.
- **Clock:** `circle 16,16 r6` and `M16 14v2.2l1.6 1`.
- **Search:** `circle 17,17 r3` and `m21 21-1.9-1.9`.
- **Lock:** `rect 13,16 8×5` with its shackle `M19 16v-2a2 2 0 0 0-4 0v2`.
- **Sparkle:** Lucide's `sparkle` scaled to 0.45, in a 9 × 9 slot. At 0.35 the centre fills in and it reads as `-plus` at 14px. Lucide's 4 × 4 cross `M20 2v4` `M22 4h-4` has the same problem beside a plus.
- **Bot:** with a badge in the corner, the head moves up and left and keeps both eyes: `M10 6V2H6`, `M21 8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6`, `M7 10v2`, `M11 10v2`. A badge fits in x 14 to 22, y 11 to 22. `bot-user`, `bot-shield` and `bot-wrench` use it.
- **Person badge:** `circle 10,7 r4` and `M10.3 15H7a4 4 0 0 0-4 4v2`, from Lucide's `user-search`, leave x 13 to 22, y 13 to 22 free.
- **Table:** drop the second row and second column, or a corner badge makes it clot at 14px: `M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7`, `M3 9h18`, `M9 3v18`.
- **Hand:** Lucide's `pointer` at 0.9, anchored bottom right, leaves x 14 to 22, y 2 to 6 for a gesture arrow.

Lucide isn't fully uniform here: plus appears in several positions, so copy the slot of the nearest relative, and use the table when there is no relative. The top-right X and the right-middle check are mine, derived from the other parts in their slot and tested on the proof sheet below. The rest appear in Lucide.

### Budgets

| Measure                             | p5    | Median | p95   |
| ----------------------------------- | ----- | ------ | ----- |
| Ink coverage, 96px render, stroke 2 | 13.9% | 27%    | 36.1% |

Elements per icon: median 4, p90 7. `circle` is 21.7% and `square` 23.8%, the references the spec names.

Target: ink between 14% and 36%, and no more than 7 elements. These bands are my proposal from those percentiles, and Lucide itself has icons outside them.

### Proof

I drew 9 icons with these recipes in a temp folder and ran them through the real `validateOutlineSvg` in strict mode. All 9 pass. Then I rendered them beside their relatives at 14, 16, 18 and 24px, stroke 1.5 and 2, light and dark: `docs/plans/icon-pack-expansion-proof.png`.

| Icon          | Ink   | Result                                                                 |
| ------------- | ----- | ---------------------------------------------------------------------- |
| `users-plus`  | 23.0% | Good. Reads with `user-plus`.                                          |
| `bell-x`      | 22.3% | Good. Reads with `bell-plus`.                                          |
| `tag-check`   | 20.7% | Good. Reads with `tag-plus`.                                           |
| `key-check`   | 23.7% | Good. Needs no cut to the base.                                        |
| `inbox-x`     | 29.3% | Good.                                                                  |
| `inbox-check` | 27.4% | Acceptable. Crowded at 14px, stroke 2.                                 |
| `chart-donut` | 33.2% | Weak. Clots at 14px, stroke 2. Needs one spoke fewer or a larger hole. |
| `ease-in-out` | 9.2%  | Fails the floor. A lone curve looks thinner than its neighbours.       |
| `radius-pill` | 17.8% | Fails review. Hard to tell from `rectangle-horizontal` at 14px.        |

So variants are low risk, and new bases need real design work. This was judged by eye on one sheet, with no one else reviewing it.

The 24 `ui-*` icons went through the same loop: `docs/plans/icon-pack-custom-ui.png` is the final sheet. Six needed a redraw after the first sheet. `ui-slider` first read as the text "-0.", then as a sun, and now sits at 11.3% ink, under the 14% floor: I kept it because it reads correctly as a track and knob. The other 23 are between 14% and 36%.

### What `icons:check` doesn't catch

It enforces root attributes, allowed elements, 3 decimals, the 1 to 23 safe zone, name collisions and brand stopwords. All three weak icons above passed it. Worth adding:

- An ink band warning (14% to 36%).
- A warning when two shapes sit closer than the 2px gap.
- Automatic relatives in `icons:sheet`: it adds only `circle` and `square` today, while spec rule 1 asks for the nearest relatives.

## 3. The list

Checked by script against Lucide 1.66.0's names and aliases, Lucide's main branch, its open pull requests and the brand stopwords. "Upstream PR" marks a related name someone has proposed to Lucide. Check it again before drawing that family.

### 3.1 Free: sync Lucide

`bun run icons:sync --ref <latest>` brings `circle-fading-check`, `diagram-flow-horizontal`, `diagram-flow-vertical`, `globe-ban`, `globe-plus`, `mango`, `opacity`, `package-pen`, `package-question-mark`, plus the 13 renames above. No drawing.

### 3.2 Priority 1: state variants for product UI

Each name is `<base>-<variant>`. `inbox` is the third most used icon in the registry source, at 55 uses, and has no variants at all.

| Base            | Variants                                 | Slot | For                                                                  |
| --------------- | ---------------------------------------- | ---- | -------------------------------------------------------------------- |
| `inbox`         | check, x, plus, dot, arrow-down          | BR   | Inbox zero, unread, triage                                           |
| `users`         | plus, minus, check, x, cog, search       | BR   | Team and member management. `users-round-plus` is an upstream PR     |
| `user`          | off, clock                               | RM   | Suspended and pending accounts. `user-round-clock` is an upstream PR |
| `key`           | plus, check, x, off, clock               | BR   | API keys: create, verify, revoke, expire                             |
| `lock`          | check, x, clock, plus                    | BR   | Access rules                                                         |
| `bell`          | x, clock, cog                            | TR   | Dismiss, snooze, notification settings                               |
| `send`          | check, x, clock                          | BR   | Sent, failed, scheduled                                              |
| `mail`          | off, star, lock                          | BR   | Fills the gaps in a 12-icon family                                   |
| `link`          | plus, check, x                           | BR   | Add and verify links                                                 |
| `tag`           | check, minus, off, search                | RM   | Labels. Upstream PR proposes tag variants                            |
| `funnel`        | check, off, minus                        | BR   | Applied and cleared filters                                          |
| `table`         | plus, minus, check, x, search, lock, off | BR   | Data views                                                           |
| `layers`        | check, x, off                            | BR   | Layer and environment state                                          |
| `credit-card`   | off, clock, lock, pen, sync              | BR   | Expired, secure, edit, subscription                                  |
| `wallet`        | plus, check, x, clock                    | BR   | Top-ups and balances                                                 |
| `receipt`       | check, x, clock, plus, percent           | C    | Paid, void, due, tax                                                 |
| `shopping-cart` | check, x                                 | TR   | Completes the plus and minus pair                                    |
| `shopping-bag`  | plus, minus, check, x                    | BR   | No variants today                                                    |
| `store`         | plus, check, x, off                      | BR   | Multi-store admin                                                    |
| `truck`         | check, x, clock                          | BR   | Delivered, failed, delayed                                           |

### 3.3 Priority 2: state variants for developer tools and media

| Base       | Variants                      | Slot | For                                           |
| ---------- | ----------------------------- | ---- | --------------------------------------------- |
| `database` | lock, off, clock              | BR   | Access, offline, backups                      |
| `server`   | check, x, minus, lock         | RM   | Health and removal                            |
| `cloud`    | plus, x, lock, search         | BR   | Remote resources                              |
| `globe`    | minus                         | TR   | Pairs with `globe-plus`                       |
| `webhook`  | check, x, plus                | BR   | Delivery state                                |
| `terminal` | check, x                      | BR   | Command results                               |
| `workflow` | check, x, plus                | BR   | Run state                                     |
| `bot`      | plus, check, x, cog, clock    | BR   | Agent management                              |
| `clock`    | x, off                        | BR   | Overdue and disabled schedules                |
| `folder`   | off, star, share              | C    | Fills family gaps                             |
| `file`     | off, star, share, dollar-sign | C    | Fills family gaps. The last one is an invoice |
| `calendar` | star, user, pen               | C    | Fills family gaps                             |
| `shield`   | star                          | C    | Three of the four sibling libraries have it   |
| `video`    | plus, x                       | BR   | Calls and uploads                             |
| `camera`   | plus, x                       | BR   | Calls and uploads                             |
| `image`    | check, x                      | BR   | Upload results                                |
| `phone`    | plus, x, clock                | BR   | Call state                                    |
| `monitor`  | plus, minus                   | BR   | Completes the family                          |

### 3.4 Priority 2: new glyphs

**AI actions.** Lucide marks only cleaning tools, `wand`, `square` and `pencil` with sparkles. Hugeicons has a whole `ai-*` set, so demand exists. The Sparkle part isn't proven on a sheet yet, so draw two and check them first.

`image-sparkles`, `video-sparkles`, `mic-sparkles`, `message-circle-sparkles`, `message-square-sparkles`, `search-sparkles`, `code-sparkles`, `folder-sparkles`, `file-sparkles`, `text-sparkles`, `table-sparkles`, `calendar-sparkles`, `mail-sparkles`, `refresh-cw-sparkles`, `brain-sparkles`, `bot-sparkles`

**Charts.** Lucide has `chart-radar`, `chart-pie`, `chart-scatter`, `chart-gantt` and `chart-candlestick`, and these are missing. `chart-sankey` is an upstream PR.

`chart-donut`, `chart-treemap`, `chart-heatmap`, `chart-histogram`, `chart-funnel`, `chart-waterfall`, `chart-bubble`, `chart-box-plot`, `chart-sunburst`

**Sign-in and admin.** Each is named for what it depicts, with the use in its tags.

| Icon               | Depicts           | Tag it with        |
| ------------------ | ----------------- | ------------------ |
| `key-user`         | Key and person    | passkey            |
| `smartphone-lock`  | Phone and lock    | 2FA, authenticator |
| `smartphone-check` | Phone and check   | device verified    |
| `mail-key`         | Envelope and key  | magic link         |
| `id-card-check`    | ID card and check | identity verified  |
| `flag-toggle`      | Flag and switch   | feature flag       |
| `cash-register`    | Till              | point of sale      |

**Tables.** `table-row-plus`, `table-column-plus`. Upstream PRs propose the matching `-delete` pair, so follow their naming.

**Design tools.** For style panels.

`border-all`, `border-none`, `border-top`, `border-right`, `border-bottom`, `border-left`, `border-inner`, `border-horizontal`, `border-vertical`, `shadow`, `blur`, `blur-off`, `gradient-linear`, `gradient-radial`

### 3.5 Priority 2: more new glyphs

**AI and agents: drawn.** All 15 are in `sources/outline/`; the review sheet is `docs/plans/icon-pack-custom-ai.png`. `bot-user`, `bot-shield` and `bot-wrench` were redrawn on 2026-11-05 with a larger badge.

| Icon                    | Depicts                     | For                     | Review                                                 |
| ----------------------- | --------------------------- | ----------------------- | ------------------------------------------------------ |
| `bot-network`           | Bot joined to two nodes     | Multi-agent runs        | Good                                                   |
| `bot-shield`            | Bot and shield              | Guardrails              | Good                                                   |
| `bot-user`              | Bot beside a person         | Human in the loop       | Good, after two redraws                                |
| `bot-wrench`            | Bot and wrench              | Agent tools             | Good at 16px and up, tight at 14px                     |
| `bot-sync`              | Eyes inside circular arrows | Agent loop              | Reads a little like a smiley; an antenna made it worse |
| `message-square-stop`   | Bubble and stop square      | Stop generating         | Good                                                   |
| `message-square-wrench` | Bubble and wrench           | Tool call               | Good                                                   |
| `message-square-stream` | Bubble, lines and caret     | Streaming reply         | Good                                                   |
| `quote-link`            | Quote marks over a link     | Citation                | The weakest: thinner than Lucide's `quote`             |
| `braces-sparkles`       | Braces around a sparkle     | Prompt template         | Good                                                   |
| `box-sparkles`          | Cut box and sparkle         | Model                   | Good                                                   |
| `database-sparkles`     | Database and sparkle        | Dataset, knowledge base | Good, dense (34.9% ink)                                |
| `token-stack`           | Three stacked discs         | Tokens, usage           | Close to `database`, which has sides                   |
| `vector-nodes`          | Triangle of nodes and a dot | Embeddings              | Good, distinct from `share-2`                          |
| `context-gauge`         | Partial ring around lines   | Context window          | Good                                                   |

**Accounts and security: drawn.** `fingerprint-check`, `scan-face-check`, `shield-key`, `badge-key`, `key-rotate`, `monitor-key`, `monitor-lock`, `user-crown`, `user-eye`, `user-wrench`, `users-crown`, `building-user`, `building-lock`

**Deploys and infrastructure: drawn.** `rocket-undo`, `rocket-check`, `rocket-x`, `rocket-clock`, `container-check`, `container-x`, `globe-shield`, `globe-arrow-up-right`, `clock-sync`, `git-branch-eye`, `git-branch-lock`, `git-pull-request-check`, `git-commit-check`, `git-commit-x`, `trace-waterfall`, `flame-graph`, `logs-play`

**Data grids: drawn.** `column-pin`, `row-pin`, `columns-3-off`, `table-row-check`, `table-cell-pen`, `table-sum`, `table-arrow-down`, `table-arrow-up`, `table-bookmark`, `table-pivot`, `funnel-cog`, `database-code`, `table-relation`, `key-arrow-right`

**Commerce: drawn.** `receipt-undo`, `hand-banknote`, `ticket-dashed`, `package-clock`, `store-user`, `tag-percent`, `shopping-cart-clock`, `qr-code-dollar`

The review sheet for these groups and the desktop and mobile group is `docs/plans/icon-pack-custom-groups.png`.

Changed from the first list:

- `git-pull-request-x` is out: Lucide's `git-pull-request-closed` already draws it.
- `building-users` is `building-user`, because one person fits. `globe-arrows` is `globe-arrow-up-right`. `tree-schema` is `table-relation` and `key-foreign` is `key-arrow-right`, named for what they depict with the use in their tags.
- `ticket-scissors` is `ticket-dashed`: scissors don't fit beside a ticket at this size, and Lucide has `scissors-line-dashed`.

**Collaboration**

`message-square-user`, `message-square-clock`, `message-square-pin`, `message-square-branch`, `at-sign-bell`, `user-dot`, `users-dot`, `video-user`, `monitor-user`, `calendar-video`, `calendar-users`, `list-user`, `map-flag`, `scroll-plus`

- `at-sign-bell` is a mention, `user-dot` presence, `message-square-branch` a thread, `map-flag` a roadmap, `scroll-plus` a changelog.

**Desktop and mobile: drawn.** `window-snap-left`, `window-snap-right`, `window-tile`, `window-float`, `tray-bar`, `dock-bar`, `safe-area`, `status-bar`, `gesture-tap`, `gesture-long-press`, `gesture-pinch`, `gesture-swipe-left`, `gesture-swipe-right`, `gesture-swipe-up`, `gesture-swipe-down`, `gesture-haptic`, `browser-tab`, `browser-tab-plus`, `browser-tab-x`, `browser-tab-pin`, `kbd-shortcut`

`haptic-wave` became `gesture-haptic`, because Lucide's `vibrate` and `radio` already draw the wave.

**Accessibility and design tokens**

`focus-ring`, `screen-reader`, `motion-reduce`, `contrast-check`, `surface-stack`, `elevation`, `baseline-grid`, `token-swatch`, `theme-split`

### 3.6 Priority 3: Fabricator's own glyphs

**Tokens and settings.** The settings menu uses `SquareIcon` and `CircleIcon` as stand-ins for radius (`components/fabricator/site-settings.tsx`).

`sidebar-toggle`, `density-compact`, `density-default`, `density-spacious`, `radius-rounded`, `radius-pill`, `motion-off`, `motion-smooth`, `motion-snappy`, `motion-instant`, `surface-tint`, `ease-in`, `ease-out`, `ease-in-out`, `ease-linear`, `ease-spring`

- `sidebar-toggle` already exists inline in `shared/lib/sidebar-model.ts`, but it can't move as is. Its frame has 5-decimal coordinates, a 1.5 stroke and a fill, and it morphs through the CSS `d` property. Publish a static outline version and keep the animated one in the component.
- The `ease-*` curves need an axis or end points to clear the ink floor, and `radius-pill` needs a redraw. Both failed the proof.

**Components, second batch.** The first 24 are drawn. These complete the component list in `lib/component-groups.ts`, on the same pattern: one frame with one highlighted part. Nothing shows them yet, so the docs sidebar or a builder should adopt them.

`ui-app-shell`, `ui-sidebar`, `ui-workspace-switcher`, `ui-user-menu`, `ui-search`, `ui-bubble`, `ui-attachment`, `ui-questionnaire`, `ui-data-table`, `ui-date-picker`, `ui-menubar`, `ui-navigation-menu`, `ui-hover-card`, `ui-alert-dialog`, `ui-collapsible`, `ui-radio-group`, `ui-toggle-group`, `ui-button-group`, `ui-input-group`, `ui-kbd`, `ui-avatar`, `ui-badge`, `ui-progress`, `ui-spinner`, `ui-separator`, `ui-carousel`, `ui-aspect-ratio`, `ui-field`, `ui-marker`, `ui-tab-strip`, `ui-button`, `ui-checkbox`, `ui-switch`, `ui-alert`, `ui-table`, `ui-calendar`

### 3.7 Priority 4: the long tail

At least two sibling libraries have them and Lucide doesn't. Low value for app UI.

`bread`, `taxi`, `car-police`, `crane`, `sphere`, `square-wave`, `sine-wave`, `triangle-wave`, `polygon`, `parallelogram`, `meteor`, `comet`, `tram`, `moped`, `submarine`, `zeppelin`, `garage`, `parachute`, `mushroom`, `passport`, `polaroid`, `treadmill`, `yoga`, `abacus`, `hoodie`, `remote-control`, `artboard`

### 3.8 Brand marks

All of these are in Simple Icons 16.36.0, with no redrawing. **I haven't read any of their terms**, and `CONTRIBUTING.md` requires that per mark, so expect some to end up held. `†` means Simple Icons records a separate licence, `‡` a guidelines link.

- **AI:** Google Gemini, Mistral AI, DeepSeek, Perplexity, Hugging Face‡, Ollama, LangChain, Replicate, GitHub Copilot†, Windsurf‡
- **Languages and frameworks:** Angular†‡, Nuxt‡, Remix, Rust†‡, Go‡, Swift‡, Kotlin‡, Flutter‡, Ruby†, Ruby on Rails‡, Django, Flask, FastAPI, Spring, .NET†‡, TanStack‡, tRPC, Redux
- **Infrastructure and data:** Redis‡, Kubernetes, NGINX‡, Neon‡, PlanetScale, Drizzle, Railway, Render, Fly.io‡, DigitalOcean‡, Hetzner, Upstash, Appwrite‡, PocketBase, Elasticsearch, Meilisearch, Algolia‡, Cloudinary, Grafana, Prometheus, Tailscale
- **Auth and SaaS:** Auth0, Clerk, Okta‡, Intercom‡, Zendesk‡, Jira‡, Confluence, Atlassian‡, ClickUp, Basecamp, PagerDuty‡, New Relic‡, Snyk, Plausible Analytics, Sanity†, Contentful, Strapi‡, Ghost‡
- **Payments:** Apple Pay, Google Pay, Visa, American Express, Klarna, Wise‡, Revolut, Paddle, Lemon Squeezy, Gumroad, RevenueCat. Mastercard isn't in Simple Icons, and a checkout row without it looks broken, so it needs an official kit or this group waits.
- **Developer tools:** Yarn†‡, Storybook†, Cypress, ESLint, Prettier, Webpack†‡, esbuild, Git†, GNU Bash†‡, Postman, Insomnia, Bruno, Swagger, OpenAPI Initiative‡, JetBrains‡, Zed Industries, Warp, iTerm2, Homebrew, Vim, Neovim†, Ubuntu‡, Debian†‡, Raycast‡, Obsidian‡, Arc, Brave‡, Opera‡

`components/icons.tsx` also draws Yarn inline, which a shipped mark could replace.

### 3.9 Duotone pilot

Plan Phase 5 pilots the 40 icons components use most. Many of those are bare lines (`x`, `arrow-right`, `check`, `plus`, the chevrons) with no closed shape to tint, so the pilot should skip them. From registry usage, the first 20 with a real shape:

`inbox`, `file-text`, `copy`, `credit-card`, `settings`, `info`, `circle-alert`, `bell`, `trash`, `folder`, `user`, `file`, `terminal`, `sparkles`, `calendar`, `house`, `badge-check`, `star`, `chart-pie`, `settings-2`

## 4. Don't draw these

- **Letters in a file frame:** `file-pdf`, `file-csv`, `file-doc`, `api`, `png`, `jpg`, `svg`, `hdr`, `vip`. Phosphor and Tabler have them, but three letters in 2px strokes won't hold at 14 to 18px. Use `file-text` or `file-spreadsheet` with a text `Badge`.
- **Same thing, other name:** the gap analysis flagged these, and Lucide already has them. `notification` is `bell`, `robot` is `bot`, `gps` is `locate`, `at` is `at-sign`, `lifebuoy` is `life-buoy`, `first-aid-kit` is `briefcase-medical`, `file-zip` is `file-archive`, `wheelchair` is `accessibility`, `bank` is `landmark`, `coupon` is `ticket-percent`, `browser` is `app-window`, `face-id` is `scan-face`.
- **Product concepts Lucide's metaphors cover:** `deploy` (`rocket`), `incident` (`siren`), `logs` (`logs`), `secret` (`vault`), `invoice` (`receipt-text`). A synonym list on top of `searchIcons` costs less than new art. `sources/lucide/` can't be edited, so it would live in the catalog build.
- **Brand words in the outline set:** rule 3.
- **A second `spacing` or `load-balancer`:** Lucide's `gap-horizontal`, `margin` and `graph-hub` already carry those tags.

## 5. Decisions

Decided 2026-11-04:

1. **Custom replaces "Lucide first".** Fabricator's own icons ship in a new Custom category. Collisions stay handled by I2: if Lucide later ships a name we use, `icons:check` fails, and ours becomes its alias or takes a new name. A Custom icon that becomes an alias changes to Lucide's drawing, so that sync needs a changelog note.
2. **No Lucide Lab.** Lab is Lucide's side collection of extra icons. Every icon here is drawn by us.
3. **The `ui-*` glyphs are drawn now.** The first 24 are in `sources/outline/`, and the docs sidebar doesn't use them yet.

## 6. Suggested order

1. Sync Lucide. `lucide-parity.test.ts` pins the tag, so bump the parity dev dependencies with it.
2. Add the check additions from section 2.
3. Draw the 3.2 families in batches of 10 to 15, one sheet per PR. Start with `inbox`, `users`, `key`, `bell`.
4. Then 3.3 and 3.4, then the AI, accounts and deploy groups in 3.5.
5. Draw the rest on request.
6. Run the duotone pilot and the brand marks on their own tracks.

Every batch: `bun run icons:check`, `bun run icons:sheet <names> <relatives>`, a changeset, and a changelog entry.

## How this was measured

- **Gaps:** names in `@tabler/icons`, `@phosphor-icons/react`, `@remixicon/react` and `@hugeicons/core-free-icons` from `node_modules`, normalised and compared with Lucide's names and aliases. 16 concepts appear in all four and not in Lucide, 91 in three and 637 in two. Most of those turn out to be Lucide icons under another name or tag, or brands, so the list above is hand-picked from them and I don't rank by that count alone.
- **Holes:** every `<base>-<modifier>` pair in Lucide, for plus, minus, x, check and off.
- **Upstream:** Lucide's `main` tree and open pull request titles through `gh`, on 2026-11-04. PR titles only: I didn't read closed or declined PRs, so I can't say which of these Lucide has already refused.
- **Priorities** are my judgement from registry usage and the kinds of apps the library targets, with no user research behind them.
