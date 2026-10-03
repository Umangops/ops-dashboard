# Ops Dashboard — Project Progress Diary

> At the **START** of every session, read this file first.
> At the **END** of every session (or when the user says "update progress"), add a dated entry to the Session log and update DONE / NEXT.

---

## 1. Project Snapshot

**What it is:** An internal operations dashboard for tracking warranty activations across three consumer-electronics brands — Hitachi, Godrej, and Samsung. Staff import Excel/CSV files exported from a warranty system, and the dashboard lets them search, filter, and view the current status of every plan.

**Live URL:** Check the Vercel dashboard (project: `ops-dashboard` under the `Umangops` GitHub account). Deploys automatically on every push to `master`.

**Stack:**
- **Frontend/API:** Next.js 16.3.8 (App Router, Turbopack, TypeScript)
- **Database/Auth:** Supabase (PostgreSQL + Row Level Security + anon-key auth)
- **Hosting:** Vercel (Hobby tier — 10-second serverless function timeout)
- **Excel parsing:** SheetJS (`xlsx` v0.18.5)
- **UI components:** Custom (no UI library), Tailwind-like design tokens in `app/globals.css`

**Brands:**
| Brand | Table | Sheet name in Excel | Row count (approx) |
|---|---|---|---|
| Hitachi | `hitachi_records` | Hitachi | ~18,600 |
| Godrej | `godrej_records` | Godrej | ~25,500 |
| Samsung | `samsung_records` | Samsung | ~149,000 |

**Roles:** Single shared login via Supabase email/password. No per-user row-level permissions — everyone who can log in sees all brands.

---

## 2. What Is DONE

- **Login page** — Supabase email/password auth, redirect to `/hitachi` on success.
- **Route protection** — middleware redirects unauthenticated users to `/login`.
- **3 brand pages** (`/hitachi`, `/godrej`, `/samsung`) — each loaded from its brand config file in `lib/brands/`.
- **Records table** — sortable columns, sticky header, paginated display.
- **Column search** — per-field text search boxes above each searchable column.
- **Global search** — single search box that searches all `globalSearch: true` fields at once.
- **Date range filter** — calendar picker for date columns.
- **Select filter** — dropdown for status/boolean columns.
- **Dynamic summary cards (Hitachi & Godrej)** — cards are generated live from the database using the `status_groups` RPC; they reflect whatever status values are actually in the `remarks` column. "Plan Inactive" (Hitachi) and "Not Booked" (Godrej) cards are hidden from the top but those rows still count in Total and appear in the table.
- **Samsung summary cards** — show total records + top plan names (dynamic by `plan_name` count).
- **Import** — upload Excel or CSV, progress bar, inserts/updates via Supabase upsert, shows result tiles (Total / Inserted / Updated / Skipped), option to download skipped rows as CSV.
- **Export** — downloads the currently visible (filtered) rows as a CSV.
- **Upload history page** (`/uploads`) — shows all past import runs with filename, row counts, uploader name, and timestamp.
- **Mobile list view** — card-style list replaces the table on small screens.
- **Record drawer** — tap/click any row to open a side drawer showing all fields.
- **Plain-text status cells** — status values shown as normal text (no coloured bubble).
- **Stale-while-revalidate** — table data is cached client-side and refreshed in the background for faster navigation.
- **`test-data/` in `.gitignore`** — customer Excel files are never committed.
- **`scripts/test-import.mjs`** — local Node script to benchmark parsing without touching Supabase.

---

## 3. Important Decisions & Rules

### Summary cards
- Hitachi and Godrej summary cards are **fully dynamic**. They are not hardcoded.
- Each card represents a distinct status value from the `remarks` column.
- The database column `remarks_key` (a PostgreSQL **generated column**) stores a normalised version: `lower(regexp_replace(btrim(remarks), '\s+', ' ', 'g'))`. This means "Plan Active", "PLAN ACTIVE", and "  plan active " all map to the same key.
- The `status_groups(p_table text)` RPC groups rows by `remarks_key` and returns the most-common raw label for display, plus a row count.
- **"Plan Inactive"** (Hitachi) and **"Not Booked"** (Godrej) cards are intentionally hidden using `hiddenKeys` in the brand config — but those rows still count in the Total card and appear in the table when you remove filters.

### Import — what NOT to do
- **Do NOT move import to a Server Action or API route.** Vercel Hobby has a 10-second timeout. Parsing and upserting 18K+ rows takes longer. This was tried (`b89c916`) and failed with "unexpected response from server." Do not try again.
- **Do NOT use a Web Worker built through the Next.js/Turbopack bundler.** The `new Worker(new URL('./file.ts', import.meta.url))` pattern failed silently in production Turbopack builds. It was tried (`fd695a7`) and caused RESULT_CODE_HUNG. Do not repeat.
- **Import runs entirely in the browser main thread** (current approach). This is acceptable because the `sheets` option now limits memory use. If the user wants true background processing in the future, the only safe path is a static `/import-worker.js` (already exists in `/public/`) combined with the `accessToken` passed from the client — but this needs end-to-end testing before enabling.

### XLSX memory — the `sheets` option is mandatory
- `XLSX.read(buffer)` without a `sheets` option parses **all sheets** in the workbook. The test file has 3 sheets totalling ~193K rows.
- **Before the fix**, importing any brand parsed all 193K rows and crashed the browser with "Aw, Snap! Out of Memory."
- **The fix** (commit `876544d`): first call `XLSX.read(buffer, { bookSheets: true })` to get sheet names cheaply, then call `XLSX.read(buffer, { sheets: targetSheetName, cellFormula: false, cellHTML: false, cellStyles: false, bookVBA: false })` to parse only the one needed sheet.
- This must never be removed.

