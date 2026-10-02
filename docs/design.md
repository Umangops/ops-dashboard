# Design System & UI Specification
## Operations Dashboard — Hitachi · Godrej · Samsung

The layout follows the reference "Claims Overview" template: white header, left sidebar, light-grey content area, four white summary cards with tinted icon tiles, a filter bar, and a white table with a filter row under the column headers. The template is a **layout reference only**; the app uses its own name and logo ("Ops Dashboard") and shows brands as text labels.

---

## 1. Design Principles

1. **Find it fast** — search is always visible; every column can be filtered.
2. **Calm and scannable** — lots of white space, one accent colour per meaning.
3. **Same layout, every brand** — users learn one screen.
4. **Mobile is first-class** — every action available on a phone.

## 2. Colour Tokens

Defined once in `tailwind.config.ts` as CSS variables. Components use tokens, never hex values.

### 2.1 Neutrals
| Token | Hex | Usage |
|---|---|---|
| `--bg-app` | `#F5F7FA` | Page background (content area) |
| `--bg-surface` | `#FFFFFF` | Header, sidebar, cards, table |
| `--bg-subtle` | `#F0F2F5` | Active sidebar item, table row hover |
| `--border` | `#E5E7EB` | Card, input and table borders |
| `--border-strong` | `#D1D5DB` | Input hover |
| `--text-primary` | `#111827` | Headings, table text |
| `--text-secondary` | `#4B5563` | Column headers, labels |
| `--text-muted` | `#9CA3AF` | Placeholders, helper text |

### 2.2 Brand / action
| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#4F5FE8` | Links (Plan ID), primary buttons, focus ring, "Total" card |
| `--primary-hover` | `#3E4ED6` | |
| `--primary-soft` | `#E8EBFD` | Total card icon tile |

### 2.3 Semantic tones (cards and pills)
| Tone | Text / number | Soft background | Pill border | Used for |
|---|---|---|---|---|
| `info` | `#4F5FE8` | `#E8EBFD` | `#C7CDFA` | Total Plans |
| `success` | `#2E9E5B` | `#DDF5E7` | `#A7E3C1` | Plan Active, Contract Booked, Paid |
| `warning` | `#D4A017` | `#FDF3D0` | `#F2D675` | Pending Payment, Pending |
| `danger` | `#E5252A` | `#FDE2E2` | `#F7B4B5` | Plan Inactive, Not Booked, Unpaid |
| `neutral` | `#4B5563` | `#F0F2F5` | `#D1D5DB` | Unknown / other values |

Samsung plan cards cycle through: `info`, `success`, `warning`, then a violet tone (`#7C3AED` / `#EDE7FD`) for "Others".

### 2.4 Dark mode
Not in v1 scope. Tokens are structured so a dark theme can be added by redefining variables.

## 3. Typography

