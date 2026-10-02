# Architecture (v1 — Demo / MVP)
## Operations Dashboard — Hitachi · Godrej · Samsung

**Goal of v1:** a working, deployed app for the Monday demo, built with AI (vibe coding) by a non-developer. Simple, few moving parts, free tiers, one-click deploy on Vercel.

Heavy production items (Docker, Redis, background workers, advanced security) are intentionally **left out** of v1. See §11 for what to add later.

---

## 1. High-Level Overview

```
┌───────────────────────────────────────────┐
│  Next.js app (deployed on Vercel)         │
│  ─ Pages: Login, Hitachi, Godrej,         │
│    Samsung, Upload History                │
│  ─ Excel read/write in the BROWSER        │
│    (SheetJS)                              │
└───────────────┬───────────────────────────┘
                │ supabase-js (HTTPS)
                ▼
┌───────────────────────────────────────────┐
│  Supabase (free tier)                     │
│  ─ Auth: email + password login           │
│  ─ Postgres DB: brand tables, imports     │
│  ─ Row Level Security: logged-in users    │
│    read, admins write                     │
└───────────────────────────────────────────┘
```

Why this shape:
- **No custom backend server.** The browser talks directly to Supabase using the official `supabase-js` library. Supabase handles login and database.
- **Excel is processed in the browser.** Vercel limits request size (~4.5 MB) and function run time. Reading the file in the browser avoids both limits: the browser parses the file and sends rows to Supabase in small batches.
- **Vercel + GitHub:** every `git push` redeploys automatically.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 14+ (App Router)** with **TypeScript** |
| Styling | **Tailwind CSS** + **lucide-react** icons |
| Database + Auth | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) |
| Excel / CSV | **SheetJS** (`xlsx`) — read on import, write on export |
| Dates | `date-fns` |
| Hosting | **Vercel** (connected to a GitHub repo) |
| AI coding tool | Claude Code (in the Claude desktop app or terminal) or Cursor |

Only these libraries. Do not add more unless a step truly needs it.

## 3. Folder Structure

```
ops-dashboard/
├── app/
│   ├── login/page.tsx                 # Login screen
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # Header + sidebar shell (protected)
│   │   ├── [brand]/page.tsx           # ONE page for hitachi | godrej | samsung
│   │   └── uploads/page.tsx           # Upload history (admin)
│   ├── layout.tsx                     # Root layout, Inter font
│   └── page.tsx                       # Redirects to /hitachi
├── components/
│   ├── layout/   Header.tsx, Sidebar.tsx, MobileNav.tsx
│   ├── ui/       Button.tsx, Input.tsx, Select.tsx, Modal.tsx, Drawer.tsx, Pill.tsx, Skeleton.tsx
│   ├── SummaryCards.tsx
│   ├── FilterBar.tsx
│   ├── DataTable.tsx                  # desktop table with filter row
│   ├── RecordCardList.tsx             # mobile list
│   ├── RecordDrawer.tsx               # detail view
│   ├── ImportDialog.tsx
│   └── ExportDialog.tsx
├── lib/
│   ├── brands/
│   │   ├── types.ts
│   │   ├── hitachi.ts
│   │   ├── godrej.ts
│   │   ├── samsung.ts
│   │   └── index.ts                   # getBrand(key)
│   ├── supabase/
│   │   ├── client.ts                  # browser client
│   │   └── server.ts                  # server client (for middleware/layout)
│   ├── query.ts                       # builds filtered Supabase queries
│   ├── import.ts                      # parse + clean + upsert Excel
│   ├── export.ts                      # fetch filtered rows + build Excel/CSV
│   └── clean.ts                       # cleanCell, toText, parseDate, parseBool
├── middleware.ts                      # redirects to /login if not signed in
├── supabase/schema.sql                # the SQL in §5 (run once in Supabase)
├── docs/                              # PRD.md, architecture.md, rules.md, phases.md, design.md, prompts.md
├── .env.local                         # NOT committed
└── tailwind.config.ts                 # design tokens from design.md
```

## 4. Brand Configuration

All brand differences live in `lib/brands/*.ts`. The page, table, filters, cards, import and export all read from this config. There is only **one** brand page component.

