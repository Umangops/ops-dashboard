# Delivery Phases (v1 — Weekend Demo Plan)
## Operations Dashboard — Hitachi · Godrej · Samsung

**Target:** working demo on Vercel by **Monday, 05 Oct 2026**.
**Builder:** one person, vibe coding with an AI assistant (no prior coding needed).
**Stack:** Next.js + Tailwind + Supabase + SheetJS, deployed on Vercel (see `architecture.md`).

Each phase has a matching copy-paste prompt in `prompts.md`. Don't move to the next phase until the "Check" passes.

| When | Phase | Time |
|---|---|---|
| Fri night | 0. Accounts & tools setup | 1–1.5 h |
| Fri night | 1. Create project + database | 1 h |
| Sat morning | 2. Login + app layout | 2 h |
| Sat afternoon | 3. Brand page: table + search | 3 h |
| Sat evening | 4. Summary cards | 1 h |
| Sat evening | 5. First deploy to Vercel | 1 h |
| Sun morning | 6. Excel import | 3 h |
| Sun afternoon | 7. Export + record details + upload history | 2 h |
| Sun evening | 8. Mobile polish + final deploy | 2 h |
| Mon morning | 9. Demo check (no new features) | 1 h |

Times include testing and fixing. If you fall behind, see "Cut list" at the bottom.

---

## Phase 0 — Accounts & tools (Friday night)
Do these by hand (no AI needed):
- [ ] Install **Node.js LTS** from nodejs.org.
- [ ] Install **Git** from git-scm.com.
- [ ] Create a **GitHub** account.
- [ ] Create a **Supabase** account → New project (pick a region close to India, e.g. Mumbai if available; save the database password).
- [ ] Create a **Vercel** account (sign up with GitHub).
- [ ] Install your AI coding tool: **Claude Code** (desktop app or terminal — setup guide: https://docs.claude.com/en/docs/claude-code/overview) or **Cursor**.
- [ ] Make a folder `ops-dashboard` and inside it a `docs` folder. Put all 6 docs there (PRD, architecture, rules, phases, design, prompts).
- [ ] Keep the sample Excel file handy for testing.

**Check:** `node -v` and `git --version` show version numbers in the terminal; you can open your Supabase project dashboard.

## Phase 1 — Project + database (Friday night)
- [ ] AI creates the Next.js + TypeScript + Tailwind project and installs libraries. *(Prompt 1)*
- [ ] AI creates `supabase/schema.sql` from `architecture.md` §5. You paste it into Supabase → SQL Editor → Run. *(Prompt 2)*
- [ ] Copy Supabase **Project URL** and **anon public key** (Settings → API) into `.env.local`.
- [ ] Create 2 users in Supabase (one admin, one viewer) and make one admin (SQL in `architecture.md` §5).
- [ ] First git commit.

**Check:** `npm run dev` opens a page at http://localhost:3000; Supabase Table Editor shows `hitachi_records`, `godrej_records`, `samsung_records`, `imports`, `profiles`.

## Phase 2 — Login + layout (Saturday morning)
- [ ] Design tokens in `tailwind.config.ts`, Inter font. *(Prompt 3)*
- [ ] Login page, middleware protection, logout. *(Prompt 4)*
- [ ] Header + sidebar (Hitachi, Godrej, Samsung; Upload History for admin) + mobile drawer. *(Prompt 5)*

**Check:** wrong password shows an error; right password opens `/hitachi`; opening `/samsung` while logged out sends you to login; viewer doesn't see "Upload History"; on phone size the menu opens from a ☰ button.

## Phase 3 — Brand page: table + search (Saturday afternoon)
- [ ] Brand configs for all 3 brands in `lib/brands/`. *(Prompt 6)*
- [ ] `lib/query.ts` filter builder + data table with filter row under every column, global search, date range, Reset, pagination, sorting. *(Prompt 7)*
- [ ] Add a few test rows by hand in Supabase Table Editor (or wait for Phase 6) to see data.

**Check:** each brand page shows its own columns; typing part of a phone/IMEI filters rows; dropdown filters work; Reset clears everything; refreshing the page keeps filters.

## Phase 4 — Summary cards (Saturday evening)
- [ ] Cards per brand: Hitachi 4, Godrej 3, Samsung Total + plan cards. Counts follow filters; clicking a card filters the table. *(Prompt 8)*

**Check:** numbers on cards match the table count when you click each card.

## Phase 5 — First deploy (Saturday evening)
- [ ] Push to GitHub, import into Vercel, add the 2 env variables, deploy. Set Supabase Site URL to the Vercel URL. *(Prompt 9)*

**Check:** you can log in on the Vercel link from your phone.

## Phase 6 — Excel import (Sunday morning)
- [ ] `lib/clean.ts` + `lib/import.ts` + Import dialog (admin only): pick file → header check → progress → result (inserted / updated / skipped) → save to `imports` → refresh table and cards. *(Prompt 10)*

**Check (use the sample Excel):**
- Hitachi import → 3 rows, Godrej → 4 rows, Samsung → 4 rows.
- Import the same file again → 0 inserted, all updated, no duplicates.
- Phone numbers and IMEI look exactly like in Excel (no `E+` numbers, no `.0`).
- A file with a missing column shows a clear error.
- Viewer cannot see the Import button.

## Phase 7 — Export, details, history (Sunday afternoon)
- [ ] Export dialog: Excel/CSV, dashboard columns or all columns, exports exactly the filtered rows. *(Prompt 11)*
- [ ] Record detail drawer with all fields (including raw). *(Prompt 12)*
- [ ] Upload History page for admin. *(Prompt 12)*

**Check:** filter Godrej by "Not Booked" → export → file has only those rows; clicking a row shows full details.

## Phase 8 — Mobile polish + final deploy (Sunday evening)
- [ ] Mobile: 2×2 cards (Samsung swipe), filters in bottom sheet, record cards list, full-screen details, no sideways page scroll. *(Prompt 13)*
- [ ] Loading skeletons, empty and error states everywhere. *(Prompt 13)*
- [ ] Upload the **real** data files.
- [ ] Final push → Vercel redeploys. Git commit with message "demo ready". **Freeze.**

**Check:** run through the Monday demo script below on both laptop and phone.

## Phase 9 — Monday morning demo check
- [ ] Open the Vercel link in a fresh browser window; log in.
- [ ] Walk through the demo script once. Fix only real bugs.
- [ ] Keep a backup: screen recording of the full flow, in case internet fails during the meeting.

### Demo script (5 minutes)
1. Log in.
2. Hitachi page → explain cards → click "Pending Payment" card → table filters.
3. Search a phone number in the top search bar → record found → open details.
4. Samsung → type last 6 digits of an IMEI in the IMEI column → found.
5. Godrej → filter "Not Booked" → Export to Excel → open the file.
6. (Admin) Import an updated file → show inserted/updated counts → cards update.
7. Open the same link on a phone → show the mobile view.

---

## Cut list (if you run out of time — drop in this order)
1. Upload History page
2. "All columns" export option (keep dashboard columns only)
3. Clickable summary cards
4. Skipped-rows CSV download in import result
5. Record detail drawer (keep the table only)

**Never cut:** login, the 3 brand pages, column search + global search, summary cards, import, export, mobile view.

---

## After the demo (v2 — next 1–3 weeks)
- Users management page inside the app
- Server-side import for very large files (lakhs of rows)
- Login rate limiting, password rules, audit logs
- Record change history per import
- Automated tests
- Vercel Pro + Supabase paid plan with backups for real company use
