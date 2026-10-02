# Copy-Paste Prompts for the AI Assistant
## Operations Dashboard — Weekend Build

**How to use:** open your project folder (`ops-dashboard`) in Claude Code or Cursor. Paste **one prompt at a time**, in order. After each prompt: test in the browser, then send the "Save" prompt. Phase numbers match `phases.md`.

**After every working step, send this:**
> Everything works. Commit this to git with a short, clear message.

**When you get an error, send this (with the full error pasted below it):**
> I got this error. Explain the cause in one simple sentence, then fix it. Run `npm run build` after fixing.
> ```
> (paste full error here)
> ```

---

## Prompt 0 — Start every new chat with this
```
You are helping me build a project. I am not a developer, so explain things simply.
Read every file in the docs/ folder first: PRD.md, architecture.md, rules.md, phases.md, design.md, prompts.md.
Follow rules.md strictly. Use only the stack in architecture.md (Next.js + TypeScript + Tailwind + Supabase + SheetJS, deployed on Vercel).
Work one step at a time. After each step run `npm run build`, fix errors, then tell me in simple words what you did and exactly how I can test it.
Reply "Ready" when you have read the docs, with a 5-line summary of the project.
```

## Prompt 1 — Create the project (Phase 1)
```
Create the Next.js project in this folder (keep the existing docs/ folder):
- Next.js latest with App Router, TypeScript, Tailwind CSS, ESLint, src directory NOT used, import alias "@/*".
- Install: @supabase/supabase-js, @supabase/ssr, xlsx, date-fns, lucide-react.
- Create the folder structure from architecture.md §3 (empty placeholder files are fine).
- Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY placeholders, and make sure .env.local is in .gitignore.
- Create lib/supabase/client.ts and lib/supabase/server.ts using @supabase/ssr.
- Initialise git.
Then tell me how to run it and where to paste my Supabase URL and anon key.
```

## Prompt 2 — Database (Phase 1)
```
Create supabase/schema.sql with exactly the SQL from architecture.md §5.
Then give me click-by-click steps to:
1. Run it in the Supabase SQL Editor.
2. Find my Project URL and anon public key and put them in .env.local.
3. Create two users (admin and viewer) in Supabase Authentication with "Auto confirm".
4. Make the admin user an admin with the SQL update command, and set full names for both.
```

## Prompt 3 — Design tokens (Phase 2)
```
Set up the design system from design.md §2–§5:
- Add all colour tokens (neutrals, primary, semantic tones info/success/warning/danger/neutral) to tailwind.config.ts as CSS variables.
- Inter font via next/font with system fallbacks, tabular numbers utility.
- Radius, shadow and breakpoint values from design.md.
- Create base UI components in components/ui: Button (primary, secondary, ghost; loading state; icon), Input (with optional search icon), Select, Modal, Drawer (right side on desktop, bottom/full sheet on mobile), Pill (tone-based outlined pill from design.md §7.3), Skeleton, EmptyState.
Show me a temporary /preview page with all components so I can check the look.
```

## Prompt 4 — Login (Phase 2)
```
Build login and route protection (architecture.md §6, design.md §7.1):
- /login page: centred card, app name "Ops Dashboard", email, password with show/hide, "Sign in" button with loading state, clear error messages.
- Use supabase.auth.signInWithPassword.
- middleware.ts: not logged in → redirect to /login; logged in and on /login → redirect to /hitachi. Root "/" redirects to /hitachi.
- Logout function.
No signup page.
```

## Prompt 5 — App layout (Phase 2)
```
Build the dashboard shell in app/(dashboard)/layout.tsx following design.md §6 and §8:
- Header: logo icon + "Ops Dashboard" on the left; on the right user's full name, role badge, and a menu with Logout. Load name and role from the profiles table.
- Sidebar (260px, white): Hitachi, Godrej, Samsung. Admin only: a divider then "Upload History". Active item has the dark left bar + subtle background like design.md. Collapse button (‹) shrinks it to icons.
- Mobile (<768px): header shows ☰ button that opens the sidebar as a slide-in drawer; drawer closes after choosing a page.
- Content area background --bg-app with padding from design.md.
- Create app/(dashboard)/[brand]/page.tsx that shows "<Brand> Overview" for hitachi/godrej/samsung and a 404 for anything else.
```

## Prompt 6 — Brand configs (Phase 3)
```
Create lib/brands/types.ts, hitachi.ts, godrej.ts, samsung.ts and index.ts exactly as described in architecture.md §4 and PRD.md §5.
- Godrej payment_status is boolean; in the UI show "Paid"/"Unpaid".
- Samsung column order follows design.md §7.2 (IMEI right after Plan ID).
- Add getBrand(key) that returns the config or null.
- Add mobileFields per brand from design.md §8.
Do not build UI in this step.
```

## Prompt 7 — Table + search (Phase 3)
```
Build the records table on the brand page (PRD §6.4, §6.5; architecture §7; design §7.2):
- lib/query.ts: one function that takes (brandConfig, filters) and returns a Supabase query. Supports column search (ilike, partial, case-insensitive, escape % and _), dropdown (eq; Paid/Unpaid → true/false), date range on brand.dateField, global search across globalSearch columns with .or(), sort, pagination with exact count. Phone search strips spaces, +91 and leading 0. Remove , ( ) % from global search text.
- FilterBar: global search (placeholder "Search by Plan ID, phone, IMEI, CRM ID…"), date range with presets (Today, Last 7 days, Last 30 days, This month, Custom), Reset button, "N filters active" text. Leave space on the right for Import and Export buttons (add them later).
- DataTable: header labels uppercase; directly under each header a filter control based on column.filter (search input / select with "All" / date range). Sticky header, horizontal scroll inside the container, Plan ID column sticky, rows 72px, hover background, status pills using statusTones, copy button on copyable columns, empty cells show "—", long text truncated with tooltip.
- Footer: "Showing 1–25 of N", pagination, page size 25/50/100. Clicking a column header sorts.
- Debounce text inputs 400ms. Keep all filters in the URL query string so refresh keeps them.
- Loading skeleton rows, empty state "No records match your filters" with Reset, error state with Retry.
Test with all three brands.
```