```ts
// lib/brands/types.ts
export type FilterType = 'search' | 'select' | 'dateRange';
export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BrandColumn {
  field: string;          // DB column name (snake_case)
  header: string;         // Excel header (exact text in file)
  label: string;          // Shown in UI
  type: 'text' | 'date' | 'status' | 'boolean';
  filter: FilterType;
  required?: boolean;     // must exist in uploaded file
  copyable?: boolean;     // show copy icon
  globalSearch?: boolean; // included in the top search bar
  options?: string[];     // fixed dropdown values (optional)
}

export interface BrandConfig {
  key: 'hitachi' | 'godrej' | 'samsung';
  label: string;
  table: string;
  sheetName: string;
  dateField: string;                 // used by the date-range filter
  columns: BrandColumn[];            // in display order
  ignoredHeaders?: string[];
  statusTones: Record<string, Tone>; // value → pill colour
  summary:
    | { type: 'status'; field: string; cards: { label: string; value: string; tone: Tone }[] }
    | { type: 'dynamic'; field: string; maxCards: number };
  mobileFields: string[];            // fields shown on mobile record cards
}
```

```ts
// lib/brands/hitachi.ts
export const hitachi: BrandConfig = {
  key: 'hitachi', label: 'Hitachi', table: 'hitachi_records', sheetName: 'Hitachi',
  dateField: 'purchase_date',
  columns: [
    { field: 'activation_code',    header: 'Warranty Activation Code', label: 'Plan ID',            type: 'text',   filter: 'search', required: true, copyable: true, globalSearch: true },
    { field: 'purchase_date',      header: 'Warranty Purchase Date',   label: 'Purchase Date',      type: 'date',   filter: 'dateRange' },
    { field: 'customer_name',      header: 'Customer_Name',            label: 'Customer Name',      type: 'text',   filter: 'search', globalSearch: true },
    { field: 'customer_mobile',    header: 'Customer_Mobile',          label: 'Phone Number',       type: 'text',   filter: 'search', copyable: true, globalSearch: true },
    { field: 'serial_number',      header: 'Product_Serial_Number',    label: 'Serial Number',      type: 'text',   filter: 'search', copyable: true, globalSearch: true },
    { field: 'crm_id',             header: 'CRM ID',                   label: 'CRM ID',             type: 'text',   filter: 'search', globalSearch: true },
    { field: 'remarks',            header: 'Remarks',                  label: 'Status',             type: 'status', filter: 'select', options: ['Plan Active', 'Plan Inactive', 'Pending Payment'] },
    { field: 'additional_remarks', header: 'Additional Remarks',       label: 'Additional Remarks', type: 'text',   filter: 'search' },
  ],
  ignoredHeaders: ['Month', 'Year'],
  statusTones: { 'Plan Active': 'success', 'Plan Inactive': 'danger', 'Pending Payment': 'warning' },
  summary: { type: 'status', field: 'remarks', cards: [
    { label: 'Plan Active',     value: 'Plan Active',     tone: 'success' },
    { label: 'Plan Inactive',   value: 'Plan Inactive',   tone: 'danger'  },
    { label: 'Pending Payment', value: 'Pending Payment', tone: 'warning' },
  ]},
  mobileFields: ['customer_name', 'customer_mobile', 'serial_number', 'purchase_date'],
};
```

**Godrej** (`godrej_records`, `dateField: 'created_at'`): activation_code · warranty_status (select: Active, Pending) · customer_name · customer_mobile · serial_number · payment_status (boolean → select: Paid/Unpaid) · contract_id · remarks (select: Contract Booked, Not Booked) · additional_remarks.
Summary: status cards on `remarks` → Contract Booked (success), Not Booked (danger).

**Samsung** (`samsung_records`, `dateField: 'purchase_date'`): activation_code · purchase_date · serial_number (label "IMEI / Serial Number") · model_name ("Appliance Model Name") · plan_name ("display_plan_name", select) · store_name ("Store_Name") · branch_name ("Branch_Name").
Summary: `{ type: 'dynamic', field: 'plan_name', maxCards: 3 }` → Total + top 3 plan names + "Others".

## 5. Database (run once in Supabase → SQL Editor)

Save this as `supabase/schema.sql` and paste it into the Supabase SQL Editor.

