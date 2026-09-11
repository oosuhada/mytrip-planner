# MyTrip Design System v1

MyTrip is a travel operations product, not a content magazine. The interface should help two people decide, move, pay, and recover from changes quickly. Visual style exists to make state and priority obvious.

## 1. Product IA

### PLAN — before the trip

**준비**
- 준비 · 예약
- 예산 · 지출
- 짐 · 코디

**계획**
- 일정 편집
- 후보 · 결정
- 지도 · 리서치

**도구**
- AI 가져오기

### TRIP — during the trip

**여행 중**
- 오늘
- 전체 일정
- 날씨 · 오늘의 코디

**현장 도구**
- 일본어 표현
- 쇼핑 리스트
- 예산 · 지출
- 지도

PLAN is for comparison and editing. TRIP is for the next action. The same data may appear in both modes, but the hierarchy may differ.

## 2. Visual principles

1. **One dominant hierarchy per screen.** Page title → section title → card title → metadata.
2. **Color carries meaning, not decoration.** Forest green is for primary/selected state. Amber is caution. Red is destructive/over-budget. Everything else is neutral.
3. **White space groups content.** Avoid solving density by shrinking text.
4. **Nested cards are limited.** Prefer page background → section surface → row/card. Do not stack multiple bordered boxes without a clear hierarchy change.
5. **Field actions are large.** Controls used while walking target 44px on mobile.
6. **Numbers scan fast.** Times, prices, and totals use tabular numerals.

## 3. Tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--ds-bg` | `#F5F5F2` | app background |
| `--ds-surface` | `#FFFFFF` | cards, panels |
| `--ds-surface-soft` | `#F0F1ED` | selected-neutral surface |
| `--ds-text` | `#20241F` | primary text |
| `--ds-text-2` | `#626A63` | supporting text |
| `--ds-text-3` | `#858C85` | metadata |
| `--ds-border` | `#DCDFD9` | dividers and borders |
| `--ds-primary` | `#2F5943` | primary action / selected |
| `--ds-primary-soft` | `#E7EFE9` | selected background |
| `--ds-warning` | `#8A6A37` | caution |
| `--ds-warning-soft` | `#F6F0E4` | caution surface |
| `--ds-danger` | `#9D4E45` | destructive / negative |
| `--ds-sidebar` | `#1E2822` | desktop/mobile navigation |

Do not introduce a new semantic color when an existing token communicates the state.

### Spacing

Use a 4px base grid. Preferred values: `4, 8, 12, 16, 20, 24, 32, 40, 48`.

- Desktop page side padding: 32px.
- Mobile page side padding: 16px.
- Section gap: 24px desktop / 16px mobile.
- Card padding: 16–20px desktop / 14–16px mobile.
- Inline control gap: 8px.

### Radius

- control: 10px
- card: 14px
- major panel: 18px
- pill: 999px

### Typography

Use the platform/system sans stack for Korean and Latin consistency.

| Role | Desktop | Mobile |
| --- | --- | --- |
| Page title | 28–30 / 1.2 / 700 | 24 / 1.25 / 700 |
| Section title | 18–20 / 1.3 / 700 | 17–18 / 1.3 / 700 |
| Card title | 14–16 / 1.4 / 700 | 14–16 / 1.4 / 700 |
| Body | 13–14 / 1.55 | 13–14 / 1.55 |
| Supporting | 12 / 1.5 | 12 / 1.5 |
| Metadata | 11 | 11 |
| Eyebrow | 10.5 / 800 / tracking | 10.5 / 800 / tracking |

Essential instructions must never be set as metadata. Avoid body text below 12px.

## 4. Surfaces and controls

- Default card: white surface + 1px border. No shadow.
- Floating/map/search surface: shadow is allowed because elevation communicates layering.
- Primary button: forest fill, white text.
- Secondary button: white/soft surface, border, forest/neutral text.
- Destructive button: neutral until confirmation; red only when the destructive state is explicit.
- Input height: 42px desktop / 44px mobile minimum.
- Touch target: 44px mobile whenever the action matters during travel.

## 5. Responsive behavior

### Desktop >= 861px

- Persistent 236px navigation rail.
- Content pages use a centered 1180–1280px working area unless the page is intentionally full-bleed (map, schedule).
- Schedule full view shows about three readable days at 1440–1600px.
- Comparison grids use 2–3 columns only when supporting text stays readable.

### Mobile <= 860px

- Navigation is a drawer; page content is single-column by default.
- Do not reproduce a desktop dashboard as tiny cards. Collapse secondary metadata or move it behind a local switcher.
- Horizontal scrolling is reserved for intentional rails: day schedule, NOW/NEXT, phrase categories, quick actions.
- Root/body horizontal overflow must remain zero.

## 6. Page-specific rules

### 준비 · 예약
- First viewport: departure blockers and progress.
- Checklist and restaurant detail follow; avoid five-column micro-cards.
- Reservation state should be readable without color alone.

### 예산 · 지출
- First viewport: total budget and the two traveler balances.
- Expense input is one clear form; ledger is chronological.
- Positive funding and negative spending use sign + label in addition to color.

### 일정
- Date, weather, and meal/destination rhythm precede logistics detail.
- Event card minimum text is body/support size, never metadata size.
- All-view is intentionally horizontally scrollable; mobile one-day view remains primary.

### 후보 · 결정
- Date → region → theme → candidate.
- Filters and view toggle are controls, not decorative pills.
- Candidate rationale is supporting body text, not 8px metadata.

### 지도
- Map owns the visual field. Search and stop list are overlays/side panels, not competing page cards.
- TRIP map prioritizes next route and current-day stops.

### 짐 · 코디
- Weather/outfit first, bag plan second, item checklist third.
- Editable selects/weights must remain readable and tappable.

### AI 가져오기
- One primary input surface and one result surface.
- Intro copy is compact; the input/result area gets the screen real estate.

### 오늘
- Status → NOW/NEXT → field command → secondary support.
- No section may visually outrank NOW/NEXT unless it is an alert.

### 날씨 · 코디
- Temperature and rain risk are the first scan target.
- Outfit advice is second; five-day forecast is supporting detail.

### 일본어 표현
- Overview → category → phrase detail.
- Japanese phrase is largest, pronunciation second, Korean meaning third.
- SHOW TO STAFF is a full-screen field mode on mobile.

### 쇼핑 리스트
- Store/mission first, product cards second.
- Product name and price are primary; long buying advice is supporting text.

## 7. Visual QC checklist

Before release verify Chrome at 1512×982, 1024×900, and 390×844.

- root horizontal overflow = 0
- no essential text < 12px
- no mobile input text < 16px where keyboard zoom can occur
- primary touch targets >= 44px on mobile
- page side padding is visually consistent
- same hierarchy level uses the same type size across pages
- only semantic colors appear in status/action states
- PLAN and TRIP nav group order matches this document
- schedule shows ~3 readable columns on normal desktop
- maps remain usable rather than squeezed by surrounding panels

## 8. External references

- Apple Human Interface Guidelines — Layout, Typography, Color, Branding, Text Fields
- Material Design 3 — layout, typography, color roles and component hierarchy
- WCAG 2.2 — target size and contrast/accessibility guidance

