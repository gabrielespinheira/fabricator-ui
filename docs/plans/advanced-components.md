# Advanced components performance review

Reviewed 2026-11-25. Scope is the nine Advanced components in the Fabricator registry on Base UI, Radix UI, React Aria, and React Native where available. Data Table is web-only. The review follows the mounted component, its controller and model, and the interaction that produces the most work. See the [Data Table](data-table.md), [Event Calendar](event-calendar.md), [Editor](editor.md), and [Kanban](kanban.md) plans for earlier measurements and decisions.

## Findings

| Component | Current cost and protection | Change or next measurement |
| --- | --- | --- |
| Data Table | The mounted rows are virtualized, and remote windows keep the amount of data processed locally bounded. Headers and cells have memo boundaries. Facet work and footer aggregations still depend on how much data is resident. The earlier trace also found page-wide style invalidation in the docs shell when virtual rows mount. | Compare the same 10,000 records and identical columns in a Fabricator-only page and the docs shell. Measure loaded row count, sort and scroll traces. Prioritize style invalidation or server-side facets according to the trace. |
| Event Calendar | The controller caches loaded month ranges, indexes events, and builds a visible window. Agenda virtualizes days. A large grid still pays for event layout and the mount cost of chips. The docs isolate heavy previews in fit frames. | Measure dense week, month and agenda changes with a fixed event distribution. Keep the event renderer stable and compare FullCalendar layout time with custom chip rendering. Check native separately since it uses a different engine. |
| Kanban | The board pages by column and virtualizes tall lists. Dragging works against measured card positions. Each changed local search can format properties across loaded records, and mounting richer cards multiplies the work per visible column. | Measure rapid search and a cross-column drag with 1,000 loaded cards and three populated lanes. If formatting dominates typing, index searchable values at the data and schema boundary. Profile the current Kanban work before changing drag behavior. |
| Rich Text Editor | The store and block rendering already retain unchanged block identities. The word count previously joined and scanned the whole document on selection updates. | Cache the count by block and the total by the immutable block array. Caret-only changes read the cached total. Text edits recount replaced blocks. Next measure typing and paste separately with autosave or controlled Markdown serialization enabled. |
| File Tree | Closed branches drop out of the flattened list. Native previously scanned selected and expanded arrays for every visible row. Web rebuilt the lookup sets and filtered enabled rows on local focus renders. | Reuse lookup sets and enabled rows across focus changes. For very wide folders, measure the remaining mounted-row, icon bundle and layout costs before adopting virtualization. Preserve roving focus, typeahead and range selection if virtualizing. |
| Syntax Highlight | The root memoizes tokenization. Content used to recreate every token and line element, even when only wrapper props changed. | Memoize rendered lines on both platforms. Keep the input and line-range arrays stable in callers. Profile initial tokenization and mounted token count separately for very large source files or streaming updates. |
| Image Compare | The web drag loop updates the clip, curve and handle directly. The native gesture uses shared values and Skia. Both images still need transfer, decode and GPU memory. Controlled integrations can add React work during the drag. | Measure image decode and drag paint with display-sized and full-resolution assets. Keep external persistence on the commit callback. Profile a comparison gallery before changing the component's frame loop. |
| Video Player | The web playhead moves via a CSS variable while React state syncs on media events. Status events still reach the root, and each mounted player can request metadata. | Profile one playing video and a feed of inactive posters. If playback commits dominate, extract the time, chapter and seek UI into a smaller subscriber. Verify captions, keyboard seeking, buffering and fullscreen across browsers. |
| Audio Player | The playhead moves via a CSS variable on web and animated style on native. Playback updates and scrub redraws previously recreated the static bars. | Reuse waveform elements until peak data, bar count, or native motion settings change. Keep peak generation on ingestion. Measure seek hover and playback commits independently to see whether the controls need narrower state subscriptions. |

## Measurements

Local Bun microbenchmarks on the development machine. Each value is the median of seven timed runs after a warmup. These isolate work in the affected path; UI frame times also include rendering, layout and paint.

| Workload | Before | After |
| --- | ---: | ---: |
| File Tree membership over 10,000 IDs, with 2,000 selected and 500 expanded, 20 sweeps with stable inputs | 644.1 ms | 2.2 ms |
| Editor word count for 200 reads of an unchanged 2,000-block document | 144.9 ms | Below 0.01 ms |

Both variants produced the same counts. Syntax Highlight and Audio Player changes remove element construction from unchanged lines and bars respectively. No production frame-time estimate is reported for those paths.

## Next profiling pass

1. Compare the Data Table and Event Calendar demos with equivalent standalone pages. Record main-thread time, long tasks, mounted elements and commit durations under the same viewport and CPU settings. Start with this comparison because docs CSS has already been shown to distort the results.
2. Profile local search and drag separately in Kanban. Include a partially loaded column, multi-card moves and stale results after a query change.
3. Repeat File Tree selection, editor typing, syntax loading and media seeking on a midrange phone. Capture both first-render cost and repeat interactions. Preserve focus, accessibility actions, reduced motion and error recovery when assessing improvements.

## Documentation

The existing Advanced pages remain the installation and usage entry points. Their nested references provide focused composition and configuration examples. The references are shared across bases and use Base UI previews. Shared URLs use Base UI navigation, with platform details described in the references and native component docs. Data Table references appear under the three web bases.
