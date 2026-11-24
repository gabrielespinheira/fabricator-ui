# Loading without layout shift

The rule behind all of it: the layout is settled before the data arrives, everything already known renders at once, and each part that waits holds the exact space its content will take. This file builds it with each framework's own tools; the other states are in [states.md](../states.md).

## Contents

- Choosing the indicator
- What the components already do
- Next.js
- React
- Data
- React Native
- Checks

---

## Choosing the indicator

| Waiting for | Show |
| --- | --- |
| The first data of a page or region | One `Skeleton` filling each card's content area, or one per row |
| New data for what is on screen | The current content, dimmed |
| The result of an action | The result at once when it can be undone; else a `Spinner` in the button |
| Work of known length | `Progress` with words: "Importing 240 of 1,200 rows" |
| Text being written | `shimmer` text, then the text streaming in |
| An image, a map, a video | Its `AspectRatio` box until it loads |
| Under about 300ms | Nothing |

## What the components already do

- `Skeleton` is the hover fill with a slow pulse. Use it as one block filling a box whose size is settled: a card's content area at its set height or `min-h-*`, a stat card's value area, a list or table row at the row height, a whole card in a grid of cards. Don't build placeholders from text bars, avatar circles or badge pills; real text wraps and names vary, so they shift when the content lands.
- Charts take `loading`: the plot keeps its size, dims while new data is on the way, sets `aria-busy`, and shows its `empty` message only once loading is over. Use it for the first load too, instead of swapping the chart for a skeleton.
- `DataTable` draws skeleton rows when it has none, and a thin shimmering bar over the rows it has while it refreshes. With a loader, rows not loaded yet are skeleton rows in their place, so the scroll never changes length.
- Shimmering text is the `shimmer` utility from `shadcn/tailwind.css` ("Thinking…", "Saving draft…").
- `Spinner` goes in the control that started the wait; `Progress` for work of known length.

## Next.js

- Keep the App Shell in the layout, so navigating swaps only the page and the frame never reloads.
- A route's `loading.tsx` renders the page's real title, toolbar and card headers, with one skeleton block filling each card's content area.
- Wrap each region that waits in its own `Suspense` boundary, with that region's skeleton as the fallback, so the page streams region by region. Put neighbouring cards of one row under one boundary, so the row appears at once.
- Fetch on the server whatever can be fetched there: it arrives with the HTML and needs no skeleton.
- Fade skeletons in after about 300ms (an animation delay with the skeleton starting invisible), so a fast response never flashes a placeholder.
- Images: `next/image` with its width and height, or `fill` inside an `AspectRatio`, and `placeholder="blur"` for photos. Fonts: `next/font`, so text doesn't reflow when the typeface loads. Links prefetch, so most navigations show no loading at all.
- Read the URL's period and filters inside a `Suspense` boundary, as Next.js requires for search params on statically rendered pages.

## React

- Changes to what is already on screen (a period, a filter, a tab) run in a transition (`useTransition`): the current view stays, marked pending, while the next one prepares. Never let them fall back to a skeleton.
- Search as you type defers its results (`useDeferredValue`), so the list doesn't blank between keystrokes.
- Quick, reversible actions (toggle, rename, reorder, add a row) show their result at once (`useOptimistic`) and roll back with an error toast if the server refuses.
- A pending button keeps its width: reserve the longer of its two labels, and let the spinner take the icon's place.

## Data

- Keep the previous result while refetching (the query library's keep-previous-data option, or the last value held in state), so only the very first load is a skeleton.
- Distinguish "loading" from "empty": `undefined` means waiting, an empty array means nothing to show. `Empty` and a chart's empty message wait for the second.
- Append "load more" rows below; hold live rows behind a "3 new" button rather than inserting them above what someone is reading.

## React Native

- The same components and rules. List rows keep a fixed height (give the list its item layout when rows are uniform), images a fixed size, and the screen's header and tab bar never unmount between screens.

## Checks

- Load the page on a throttled connection: after the first paint nothing moves except placeholders filling in. The layout-shift score stays under 0.1.
- Load it on a fast connection: no skeleton flashes.
- Change the period and a filter: the content stays, dims, and updates in place.