Font: **Inter** (Google Fonts), fallback `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Use tabular numbers (`font-variant-numeric: tabular-nums`) for counts, IDs, phone and IMEI.

| Style | Size / line height | Weight | Usage |
|---|---|---|---|
| Page title | 24 / 32 | 600 | "Hitachi Overview" |
| Card label | 13 / 16, uppercase, letter-spacing 0.06em | 600 | "TOTAL PLANS" |
| Card number | 36 / 40 (mobile 28 / 32) | 700 | Count |
| Table header | 13 / 16, uppercase, letter-spacing 0.06em | 600 | Column names |
| Body / table cell | 14 / 20 | 400 | |
| Link cell (Plan ID) | 14 / 20 | 600 | Primary colour |
| Small / helper | 12 / 16 | 400 | Hints, timestamps |
| Button | 15 / 20 | 500 | |

## 4. Spacing, Radius, Shadow

- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Content padding: 40 desktop, 24 tablet, 16 mobile.
- Gap between summary cards: 20 desktop, 12 mobile.
- Radius: inputs/buttons 6 px, cards/table container 10 px, icon tiles 8 px, pills 9999 px.
- Shadow (cards, table): `0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)`.
- Header shadow: `0 2px 4px rgba(16,24,40,0.06)`.

## 5. Breakpoints

| Name | Min width | Layout |
|---|---|---|
| `sm` (mobile) | 0 | Drawer nav, 2×2 cards, card-list records, filters in bottom sheet |
| `md` (tablet) | 768 px | Drawer nav, 4 cards in a row (2×2 if tight), table view |
| `lg` (desktop) | 1024 px | Fixed sidebar, 4 cards in a row, full table |
| `xl` | 1440 px | Max content width 1600 px, centred |

## 6. Layout Structure (desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [logo] Ops Dashboard                                     Ravi · Admin (👤) ▾ │ ← Header 72px
├───────────────┬──────────────────────────────────────────────────────────────┤
│  (‹)          │  Hitachi Overview                                            │
│               │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ ▌Hitachi      │  │TOTAL    │ │PLAN     │ │PLAN     │ │PENDING  │  ← Summary   │
│  Godrej       │  │PLANS [▣]│ │ACTIVE[✓]│ │INACT.[⊘]│ │PAYMT [◷]│    cards     │
│  Samsung      │  │ 4,312   │ │ 3,950   │ │ 210     │ │ 152     │              │
│ ───────────   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│  Upload       │  [🔍 Search Plan ID, phone, IMEI…] [📅 Sep 01 – Oct 01]        │
│  History*     │                                [⟲ Reset] [⇪ Import*] [⇩ Export]│
│  Users*       │  ┌──────────────────────────────────────────────────────────┐ │
│               │  │ PLAN ID   PURCHASE DATE  CUSTOMER NAME  PHONE   STATUS   │ │
│ Sidebar 260px │  │ [Search]  [date range]   [Search]       [Search][All ▾]  │ │
│               │  │──────────────────────────────────────────────────────────│ │
│               │  │ WBN3560015  05 Apr 2025  SHYAM S. GHOSH  97325… (Pending)│ │
│               │  │ …                                                        │ │
│               │  │ Showing 1–25 of 4,312          ‹ 1 2 3 … 173 ›  [25 ▾]   │ │
│               │  └──────────────────────────────────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────────────────────┘
                                                        * Admin only
```

Card icon per tone: Total → document, success → check-circle, danger → ban/stop, warning → clock. Icons from **lucide**.

## 7. Screens

### 7.1 Login
- Centred white card (max-width 400 px) on `--bg-app`; app logo + "Ops Dashboard" on top.
- Fields: Email, Password (show/hide toggle). "Sign in" primary full-width button.
- Errors: inline under field (validation) or banner above form ("Invalid email or password", "Account locked. Try again in 15 minutes").
- Button shows spinner and is disabled while submitting. Enter key submits.

### 7.2 Brand page (Hitachi / Godrej / Samsung)
Order: page title → summary cards → filter bar → table.

**Page title**: `<Brand> Overview` + small text "Last updated: 02 Oct 2026, 10:42 by Admin" (from latest completed import).

**Summary cards** (per brand config):
| Brand | Cards |
|---|---|
| Hitachi | Total Plans (info) · Plan Active (success) · Plan Inactive (danger) · Pending Payment (warning) |
| Godrej | Total Plans (info) · Contract Booked (success) · Not Booked (danger) |
| Samsung | Total Plans (info) · one card per plan name (top 3) · Others |

- Godrej has 3 cards → they stretch to fill the row (`grid-cols-3`).
- Card is clickable: hover lifts shadow; selected state shows a 2 px border in the tone colour; clicking again clears the filter. Total card clears the status filter.
- Loading: skeleton blocks for label and number.

**Filter bar**
- Left: global search input (placeholder "Search by Plan ID, phone, IMEI, CRM ID…", width 360 px), date-range picker (shows "Sep 01, 2026 – Oct 01, 2026"; presets: Today, Last 7 days, Last 30 days, This month, Custom).
- Right: `Reset` (secondary), `Import` (secondary, Admin only), `Export` (secondary with download icon).
- When filters are active, show a small "N filters active" text next to Reset.

**Table**
- Container: white, radius 10, shadow, internal horizontal scroll.
- Header row: uppercase labels, `--text-secondary`, padding 16 × 24. Sort icon appears on hover; active sort shows ▲/▼.
- Filter row (directly under header labels, as in the template):
  - Text column → input with search icon, placeholder "Search", height 40.
  - Dropdown column → select with "All" default, values from `/filter-options`.
  - Date column → compact date-range input.
