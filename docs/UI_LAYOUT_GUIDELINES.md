# MyTrip responsive UI acceptance rules

This project treats visual verification as part of implementation, not as a final polish pass.

## Principles

- Breakpoints are chosen where content stops reading well, not to match a named device model.
- Mobile source order follows task priority. TRIP mode prioritizes `status -> NOW/NEXT -> field actions -> secondary detail`.
- Do not solve density problems by shrinking core text below readable sizes.
- Avoid horizontal scrolling on mobile except components where horizontal browsing is an explicit interaction: `NOW/NEXT` and `Schedule > 전체보기`.
- Prefer container-relative sizing (`minmax`, `clamp`, percentages, container queries where useful) over hard-coded desktop card widths.
- A control that matters in the field should target roughly 44 CSS px on touch layouts. Never rely on hover for critical actions.
- PLAN optimizes for comparison/editing. TRIP optimizes for immediate action and one-handed scanning.

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

## References

- MDN Responsive Design: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- MDN Media Query breakpoints: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries
- MDN Container Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries
- WCAG 2.2 Target Size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
