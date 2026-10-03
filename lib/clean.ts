// Values treated as null/empty
const NULL_SET = new Set(['-', '--', 'na', 'n/a', 'null', 'none', 'nil', '#n/a', 'n.a.', 'n.a']);

export function cleanCell(val: unknown): unknown | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const s = val.trim();
    return NULL_SET.has(s.toLowerCase()) || s === '' ? null : s;
  }
  return val;
}

// Numbers → string without E+ notation, without trailing .0, keeps all digits
export function toText(val: unknown): string | null {
  const v = cleanCell(val);
  if (v === null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    const n = Math.round(v);
    // near-integer (phone numbers, codes stored as numbers in Excel)
    if (Math.abs(v - n) < 1e-9) return String(n);
    return String(v).replace(/\.?0+$/, '');
  }
  if (v instanceof Date) return _fmtISO(v);
  return String(v).trim() || null;
}

const MON: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function _fmtISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Converts many date representations → "YYYY-MM-DD" or null
export function parseDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;

  // JS Date — from SheetJS cellDates:true
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : _fmtISO(val);
  }

  // Excel serial number (1 = 1900-01-01, but Excel wrongly counts 1900 as leap)
  if (typeof val === 'number') {
    if (val < 1 || val > 2958465) return null; // outside 1900–9999
    const d = new Date((val - 25569) * 86400 * 1000);
    return _fmtISO(d);
  }

  if (typeof val !== 'string') return null;
  const s = val.trim();
  if (!s || NULL_SET.has(s.toLowerCase())) return null;

  // "2026-01-01" or "2026-01-01 00:00:00.000000" or ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // "30/Sep/26" or "30-Sep-26" or "30/Sep/2026"
  const mon = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (mon) {
    const day = parseInt(mon[1], 10);
    const mIdx = MON[mon[2].toLowerCase()];
    let yr = parseInt(mon[3], 10);
    if (yr < 100) yr += yr >= 50 ? 1900 : 2000;
    if (mIdx === undefined) return null;
    return `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // "DD-MM-YYYY" or "DD/MM/YYYY"
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // Last resort: native parse
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : _fmtISO(d);
}

export function parseBool(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  const s = String(val).trim().toLowerCase();
  if (['paid', 'yes', 'true', '1', 'y'].includes(s)) return true;
  if (['unpaid', 'no', 'false', '0', 'n'].includes(s)) return false;
  return null;
}

// Lowercase + trim + "_" → " " + collapse spaces — used for header matching
export function normaliseHeader(h: unknown): string {
  return String(h ?? '').toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}
