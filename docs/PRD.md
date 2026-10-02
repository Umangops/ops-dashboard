# Product Requirements Document (PRD)
## Operations Dashboard — Hitachi · Godrej · Samsung

| Item | Detail |
|---|---|
| Version | 1.0 |
| Date | 02 Oct 2026 |
| Status | Approved for build |
| Platforms | Desktop web + Mobile web (responsive) |

---

## 1. Overview

The Operations Dashboard is an internal, login-protected web application that lets the operations team view, search, import and export warranty / protection-plan records for three brands: **Hitachi, Godrej and Samsung**.

Data arrives as Excel/CSV files. An Admin uploads the latest file, the system merges it into the database, and every user can immediately search records (by Plan ID, phone number, IMEI/serial etc.), see status summaries, and download filtered data.

The UI follows the visual pattern of the reference "Claims Overview" template: a header, a left sidebar, summary cards, a filter bar, and a data table with a search/filter control under every column header. The sidebar lists the three brands instead of "Claims Listing". All three brand pages share the same layout but show their own columns and summary cards.

## 2. Problem Statement

Today the team works directly in raw Excel sheets with 24–49 columns per brand. Finding a single customer's record (by phone, IMEI or activation code) is slow, status counts are calculated by hand, and there is no single source of truth when new files arrive.

## 3. Goals

1. One place to see all three brands' operational data.
2. Find any record in seconds using any key identifier.
3. Instant status counts (summary cards) per brand.
4. Simple refresh of data via file upload, without creating duplicates.
5. Easy export of exactly the data a user is looking at.
6. Work equally well on desktop and mobile.
7. Scale to hundreds of thousands of rows per brand without slowing down.

### Non-goals (v1)
- Editing individual records from the UI (data changes only through import).
- Pulling data directly from brand APIs / CRMs / SFDC.
- Notifications, emails, or scheduled reports.
- Public sign-up.

## 4. Users and Roles

| Role | Who | Permissions |
|---|---|---|
| **Admin** | Operations lead / data owner | Everything a Viewer can do + import files, view upload history, manage users |
| **Viewer** | Operations executives, support agents | Log in, view all brand pages, search, filter, export |

No public registration. Admins create user accounts.

## 5. Brands and Data

The source file has one sheet per brand. Only the **yellow-highlighted columns** are shown in the main UI. All other columns are still stored in the database (as raw data) so they can be exported or shown later without re-uploading.

### 5.1 Hitachi — display columns

| # | Excel Header | Display Label | Filter Type |
|---|---|---|---|
| 1 | Warranty Activation Code | Plan ID | Text search |
| 2 | Warranty Purchase Date | Purchase Date | Date range |
| 3 | Customer_Name | Customer Name | Text search |
| 4 | Customer_Mobile | Phone Number | Text search |
| 5 | Product_Serial_Number | Serial Number | Text search |
| 6 | CRM ID | CRM ID | Text search |
| 7 | Remarks | Status | Dropdown |
| 8 | Additional Remarks | Additional Remarks | Text search |

Known Status (Remarks) values: `Plan Active`, `Plan Inactive`, `Pending Payment`.

### 5.2 Godrej — display columns

| # | Excel Header | Display Label | Filter Type |
|---|---|---|---|
| 1 | Warranty Activation Code | Plan ID | Text search |
| 2 | Warranty Status | Warranty Status | Dropdown |
| 3 | Customer_Name | Customer Name | Text search |
| 4 | Customer_Mobile | Phone Number | Text search |
| 5 | Product_Serial_Number | Serial Number | Text search |
| 6 | Payment_Status | Payment Status | Dropdown (Paid / Unpaid) |
| 7 | Contract ID | Contract ID | Text search |
| 8 | Remarks | Status | Dropdown |
| 9 | Additional Remarks | Additional Remarks | Text search |

Known Status (Remarks) values: `Contract Booked`, `Not Booked`.
Known Warranty Status values: `Active`, `Pending`.

### 5.3 Samsung — display columns

| # | Excel Header | Display Label | Filter Type |
|---|---|---|---|
| 1 | Warranty Activation Code | Plan ID | Text search |
| 2 | Warranty Purchase Date | Purchase Date | Date range |
| 3 | Store_Name | Store Name | Text search |
| 4 | Branch_Name | Branch Name | Text search |
| 5 | Appliance Model Name | Device Model | Text search |
| 6 | Product_Serial_Number | IMEI / Serial Number | Text search |
| 7 | display_plan_name | Plan Name | Dropdown |

For Samsung, the IMEI / serial number is the primary lookup key. Customer name and mobile are not part of the Samsung data.

