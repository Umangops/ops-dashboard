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
- **Global search** — searches the entire record (all columns + raw jsonb) via a `search_text` trigger-maintained column with `ILIKE`. Hitachi and Godrej fully working; Samsung backfill pending (see Next Steps).
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
| 9 Oct | Global search missed store/distributor names | `globalSearch` only covered a few explicit columns; store_name and other fields in raw jsonb were invisible | Added `search_text` trigger column (lower of all columns + raw::text) on all 3 tables; changed `lib/query.ts` to `ilike('search_text', '%...%')` | — |
| 9 Oct | Generated column rejected with "not immutable" | `date::text` and `jsonb::text` casts are STABLE not IMMUTABLE in PostgreSQL | Switched to BEFORE INSERT OR UPDATE trigger function (no immutability constraint) + manual backfill UPDATE | — |
| 9 Oct | Supabase "No space left on device" on Samsung GIN index | GIN trigram indexes on 149K-row table exhausted Free plan 500 MB disk | Dropped all 3 `search_trgm` GIN indexes; search_text ILIKE works via sequential scan (acceptable speed) | — |
| 9 Oct | Export downloaded only 25 rows instead of all | `queryBrand` page-size whitelist `[25,50,100]` — export's `pageSize:'1000'` fell back to 25 | Replaced whitelist with `Math.min(rawSize, 1_000)` | `bdc10a8` |

---

## 5. SQL Run in Supabase

All SQL was run in the Supabase SQL Editor. Safe to re-run (idempotent).

1. **Initial schema** (Phase 1, 2 Oct) — created `hitachi_records`, `godrej_records`, `samsung_records`, and `imports` tables with appropriate columns, primary keys, and Row Level Security enabled.

2. **`remarks_key` generated column** (3 Oct) — added to `hitachi_records` and `godrej_records`. Formula: `lower(regexp_replace(btrim(remarks), '\s+', ' ', 'g'))`. Normalises status values for case/space-insensitive grouping. Used `DO $$ IF NOT EXISTS $$` guard.

3. **Indexes on `remarks_key`** (3 Oct) — `CREATE INDEX IF NOT EXISTS` on both tables to speed up `status_groups` queries.

4. **`status_groups(p_table text)` RPC** (3 Oct) — `CREATE OR REPLACE FUNCTION`. Takes a table name, returns `(key text, label text, total bigint)` — one row per distinct `remarks_key`, with the most-common raw `remarks` as the label and the total count. Uses `mode() WITHIN GROUP`, dynamic SQL via `format('%I', p_table)`, and `SECURITY DEFINER`.

> **Not yet run:** Samsung does not have a `remarks_key` column or `status_groups` integration (Samsung uses `plan_name` for its summary cards instead).

5. **`search_text` trigger column** (9 Oct) — added plain `text` column to all 3 tables. BEFORE INSERT OR UPDATE trigger populates it as `lower(all columns || ' ' || raw::text)`. All 3 tables backfilled. GIN trigram indexes (`hit_search_trgm`, `god_search_trgm`, `sam_search_trgm`) were created then **dropped** to reclaim disk space (DB at 829 MB). Full SQL in `supabase/schema.sql`.

---

## 6. Next Steps (in priority order)

1. **Verify Hitachi and Godrej imports work end-to-end** after the `sheets` OOM fix — test with the real Excel file on localhost and then in production.
2. **Samsung import strategy** — 149K rows cannot be imported from the browser. Options: (a) chunk the Excel into multiple CSV files and import each separately, (b) have the user upload to Supabase Storage and trigger a scheduled function, (c) use the existing `/public/import-worker.js` static Web Worker (already written, needs testing). Decide before proceeding.
3. **Users / admin page** — if multiple staff members need separate logins or roles, add a simple user management page. Currently one shared login.
4. **`middleware` → `proxy` migration** — pre-existing deprecation warning from Next.js 16. Run `npx @next/codemod@canary middleware-to-proxy .` when convenient; low priority.

---

## 7. Session Log

