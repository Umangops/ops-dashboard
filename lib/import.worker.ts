/* Web Worker — runs on a background thread, keeps the UI responsive during import */

import * as XLSX from 'xlsx';

// ── Inlined helpers from lib/clean.ts (no Next.js / DOM imports allowed here) ──

const NULL_SET = new Set(['-', '--', 'na', 'n/a', 'null', 'none', 'nil', '#n/a', 'n.a.', 'n.a']);

function cleanCell(val: unknown): unknown | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const s = val.trim();
    return NULL_SET.has(s.toLowerCase()) || s === '' ? null : s;
  }
  return val;
}

function toText(val: unknown): string | null {
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

const MON: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function fmtISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseDate(val: unknown): string | null {
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
  const mon = s.match(/^(\d{1,2})[/\-]([A-Za-z]{3})[/\-](\d{2,4})$/);
  if (mon) {
    const mIdx = MON[mon[2].toLowerCase()];
    if (mIdx === undefined) return null;
    let yr = parseInt(mon[3], 10);
    if (yr < 100) yr += yr >= 50 ? 1900 : 2000;
    return `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(parseInt(mon[1], 10)).padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : fmtISO(d);
}

function parseBool(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  const s = String(val).trim().toLowerCase();
  if (['paid', 'yes', 'true', '1', 'y'].includes(s)) return true;
  if (['unpaid', 'no', 'false', '0', 'n'].includes(s)) return false;
  return null;
}

function normaliseHeader(h: unknown): string {
  return String(h ?? '').toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

// ── Worker message types ──────────────────────────────────────────────────────

interface ColDef { field: string; header: string; type: string; required?: boolean }

interface WorkerInput {
  buffer: ArrayBuffer;
  sheetName: string;
  columns: ColDef[];
  ignoredHeaders: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = self as any;

ctx.onmessage = (e: MessageEvent<WorkerInput>) => {
  const post = (data: Record<string, unknown>) => ctx.postMessage(data);
  const { buffer, sheetName, columns, ignoredHeaders } = e.data;

  try {
    post({ type: 'progress', msg: 'Reading file…', pct: 5 });

    // cellDates:false is faster — parseDate() handles numeric serial dates already
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });

    const wsName =
      wb.SheetNames.find((n) => n.trim().toLowerCase() === sheetName.toLowerCase()) ??
      wb.SheetNames[0];
    if (!wsName) throw new Error('No sheets found in the workbook.');

    post({ type: 'progress', msg: 'Parsing rows…', pct: 10 });
    const ws = wb.Sheets[wsName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: null });

    if (rows.length === 0) {
      post({ type: 'done', records: [], skippedRows: [] });
      return;
    }

    post({ type: 'progress', msg: 'Validating headers…', pct: 15 });

    const headerToField = new Map<string, string>();
    for (const col of columns) headerToField.set(normaliseHeader(col.header), col.field);
    const ignoredNorm = new Set(ignoredHeaders.map(normaliseHeader));

    const fileHeaders = Object.keys(rows[0]).map(normaliseHeader);
    const missing = columns.filter((c) => c.required).filter((c) => !fileHeaders.includes(normaliseHeader(c.header)));
    if (missing.length > 0)
      throw new Error(`Missing required columns: ${missing.map((c) => c.header).join(', ')}`);

    post({ type: 'progress', msg: 'Processing rows…', pct: 20 });

    const recordMap = new Map<string, Record<string, unknown>>();
    const skippedRows: Record<string, unknown>[] = [];

    for (const row of rows) {
      const record: Record<string, unknown> = {};
      const raw: Record<string, unknown> = {};

      for (const [rawKey, rawVal] of Object.entries(row)) {
        const normKey = normaliseHeader(rawKey);
        const field = headerToField.get(normKey);
        if (field) {
          const col = columns.find((c) => c.field === field)!;
          if (col.type === 'date') {
            record[field] = parseDate(rawVal);
          } else if (col.type === 'boolean') {
            record[field] = parseBool(rawVal);
          } else if (col.type === 'status') {
            const txt = toText(rawVal);
            record[field] = txt !== null ? txt.replace(/\s+/g, ' ') : null;
          } else {
            record[field] = toText(rawVal);
          }
        } else if (!ignoredNorm.has(normKey) && normKey !== '') {
          raw[rawKey] = rawVal instanceof Date ? rawVal.toISOString().slice(0, 10) : rawVal;
        }
      }

      const code = record['activation_code'];
      if (!code) { skippedRows.push(row); continue; }
      record['raw'] = Object.keys(raw).length > 0 ? raw : null;
      recordMap.set(String(code), record);
    }

    post({ type: 'done', records: Array.from(recordMap.values()), skippedRows });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
