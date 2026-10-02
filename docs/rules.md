# Project Rules (v1 — Demo / MVP)
## Operations Dashboard — Hitachi · Godrej · Samsung

This project is built with an AI coding assistant. **AI assistant: read this file and follow it in every task.** Part A is for the AI. Part B is for the person giving the instructions.

---

# Part A — Rules for the AI assistant

## A1. Golden rules
1. **Brand config is the single source of truth.** Columns, labels, filters, cards and import headers come from `lib/brands/*.ts`. Never hard-code a brand's columns inside a component.
2. **One brand page for all brands:** `app/(dashboard)/[brand]/page.tsx`. Do not create separate Hitachi/Godrej/Samsung pages.
3. **IDs are always text.** Phone, IMEI, serial number, Plan ID (activation code), CRM ID, Contract ID are `string` in TypeScript and `text` in the database. Never convert them to numbers.
4. **Server-side data work.** Pagination, search, filters and counts are done by Supabase queries. Never download a whole table to filter it in the browser (export is the only exception, and it fetches in pages).
5. **Excel is processed in the browser** with SheetJS. Do not upload Excel files to a Next.js API route (Vercel size limits).
6. **Keep it simple.** Use only the stack in `architecture.md`: Next.js (App Router) + TypeScript + Tailwind + lucide-react + Supabase (`@supabase/supabase-js`, `@supabase/ssr`) + SheetJS (`xlsx`) + date-fns. Ask before adding any other library.
7. **Follow the docs.** Features → `PRD.md`. Structure and logic → `architecture.md`. Look and feel → `design.md`. Order of work → `phases.md`.

## A2. How to work
- Do **one step at a time**. Finish it, make sure it builds, then stop and summarise what you did and how to test it.
- Before finishing any step, run `npm run build` and fix all errors.
- Change only the files needed for the current step. Do not rewrite working code unless asked.
- If something is unclear, ask one short question instead of guessing.
- Explain results in simple, non-technical words — the user is not a developer.
- When you need the user to do something outside the code (Supabase dashboard, Vercel settings), give numbered click-by-click steps.

## A3. Code style
- TypeScript everywhere. Avoid `any`.
- Files: components `PascalCase.tsx`, other files `camelCase.ts`. Database tables/columns `snake_case`.
- Keep components under ~200 lines; split if bigger.
- Use Tailwind with the colour tokens from `design.md` (set in `tailwind.config.ts`). No random hex colours inside components.
- All Supabase access goes through `lib/supabase/client.ts` / `server.ts` and helper functions in `lib/` — not scattered across components.
- Every screen that loads data shows: loading skeleton, empty state, error message with Retry.

## A4. UI rules
- Match `design.md`: header, left sidebar (brands), summary cards, filter bar, table with a filter control under every column header.
- **Mobile-first and responsive.** Check layouts at 360 px, 768 px and 1280 px. On mobile: drawer menu, 2×2 cards, filters in a bottom sheet, records as cards instead of a table.
- Text search inputs are debounced (400 ms).
- Filters are kept in the URL query string.
- Status values always show as coloured pills with text.
- Plan ID, phone and IMEI have a copy button.
- Hide admin-only things (Import button, Upload History) from viewers.

## A5. Data rules
- Excel header matching ignores case, extra spaces and underscores (`Store_Name` = `store name`).
- Cells containing `-`, empty, `NA` or `N/A` become `null`.
- Dates are stored as `YYYY-MM-DD`; shown as `DD MMM YYYY` (e.g. `05 Apr 2025`).
- Upsert on `activation_code` — never create duplicates.
- Columns that are not display columns go into the `raw` JSON column. Skip formula columns listed in `ignoredHeaders`.
- Rows without an activation code are skipped and listed in the import result.
- Export escapes values starting with `=`, `+`, `-`, `@`.

## A6. Minimum safety (keep even in the demo)
- Row Level Security stays **ON** for all tables (SQL in `architecture.md`).
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used. **Never** use or ask for the `service_role` key.
- `.env.local` must be in `.gitignore`. Never print keys in code or chat.
- Never `console.log` customer names or phone numbers.

---

# Part B — Rules for you (vibe coding tips)

1. **Put all 6 docs in the project's `docs/` folder** before starting, and tell the AI to read them.
2. **One prompt = one step.** Use the prompts from `prompts.md` in order. Don't ask for everything at once.
3. **Test after every step** in the browser (`npm run dev` → open http://localhost:3000). Also check on mobile size: right-click → Inspect → phone icon.
4. **Save your progress with Git after every working step.** Tell the AI: *"Everything works. Commit this to git with a short message."* If something breaks later, you can say: *"Go back to the last commit."*
5. **When you get an error,** copy the *full* error text (from the terminal or browser) and paste it to the AI with: *"I got this error, please fix it."* Don't describe it in your own words.
6. **If the AI goes in circles** (same error 3 times), say: *"Stop. Explain the problem simply, then try a different approach."* Or start a fresh chat and paste the error plus the relevant doc section.
7. **Don't let it add features you didn't ask for** before Monday. Say: *"Only do what this step asks."*
8. **Keep your keys secret.** Paste Supabase keys only into `.env.local` and Vercel settings, never into chat screenshots you share.
9. **Deploy early.** Put the app on Vercel on Saturday evening even if unfinished, so Sunday you're only fixing small things, not fighting deployment.
10. **Freeze on Sunday night.** No new changes on Monday morning except fixing a real bug.