### 5.4 Data rules
- **Warranty Activation Code** is the unique key per brand (used for de-duplication on import).
- Serial numbers are **not** unique (the same serial can appear on multiple plans).
- A cell containing only `-` is treated as empty.
- Phone numbers, IMEI, serial numbers, CRM/Contract IDs are always stored as **text**, never as numbers (to avoid losing digits or leading zeros).
- Excel formula columns (e.g. Hitachi `Month`, `Year`) are ignored on import; they are derived values.

## 6. Functional Requirements

### 6.1 Authentication (FR-AUTH)
| ID | Requirement |
|---|---|
| FR-AUTH-1 | Users log in with email + password. |
| FR-AUTH-2 | All pages except Login require a valid session. |
| FR-AUTH-3 | Session expires after inactivity (default 8 hours); user is redirected to Login. |
| FR-AUTH-4 | User can log out from the header profile menu. |
| FR-AUTH-5 | Login is rate-limited (5 failed attempts → 15-minute lock for that account/IP). |
| FR-AUTH-6 | Admin can create users, assign role, deactivate users, and reset passwords. |
| FR-AUTH-7 | User can change their own password. |

### 6.2 Navigation & Layout (FR-NAV)
| ID | Requirement |
|---|---|
| FR-NAV-1 | Sidebar lists: Hitachi, Godrej, Samsung. Admins also see: Upload History, Users. |
| FR-NAV-2 | Active page is highlighted in the sidebar. |
| FR-NAV-3 | Sidebar can be collapsed on desktop; on mobile it becomes a slide-in drawer. |
| FR-NAV-4 | Header shows app name/logo on the left and the user name + role + profile menu on the right. |
| FR-NAV-5 | Each brand has its own URL: `/hitachi`, `/godrej`, `/samsung`. Default landing page after login: first brand. |

### 6.3 Summary Cards (FR-CARD)
| ID | Requirement |
|---|---|
| FR-CARD-1 | **Hitachi:** Total Plans, Plan Active, Plan Inactive, Pending Payment. |
| FR-CARD-2 | **Godrej:** Total Plans, Contract Booked, Not Booked. |
| FR-CARD-3 | **Samsung:** Total Plans + one card per plan name (e.g. Screen Protect, Combo). If more than 4 plan names exist, show the top 3 by count + "Others". New plan names appear automatically. |
| FR-CARD-4 | Card counts respect the active date range and filters. |
| FR-CARD-5 | Clicking a status card applies that status as a table filter (click again to clear). |

### 6.4 Data Table (FR-TABLE)
| ID | Requirement |
|---|---|
| FR-TABLE-1 | Shows only the brand's display (yellow) columns, in the order listed in Section 5. |
| FR-TABLE-2 | Server-side pagination; page sizes 25 / 50 / 100; default 25. |
| FR-TABLE-3 | Sort by any column (default: Purchase Date desc, or upload date desc when no purchase date). |
| FR-TABLE-4 | Status values render as coloured pills. |
| FR-TABLE-5 | Clicking a row opens a detail drawer showing **all** stored columns for that record (raw data included). |
| FR-TABLE-6 | Phone, IMEI and Plan ID cells have a one-click copy icon. |
| FR-TABLE-7 | Header row stays sticky while scrolling; wide tables scroll horizontally inside their container. |
| FR-TABLE-8 | Shows total result count ("Showing 1–25 of 4,312"). |

### 6.5 Search & Filters (FR-SEARCH)
| ID | Requirement |
|---|---|
| FR-SEARCH-1 | Every display column has its own filter control directly under the column header (as in the template). |
| FR-SEARCH-2 | Text columns: search box with **partial, case-insensitive** match (e.g. last 6 digits of an IMEI). |
| FR-SEARCH-3 | Status/category columns: dropdown populated from actual distinct values in the DB, with "All" option. |
| FR-SEARCH-4 | Date columns: date-range picker. |
| FR-SEARCH-5 | **Global search** box in the filter bar searches across all key identifier columns at once (Plan ID, phone, serial/IMEI, CRM ID, Contract ID, customer name). |
| FR-SEARCH-6 | All filters combine with AND logic. |
| FR-SEARCH-7 | Text inputs are debounced (400 ms) before querying. |
| FR-SEARCH-8 | **Reset** clears all filters, global search and date range. |
| FR-SEARCH-9 | Active filters are reflected in the URL query string, so a filtered view can be bookmarked or shared. |
| FR-SEARCH-10 | Search returns within 1 second for up to 500,000 rows per brand. |