### Data size & Samsung
- Hitachi (~18.6K rows × 49 cols) uses ~390 MB of browser heap during import — manageable.
- Godrej (~25.5K rows × 46 cols) uses ~500 MB — borderline, may fail on low-memory machines.
- Samsung (~149K rows × 24 cols) — **will OOM in any browser**. Do not try to import Samsung from the browser with the current approach. Future plan: chunked CSV upload or server-side processing.
- Before importing Samsung, check Supabase free-tier database size limit (500 MB on Free plan).

### Phone / IMEI / Plan ID are always text
- Excel can silently convert long numeric IDs (e.g. IMEI `358967XXXXXXXXXX`) to scientific notation (`3.59E+14`) in CSV exports. SheetJS reads with `raw: true` to avoid this for XLSX, but CSV exports from Excel already have the damage done.
- Warn users to use XLSX format (not CSV exported from Excel) when columns contain long numeric IDs.

### Git / deployment rule
- **Never commit or push** unless the user explicitly says so. Always test on `localhost:3000` first.

---

## 4. Problems Faced & Fixes

| Date | Problem | Cause | Fix | Commit |
|---|---|---|---|---|
| 2 Oct | Status cells showed as coloured bubbles | Styling applied globally to status column | Changed to plain-text rendering | `ad01994` |
| 3 Oct | Summary cards showed hardcoded counts | Cards were counting locally filtered rows | Added `remarks_key` generated column + `status_groups` RPC; SummaryCards now calls RPC | `9e77cdd` → `299ea98` |
| 3 Oct | "Not Booked" card appeared on Godrej | Not included in `hiddenKeys` | Added `'not booked'` to `hiddenKeys` in `lib/brands/godrej.ts` | `a633be4` |
| 3 Oct | Browser froze ("Page Unresponsive") on large import | `XLSX.read` blocked the main thread for 25K × 46 cells | Tried Web Worker via bundler → FAILED (`fd695a7`). Tried Server Action → FAILED (`b89c916`). Tried static `/import-worker.js` → committed before testing, reverted | `d0fb96a` |
| 3 Oct | "Aw, Snap! Out of Memory" on every import | `XLSX.read` without `sheets` option parsed all 3 sheets (193K rows total, including Samsung's 149K) | Added two-pass read: `bookSheets:true` then `sheets:targetName` + lean options | `876544d` |

---

## 5. SQL Run in Supabase

All SQL was run in the Supabase SQL Editor. Safe to re-run (idempotent).

1. **Initial schema** (Phase 1, 2 Oct) — created `hitachi_records`, `godrej_records`, `samsung_records`, and `imports` tables with appropriate columns, primary keys, and Row Level Security enabled.

2. **`remarks_key` generated column** (3 Oct) — added to `hitachi_records` and `godrej_records`. Formula: `lower(regexp_replace(btrim(remarks), '\s+', ' ', 'g'))`. Normalises status values for case/space-insensitive grouping. Used `DO $$ IF NOT EXISTS $$` guard.

3. **Indexes on `remarks_key`** (3 Oct) — `CREATE INDEX IF NOT EXISTS` on both tables to speed up `status_groups` queries.

4. **`status_groups(p_table text)` RPC** (3 Oct) — `CREATE OR REPLACE FUNCTION`. Takes a table name, returns `(key text, label text, total bigint)` — one row per distinct `remarks_key`, with the most-common raw `remarks` as the label and the total count. Uses `mode() WITHIN GROUP`, dynamic SQL via `format('%I', p_table)`, and `SECURITY DEFINER`.

> **Not yet run:** Samsung does not have a `remarks_key` column or `status_groups` integration (Samsung uses `plan_name` for its summary cards instead).

---

## 6. Next Steps (in priority order)

1. **Verify Hitachi and Godrej imports work end-to-end** after the `sheets` OOM fix — test with the real Excel file on localhost and then in production.
2. **Check Supabase database storage** before attempting any Samsung import — Free plan limit is 500 MB. Run `SELECT pg_size_pretty(pg_database_size(current_database()))` in the SQL Editor.
3. **Samsung import strategy** — 149K rows cannot be imported from the browser. Options: (a) chunk the Excel into multiple CSV files and import each separately, (b) have the user upload to Supabase Storage and trigger a scheduled function, (c) use the existing `/public/import-worker.js` static Web Worker (already written, needs testing). Decide before proceeding.
4. **Users / admin page** — if multiple staff members need separate logins or roles, add a simple user management page. Currently one shared login.
5. **`middleware` → `proxy` migration** — pre-existing deprecation warning from Next.js 16. Run `npx @next/codemod@canary middleware-to-proxy .` when convenient; low priority.

---

## 7. Session Log

### 2026-10-02
Project scaffolded from scratch. Created Next.js app, Supabase schema, brand config files, dashboard shell (header, sidebar, mobile drawer), login page, route protection, records table with filters, and summary cards. Deployed to Vercel.

### 2026-10-03
Long session fixing two main issues:
- **Dynamic summary cards:** Added `remarks_key` generated column and `status_groups` RPC to Supabase. Updated `SummaryCards.tsx` to call the RPC and render cards dynamically. Hidden "Plan Inactive" (Hitachi) and "Not Booked" (Godrej) from card display.
- **Import OOM crash:** Root cause found — `XLSX.read` was parsing all 3 sheets (including Samsung's 149K rows) on every import. Fixed with two-pass `bookSheets` + `sheets:targetName` approach. Also confirmed Web Worker (bundler) and Server Action routes are dead ends. Shipped commit `876544d`.
- Added `test-data/` to `.gitignore` and created `scripts/test-import.mjs` for local profiling.
