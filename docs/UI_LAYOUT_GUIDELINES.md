# MyTrip responsive UI acceptance rules

Visual tokens, IA, typography, color, surfaces, and per-page hierarchy live in `docs/MYTRIP_DESIGN_SYSTEM.md`. This file remains the engineering acceptance checklist for responsive and offline behavior.

This project treats visual verification as part of implementation, not as a final polish pass.

## Principles

- Breakpoints are chosen where content stops reading well, not to match a named device model.
- Mobile source order follows task priority. TRIP mode prioritizes `status -> NOW/NEXT -> field actions -> secondary detail`.
- Do not solve density problems by shrinking core text below readable sizes.
- Avoid horizontal scrolling on mobile except components where horizontal browsing is an explicit interaction: `NOW/NEXT`, `Schedule > 전체보기`, and compact navigation rails such as phrase-category chips. Navigation rails must keep the active state obvious.
- Prefer container-relative sizing (`minmax`, `clamp`, percentages, container queries where useful) over hard-coded desktop card widths.
- A control that matters in the field should target roughly 44 CSS px on touch layouts. Never rely on hover for critical actions.
- PLAN optimizes for comparison/editing. TRIP optimizes for immediate action and one-handed scanning.
- The trip-day skeleton is `meals + named destinations`; transit, hotel operations and check-in/out are scaffolding. A full sightseeing day should make the eating rhythm and actual places to visit obvious before logistics.
- For this trip, 9/13–9/16 should normally expose three real meal slots (`brunch/first meal -> late lunch -> late dinner`) unless a transport constraint makes that unreasonable. Desserts/snacks do not substitute for a meal.
- Day summaries should expose meal and destination counts so a logistics-heavy but experience-empty day is visible during QC.
- TRIP state is explicit: `PLANNED -> DONE | SKIPPED | CANCELLED`. Resolved events must not remain the current/next action, and changing a meal or Plan B resets the linked event to `PLANNED`.
- TRIP preview is read-only for execution state. Future events cannot be accidentally marked done/skipped before the trip begins.
- Field-critical PATCH actions are offline-first: apply optimistically, queue locally, expose pending-sync state, and replay when connectivity returns.
- A trip that has been explicitly saved for offline use must open from a deep link without network access. Keep a local trip snapshot and last usable weather snapshot in IndexedDB; never overwrite a usable weather snapshot with an empty/failed response.
- Reopening a recently loaded trip should render from local snapshot first and avoid redundant trip/weather requests until the relevant TTL expires. Real-time update signals and successful mutation replay may force a refresh.
- Offline packs should cache the current same-origin app shell/assets and operational trip data only. Prune obsolete hashed assets on refresh so offline storage does not grow indefinitely.
- Do not bulk-cache third-party map tiles from the public OSM tile service for offline use. In TRIP mode, render a lightweight coordinate-based offline route view from saved event coordinates; load the normal MapLibre/OSM map only when online.
- Offline readiness must be visible to the traveler: expose saved/not-saved state, last refresh time and approximate pack size, and make refresh an explicit action.
- Use progressive disclosure for long operational flows. Group consecutive transport steps into one journey card and keep the full step list collapsed until requested.
- In the final three days before departure, surface blocking/urgent preparation and `RESERVE NOW` work above the full checklist.
- Long information sets use `overview -> category/choice -> detail`. Do not render every category expanded by default just because the data is grouped.
- Secondary TRIP information that competes for the same moment should use a local switcher/segmented view instead of stacking multiple long sections vertically.
- Contextual actions should deep-link to the relevant detail state when possible. Example: a meal card opens restaurant Japanese; a transport card opens transport Japanese.
- A top-level label may need different content by mode. Reuse data, not necessarily the whole screen: PLAN `지도` is for research; TRIP `지도` is for today's route, meals and hotel.
- An overview/index should fit in the first common mobile viewport when feasible. Put long content behind an explicit category or local tab rather than making the index itself a long feed.

## Typography floor

- Mobile primary body: 14–16px.
- Mobile supporting body: 12px minimum; avoid using supporting text for essential instructions.
- Desktop primary body: 13.5–16px.
- Inputs on mobile: 16px minimum.
- Labels may be smaller only when they are genuinely secondary metadata.

## Layout ranges

### Narrow / mobile: <= 860px

- One primary content column.
- Full-screen Assistant.
- Header control geometry is a hard acceptance rule: menu, mode and add controls are 44x44px; the weather control is exactly 44px high; action-to-action gaps are 8px; header outer gutters are 14px. Verify the actual `getBoundingClientRect()` values rather than judging alignment by screenshot alone.
- Header controls and field actions: touch target >= 44px where practical.
- Schedule `날짜별`: exactly one day at full available width.
- Schedule `전체보기`: intentional horizontal day browsing, about 88vw per day.
- Body/root horizontal overflow must be 0.

### Desktop: >= 861px

- Sidebar + fluid main content.
- Schedule `날짜별`: one day at full available main width.
- Schedule `전체보기`: around three readable day columns at 1440–1600px viewport width; do not force all five days into one screen.
- Assistant target width about 700–760px while staying inside the viewport.
- Dense information may use two or three columns only while text remains readable without truncating critical content.

## Required browser checks before deployment

At minimum verify in real Chrome at:

- 1512 x 982 desktop
- 390 x 844 mobile

Record computed rectangles for important panels, card widths, `clientWidth`, `scrollWidth`, rendered item counts, and body/root horizontal overflow.

For a responsive change, also smoke-test an intermediate width around 1024–1180px when the component changes column count.

## Interaction checks

- Every rendered count must correspond to content the user can actually reach.
- Drag-only actions need a simple pointer/tap alternative when the action is important during travel.
- Completion/progress states must represent explicit user state. Time-based inference may be shown only as secondary context and must not masquerade as completion.
- Preview mode must not mutate trip-execution state.
- Test field-critical PATCH controls with the browser fully offline, then restore connectivity and verify the queued change reaches SQLite exactly once.
- After building an offline pack, disable network access and hard-navigate directly to the trip URL. Verify trip data, Japanese phrases and the offline route map remain usable without a warm in-memory app session.
- Record offline-pack cache entry count and approximate raw bytes. Treat unexpectedly large storage use as a regression; do not rely on opaque cross-origin cache entries for map coverage.
- Reload the same trip within the local snapshot TTL and verify no redundant `/api/trips/:id` or `/api/weather` request is emitted when valid cached data already exists.
- Changing the selected meal or decision option must clear stale completion state on its linked event.
- Current/next calculations must ignore `DONE`, `SKIPPED`, and `CANCELLED` events.
- Weather advice that can alter a route should use the next action's hourly window and a date-appropriate location rather than only the trip-wide daily maximum.

## References

- MDN Responsive Design: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- MDN Media Query breakpoints: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries
- MDN Container Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries
- WCAG 2.2 Target Size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