### 2026-10-02
Project scaffolded from scratch. Created Next.js app, Supabase schema, brand config files, dashboard shell (header, sidebar, mobile drawer), login page, route protection, records table with filters, and summary cards. Deployed to Vercel.

### 2026-10-03
Long session fixing two main issues:
- **Dynamic summary cards:** Added `remarks_key` generated column and `status_groups` RPC to Supabase. Updated `SummaryCards.tsx` to call the RPC and render cards dynamically. Hidden "Plan Inactive" (Hitachi) and "Not Booked" (Godrej) from card display.
- **Import OOM crash:** Root cause found — `XLSX.read` was parsing all 3 sheets (including Samsung's 149K rows) on every import. Fixed with two-pass `bookSheets` + `sheets:targetName` approach. Also confirmed Web Worker (bundler) and Server Action routes are dead ends. Shipped commit `876544d`.
- Added `test-data/` to `.gitignore` and created `scripts/test-import.mjs` for local profiling.

### 2026-10-09
**Global search overhaul** — searching "croma" on Samsung or "Hindustan Distributor" on Godrej was returning nothing because store names were only in the `raw` jsonb column, invisible to the column-by-column OR query.
- Added `search_text text` column to all 3 tables, maintained by BEFORE INSERT OR UPDATE trigger (`lower(all columns || raw::text)`).
- Changed `lib/query.ts` global search from multi-column OR to single `ilike('search_text', '%...%')` for Hitachi/Godrej.
- Added `globalSearchColumns` override to `BrandConfig` — when set, uses per-column OR instead of `search_text` ILIKE.
- Samsung uses `globalSearchColumns` (activation_code, serial_number, store_name, branch_name, model_name, plan_name) because disk was full — no GIN index on `search_text` possible. Existing `sam_store_trgm`, `sam_code_trgm`, `sam_serial_trgm` trigram indexes make store/code/serial searches fast.
- **Issues hit during SQL:** (a) Generated column approach failed — `date::text` is STABLE not IMMUTABLE; switched to trigger. (b) GIN trigram indexes on Samsung (149K rows) caused "No space left on device" — 829 MB disk exhausted. Dropped all 3 GIN indexes. (c) DB compute quota exhausted mid-session — Samsung backfill completed in second session. (d) Vercel deployment blocked — GitHub repo was private; made public, triggered redeploy via empty commit.
- All three brands verified working in production (Vercel). Commits: `26a96b4`, `66dfff8`.

### 2026-10-09 (Session 2)
**Export all rows + data masking in downloads**
- **Root bug:** `queryBrand` had a page-size whitelist `[25, 50, 100]` — any other value fell back to 25. Export was passing 1000 but only getting 25 rows per page. Fixed: replaced whitelist with `Math.min(rawSize, 1_000)`.
- **lib/mask.ts (new):** Masking module with `getMaskType` (mobile/text2/email detection by keyword) and `maskStr`. Mobile → first2+last2 with `*` fill. Email → local part masked (first2 kept), `@domain` preserved. Address/city/state → first2 + `*`. Strings ≤4 chars → fully masked.
- **lib/export.ts rewritten:** Fetches all pages in 1000-row chunks, shows "Preparing X / Y…" progress, `isCancelled` callback checked between pages. Incremental CSV (array of chunks → Blob). Excel capped at 100K rows; larger exports auto-force CSV. Masking applied to schema columns (by `col.field` then `col.label`) and raw jsonb keys. `csvInject` prefix protection.
- **ExportDialog.tsx:** Cancel button (X) shown during fetch, `cancelledRef` pattern. Excel button disabled+dimmed when `forceCsv`. "Large export — downloading as CSV" note. Masking note: "Mobile, email, address, city and state are masked in downloads." Export button shows full unfiltered count.
- **Brand configs:** `maskedColumnKeywords: ['mobile', 'phone', 'contact', 'email', 'address', 'city', 'state']` added to all 3 brands. `globalSearchColumns` and `maskedColumnKeywords` fields added to `BrandConfig` type.
- Tested on localhost (Hitachi, 154 records with "shree jain" filter) — all 154 downloaded correctly. Commit: `bdc10a8`.