### 6.6 Import / Upload (FR-IMPORT) — Admin only
| ID | Requirement |
|---|---|
| FR-IMPORT-1 | "Import" button on each brand page opens an upload dialog for that brand. |
| FR-IMPORT-2 | Accepts `.xlsx` and `.csv`, max 25 MB. Drag-and-drop or file picker. |
| FR-IMPORT-3 | For `.xlsx` with multiple sheets, the sheet matching the brand name is used; otherwise the user picks the sheet. |
| FR-IMPORT-4 | Headers are validated against the brand's expected headers (case/space/underscore-insensitive). Missing required headers → file rejected with a clear message listing them. |
| FR-IMPORT-5 | Upsert logic: new Activation Code → insert; existing Activation Code → update. No duplicates. |
| FR-IMPORT-6 | Rows with errors (e.g. missing Activation Code, unparseable date) are skipped, not the whole file. |
| FR-IMPORT-7 | After processing, show a result summary: total rows, inserted, updated, skipped, plus a downloadable error report (row number + reason). |
| FR-IMPORT-8 | Large files are processed in the background with a progress indicator; the user can keep using the app. |
| FR-IMPORT-9 | Every import is logged in Upload History: brand, file name, uploaded by, time, counts, status. |
| FR-IMPORT-10 | Non-display columns are stored as raw data; unknown extra columns are kept too. |

### 6.7 Export (FR-EXPORT) — All users
| ID | Requirement |
|---|---|
| FR-EXPORT-1 | "Export" button on each brand page (replaces the template's "Report" button). |
| FR-EXPORT-2 | Export dialog options: **Format** (Excel .xlsx / CSV) and **Columns** (Display columns only / All columns). |
| FR-EXPORT-3 | Export contains exactly the rows matching current filters, search and date range. With no filters, full brand data. |
| FR-EXPORT-4 | File name pattern: `<Brand>_Export_<YYYY-MM-DD>.<ext>`. |
| FR-EXPORT-5 | Exports up to 200,000 rows as Excel; beyond that, CSV is enforced. |
| FR-EXPORT-6 | Cell values starting with `=`, `+`, `-`, `@` are escaped to prevent spreadsheet formula injection. |
| FR-EXPORT-7 | Exports are logged (user, brand, filters, row count, time). |

### 6.8 Upload History (FR-HIST) — Admin only
List of all imports with filters by brand and date, status badge (Processing / Completed / Completed with errors / Failed), and download link for the error report.

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Page load < 2 s; list/search API < 1 s at 500k rows/brand; import ≥ 5,000 rows/sec. |
| Scalability | Brand configuration is data-driven so a 4th brand can be added with config + migration, no UI rewrite. |
| Responsiveness | Fully usable from 360 px (mobile) to 1920 px+ (desktop). |
| Security | HTTPS only, hashed passwords (bcrypt), JWT in httpOnly cookies, role checks on every API, input validation, rate limiting, audit logs. |
| Reliability | Imports are transactional per batch; a failure never leaves half-written batches. |
| Browser support | Latest Chrome, Edge, Safari, Firefox; Android Chrome and iOS Safari. |
| Accessibility | Keyboard navigable, visible focus states, WCAG AA colour contrast. |
| Privacy | Customer phone/name data visible only to logged-in users; no PII in logs. |

## 8. Acceptance Criteria (key scenarios)

1. A Viewer logs in, opens Samsung, types the last 6 digits of an IMEI in the IMEI column search, and sees the matching record within 1 second.
2. A Viewer types a phone number into global search on Hitachi and finds the customer.
3. An Admin uploads an updated Hitachi file where 100 rows are new and 50 have changed Remarks → summary shows 100 inserted, 50 updated, Total card increases by 100, status cards update.
4. Uploading the same file twice creates no duplicates (second run: 0 inserted, N updated).
5. An Admin uploads a Godrej file missing the "Contract ID" column → upload rejected with message naming the missing column.
6. A Viewer filters Godrej by Status = "Not Booked", exports to Excel with display columns → file contains only Not Booked rows and the 9 display columns.
7. A Viewer cannot see the Import button or access the import API (API returns 403).
8. On a 375 px phone, the user can open the brand drawer, see summary cards, search, and open a record's details without horizontal page scrolling.

## 9. Assumptions & Open Points

| # | Item | Default assumption |
|---|---|---|
| 1 | Godrej has no display date column | Date range on Godrej filters by record upload date |
| 2 | Import mode | Upsert only; "replace all data" is out of scope for v1 |
| 3 | Data retention | Records are never auto-deleted |
| 4 | Brand logos | Brands shown as text labels; official logos only if the company has rights to use them |
| 5 | Language | UI in English |