- Body rows: height 72 desktop, padding 16 × 24, bottom border `--border`, hover `--bg-subtle`, cursor pointer.
- Plan ID cell: link style (primary, semi-bold). Phone / IMEI / Plan ID cells show a copy icon on hover (always visible on touch).
- Long text (Additional Remarks, model names) truncates with ellipsis at 280 px; full text in tooltip and detail drawer.
- Empty cells show `—` in `--text-muted`.
- Sticky header on vertical scroll; first column (Plan ID) sticky on horizontal scroll.
- Footer: "Showing 1–25 of 4,312" left; pagination + page-size select right.

**Column order per brand**
- Hitachi: Plan ID · Purchase Date · Customer Name · Phone Number · Serial Number · CRM ID · Status · Additional Remarks
- Godrej: Plan ID · Warranty Status · Customer Name · Phone Number · Serial Number · Payment Status · Contract ID · Status · Additional Remarks
- Samsung: Plan ID · Purchase Date · IMEI / Serial Number · Device Model · Plan Name · Store Name · Branch Name

(Samsung puts IMEI right after Plan ID because it is the main lookup key.)

### 7.3 Status pills
Outlined pill like the template: tone-coloured text, 1 px tone border, soft background at 40% opacity, padding 4 × 12, 14 px text.

| Value | Tone |
|---|---|
| Plan Active, Contract Booked, Active, Paid | success |
| Pending Payment, Pending | warning |
| Plan Inactive, Not Booked, Unpaid | danger |
| Samsung plan names | info |
| Anything else | neutral |

Mapping lives in the brand config, not in components.

### 7.4 Record detail drawer
- Opens from the right, width 480 px (desktop), full-screen sheet on mobile.
- Header: Plan ID (large, copyable) + status pill + close button.
- Section 1 "Key details": display columns as label/value pairs.
- Section 2 "All data": every raw column, alphabetical, collapsible.
- Footer: "Last updated 02 Oct 2026 via import <file name>".
- Closes on Esc, overlay click, or back gesture.

### 7.5 Import dialog (Admin)
Modal, width 560 px.
1. **Select**: drop zone ("Drag & drop .xlsx or .csv, or browse", max 25 MB). Shows brand being imported. Sheet selector appears if needed.
2. **Uploading**: file name + progress bar.
3. **Processing**: progress bar with % and "You can close this window — processing continues in the background."
4. **Result**: four stat tiles — Total rows, Inserted (success), Updated (info), Skipped (danger) — plus "Download error report" link when skipped > 0. Primary button "Done".
- Header-validation error: red banner listing missing columns, button "Choose another file".

### 7.6 Export dialog
Modal, width 480 px.
- Info line: "**1,248 records** match your current filters."
- Format: segmented control `Excel (.xlsx)` | `CSV`.
- Columns: radio — "Dashboard columns (8)" / "All columns (49)".
- Primary button "Export". Small exports download immediately; large ones show progress then a "Download" button; a toast confirms.
- If > 200,000 rows, Excel option is disabled with a hint "Use CSV for more than 200,000 rows."

### 7.7 Upload History (Admin)
Table: Date & time · Brand · File name · Uploaded by · Rows · Inserted · Updated · Skipped · Status (pill) · Error report (link). Filters: brand, status, date range.

### 7.8 Users (Admin)
Table: Name · Email · Role (pill) · Status (Active/Inactive) · Last login · Actions (Edit, Reset password, Activate/Deactivate). "Add user" primary button opens a modal (Name, Email, Role, temporary password generated and shown once).

## 8. Mobile Behaviour (< 768 px)

