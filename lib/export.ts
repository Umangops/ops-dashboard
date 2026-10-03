import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandConfig } from './brands/types';
import type { Filters } from './query';
import { queryBrand } from './query';
import { format, parseISO, isValid } from 'date-fns';

export type ExportFormat = 'xlsx' | 'csv';
export type ExportColumns = 'dashboard' | 'all';

export interface ExportOptions {
  format: ExportFormat;
  columns: ExportColumns;
}

export type ExportProgressFn = (msg: string, pct: number) => void;

export const MAX_EXPORT_ROWS = 50_000;
const PAGE_SIZE = 1_000;

// Format a cell value for export
function fmtCell(val: unknown, type: string): string {
  if (val === null || val === undefined || val === '') return '';
  const s = (() => {
    if (type === 'date') {
      try {
        const d = parseISO(String(val));
        return isValid(d) ? format(d, 'd MMM yyyy') : String(val);
      } catch {
        return String(val);
      }
    }
    if (type === 'boolean') return val === true ? 'Paid' : 'Unpaid';
    return String(val);
  })();
  // CSV injection: prepend ' to cells starting with = + - @
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

function toCsvCell(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n'))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function _download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportBrand(
  supabase: SupabaseClient,
  brand: BrandConfig,
  filters: Filters,
  opts: ExportOptions,
  onProgress?: ExportProgressFn,
): Promise<void> {
  onProgress?.('Fetching records…', 5);

  const allRows: Record<string, unknown>[] = [];
  let total = 0;
  let page = 1;

  while (true) {
    const { data, count, error } = await queryBrand(supabase, brand, {
      ...filters,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (error) throw new Error(error);

    if (page === 1) total = Math.min(count, MAX_EXPORT_ROWS);
    allRows.push(...data);

    const pct = 5 + Math.round((allRows.length / Math.max(total, 1)) * 80);
    onProgress?.(`Fetching rows ${allRows.length.toLocaleString()} of ${total.toLocaleString()}…`, pct);

    if (data.length < PAGE_SIZE || allRows.length >= MAX_EXPORT_ROWS) break;
    page++;
  }

  onProgress?.('Generating file…', 90);

  const cols = brand.columns;

  // Collect raw JSON keys across all rows (for "all" columns mode)
  const rawKeys: string[] = [];
  if (opts.columns === 'all') {
    const seen = new Set<string>();
    for (const row of allRows) {
      const raw = row['raw'] as Record<string, unknown> | null;
      if (raw) Object.keys(raw).forEach((k) => seen.add(k));
    }
    rawKeys.push(...seen);
  }

  const headers = [...cols.map((c) => c.label), ...rawKeys];

  const tableRows = allRows.map((row) => [
    ...cols.map((col) => fmtCell(row[col.field], col.type ?? 'text')),
    ...rawKeys.map((k) => {
      const raw = row['raw'] as Record<string, unknown> | null;
      return fmtCell(raw?.[k] ?? '', 'text');
    }),
  ]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const baseName = `${brand.label}_Export_${today}`;

  if (opts.format === 'csv') {
    const lines = [
      headers.map(toCsvCell).join(','),
      ...tableRows.map((r) => r.map(toCsvCell).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    _download(blob, `${baseName}.csv`);
  } else {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([headers, ...tableRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, brand.sheetName);
    XLSX.writeFile(wb, `${baseName}.xlsx`);
  }

  onProgress?.('Done!', 100);
}