```sql
-- Extensions
create extension if not exists pg_trgm;

-- ───────── Profiles (role per user) ─────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz default now()
);

-- auto-create a profile when a user is created in Supabase Auth
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────── Brand tables ─────────
create table if not exists hitachi_records (
  id bigint generated always as identity primary key,
  activation_code text not null unique,
  purchase_date date,
  customer_name text,
  customer_mobile text,
  serial_number text,
  crm_id text,
  remarks text,
  additional_remarks text,
  raw jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists godrej_records (
  id bigint generated always as identity primary key,
  activation_code text not null unique,
  warranty_status text,
  customer_name text,
  customer_mobile text,
  serial_number text,
  payment_status boolean,
  contract_id text,
  remarks text,
  additional_remarks text,
  raw jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists samsung_records (
  id bigint generated always as identity primary key,
  activation_code text not null unique,
  purchase_date date,
  store_name text,
  branch_name text,
  model_name text,
  serial_number text,
  plan_name text,
  raw jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────── Import history ─────────
create table if not exists imports (
  id bigint generated always as identity primary key,
  brand text not null,
  file_name text,
  total_rows int default 0,
  inserted int default 0,
  updated int default 0,
  skipped int default 0,
  status text default 'completed',
  uploaded_by uuid references auth.users(id),
  uploaded_by_name text,
  created_at timestamptz default now()
);

-- ───────── Indexes (fast partial search) ─────────
create index if not exists hit_code_trgm   on hitachi_records using gin (activation_code gin_trgm_ops);
create index if not exists hit_mobile_trgm on hitachi_records using gin (customer_mobile gin_trgm_ops);
create index if not exists hit_serial_trgm on hitachi_records using gin (serial_number gin_trgm_ops);
create index if not exists hit_name_trgm   on hitachi_records using gin (customer_name gin_trgm_ops);
create index if not exists hit_remarks     on hitachi_records (remarks);
create index if not exists hit_date        on hitachi_records (purchase_date desc);

create index if not exists god_code_trgm   on godrej_records using gin (activation_code gin_trgm_ops);
create index if not exists god_mobile_trgm on godrej_records using gin (customer_mobile gin_trgm_ops);
create index if not exists god_serial_trgm on godrej_records using gin (serial_number gin_trgm_ops);
create index if not exists god_name_trgm   on godrej_records using gin (customer_name gin_trgm_ops);
create index if not exists god_remarks     on godrej_records (remarks);

create index if not exists sam_code_trgm   on samsung_records using gin (activation_code gin_trgm_ops);
create index if not exists sam_serial_trgm on samsung_records using gin (serial_number gin_trgm_ops);
create index if not exists sam_store_trgm  on samsung_records using gin (store_name gin_trgm_ops);
create index if not exists sam_plan        on samsung_records (plan_name);
create index if not exists sam_date        on samsung_records (purchase_date desc);

-- ───────── Samsung plan counts (for dynamic cards) ─────────
create or replace function samsung_plan_counts(date_from date default null, date_to date default null)
returns table(plan_name text, total bigint)
language sql stable as $$
  select coalesce(plan_name, 'Unknown'), count(*)
  from samsung_records
  where (date_from is null or purchase_date >= date_from)
    and (date_to   is null or purchase_date <= date_to)
  group by 1 order by 2 desc;
$$;

-- ───────── Row Level Security ─────────
alter table profiles        enable row level security;
alter table hitachi_records enable row level security;
alter table godrej_records  enable row level security;
alter table samsung_records enable row level security;
alter table imports         enable row level security;

create policy "read own profile" on profiles for select to authenticated using (id = auth.uid() or is_admin());

-- every logged-in user can read; only admins can write
do $$ declare t text; begin
  foreach t in array array['hitachi_records','godrej_records','samsung_records','imports'] loop
    execute format('create policy "auth read %1$s"   on %1$s for select to authenticated using (true);', t);
    execute format('create policy "admin insert %1$s" on %1$s for insert to authenticated with check (is_admin());', t);
    execute format('create policy "admin update %1$s" on %1$s for update to authenticated using (is_admin());', t);
    execute format('create policy "admin delete %1$s" on %1$s for delete to authenticated using (is_admin());', t);
  end loop;
end $$;
```

**Why RLS even in a demo:** the Supabase "anon" key is visible in the browser. Without RLS, anyone with the URL could read customer phone numbers. These policies are the minimum: only logged-in users can see data, only admins can upload.

### Creating users (no signup page)
1. Supabase → **Authentication → Users → Add user** → email + password, tick "Auto confirm".
2. To make someone admin, run in SQL Editor:
   `update profiles set role = 'admin', full_name = 'Your Name' where id = (select id from auth.users where email = 'you@company.com');`

## 6. Login & Route Protection

- Login page calls `supabase.auth.signInWithPassword({ email, password })`.
- `middleware.ts` (using `@supabase/ssr`) checks the session on every request; no session → redirect to `/login`. Logged-in user visiting `/login` → redirect to `/hitachi`.
- Dashboard layout loads the user's `profiles` row to know `role` and `full_name`.
- Admin-only UI (Import button, Upload History link) is hidden for viewers; RLS blocks writes anyway.
- Logout: `supabase.auth.signOut()` → `/login`.

## 7. Listing, Search & Filters (`lib/query.ts`)

One function builds the Supabase query from the brand config and the current filters. The same function is used by the table, the summary cards and the export, so all three always agree.

```ts
let q = supabase.from(brand.table).select('*', { count: 'exact' });

// column filters
for each column filter:
  search    → q = q.ilike(field, `%${escapeLike(value)}%`)
  select    → q = q.eq(field, value)              // boolean: Paid → true, Unpaid → false
  dateRange → q = q.gte(field, from).lte(field, to)

// global search (top bar) across all globalSearch columns
q = q.or(globalFields.map(f => `${f}.ilike.%${value}%`).join(','));

// sort + page
q = q.order(sortField, { ascending }).range((page - 1) * pageSize, page * pageSize - 1);
```