```
┌───────────────────────────┐
│ ☰  Ops Dashboard     (👤) │  ← Header 56px, hamburger opens nav drawer
├───────────────────────────┤
│ Hitachi Overview          │
│ ┌──────────┐┌──────────┐  │
│ │TOTAL     ││ACTIVE    │  │  ← 2×2 card grid (Samsung: horizontal swipe)
│ │4,312     ││3,950     │  │
│ └──────────┘└──────────┘  │
│ ┌──────────┐┌──────────┐  │
│ │INACTIVE  ││PENDING   │  │
│ │210       ││152       │  │
│ └──────────┘└──────────┘  │
│ [🔍 Search Plan ID, phone…]│  ← global search full width
│ [⚙ Filters (2)] [⇩ Export]│  ← filters open bottom sheet
├───────────────────────────┤
│ WBN3560015    (Pending)   │  ← record card
│ SHYAM SUNDAR GHOSH        │
│ 📞 9732568546   📅 05 Apr │
│ SN SE230S29811            │
├───────────────────────────┤
│ …                         │
│      [ Load more ]        │
└───────────────────────────┘
```

- **Navigation**: hamburger → left drawer with brands (and admin items). Drawer closes on selection.
- **Cards**: 2×2 grid; number 28 px; icon tile 40 px. Samsung cards scroll horizontally with snap.
- **Filters**: "Filters" button opens a bottom sheet containing every column filter + date range, with "Apply" and "Reset" buttons. Badge shows active filter count.
- **Records**: the table becomes a list of record cards. Each card shows Plan ID + status pill on top and 3–4 key fields (per brand: Hitachi/Godrej → name, phone, serial; Samsung → IMEI, model, plan, store). Tap opens full-screen detail.
- **Pagination**: "Load more" button (infinite list), not page numbers.
- **Import / Export dialogs**: full-screen sheets.
- Touch targets ≥ 44 × 44 px; no page-level horizontal scroll at 360 px.

Tablet (768–1023 px): drawer navigation, table view with horizontal scroll, filter row stays under headers.

## 9. Components Inventory

| Component | Variants / notes |
|---|---|
| Button | primary, secondary (white + border, as Reset/Report in template), ghost, danger; sizes sm/md; loading state; icon left |
| Input | default, with search icon, error; height 40 |
| Select | single, multi (status), searchable when > 10 options |
| DateRangePicker | presets + calendar; mobile uses native-feeling sheet |
| SummaryCard | label, value, icon, tone, selected, loading |
| StatusPill | tone-based, outlined |
| DataTable | config-driven columns, filter row, sticky header/first column, sort, pagination |
| RecordCard | mobile list item |
| Drawer / Sheet | right drawer (desktop), bottom/full sheet (mobile) |
| Modal | sizes sm (400), md (480), lg (560) |
| Toast | success, error, info; bottom-right desktop, top mobile |
| Skeleton | text line, number, table row, card |
| EmptyState | icon, title, message, action |
| CopyButton | icon button with "Copied" tooltip |
| Sidebar / NavItem | active (left 4 px dark bar + subtle bg, as in template), collapsed (icons only) |
| UserMenu | name, role, change password, logout |

## 10. States & Feedback

| State | Treatment |
|---|---|
| Loading (first load) | Skeleton cards + 8 skeleton table rows |
| Loading (filter change) | Keep previous rows, show thin progress bar at top of table |
| Empty (no data yet) | "No data yet for Hitachi" + "Import a file" button (Admin) |
| Empty (no results) | "No records match your filters" + "Reset filters" |
| Error | Inline card "Couldn't load records" + "Retry" |
| Success actions | Toast ("Export ready", "Import completed: 120 inserted, 45 updated") |
| Session expired | Redirect to Login with banner "Your session expired. Please sign in again." |

## 11. Accessibility

- Contrast ≥ 4.5:1 for text (pill text colours above pass on their soft backgrounds).
- Status is never shown by colour alone — pills always have text.
- Visible focus ring: 2 px `--primary` with 2 px offset.
- Table uses semantic `<table>`, `<th scope="col">`; filter inputs have `aria-label="Search <column>"`.
- Drawers/modals trap focus and return focus to the trigger on close.
- Respect `prefers-reduced-motion` (disable slide animations).

## 12. Motion

- Drawer/sheet: 200 ms ease-out slide.
- Modal: 150 ms fade + scale from 98%.
- Card hover: 150 ms shadow transition.
- No animations on table data refresh.
