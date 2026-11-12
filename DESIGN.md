---
version: alpha
name: Fabricator UI
description: >-
  Calm, precise interfaces for apps, dashboards and websites: neutral surfaces
  lifted by shadow, colour kept for meaning, and size and motion set per region.
  This file is the design guide: the look, the behaviour and which component
  each part of a screen calls for. Values and code live in the component docs.
omitted:
  - section: colors
    reason: Colours come from the project's look and are documented on the Colors page.
  - section: typography
    reason: The type roles are described in prose; their values are on the Typography page.
  - section: rounded
    reason: Corners follow one radius the project sets.
  - section: spacing
    reason: Sizes follow the density of the region.
  - section: components
    reason: Each component's variants and props are in its own docs page.
---

# Fabricator UI

The design guide for products built with Fabricator UI: how they look, how they behave, and which component each part of a screen calls for. Read it before you design a screen, follow [Designing a screen](#designing-a-screen), and check the result against [the review checklist](#review-checklist).

This file is about design decisions. How to write them (props, classes, tokens) is in each component's docs page (`npx fabricator-ui@latest docs <name>`) and in the Foundations pages at [fabricator-ui.vercel.app/docs](https://fabricator-ui.vercel.app/docs). Read the docs of every component you use before writing with it.

**Using it in your project:** copy this file to the root of a project that uses Fabricator UI and point your agent instructions at it. Rewrite the first paragraph of the Overview for your product, and delete the patterns you will never build. Keep the rules.

## Overview

Fabricator interfaces are calm and exact. They feel like well-made tools: neutral surfaces, one clear action, quiet chrome and the content in front. Colour carries meaning (the main action, a selection, a status), so it stays rare and reads at once. Depth comes from surfaces lifted by shadow. Motion confirms what happened and gets out of the way. Every size follows the density of the region it sits in.

### The look

- **Neutral first.** A product starts black, white and grey. The main action is the darkest thing on the screen, and the only hues are the statuses, until the brand adds one of its own.
- **Lifted surfaces.** Cards, menus and dialogs sit above the page on a soft shadow with a hairline edge. That shadow is the edge, so surfaces carry no border.
- **Small and precise.** Interface text is 13px and controls are 36px tall, with air around compact parts. Nothing is oversized to look friendly.
- **Soft geometry.** Controls have 8px corners and containers slightly rounder ones, so a row sits evenly inside its container.
- **Quiet chrome.** Navigation, labels and metadata rest in grey and come forward only when pointed at or selected.
- **Alive under the hand.** One highlight glides to whatever the pointer is nearest, a selection slides to its new place, a button gives a little when pressed, a menu grows from the button that opened it. Each lasts a fraction of a second.
- **One system at every size.** A dense dashboard, a roomy website and a phone use the same components, set to a different density and speed.

### Product modes

Pick the mode for the product, then for each region that differs (a marketing page inside an app, a dense table inside a spacious page).

| Mode    | For                                      | Density  | Motion            | Frame                                      |
| ------- | ---------------------------------------- | -------- | ----------------- | ------------------------------------------ |
| App     | Product UI, docs and component explorers | Default  | Default or snappy | The App Shell                              |
| Tool    | Dashboards, admin, editors, dense data   | Compact  | Snappy or instant | The App Shell, compact toolbars and tables |
| Website | Marketing, landing pages, pricing        | Spacious | Smooth            | A site header and centred content          |

### Principles

1. **Compose, then configure.** Reach for the component, then its variant and size. The component owns its colour, type, corners, spacing and states; you decide where it goes.
2. **One primary action per region.** The filled button marks what the region is for. Everything else is quieter.
3. **Hierarchy from surface, weight and grey.** Height separates layers, grey steps content back, size and weight make titles. Colour and lines come last.
4. **The region decides the size.** Density is set on a region and everything inside follows it. A component picks its own size only when it must differ from its neighbours.
5. **Every view has all its states.** Loading, empty, error, partial and disabled are designed with the happy path, each with its own component.
6. **The keyboard is a first-class pointer.** Every action is reachable from it, focus is always visible, and frequent actions have shortcuts that the interface shows.
7. **Motion has a job.** It shows where something came from or confirms what just happened. Nothing moves for decoration.

### Designing a screen

Work through these in order. Each step is done when its last sentence is true.

1. **Name the job.** Write one sentence: who is on this screen and what they came to do ("A support lead scans the open tickets and opens the most urgent one"). Done when that sentence names one person and one task; a screen with two jobs is two screens, or a screen and a panel.
2. **Know the project.** Its mode, its look (brand hue, shape, density), whether it is web or React Native, and which components are already installed. Done when you know all four.
3. **Pick the pattern.** The closest [pattern](#patterns) sets the regions. Start from a block when one fits, then delete what the product doesn't need. Done when every region of the screen has a name from the pattern (header, toolbar, body, panel).
4. **Rank the content.** Mark what the job needs first, what supports it, and what is there for the rare case. The first gets the top of the main column and the primary action; the rare case goes into a "More" menu, a panel or its own page. Done when the screen has [one focal point](#hierarchy) and nothing competes with it.
5. **Lay out the regions** with space and alignment before any line or card. Done when the screen reads correctly as plain blocks of text and gaps.
6. **Choose the components** from [Choosing a component](#choosing-a-component), and read each one's docs. Done when no part of the screen is hand-built that a component covers.
7. **Design every state** in the same pass: loading, empty, error, partial, disabled, and long or missing values (see [States](#states)). Done when each region has an answer for each.
8. **Write the words** (see [Content](#content)). Done when every button is a verb, every empty state says how to start and every error says how to fix it.
9. **Review** the running screen against [the checklist](#review-checklist): light and dark, phone and wide desktop, keyboard only.

### Hierarchy

A screen has a budget of emphasis, and the calm look comes from spending little of it.

- **One focal point per screen:** the page title with its primary action, or the one number or document the person came for. Squint at it: the focal point and the primary action are the two things still visible.
- **Spend emphasis in this order,** and stop at the first that works: position and space, size, weight, dark text against grey text, a raised surface, colour.
- **One step at a time.** A title is larger or heavier than its neighbours, never larger, heavier and coloured at once.
- **Most of a screen is quiet.** Labels, metadata, resting navigation and secondary actions are grey or unfilled, so the few dark elements stand out without help.
- **Per region:** one filled button, one title, and at most one tinted alert.
- **Equal things look equal.** Rows of a list, cards of a grid and fields of a form share one size, one alignment and one set of parts. A difference in look means a difference in meaning.

## Colors

### Neutral by default

The page, the surfaces and the text are neutral, and so is the main action: until a project picks a brand hue, the primary colour is the text colour itself, near black in light mode and near white in dark. A default Fabricator product is black and white with colour only where a status needs it.

- **Text has two steps.** The foreground is for headings, values and the labels people act on. The muted grey is for descriptions, captions, metadata, placeholders, resting navigation and the icon beside a label. A third level comes from size or weight, never from a third grey.
- **Lines are faint.** Separators and table rules are a soft hairline. They divide content inside a surface; they never frame one.
- **Hover and selection are washes.** Pointing at a row lays a faint translucent wash over it; pressing or selecting it lays a slightly stronger one. Because they are translucent, they look right on every surface. Selection is that wash, with no coloured edge or coloured text.
- **Focus is one blue ring,** the same blue in both themes and in every palette, so the keyboard's position never depends on the brand.

### Colour roles

Six roles carry all the colour. Each one means one thing everywhere.

| Role        | Means                                   | Shows in                                                                                           |
| ----------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Primary     | The main action, and "on" or "selected" | The filled button, links, checked boxes and radios, a switch that is on, progress, a selected date |
| Secondary   | A soft second action                    | The secondary button, a translucent tint                                                           |
| Info        | Neutral information, work under way     | Alerts, badges, toasts                                                                             |
| Success     | Done, healthy, a positive change        | Alerts, badges, toasts                                                                             |
| Warning     | Late, or needs attention soon           | Alerts, badges, toasts                                                                             |
| Destructive | Error, invalid, irreversible            | The destructive button and menu items, invalid fields and their messages, error alerts and toasts  |

- **Status comes from components first:** a status `Badge`, a status `Alert`, a toast of that type. They already pair the right tint, text and icon.
- **A status colour always means its status.** Green is never decoration and red is never emphasis. Brand accents use primary.
- **Colour never carries meaning alone.** A trend pairs its green with an arrow; an invalid field pairs its red ring with a message.
- **Status hues stay in their family:** info is blue, success green, warning orange to yellow, destructive red. A project can shift each within its family, never out of it.
- **Destructive is soft.** The destructive button is a red tint with red text, so even a dangerous action doesn't shout before it is confirmed.

### Brand colour

A brand enters through the project's look, chosen on the [Get started page](https://fabricator-ui.vercel.app/create) or the [Colors page](https://fabricator-ui.vercel.app/docs/foundations/colors): a hue and a strength for each role, and an optional tint for the neutral surfaces. Every fill, text colour, tint and state is worked out from those and tested for contrast in both themes.

- **One brand hue is enough.** Give it to primary. Leave secondary neutral unless the brand has a real second colour.
- **Keep the surface tint low,** so the page stays quiet and the statuses stay readable.
- **Colour stays with the action.** The brand hue shows in the main button, links and selected controls. Backgrounds, headings and icons stay neutral.

### Dark mode

Both themes are designed, and one design covers both: a screen built from the components and the roles needs no second pass. In light mode raised surfaces are white and the shadow shows their height; in dark mode each level is a step lighter than the one below. Check every screen in both.

### Charts

There is no Chart component for now. Show numbers with stat cards, tables, `Progress` and status-coloured text.

## Typography

Inter throughout, with a monospace face for code, keys and IDs. The interface is set small: 13px for controls and body text, and titles that are only a little larger. Medium and semibold are drawn slightly lighter than usual, because Inter reads heavy at interface sizes.

| Role       | Size                  | Weight          | Use                                                                                        |
| ---------- | --------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Hero       | 48px, 60px on desktop | Medium, tight   | The one headline of a website page                                                         |
| Display    | 28px                  | Semibold, tight | Page titles outside the App Shell; on websites, section headings, prices and proof numbers |
| Page title | 24px                  | Semibold, tight | The title of an app page                                                                   |
| Title      | 16px                  | Bold            | Dialog titles, section headings inside an app page                                         |
| Subtitle   | 14px                  | Medium          | Card titles, group headings, feature titles                                                |
| Lead       | 15px                  | Regular, muted  | The sentence under a hero or a page title                                                  |
| Body       | 13px                  | Regular         | Controls, menus, body text                                                                 |
| Caption    | 12px                  | Regular, muted  | Descriptions, group labels, errors, metadata                                               |

Components set their own type. The table is for the headings and copy you write around them. Body, caption, subtitle and title follow the density: body text is 12px in compact regions and 15px in spacious ones.

- **Two weights per view** is the norm: regular for text, medium or semibold for titles and values. Bold is for dialog titles.
- **Weight is state.** Hovering changes colour, from grey to the foreground, and thickens the icon's stroke. Weight changes only for state that lasts: checked, selected, an open section. Tabs keep their weight; the active tab is its colour and its pill.
- **Sentence case everywhere.** No all-caps labels and no wide letter-spacing; a group label is small, grey and written like a sentence.
- **Numbers line up.** Figures that update or sit in a column (tables, counters, prices, timers) use tabular figures and align to the end.
- **Long text** is capped at a comfortable reading width, about 65 characters, with balanced headings.
- **Documents are their own role.** Notes, articles, comments and an assistant's replies are set through `Markdown` or `Editor`: 14px for comments, chat and panels, 16px by default, 18px for long reading, on a generous line height. This text does not follow the density, so a compact dashboard never shrinks what people read.

## Layout

### Density

Density sizes every component at once: controls, rows, text, icons, padding and gaps. It is the main way a Fabricator product changes character.

|                                  | Compact                      | Default | Spacious                      |
| -------------------------------- | ---------------------------- | ------- | ----------------------------- |
| For                              | Dashboards, toolbars, tables | Apps    | Websites, touch-first screens |
| Controls, menu rows, table heads | 28px                         | 36px    | 44px                          |
| Body text                        | 12px                         | 13px    | 15px                          |
| Icons                            | 14px                         | 16px    | 18px                          |

- **Set it on the widest region it is true for:** the whole product, then a region that differs (a compact toolbar in a default app, a spacious marketing section in an app). Popups follow the region they open from.
- **A single control changes size only to differ from its neighbours.** The small and large sizes of a button, a toggle or a search field are the compact and spacious sizes of that one control.
- **Never shrink a component by hand.** If a region feels too big, it is in the wrong density.

### Spacing

Components space their own insides. Between components, space follows a 4px grid, one step per relationship:

| Relationship                                   | App                   | Website                         |
| ---------------------------------------------- | --------------------- | ------------------------------- |
| A heading and its lead                         | 4px                   | 12px                            |
| Controls in one row (a toolbar, a button pair) | 8px                   | 12px                            |
| Cards in a grid, blocks inside a section       | 16px                  | 24px; rows of features 40px     |
| A heading and the content it introduces        | 16px                  | 40px                            |
| Text beside media                              | 24px                  | 48 to 64px                      |
| Sections of a page                             | 32 to 40px            | 64 to 96px above and below each |
| Page padding                                   | 16px, 24px on desktop | 24px, content up to 1152px wide |

Tighter space binds and more space separates: a label sits closer to its control than to the next field. Space does the grouping before a line or a card does.

### Widths

| Content                                   | Width                                        |
| ----------------------------------------- | -------------------------------------------- |
| Sign in, sign up, one-task cards          | About 384px                                  |
| Forms, settings, single-column flows      | About 672px                                  |
| Reading text                              | About 65 characters                          |
| Most app pages                            | About 896px                                  |
| Dense pages and dashboards                | About 1152px                                 |
| Tables, boards, editors, chat transcripts | The full width of the main column            |
| A website hero headline and its lead      | About 16 characters and 540px, both balanced |

The App Shell's content area offers the 672, 896 and 1152px columns as its small, medium and large sizes, centred with the page's padding. Use those in place of a width of your own.

### The app frame

Apps live in the `AppShell`. It replaces the hand-built sidebar, header and panel layout, and it handles what those usually get wrong: phones, focus, remembering the layout, and desktop windows.

| Region      | Holds                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| Sidebar     | The `WorkspaceSwitcher` at the top, the `AppNav` in the middle, the `UserMenu` at the bottom                    |
| Tab row     | Optional: a `TabStrip` of open documents                                                                        |
| Header      | The breadcrumb, the page's actions with one primary action, and the trigger for a side panel                    |
| Content     | The page, under its page title. It is the one thing that scrolls                                                |
| Side panels | Details, activity, an inspector: content about the page, which the person can open, resize and close            |
| Status bar  | Optional: a thin row under everything for what is true of the whole workspace (a branch, a sync state, a count) |
| Bottom nav  | On phones, the few main destinations                                                                            |

- **The frame is a step darker than the page.** The sidebar sits on the frame, and the main column and the side panels are cards on it, so the content reads as the thing in front.
- **The page title hands over to the header.** It sits at the top of the content; once it scrolls away, the header shows it in the breadcrumb's place.
- **Panels make room.** A panel docks beside the main column while there is space, floats over it when there isn't, and becomes a bottom drawer on a phone, or takes the whole screen in a list and detail layout. It remembers its width and whether it was open.
- **Shortcuts are part of the frame.** The app registers its shortcuts with the shell, which shows them in tooltips and menus and keeps them out of the way while someone types. One key moves focus between the sidebar, the tabs, the content and the panels.
- **Desktop apps** get a window-aware frame: the top rows clear the window's controls and drag the window, and the frame can show the window's translucent material.

Use a plain `Sidebar` layout only for a screen that needs none of this.

### Page anatomy

An app page reads top to bottom in four bands at most, each with one job:

| Band    | Answers                                           | Holds                                                              |
| ------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Header  | Where am I, and what can I do to this page        | The breadcrumb, the page's actions, the panel trigger              |
| Title   | What is this                                      | The page title, with one muted sentence when the name isn't enough |
| Toolbar | What am I looking at: search, filters, sort, view | One row of compact controls, directly above the body it controls   |
| Body    | The content                                       | One list, table, form or document, or one grid of cards            |

- **Page actions live in the header,** with the one primary action. Actions on one item live in that item's row or card. Actions on a selection replace the toolbar while the selection lasts.
- **One scroller.** The content scrolls and the header stays. A second scroller is for a pane with content of its own: a panel, a transcript, a long code block.
- **One start edge.** The title, the toolbar and the body begin on the same line, a table's text included. Text and labels align to the start and numbers to the end. Centring is for what stands alone on a screen: an empty state, a sign-in card, a hero.
- **Toolbar order:** search and filters at the start; what changes the view (sort, columns, a view switch) and the result count at the end.
- **Fill or cap.** A body of records (a table, a board, an editor, a transcript) takes the full column. A body people read or fill in (a form, settings, an article) is capped at one of the content widths.
- **Long values.** Names shorten with an ellipsis and show in full in a tooltip. Numbers, dates and statuses always show in full. Design each row for its longest value and its emptiest.
- **A page that needs a fifth band** (a second toolbar, tabs under tabs) is two pages, or a page and a panel.

### Responsive

- Design the phone layout first and widen it. Grids collapse to one column.
- The components adapt to the room they have: the App Shell rearranges itself by its own width, and form rows stack in a narrow column. Place them and let them respond.
- On phones the App Shell's sidebar sits behind the page, which moves aside to show it. The header keeps only the current page, its actions fold into one menu, and the primary action floats above the content.
- A focused task that is a `Dialog` on desktop is a `Drawer` from the bottom on a phone.
- Touch-first screens use the spacious density, whose controls are 44px, the size of a fingertip. Compact is for pointer-first tools.

## Elevation & Depth

Depth is a ladder of surfaces. Each level is a background and a shadow that starts with a hairline, so a surface needs no border. The higher the level, the deeper the shadow.

| Level    | Holds                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| Frame    | The App Shell's frame and its sidebar, a step darker than the page                     |
| 1        | The page; in an App Shell, the main column and the side panels                         |
| 2        | A sidebar on its own, inset regions, and the default `Card`, which lifts only a little |
| 3        | Raised cards, menus, selects, popovers, hover cards, sheets, drawers                   |
| 4        | The active tab; anything raised inside a level-3 surface                               |
| 5        | Dialogs, alert dialogs, toasts                                                         |
| Inverted | Tooltips: dark on a light page, light on a dark one                                    |

- **Height means layering.** Something sits higher because it is above something else right now: a menu over a page, a dialog over everything. Height is never used to make a thing look important.
- **A child sits above its parent.** A quiet area inside a raised surface (a code block in a dialog, a well in a card) is a faint wash, never a lower level.
- **No borders and no other shadows on surfaces.** The ladder is the only source of depth.
- **Status surfaces** are the same ladder tinted with the status colour.

### Cards

A `Card` holds one discrete thing: a plan, a metric, a project, a group of settings. The sections of one page are separated by headings and space, with a `Separator` where space alone is not enough.

- A card has a header (a title, a description, and room for one action), its content, and a footer.
- Lists inside a card are rows or a table, never more cards. Cards don't nest, and a whole page is never wrapped in one.
- Every card in a grid has the same parts in the same order.
- The default card lifts only slightly. A card that must stand off the page, such as a product picture on a website, goes up a level.

## Shapes

- **Two corner sizes.** Controls, rows, badges and tooltips have 8px corners. Containers (cards, menus, dialogs, tab tracks, alerts, the app's main column) are a little rounder, about 11px.
- **Corners are concentric.** A container holds its rows with a small inset, so the rounder container and the tighter row share a centre. Your own containers follow the same rule.
- **Full rounds** are for switches, avatars, status dots and slider thumbs.
- **The shape is a project setting.** The Pill look turns controls into full pills and rounds the containers with them. Design with "control corner" and "container corner" in mind and let the project decide their size.
- **Media takes the shape of its place:** the control corner inside a card, the container corner standing alone. Avatars stay round.

## Motion

Every animation has a role, and one speed setting retimes all of them together.

| What moves                                             | How                                                       |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Hover, colour, focus, an icon's stroke                 | A quick fade                                              |
| A button or toggle while held                          | It gives very slightly, and springs back                  |
| The hover highlight                                    | Glides from row to row                                    |
| Indicators, thumbs, a selection, a checkmark, progress | Slide to their new place                                  |
| Tooltips                                               | Fade in fast; instantly once one is already showing       |
| Menus, selects, popovers, hover cards                  | Grow from the trigger that opened them                    |
| Dialogs                                                | Grow slightly from the centre, over a scrim that fades in |
| Sheets and drawers                                     | Slide from their edge, the slowest motion in the system   |
| Accordions and collapsibles                            | Open by height                                            |
| Toasts                                                 | Slide in from the edge and stack                          |

- **Four speeds:** smooth for websites, default for most products, snappy for apps used all day, instant for dense dashboards, where surfaces only fade. A project, or a region, picks one.
- **Exits are quicker than entrances.** Something leaving should never keep a person waiting.
- **Things come from somewhere.** A popup grows from its trigger and a sheet from its edge, so the eye knows what opened it. Nothing appears from below the fold or zooms in from nothing.
- **App content appears in place.** Pages, lists and cards in an app render without entrance animations. Motion belongs to what the person just did.
- **A surface summoned from the keyboard to be used at once,** like a command palette, opens with no animation.
- **Reduced motion** keeps the fades and drops the slides, the zooms and the press. Your own animation does the same.
- **Custom motion uses the same roles and timings** as the components, so the product still moves as one thing when the speed changes.
- **Loading text shimmers** ("Thinking…"), and a scrolling region fades at the edge where more content waits.

### Fluid Hover

Lists of choices share one highlight. It fades in under the item nearest the pointer and glides to the next as the pointer moves, with no dead gaps between rows, and a separate selection background slides between selected items. Menus, selects, tabs, the tab strip, toggle groups, the sidebar, accordions, table rows and the file tree all have it built in.

- Give your own lists of alternatives the same highlight in place of a hover colour on each row.
- The highlight never crosses a separator: where items stop being alternatives, a new group starts.
- On touch screens a finger takes the pointer's place: a press lights the row, and dragging across a strip or a menu moves the highlight until the finger lifts.

### Sounds

Components can play short, synthesised sounds, a different one for each family: buttons, switches, rows, tabs, dialogs, toasts. They are optional and quiet.

- Sound suits apps and tools. Leave it out of websites unless asked.
- Give people a visible setting and remember their choice.
- Sound is never the only feedback: whatever it marks is also visible.

## Iconography

- **One icon library per product, one icon per meaning.** The default is Fabricator Icons, a line set drawn for these sizes.
- **Line icons at the text's weight.** Strokes are thin at rest and thicken on hover with the row or button they belong to.
- **Components size their icons.** An icon is 16px at the default density, 14px in compact and 18px in spacious, and takes the colour of its label; beside a label it rests in grey.
- **An icon supports a label; it rarely replaces one.** Icon-only buttons are for actions everyone knows (close, search, more, add) and for toolbars, and each has an accessible name and a tooltip with the same words, plus its shortcut when there is one.
- **An icon before a label names the action; after it, it shows direction:** an arrow for going somewhere, a chevron for a menu.
- **Never emoji as icons,** and never two icon libraries on one screen.
- Company logos come from the brand set and file types from the file set, so they are consistent in size and weight.

### Images and media

- **The product is the picture.** A website shows real screens and live components; an app shows the person's own content. Empty states and feature rows use an icon, so a screen needs no illustration to feel finished.
- **Hold the space.** Photos, screenshots, maps and embeds sit in an `AspectRatio`, so the layout is the same before and after they load.
- **A screenshot is an object.** On a page it sits on a raised surface with the container corner.
- **People are `Avatar`s** with initials as the fallback; companies are their logo; files are their type icon.
- **Text over an image sits on a scrim,** because no theme colour stays readable on arbitrary pixels.
- **Before and after uses `ImageCompare`:** two pictures of the same scene at the same size, such as an edit, a redesign or a restoration, split by a line the person drags. Name both sides when "Before" and "After" don't say enough.
- **Audio uses the `AudioPlayer`:** the default card where the audio is the subject, the cover variant for music and podcasts with artwork, the compact one for voice messages and audio in lists. Pass the file's `peaks` so the seek bar shows its waveform.
- **Video uses the `VideoPlayer`:** the full player on a page about the video, the compact one where it is one item among others. A muted, looping clip is for ambience only, and anything with speech has captions.

## Components

The library covers most of what a product needs, so a screen is mostly a matter of choosing well. Component names are the same on the web and on React Native.

### Choosing a component

| Need                                         | Use                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| An action                                    | `Button`; `ButtonGroup` for joined actions and split buttons                   |
| One on/off tool (bold, pin, mute)            | `Toggle`                                                                       |
| A choice of 2 to 7 options, or a view mode   | `ToggleGroup`, a segmented control                                             |
| Switching between views of one thing         | `Tabs`                                                                         |
| Short text                                   | `Input`; with an icon, a prefix, a unit or a button inside, `InputGroup`       |
| A password                                   | `InputGroup` with a show button                                                |
| A number                                     | `NumberField`, with steppers, limits and formatting                            |
| A date                                       | `DatePicker`, which can add a time                                             |
| A time, or a start and an end on one day     | `TimeInput`, `TimeRangeInput`                                                  |
| A month or a year                            | `DatePicker` with `granularity="month"` or `"year"`                            |
| A date range, or a date shown as a button    | `Calendar` in a `Popover`                                                      |
| A file                                       | `FileUploadField` in a form, `FileUploadDropzone` for a large drop target      |
| A colour                                     | `ColorPicker`, alone or behind a swatch                                        |
| Long plain text                              | `Textarea`                                                                     |
| Formatted text, notes, documents             | `Editor` to write it, `Markdown` to show it                                    |
| Searching or filtering a page                | `Search`, which folds to a button in a toolbar                                 |
| One choice from a known list                 | `Select`; `RadioGroup` when every option should stay visible, up to about five |
| One choice from a long or searchable list    | `Combobox`, which also takes several values as chips                           |
| Several choices from a long list             | `MultiSelect`, which stays open between picks and shows them as chips          |
| Several independent options                  | `Checkbox`es in a `FieldSet`                                                   |
| A setting that applies at once               | `Switch`                                                                       |
| A one-time code                              | `InputOTP`                                                                     |
| An approximate value                         | `Slider`, with the value shown beside it; `showSteps` when there are few steps |
| A score out of five, or a review's stars     | `Rating`; `readOnly` to show an average                                        |
| A focused task or short form                 | `Dialog`                                                                       |
| Confirming something irreversible            | `AlertDialog`                                                                  |
| Details or editing beside the current view   | `Sheet`                                                                        |
| A bottom panel on phones                     | `Drawer`                                                                       |
| Small interactive content on a trigger       | `Popover`                                                                      |
| A preview of a linked thing on hover         | `HoverCard`                                                                    |
| The name of an icon button, a shortcut hint  | `Tooltip`                                                                      |
| Actions on a trigger                         | `DropdownMenu`; `ContextMenu` on right-click; `Menubar` for desktop-app menus  |
| Jump anywhere, run any command               | `Command` in a `CommandDialog`                                                 |
| The frame of an app                          | `AppShell` with `AppNav`                                                       |
| A simple side navigation                     | `Sidebar`                                                                      |
| Open documents (files, records, chats)       | `TabStrip`                                                                     |
| Switching organisation or workspace          | `WorkspaceSwitcher`                                                            |
| The signed-in person's menu                  | `UserMenu`                                                                     |
| A website's header navigation                | `NavigationMenu`                                                               |
| Where am I                                   | `Breadcrumb`                                                                   |
| More results than one page                   | `Pagination`                                                                   |
| Compact section navigation, names on hover   | `PreviewRail`                                                                  |
| Records compared across columns              | `Table`                                                                        |
| Many records people sort, filter or pick     | `DataTable`                                                                    |
| A list of things (people, files, links)      | `Item`s in an `ItemGroup`                                                      |
| A tree of files and folders                  | `FileTree`                                                                     |
| One discrete object                          | `Card`                                                                         |
| A status or a short label                    | `Badge`                                                                        |
| A person or an account                       | `Avatar`; `AvatarGroup` for several                                            |
| A keyboard shortcut                          | `Kbd`                                                                          |
| Code to read or copy, a diff                 | `SyntaxHighlight`                                                              |
| A message that stays on the page             | `Alert`                                                                        |
| The result of an action                      | A toast                                                                        |
| Progress of known length                     | `Progress`                                                                     |
| A short wait in place                        | `Spinner`                                                                      |
| Content loading                              | `Skeleton`, in the shape of the content                                        |
| Nothing to show yet                          | `Empty`                                                                        |
| Sections that open and close                 | `Accordion`; `Collapsible` for one                                             |
| A dividing line                              | `Separator`                                                                    |
| Panes the person resizes                     | `Resizable`                                                                    |
| A scrolling region inside a page             | `ScrollArea`                                                                   |
| An audio file, a podcast, a voice message    | `AudioPlayer`                                                                  |
| A video                                      | `VideoPlayer`                                                                  |
| Two versions of one picture, side by side    | `ImageCompare`                                                                 |
| An image, a map or an embed at a fixed ratio | `AspectRatio`                                                                  |
| A few peer slides (screenshots, quotes)      | `Carousel`, for content people can afford to miss                              |
| A conversation                               | `MessageScroller`, `Message`, `Bubble`, `Attachment`, `Marker`, `ChatInput`    |
| Choosing an AI model                         | `ModelPicker`                                                                  |
| Questions an assistant asks                  | `Questionnaire`                                                                |

Use the library's inputs for dates, times, numbers, files and colours in place of the browser's own: they match the look, follow the density and behave the same everywhere.

### Buttons

| Variant     | Looks like                 | Use                                                                     |
| ----------- | -------------------------- | ----------------------------------------------------------------------- |
| Default     | Filled, the primary colour | The one main action of a region: Save, Create project, Send             |
| Secondary   | A soft tint                | A second real action beside the primary                                 |
| Outline     | A hairline frame           | Cancel in a dialog or form, filters, standalone actions on busy content |
| Ghost       | Grey text, no frame        | Toolbars, icon-only buttons, actions in rows and headers                |
| Destructive | A red tint, red text       | An action that destroys: Delete, Remove member                          |
| Link        | Text in the primary colour | Navigation inside text                                                  |

- **Order:** in a dialog or form footer, the dismissing action comes first and the primary last, at the end edge. A destructive confirm takes the primary's place.
- **Labels** are a verb and its object: "Create project", "Invite people". The confirming button repeats the verb of the action it confirms.
- **Loading:** the button is disabled, shows a `Spinner` before its label, and the label turns to the "-ing" form: "Saving…".
- **Pressed and toggled** state belongs to `Toggle` and `ToggleGroup`. A row of buttons where one looks active is a toggle group.
- **One size per row.** Buttons that sit together share a size. A full-width button belongs to a narrow column: a sign-in card, a phone sheet.
- **What goes to another page is a link,** even when it looks like a button, so people can open it in a new tab. Links inside a sentence keep an underline, because the primary colour is the text colour until a project picks a hue.

### Forms

- **One column,** about 672px wide, related fields together, the submit row at the end. Two short related fields (first and last name) may share a row.
- **Every control has a visible label above it.** The label names the field; the placeholder shows an example value. Help that people need while typing goes under the control.
- **A field's width hints at its answer:** a postcode field is short, an address field runs the column.
- **Ask in the order people think of the answers,** and only for what the task needs now. Mark whichever of required or optional is rarer, in the label: "Company (optional)".
- **Group related controls** under a legend: a set of checkboxes, a set of radios, a section of a long form.
- **Checkbox, radio and switch rows** put the label beside the control, with its description under the label. The whole row toggles, not only the box.
- **Validate when the person leaves a field and again on submit,** never while they type. The field gets a red ring and a message under it that says how to fix the value: "Use at least 8 characters". After a failed submit, focus goes to the first invalid field.
- **Settings save themselves.** A switch applies the moment it changes. A form of several fields has one submit button.
- **Choose the control by the answer:** see [Choosing a component](#choosing-a-component). Two to seven visible options are a `ToggleGroup` or a `RadioGroup`; a long list is a `Select`; a searchable one a `Combobox`.

### Overlays

- **Dialog** for a focused task the person returns from: a short form, a choice, a preview. It has a title, and its actions sit in the footer. Keep it to one task; a long or multi-step flow is a page or a `Sheet`.
- **AlertDialog** only to confirm what can't be undone. The title asks the question with the object ("Delete Acme Inc.?"), the description states the consequence, and the action repeats the verb ("Delete") beside an outline Cancel. For anything that can be undone, act at once and offer Undo in a toast.
- **Sheet** for details or editing beside the list it came from: a row's record, filters, settings for the current view. It comes from the end edge.
- **Drawer** for bottom panels on touch screens. People swipe it away.
- **Popover** for small interactive content tied to a trigger: a date picker, a share field, quick filters.
- **HoverCard** previews a linked person or record for pointer users. Everything in it is also one click away.
- **Tooltip** names an icon button or shows a shortcut, in a few words. Anything someone needs to read or click goes in a `Popover`.
- **Two modal layers at most.** A dialog may open a confirmation; a third layer means the flow needs a page.
- **Escape closes, and focus returns to what opened it.**

### Menus and commands

- **Group the items,** with a separator between groups, ordered by how often they are used.
- **The destructive item is last,** in its own group, in red.
- **Show the shortcut** beside every item that has one.
- **An item that opens a dialog for more input ends with "…":** "Rename…".
- **A menu holds actions; a `Select` holds values.** A menu of options with a check beside the current one is fine for a view setting.
- **A right-click menu repeats actions available elsewhere,** such as the row's "More" menu, because touch and keyboard users can't right-click.
- **The command palette** opens on ⌘K, grouped by kind (Navigation, Actions, Recent), each item with its icon and shortcut. It finds things by the words people use, so give items their synonyms.

### Navigation

- **Shape of the navigation:** five to seven top-level destinations named with nouns, ordered by how often people go there. What people make (projects, chats, documents) lives in its own group under the fixed destinations. Settings and help go in the last group or in the user menu. A destination used once a month belongs in a menu or the command palette.
- **Sidebar rows** are an icon and a short label. Counts are small badges at the end, live state is a status dot, and actions on a row appear on hover and on right-click. The current page is the selected row.
- **`AppNav`** draws the navigation from the app's list of destinations: it marks the current page, opens the parents of the current page, and lets people reorder, pin and hide items when the product allows it.
- **The sidebar collapses** to a rail of icons with tooltips, or slides away and peeks back on hover. It remembers which.
- **`WorkspaceSwitcher`** is a menu for a few workspaces and a searchable dialog for many. While the next workspace loads, the whole screen says so.
- **`UserMenu`** sits at the bottom of the sidebar as a row, or in a header as the avatar alone. Account items come first and Sign out last, in its own group.
- **`TabStrip`** holds the documents a person opens and closes (files, records, chats), with pinned tabs, a preview tab for a quick look, and drag to reorder.
- Home and Overview belong in the sidebar or bottom navigation, never as a permanent tab in the document strip.
- **`Tabs`** switch between a fixed set of views of one thing: two to six short labels on a track with a sliding pill. Where space is tight, such as a panel header, use the subtle variant, where every tab has an icon and only the active one shows its label. Vertical tabs suit a settings page with more sections than fit across.
- **Breadcrumbs** show the path with the current page last. Long paths fold their middle into a menu.
- **`PreviewRail`** suits a long page's sections or a sequence (chapters, months, steps) where a compact rail beats a list of names: thin ticks that swell around the pointer, with a card naming the section. The current section stays marked. When people need to read every name at once, use `Tabs` or a `Sidebar`.
- **`Search`** in a header or toolbar opens from a round button into a field. Escape clears it, then closes it.
- **Websites** use a `NavigationMenu` in the header, or plain links when there are five or fewer.

### Data display

- **Table** for records compared across columns. The first column is the record's name, in the foreground and medium weight; the other cells rest in grey and darken with the row under the pointer. Numbers align to the end in tabular figures. A status is a `Badge`. Row actions sit in a ghost "More" menu at the row's end. Show the columns people compare and leave the rest to the record.
- **DataTable** when people work the records: sort, filter, pick, page or scroll through hundreds or thousands. It keeps Table's rules and adds a header per column (a type icon that becomes the sort arrow, an options popover with the filter), the record's name pinned to the start and actions to the end, and a footer of calculations. Everything but the search happens in the table: column options in each header, the table's menu (columns, density, clearing filters) at the header's end. Give it the full column and a height; use compact density in dense tools. Declare each column's type rather than drawing cells by hand, so the filter, sort and alignment follow. Paginate when position matters ("page 3"); scroll otherwise, and load more as it nears the end when the data lives on a server.
- **A row opens its record.** The name is the link, which is the keyboard's way in; clicking anywhere on the row is the shortcut to it.
- **Item** for lists of things read one at a time: people, files, integrations, links to settings. Each has a picture (an icon, an avatar or an image), a title, a description and its actions.
- **Stat cards** show one number each: the label in grey, the value large in tabular figures, and the change as a status badge or status-coloured text with an arrow. Every card in the row has the same parts.
- **Badge** for statuses and short labels, one or two words. A state takes the colour of what it asks of the person: success for done, info for under way or waiting on someone else, warning for late or needing attention soon, destructive for failed or blocked, and an outline badge for a state with no urgency (draft, archived). The neutral badge is for counts and the outline one for tags.
- **Avatar** always has initials to fall back on. A group shows a few and a count for the rest; a small dot marks presence.
- **Kbd** shows shortcuts in tooltips, menus and help text.
- **SyntaxHighlight** for code a person reads or copies: a header with the file name and a Copy button for a file, Copy beside a one-line command, line numbers only when the text refers to lines, and a capped height for long code.
- **Markdown and Editor** for formatted text. A comment box is the editor's text area alone; a document adds a toolbar; long-form writing adds a word count.
- **FileTree** for files and folders, with type icons, indentation guides and folders that open in place. Selecting a file marks it; opening it is a second, deliberate act.

### Feedback

- **Toast** reports the result of an action ("Invite sent"), with Undo when it can be undone and Retry when it failed. It leaves by itself, so anything a person must act on also lives in the page. Form errors stay in the form.
- **Alert** holds a message that stays on the page: a section-level warning, a degraded service, a required step. By default it is a neutral panel with a coloured icon; the tinted, high-contrast version is for what must not be missed. It has room for one action. One alert per region.
- **Progress** for work of known length. **Spinner** for a short wait in place: a button, a row. **Skeleton** for content loading, in the content's shape. A shimmer for text that is still streaming.
- **A wait longer than a moment has words,** not only a spinner: "Saving…", "Importing 240 rows…".

### AI and chat

- **The transcript** is a `MessageScroller`, which follows a streaming reply, holds its place when history loads, and offers a jump to the latest message.
- **The person's messages sit in bubbles at the end edge. The assistant's replies are plain text on the page,** formatted as a document, with code in `SyntaxHighlight`. Files are `Attachment`s; system notes and day dividers are `Marker`s.
- **Waiting** is shimmering text ("Thinking…"), and the reply renders as it streams.
- **The composer is a `ChatInput`:** a one-line pill that grows as the draft wraps, on an empty page, floating over content or docked under a transcript. Its large layout is a card with the controls under the field, for long drafts.
- **Inside the composer:** attachments above the text, tools at the start of the footer (the add menu, modes), and at the end the context meter, the model, the microphone and send. Send turns into stop while a reply streams. Every composer accepts dropped and pasted files.
- **The model** is chosen from a `ModelPicker` in a popover opened from the composer. Modes and permissions are a small pill that opens a list of options, each with an icon, a name, a description and a check on the one in use.
- **Popups opened from the composer sit two levels above it,** so they read apart from its card.
- **Clarifying questions** are a `Questionnaire` that takes the composer's place until they are answered: one question at a time, choices picked with number keys, progress and a way to stop at the top.
- **A new chat** is an empty page with the composer centred under a short greeting and a few suggested prompts. The first message moves the composer to the bottom.

### Platforms

- **Three web bases, one design.** A project is built on Base UI, Radix or React Aria. The components look and behave the same on each; how their parts connect in code differs, so read the docs for the project's base. React Aria projects have no `Menubar` or `NavigationMenu`: use a `DropdownMenu` per menu and a header of links.
- **React Native has the same components** under the same names, with the same variants and sizes, so every rule in this file holds. Not there yet: `ChatInput`, `ColorPicker`, `FileTree`, the file upload components, `ModelPicker`, `NumberField` and the time inputs.
- **Touch takes the pointer's place.** What opens on hover or right-click on the web (`Tooltip`, `HoverCard`, `ContextMenu`) opens on a long press. Every sound has a matching haptic.
- **Phones are spacious, tablets a step lighter.** Phone controls are 44pt. Tablets use 40pt controls with the same text, since there is more room and the screen is read from further away. A narrow split-screen window counts as a phone.
- **Popups follow the size of the screen:** a `Select` or a menu is a sheet from the bottom on a phone and a popover on a tablet.
- **The App Shell on a phone:** the sidebar is revealed behind the page, the main destinations become a bottom nav, the page scrolls under a fading header, a side panel is a drawer with a grab handle, and a tab strip collapses to the active tab and a count. Native tab scenes extend behind the header too; their content is inset once, so the gradient overlays scrolling content without a clipped edge.
- **Native bottom navigation:** Glass uses the system tab controller on supported iOS builds. iOS owns its capsule, selection lens, touch tracking, refraction and settling animation. Fabricator icons are template images at native pixel densities, with separate selected strokes. Use `nativeTabs` on the bottom nav to host the system tabs and the page together; it reports the bar's measured height including the safe area, and hides the bar while the editor claims the bottom edge without unmounting the page. Floating and Flat keep Fabricator's icon-and-caption rows and sliding highlight. A destination stays selected on its detail pages.

## Patterns

Start from the closest pattern, install its block when there is one, and remove what the product doesn't need.

| Block                                              | What it is                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `app-shell-01`                                     | Workspace app: account and organisation marks in the sidebar, grouped navigation people can customise, a Details panel |
| `app-shell-02`                                     | Workbench: document tabs above the content, a resources panel, a status bar, a peeking sidebar                         |
| `app-shell-03`                                     | Classic SaaS: team switcher on top, the person's menu at the bottom, a sidebar that collapses to icons                 |
| `app-shell-04`                                     | Desktop app: a translucent window, tabs in the top row beside the window's controls                                    |
| `app-shell-05`                                     | Mobile first: a bottom nav and a floating primary action on phones, a message that takes over the list                 |
| `login-01` … `login-05`, `signup-01` … `signup-05` | Sign in and sign up                                                                                                    |
| `sidebar-01` … `sidebar-16`                        | Sidebar layouts                                                                                                        |

| The screen is about                       | Pattern                                     |
| ----------------------------------------- | ------------------------------------------- |
| Many records of one kind                  | [List](#list)                               |
| One record                                | [Detail](#detail)                           |
| Working through records one after another | [List and detail](#list-and-detail)         |
| Preferences                               | [Settings](#settings)                       |
| Making or changing one record             | [Create and edit](#create-and-edit)         |
| A task too long for one form              | [Multi-step flow](#multi-step-flow)         |
| The state of things at a glance           | [Dashboard](#dashboard)                     |
| Several documents open at once            | [Workbench](#workbench)                     |
| Writing or reading one document           | [Document](#document)                       |
| Talking to a person or an assistant       | [Chat](#chat)                               |
| Getting in                                | [Sign in and sign up](#sign-in-and-sign-up) |
| Explaining or selling the product         | [Website](#website)                         |

### List

The index of a collection: issues, customers, invoices.

- **Header:** the breadcrumb, and the primary action ("Create invoice").
- **Toolbar,** in compact controls: `Search`, the filters, a view switch, and the result count in grey at the end. A filter is a `ToggleGroup` when its few states fit the row at every width, a `Select` otherwise, and a `Combobox` when it is long or takes several values. Active filters stay visible, with one quiet control that clears them all.
- **Body:** a `Table` when the records are compared by column, a list of `Item`s when each is read on its own, a grid of `Card`s when each is recognised by its picture.
- **Selection:** a leading checkbox column. While rows are selected, the toolbar shows their count and the bulk actions.
- **Footer:** `Pagination`, or more rows loading on scroll.
- **States:** skeleton rows while loading. For the first use, an `Empty` with the primary action and no toolbar until there is something to filter; the header keeps its action, so its place never changes. For no results, an `Empty` that names the search and offers "Clear filters".
- **The filters, the sort and the page survive a reload and a shared link,** and Back returns to the list as it was.

### Detail

One record: an issue, a customer, an order.

- **Header:** the title, its status `Badge`, one primary action, and the rest in a "More" menu with the destructive item last.
- **Body:** the main content. Its sections are `Tabs` when they are views of the same record: Overview, Activity, Files.
- **Side:** metadata and activity in a side panel the person can close, so the content can take the room. Metadata is a list of pairs, the label in grey and the value in the foreground.
- **Edit in place** where the value shows, for a field or two. A record with many fields edits in a `Sheet` or on its own page.

### List and detail

Working through a queue: an inbox, tickets to triage, a review list (`app-shell-05`).

- The list fills the main column and the open record sits in a side panel beside it. On a phone the record takes the whole screen, with a way back.
- The open row is selected, and the next record is one key away: ↑ and ↓ move through the list.
- Until something is open the panel shows an `Empty` ("Select a message"). Closing the panel gives the list the full width.
- The record's actions live in its panel header. Actions on the whole list stay in the page header.

### Settings

- One column about 672px wide. Each section has a heading and a sentence saying what it covers, with a `Separator` between sections.
- A row has its label and description at the start and its control at the end. On a phone, rows with a text field stack.
- A switch applies on change. Text settings save with one button per section.
- Many sections get their own pages in a sidebar group, or `Tabs` across the top.
- The danger zone is last: a destructive button that opens an `AlertDialog` naming what is lost.

### Create and edit

- Up to about five fields: a `Dialog`. Fields that need the list visible beside them: a `Sheet`. Long or multi-step: a page.
- The footer holds an outline Cancel and the primary, last. The primary says what it creates: "Create invoice".
- Enter submits and Escape closes.
- Edit forms open with the current values. Create forms open with sensible defaults and the first field focused.

### Multi-step flow

Onboarding, checkout, an import: a task too long for one form.

- One decision per step, each a short form with a title that says what the step is for.
- Show where the person is: "Step 2 of 4" in caption type, or a `Progress` across the top.
- The footer keeps one place for each action: Back at the start, the primary at the end (Continue, then the final verb, such as "Create workspace"). Optional steps add a ghost Skip.
- Going back keeps every answer, and so does a reload.
- Validate a step when the person leaves it. The last step shows what was chosen before it commits.

### Dashboard

- A row of stat cards, four across on desktop, then the work: recent activity as a list of `Item`s, the things needing attention in a `Table`.
- Order by what the person does next: what needs them first, the trend second, the archive behind a link.
- An `Alert` at the top only while something is wrong.
- Dense dashboards use the compact density and snappy or instant motion.

### Workbench

Several documents open at once: an editor, a query tool, a design tool (`app-shell-02`).

- A `TabStrip` above the content holds the open documents, and the body takes the full column.
- The file or object browser is a `FileTree`, in the sidebar or in a panel at the start. Inspectors and resources are panels at the end, switched from the tab row.
- The status bar carries what is true of the whole workspace: a branch, a sync state, a count.
- Compact density and snappy motion. Every frequent action has a shortcut, listed in the command palette.

### Document

Writing or reading one long text: a note, a spec, an article.

- One column at reading width, the title as the first line of the document, and nothing beside the text that isn't about it.
- The `Editor` with a toolbar above it, or a small menu that appears on selected text. `Markdown` at the same size reads it back.
- It saves itself. Show the state in grey caption text ("Saved 2 min ago") in place of a Save button.
- Comments, the outline and the history go in a side panel.

### Chat

- **Assistant identity:** `BotFace` is an animated face for assistant avatars, empty conversations and voice interfaces. Choose from fourteen soft silhouettes, three eye styles and the Fabricator role or named palette colours. It follows the pointer on web and desktop, glances naturally and responds to touch on native, and stays still with Reduce Motion or `animated={false}`. Label it when it conveys identity.

- The conversation takes the full main column: the transcript scrolls between the header and the composer, which stays docked under it. On wide screens both are capped at a reading width.
- Conversations the person switches between are a `TabStrip`, or a sidebar group with dots on the unread ones.
- See [AI and chat](#ai-and-chat) for the parts.

### Sign in and sign up

- Start from a `login` or `signup` block.
- One centred column about 384px wide: the product mark, a title, the fields, one full-width primary button, other providers as outline buttons, and a link to sign up (or in).
- One-time codes use `InputOTP`. Errors stay in the form: under the field, or in an `Alert` above the fields for "Wrong email or password".

### Website

- **Mode:** spacious density and smooth motion. A marketing section inside an app sets both on itself.
- **Type:** one hero headline per page; display type for section headings, prices and proof numbers; subtitle for feature titles; a lead under each heading.
- **Header:** about 64px tall on the page's own background: the logo, the navigation, then a ghost "Sign in" and the filled call to action at the end. It may stay at the top of the window, with a hairline under it once the page scrolls. On phones the links fold into a menu.
- **Hero:** a headline saying what the product does, a lead of a sentence or two, one filled and one outline button, then the product itself: a real screen or a live composition of its components, on a raised surface, drawn at the app's own density so it looks like the app.
- **Sections** inside one container up to 1152px wide, one idea each: a heading, a lead, and its content. Neighbouring sections differ in layout (a grid, text beside media, one wide screen, a quote), so the page has a rhythm.
- **Alignment:** the hero and the closing call to action are centred. Every other section starts at the container's edge, heading and content alike.
- **Usual order:** hero, proof (logos or numbers), the three to six things the product does, how it works, pricing, questions in an `Accordion`, a closing call to action, a footer.
- **One call to action,** with the same words in the header, the hero and the close: "Start free trial".
- **Features** are an icon, a subtitle and a line of caption text in a grid, on the page with no card around each. A `Card` is for a feature someone can open.
- **Pricing:** one `Card` per plan with the same parts in the same order: the name, the price in display type with its period in grey caption, one line on who it is for, what is included, the button. The recommended plan carries a `Badge` beside its name and the only filled button.
- **Footer:** a `Separator`, the logo with one line about the product, columns of grey links under caption headings, and a last row with the legal line.
- **Colour stays with the action.** The page is neutral surfaces and type, and sections part with space.
- **Motion:** content may fade and rise a few pixels as it loads or scrolls into view, once. Scrolling never moves the text someone is reading.

## States

Every region of a screen has an answer for each row that can happen to it. Design them with the happy path, in the same pass.

| State                 | Design                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| First load            | `Skeleton`s in the shape of the content. The frame and the title render at once                                                    |
| Refreshing            | Keep the current content; a `Spinner` in the control that triggered it                                                             |
| Submitting            | The button disabled with a `Spinner` and an "-ing…" label; the rest of the form stays readable                                     |
| Streaming             | Shimmering status text; content renders as it arrives                                                                              |
| Empty, first use      | `Empty`: an icon, a title naming what will be here, one sentence on why it's useful, the primary action                            |
| Empty, no results     | `Empty` naming the search, with a button that clears the filters                                                                   |
| Field error           | A red ring on the field and a message under it                                                                                     |
| Section error         | An error `Alert` saying what failed, with Retry; the regions that loaded stay                                                      |
| Action failed         | An error toast with the reason and Retry; what the person typed is kept                                                            |
| Page error, not found | `Empty` with the reason and a way back                                                                                             |
| No access             | `Empty` saying what is restricted and who can grant it. Actions a person can never take are left out; ones they could are disabled |
| Success               | The result itself (the new row, the changed value) and a toast. A whole success screen only ends a flow                            |
| Disabled              | Half opacity. When the reason isn't obvious, say it in the description or a tooltip                                                |
| Irreversible action   | `AlertDialog` naming the object and the consequence                                                                                |
| Reversible action     | Act at once; a toast with Undo                                                                                                     |
| Unsaved changes       | Confirm on leaving; settings that save themselves have nothing to lose                                                             |
| Selected              | The stronger wash, with no coloured edge                                                                                           |
| Long or missing value | Names shorten with the full value in a tooltip; a missing value shows a grey "None", so the row keeps its shape                    |

## Accessibility

- **The components own keyboard and screen-reader behaviour.** Keep it. Something custom and interactive follows the standard pattern for its kind in full.
- **Focus is always visible,** as the blue ring, and it goes where the work is: into a dialog when it opens and back to its trigger when it closes, to the first invalid field after a failed submit.
- **Everything has a name:** icon buttons, dialogs and sheets, images, form controls.
- **Contrast** holds as long as colour comes from the roles: text and fills are tested to AA in light and dark, for every hue a project can pick.
- **Colour never works alone:** pair it with an icon, a label or a pattern.
- **Targets** are at least 24px in compact regions and 44px on touch screens.
- **Reduced motion** is respected everywhere.
- **Headings:** one main heading per page, then levels in order.
- **Toasts** are announced but they disappear, so anything someone must act on also lives in the page.
- Check every screen with the keyboard alone, and with an automated accessibility check.

## Content

- **Sentence case** everywhere: titles, buttons, menu items, tabs, labels.
- **Buttons** say what happens: a verb and its object. The same verb follows the action through the flow: "Delete project" opens "Delete Acme Inc.?", confirmed by "Delete".
- **Labels and titles** take no final period. Descriptions and messages are full sentences.
- **Errors** say what happened and how to fix it, in plain words, without blame.
- **Empty states** say what will be here and how to start.
- **"…"** ends an item that opens a dialog for more input ("Rename…") and a label in progress ("Saving…").
- **Numbers and dates** are formatted for the person's locale. Recent times are relative: "5 min ago".
- **One name per thing.** A "project" in the sidebar is a "project" in every button, title and message. Prefer the person's words to internal ones.
- **Short first.** A title is a few words, a description one sentence, a tooltip a phrase.
- **Design with real content:** real names, real numbers, the longest value and the emptiest. Placeholder text hides the cases that break a layout.

## Do's and Don'ts

- Do choose the component and its variant first; don't restyle a component's colour, type or size.
- Do set density on the region; don't shrink or enlarge components one by one.
- Do take colour from the roles; don't pick colours by hand, in either theme.
- Do separate layers with the surface ladder; don't add borders or other shadows to surfaces.
- Do keep one filled button per region; don't put two primaries side by side.
- Do let neutral surfaces, type and space carry the page; don't decorate with gradients, glows, blurred glass or bands of colour.
- Do group with space first, then a heading, then a `Separator`, then a `Card`; don't nest cards or wrap a whole page in one.
- Do show status with `Badge`, `Alert` and status dots; don't mark it with a coloured side border or a tinted row.
- Do write labels in sentence case at their role's size; don't use all-caps, wide-spaced labels.
- Do align text to the start in apps; don't centre lists, forms or body text.
- Do use the project's icon library, one icon per meaning; don't use emoji as icons.
- Do let motion follow the roles; don't add entrance animations to app content or animate for decoration.
- Do use the component made for the role (`Separator`, `Skeleton`, `Badge`, `Alert`, `Empty`, `Kbd`); don't rebuild them by hand.
- Do use the library's inputs for dates, times, numbers, files and colours; don't fall back to the browser's.
- Do use `AppShell`, `AppNav`, `TabStrip`, `Search` and `WorkspaceSwitcher` where they fit; don't rebuild their shortcuts, memory and phone behaviour.
- Do give every dialog, sheet and drawer a title, and every icon button a name.
- Do confirm only what can't be undone; offer Undo for the rest.
- Do design the empty, loading and error states with the screen; don't leave them for later.

### Review checklist

A screen is done when every line holds. Check it in the running app, never from the code alone.

- [ ] The screen's job fits in one sentence, and its focal point is the first thing seen.
- [ ] Each region has one primary action, and every icon-only button has a name and a tooltip.
- [ ] Title, toolbar and body share one start edge; space is tighter inside groups than between them.
- [ ] Light and dark both read well.
- [ ] Colour appears only where it means something: the action, a selection, a status.
- [ ] It works with the keyboard alone, and focus is visible on every stop.
- [ ] It works on a phone and on a wide desktop.
- [ ] Density and motion match the product mode.
- [ ] Loading, empty, error and disabled states exist and use their components.
- [ ] It holds with the longest name, the largest number and no data at all.
- [ ] Surfaces follow the ladder, with no borders or stray shadows.
- [ ] Copy is in sentence case, buttons are verbs, errors say how to fix.
- [ ] An automated accessibility check reports no violations.

### Theme toggle

A Button trigger with a sun/moon swap: the icons scale, rotate 45 degrees and crossfade through a 2px blur on the move timing. On web and desktop its icon has its own view-transition snapshot above the page reveal, so theme providers cannot suppress the morph and the page never freezes it mid-swap. The page uses the theme role (700ms at default speed) and the reference Material curve (`cubic-bezier(0.4, 0, 0.2, 1)`), revealing as a circle, blurred circle, square, diamond, rectangle, hexagon, triangle or twelve blinds that fan out from the origin. The blurred circle animates the incoming page snapshot from 8px blur to zero throughout a crisp circular clip expanding to 150%, with no opacity fade. Polygon boundaries fade through an alpha mask so text stays sharp; the polygon expands evenly and fully covers the viewport. A blurred circle from the pressed button is the default; its viewport position is measured on every activation, including after scrolling or resizing. Six explicit viewport origins remain available. Reduced motion and motion off apply the theme immediately. The app owns the resolved theme and persistence. Native keeps the icon morph and transient blur; its screen reveals remain a documented parity exception.

### Multi select

A searchable field for several values, built on each base's Combobox in multiple mode. The field takes the input recipe (ring-border frame, `bg-muted/50` hover, `bg-card` and `ring-foreground/25` while focused), grows a row per line of chips and ends in a muted chevrons icon. Chips are `bg-active` `rounded-md` h28 t12 medium with a h20 remove button. A new chip rises 6px from 0.92 scale and fades in on the move timing; a removed chip comes out of the row where it stood and fades as it wipes out from its start on the exit timing, while the chips after it glide over at the same time (FLIP on `translate`). The popup, rows and labels are Combobox's. One shared highlight glides to the hovered row on the glide timing; holding a row fills it to `bg-active` with the press scale, easing back on release, and on native the highlight under a finger takes that pressed fill. Picked rows turn foreground semibold and their check scales in from 0.9 and stays mounted to scale out. Picking keeps the list open and clears the search. Reduced motion and motion off remove chips at once. Native opens the list in a dialog like Combobox and animates chips with Reanimated on the same roles.

### Rating

A row of solid stars that holds a score, built on HTML for every base and on React Native. Default stars are the yellow people read as a score (`amber-400`, with an `amber-500` edge in light), fixed across themes; `primary` and the status variants fill with their role. Empty stars are a faint foreground fill. Hover previews the score under the pointer, a click or a drag sets it, `step={0.5}` takes halves, and read-only shows any fraction. The hovered star lifts to 115% on the feedback timing, and a star the score reaches pops in from half size on the bounce spring.