Rules:
- Text search waits 400 ms after typing stops (debounce).
- Phone input: remove spaces, `+91`, and a leading `0` before searching.
- Remove characters `, ( ) %` from global search text (they break the `.or()` string).
- Filters are stored in the URL (`?q=...&f_remarks=Plan%20Active&page=2`) so refresh keeps them.
- Page sizes: 25 / 50 / 100.

## 8. Summary Cards

- **Status brands (Hitachi, Godrej):** for each card, run the same filtered query with `select('id', { count: 'exact', head: true })` plus `.eq(statusField, card.value)`. Total = same query without the status condition. Run them in parallel (`Promise.all`).
- **Samsung (dynamic):** call `supabase.rpc('samsung_plan_counts', { date_from, date_to })` → Total = sum, show top 3, rest summed as "Others".
- Clicking a status card sets that column's dropdown filter.

## 9. Import Flow (`lib/import.ts`) — runs in the browser

```
Admin picks file in ImportDialog
  │
  ├─ Read with SheetJS: XLSX.read(arrayBuffer, { cellDates: true })
  ├─ Pick sheet: one named like the brand, else first sheet
  ├─ rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })
  │
  ├─ Header check: normalise headers (lowercase, trim, "_" → " ")
  │      compare with brand.columns where required/all display headers
  │      missing → show error listing missing columns, STOP
  │
  ├─ For each row:
  │     display columns → cleaned value into its DB field
  │     every other column (except ignoredHeaders) → raw JSON
  │     no activation_code → skipped (reason saved)
  │
  ├─ De-duplicate inside the file by activation_code (last one wins)
  │
  ├─ In batches of 500:
  │     existing = select activation_code where activation_code in (batch codes)
  │     inserted += batch - existing;  updated += existing
  │     upsert(batch, { onConflict: 'activation_code' })   with updated_at = now
  │     update progress bar
  │
  ├─ Insert one row into `imports` with counts
  └─ Show result: total / inserted / updated / skipped  (+ download skipped rows as CSV)
     Refresh table and cards.
```

Cleaning rules (`lib/clean.ts`):
- Trim text. `-`, `""`, `NA`, `N/A` → `null`.
- IDs, phone, IMEI, serial, CRM ID, Contract ID → **always string**. Numbers converted with `String(Math.trunc(n))` style logic so `9732568546` stays `"9732568546"` (never `9.73E+09`).
- Dates: JS `Date` (from `cellDates`), Excel serial number, `30/Sep/26`, `2026-01-01 00:00:00.000000`, `DD-MM-YYYY` → `YYYY-MM-DD`. Unparseable → `null` (row still imported).
- Booleans: `true/false`, `TRUE/FALSE`, `1/0`, `yes/no` → boolean.

Limits for v1: files up to ~50,000 rows import comfortably in the browser. Keep the tab open until it finishes.

## 10. Export Flow (`lib/export.ts`) — runs in the browser

1. Build the same filtered query (without pagination).
2. Fetch in pages of 1,000 rows (Supabase returns max 1,000 per request) until done; show "Preparing 3,000 / 12,400…".
3. Columns: "Dashboard columns" → display columns with UI labels; "All columns" → display columns + every key from `raw`.
4. Any text starting with `=`, `+`, `-`, `@` gets a leading `'` (prevents Excel formula tricks).
5. Build file with SheetJS → `.xlsx` or `.csv` → download as `<Brand>_Export_<YYYY-MM-DD>.<ext>`.
6. Limit for v1: 50,000 rows per export (show a message above that).

## 11. Deployment (Vercel)

1. Push the project to a GitHub repository.
2. Vercel → **Add New Project** → import the repo → framework auto-detected as Next.js.
3. Add environment variables (same as `.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Deploy. Every push to `main` redeploys automatically.
5. In Supabase → Authentication → URL Configuration → set **Site URL** to the Vercel URL.

Never use the Supabase **service_role** key anywhere in this project.

## 12. Later (after the demo is approved)

| Add later | Why |
|---|---|
| Server-side import (Supabase Edge Function or a worker) | Files with lakhs of rows |
| Users management page | Admin creates users from the app instead of Supabase dashboard |
| Login rate limiting, password rules, audit logs | Production security |
| Record change history | See what changed on each import |
| Vercel Pro plan | Vercel's free Hobby plan is for personal/non-commercial use |
| Supabase paid plan + backups | More storage, daily backups |
| Automated tests | Safe changes as the app grows |