## Prompt 8 — Summary cards (Phase 4)
```
Build SummaryCards above the filter bar (PRD §6.3, architecture §8, design §7.2):
- Hitachi: Total Plans + Plan Active + Plan Inactive + Pending Payment.
- Godrej: Total Plans + Contract Booked + Not Booked (3 cards fill the row).
- Samsung: Total Plans + top 3 plan names + "Others", using the samsung_plan_counts RPC.
- Counts use the same filters as the table (reuse lib/query.ts with head:true count), run in parallel.
- Card style: white, label uppercase, big number in tone colour, icon tile with soft tone background (document / check-circle / ban / clock from lucide).
- Clicking a status card sets that status filter; clicking again clears it; Total clears it. Selected card has a 2px tone border.
- Skeleton while loading. Mobile: 2×2 grid; Samsung cards scroll horizontally with snap.
- Under the page title show "Last updated: <date time> by <name>" from the latest row in imports for this brand (hide if none).
```

## Prompt 9 — Deploy to Vercel (Phase 5)
```
Help me deploy to Vercel. Give me click-by-click steps for:
1. Creating a new private GitHub repository and pushing this project (make sure .env.local is NOT pushed).
2. Importing the repo in Vercel and adding NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
3. Setting the Supabase Auth "Site URL" to my Vercel URL.
4. Checking that login works on the live link.
Before that, run npm run build and fix any errors.
```

## Prompt 10 — Excel import (Phase 6)
```
Build the Excel/CSV import (PRD §6.6, architecture §9, design §7.5). Everything runs in the browser, never send the file to an API route.
- lib/clean.ts: cleanCell ("-", "", NA, N/A → null), toText (numbers → string without E+ or .0, keeps all digits), parseDate (JS Date, Excel serial, "30/Sep/26", "2026-01-01 00:00:00.000000", DD-MM-YYYY → YYYY-MM-DD, else null), parseBool, normaliseHeader (lowercase, trim, "_" → " ", collapse spaces).
- lib/import.ts: read file with SheetJS (cellDates:true), choose the sheet named like the brand else the first, check headers against brand config (show missing ones and stop), map display columns to DB fields, put all other columns (except ignoredHeaders) into raw, skip rows without activation code, de-duplicate by activation code (last wins), then in batches of 500: count existing codes, upsert with onConflict 'activation_code' and updated_at = now. Track inserted / updated / skipped. Finally insert a row into imports with counts, brand, file name, user id and name.
- ImportDialog (admin only, "Import" button in the filter bar): drag-and-drop or browse, .xlsx/.csv only, shows brand name, progress bar, result tiles (Total, Inserted, Updated, Skipped), "Download skipped rows" CSV if any, Done button. After success refresh the table and cards.
Then tell me how to test it with my sample Excel file (sheets Hitachi, Godrej, Samsung).
```

## Prompt 11 — Export (Phase 7)
```
Build Export (PRD §6.7, architecture §10, design §7.6):
- "Export" button in the filter bar (all users).
- ExportDialog: shows "N records match your current filters", format Excel/CSV, columns "Dashboard columns" or "All columns" (adds raw fields).
- Fetch the filtered rows in pages of 1000 using lib/query.ts, show progress, max 50,000 rows (show a message above that).
- Use UI labels as headers, dates as DD MMM YYYY, booleans as Paid/Unpaid. Escape values starting with = + - @ by adding a leading '.
- File name <Brand>_Export_<YYYY-MM-DD>.xlsx or .csv. Toast "Export ready" when done.
```

## Prompt 12 — Details + Upload History (Phase 7)
```
1. RecordDrawer (design §7.4): clicking a table row opens a right drawer (full-screen on mobile) with Plan ID (copyable) + status pill on top, "Key details" section with display columns, and a collapsible "All data" section listing every raw field alphabetically. Footer shows last updated time. Close on Esc, overlay click or X.
2. Upload History page at /uploads (admin only, viewers get redirected): table with Date & time, Brand, File name, Uploaded by, Rows, Inserted, Updated, Skipped. Filter by brand. Newest first.
```

## Prompt 13 — Mobile polish + states (Phase 8)
```
Polish for mobile and final quality (design §8, §10, §11):
- Below 768px: the table becomes RecordCardList (Plan ID + status pill on top, then the brand's mobileFields), "Load more" instead of page numbers.
- A "Filters" button with active-count badge opens a bottom sheet with every column filter and the date range, with Apply and Reset.
- Import and Export dialogs become full-screen sheets on mobile.
- Touch targets at least 44px; no page-level horizontal scroll at 360px width.
- Make sure every data area has loading, empty and error states.
- Add aria-labels to icon-only buttons and visible focus rings.
- Remove the temporary /preview page.
Check the layout at 360px, 768px and 1280px and fix anything broken. Run npm run build.
```

## Prompt 14 — Final check (Sunday night)
```
Do a final review before my demo:
1. Run npm run build and fix all errors and warnings you can.
2. Check against the "Check" items for every phase in phases.md and tell me which ones might fail.
3. Make sure no keys are in the code, .env.local is ignored by git, and there are no console.log calls with customer data.
4. Give me a short list of anything I should test by hand on the live Vercel link.
Do not add new features.
```
