/**
 * scripts/test-import.mjs
 * Run: node scripts/test-import.mjs
 *
 * Tests Excel parsing + row-mapping logic for every brand sheet.
 * No Supabase writes. Measures rows, columns, time, and memory per sheet.
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dir = dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = join(__dir, '..', 'test-data', 'Operations Dashboard Test Data.xlsx');

// ── Clean helpers (mirrors lib/clean.ts exactly) ─────────────────────────────
const NULL_SET = new Set(['-','--','na','n/a','null','none','nil','#n/a','n.a.','n.a']);

function cleanCell(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const s = val.trim();
    return NULL_SET.has(s.toLowerCase()) || s === '' ? null : s;
  }
  return val;
}

function toText(val) {
  const v = cleanCell(val);
  if (v === null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    const n = Math.round(v);
    if (Math.abs(v - n) < 1e-9) return String(n);
    return String(v).replace(/\.?0+$/, '');
  }
  if (v instanceof Date) return fmtISO(v);
  return String(v).trim() || null;
}

const MON = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function fmtISO(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const dd = String(d.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}

function parseDate(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : fmtISO(val);
  if (typeof val === 'number') {
    if (val < 1 || val > 2958465) return null;
    return fmtISO(new Date((val - 25569) * 86400 * 1000));
  }
  if (typeof val !== 'string') return null;
  const s = val.trim();
  if (!s || NULL_SET.has(s.toLowerCase())) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const mon = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (mon) {
    const mIdx = MON[mon[2].toLowerCase()];
    if (mIdx === undefined) return null;
    let yr = parseInt(mon[3], 10);
    if (yr < 100) yr += yr >= 50 ? 1900 : 2000;
    return `${yr}-${String(mIdx+1).padStart(2,'0')}-${String(parseInt(mon[1],10)).padStart(2,'0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : fmtISO(d);
}

function parseBool(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  const s = String(val).trim().toLowerCase();
  if (['paid','yes','true','1','y'].includes(s)) return true;
  if (['unpaid','no','false','0','n'].includes(s)) return false;
  return null;
}

function normaliseHeader(h) {
  return String(h ?? '').toLowerCase().trim().replace(/_/g,' ').replace(/\s+/g,' ');
}

// ── Brand configs (mirrors lib/brands/*.ts) ───────────────────────────────────
const brands = [
  {
    key: 'hitachi',
    sheetName: 'Hitachi',
    columns: [
      { header: 'Warranty Activation Code', field: 'activation_code', type: 'text', required: true },
      { header: 'Warranty Purchase Date',   field: 'purchase_date',   type: 'date' },
      { header: 'Customer_Name',            field: 'customer_name',   type: 'text' },
      { header: 'Customer_Mobile',          field: 'customer_mobile', type: 'text' },
      { header: 'Product_Serial_Number',    field: 'serial_number',   type: 'text' },
      { header: 'CRM ID',                   field: 'crm_id',          type: 'text' },
      { header: 'Remarks',                  field: 'remarks',         type: 'status' },
      { header: 'Additional Remarks',       field: 'additional_remarks', type: 'text' },
    ],
    ignoredHeaders: ['Month', 'Year'],
  },
  {
    key: 'godrej',
    sheetName: 'Godrej',
    columns: [
      { header: 'Warranty Activation Code', field: 'activation_code',  type: 'text', required: true },
      { header: 'Warranty Status',          field: 'warranty_status',  type: 'status' },
      { header: 'Customer_Name',            field: 'customer_name',    type: 'text' },
      { header: 'Customer_Mobile',          field: 'customer_mobile',  type: 'text' },
      { header: 'Product_Serial_Number',    field: 'serial_number',    type: 'text' },
      { header: 'Payment_Status',           field: 'payment_status',   type: 'boolean' },
      { header: 'Contract ID',              field: 'contract_id',      type: 'text' },
      { header: 'Remarks',                  field: 'remarks',          type: 'status' },
      { header: 'Additional Remarks',       field: 'additional_remarks', type: 'text' },
    ],
    ignoredHeaders: [],
  },
  {
    key: 'samsung',
    sheetName: 'Samsung',
    columns: [
      { header: 'Warranty Activation Code', field: 'activation_code', type: 'text', required: true },
      { header: 'Warranty Purchase Date',   field: 'purchase_date',   type: 'date' },
      { header: 'Product_Serial_Number',    field: 'serial_number',   type: 'text' },
      { header: 'Appliance Model Name',     field: 'model_name',      type: 'text' },
      { header: 'display_plan_name',        field: 'plan_name',       type: 'text' },
      { header: 'Store_Name',               field: 'store_name',      type: 'text' },
      { header: 'Branch_Name',              field: 'branch_name',     type: 'text' },
    ],
    ignoredHeaders: [],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function mb(bytes) { return (bytes / 1024 / 1024).toFixed(1) + ' MB'; }
function heapMB() { return process.memoryUsage().heapUsed; }

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('Reading file from disk…');
const fileBuf = readFileSync(EXCEL_PATH);
console.log(`File size on disk: ${mb(fileBuf.length)}\n`);

// Phase 1: get sheet names only — no cell parsing
const t_meta = Date.now();
const bookMeta = XLSX.read(fileBuf, { bookSheets: true });
console.log(`Sheet names (${Date.now() - t_meta}ms): ${bookMeta.SheetNames.join(', ')}\n`);
console.log('─'.repeat(60));

for (const brand of brands) {
  console.log(`\n▶  ${brand.key.toUpperCase()} (sheet: "${brand.sheetName}")`);

  // Case-insensitive sheet lookup
  const sheetName =
    bookMeta.SheetNames.find(n => n.trim().toLowerCase() === brand.sheetName.toLowerCase())
    ?? bookMeta.SheetNames[0];

  if (!sheetName) {
    console.log('   ✗ Sheet not found — skipping');
    continue;
  }

  const memBefore = heapMB();
  const t0 = Date.now();

  // Parse ONLY the target sheet (key optimisation — skips other large sheets)
  const wb = XLSX.read(fileBuf, {
    sheets: sheetName,
    cellDates: true,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    bookVBA: false,
  });

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: null });
  const t_parse = Date.now() - t0;

  if (rows.length === 0) {
    console.log('   ✗ No rows found');
    continue;
  }

  const cols = Object.keys(rows[0]).length;
  console.log(`   Rows: ${rows.length.toLocaleString()}   Columns: ${cols}   Parse time: ${t_parse}ms`);

  // Header validation
  const headerToField = new Map();
  brand.columns.forEach(c => headerToField.set(normaliseHeader(c.header), c));
  const ignoredNorm = new Set((brand.ignoredHeaders ?? []).map(normaliseHeader));

  const fileHeaders = Object.keys(rows[0]).map(normaliseHeader);
  const missing = brand.columns.filter(c => c.required && !fileHeaders.includes(normaliseHeader(c.header)));
  if (missing.length > 0) {
    console.log(`   ✗ Missing required columns: ${missing.map(c => c.header).join(', ')}`);
  }

  // Row mapping (same logic as lib/import.ts)
  const t1 = Date.now();
  const recordMap = new Map();
  let skippedCount = 0;

  for (const row of rows) {
    const record = {};
    const raw = {};

    for (const [rawKey, rawVal] of Object.entries(row)) {
      const normKey = normaliseHeader(rawKey);
      const col = headerToField.get(normKey);

      if (col) {
        if (col.type === 'date')    record[col.field] = parseDate(rawVal);
        else if (col.type === 'boolean') record[col.field] = parseBool(rawVal);
        else                        record[col.field] = toText(rawVal);
      } else if (!ignoredNorm.has(normKey) && normKey !== '') {
        raw[rawKey] = rawVal instanceof Date ? rawVal.toISOString().slice(0, 10) : rawVal;
      }
    }

    const code = record['activation_code'];
    if (!code) { skippedCount++; continue; }
    record['raw'] = Object.keys(raw).length > 0 ? raw : null;
    recordMap.set(String(code), record);
  }

  const t_map = Date.now() - t1;
  const memAfter = heapMB();
  const memDelta = memAfter - memBefore;

  console.log(`   Mapped: ${recordMap.size.toLocaleString()} unique records   Skipped (no code): ${skippedCount}`);
  console.log(`   Map time: ${t_map}ms   Total time: ${t_parse + t_map}ms   Heap delta: ${mb(memDelta)}`);

  // Sample first record
  const sample = recordMap.values().next().value;
  if (sample) {
    const fields = Object.entries(sample).filter(([k]) => k !== 'raw').map(([k,v]) => `${k}=${JSON.stringify(v)}`).slice(0, 4).join('  ');
    console.log(`   Sample: ${fields}`);
  }
}

console.log('\n' + '─'.repeat(60));
console.log('Done. Peak heap:', mb(process.memoryUsage().heapUsed));
