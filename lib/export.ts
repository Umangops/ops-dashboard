import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandConfig } from './brands/types';
import type { Filters } from './query';
import { queryBrand } from './query';
import { getMaskType, maskStr } from './mask';
import { format, parseISO, isValid } from 'date-fns';

export type ExportFormat = 'xlsx' | 'csv';
export type ExportColumns = 'dashboard' | 'all';

export interface ExportOptions {
  format: ExportFormat;
  columns: ExportColumns;
}

export type ExportProgressFn = (msg: string, pct: number) => void;

export const MAX_XLSX_ROWS = 100_000;
const PAGE_SIZE = 1_000;

function fmtCell(val: unknown, type: string): string {
  if (val === null || val === undefined || val === '') return '';
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
}

function applyMask(s: string, maskType: 'mobile' | 'text2' | 'email' | null): string {
  if (!maskType || !s) return s;
  return maskStr(s, maskType);
}

function csvInject(s: string): string {
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
  isCancelled?: () => boolean,
): Promise<void> {
  onProgress?.('Preparing…', 5);

  const keywords = brand.maskedColumnKeywords ?? [];
  const allRows: Record<string, unknown>[] = [];
  let total = 0;
  let page = 1;

  while (true) {
    if (isCancelled?.()) return;

    const { data, count, error } = await queryBrand(supabase, brand, {
      ...filters,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (error) throw new Error(error);

    if (page === 1) total = count;
    allRows.push(...data);

    const fetched = allRows.length;
    const pct = 5 + Math.round((fetched / Math.max(total, 1)) * 80);
    onProgress?.(
      `Preparing ${fetched.toLocaleString()} / ${total.toLocaleString()}…`,
      pct,
    );

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  if (isCancelled?.()) return;

  onProgress?.('Generating file…', 90);

  const cols = brand.columns;

  // Collect raw keys
  const rawKeys: string[] = [];
  if (opts.columns === 'all') {
    const seen = new Set<string>();
    for (const row of allRows) {
      const raw = row['raw'] as Record<string, unknown> | null;
      if (raw) Object.keys(raw).forEach((k) => seen.add(k));
    }
    rawKeys.push(...seen);
  }

  // Determine mask types per column — log which get masked
  const schemaMaskTypes = cols.map((col) => {
    const t = getMaskType(col.field, keywords) ?? getMaskType(col.label, keywords);
    return t;
  });
  const rawMaskTypes = rawKeys.map((k) => getMaskType(k, keywords));

  const maskedSchemaLabels = cols
    .filter((_, i) => schemaMaskTypes[i] !== null)
    .map((c) => c.label);
  const maskedRawKeys = rawKeys.filter((_, i) => rawMaskTypes[i] !== null);
  console.log(
    `[Export masked – ${brand.label}] Schema: [${maskedSchemaLabels.join(', ')}]  Raw: [${maskedRawKeys.join(', ')}]`,
  );

  const headers = [...cols.map((c) => c.label), ...rawKeys];

  const today = format(new Date(), 'yyyy-MM-dd');
  const baseName = `${brand.label}_Export_${today}`;

  if (opts.format === 'csv') {
    // Incremental CSV build
    const chunks: string[] = [headers.map(toCsvCell).join(',') + '\n'];
    for (const row of allRows) {
      const cells = [
        ...cols.map((col, i) => {
          const formatted = fmtCell(row[col.field], col.type ?? 'text');
          const masked = applyMask(formatted, schemaMaskTypes[i]);
          return toCsvCell(csvInject(masked));
        }),
        ...rawKeys.map((k, i) => {
          const raw = row['raw'] as Record<string, unknown> | null;
          const formatted = fmtCell(raw?.[k] ?? '', 'text');
          const masked = applyMask(formatted, rawMaskTypes[i]);
          return toCsvCell(csvInject(masked));
        }),
      ];
      chunks.push(cells.join(',') + '\n');
    }
    const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
    _download(blob, `${baseName}.csv`);
  } else {
    const tableRows = allRows.map((row) => [
      ...cols.map((col, i) => {
        const formatted = fmtCell(row[col.field], col.type ?? 'text');
        const masked = applyMask(formatted, schemaMaskTypes[i]);
        return csvInject(masked);
      }),
      ...rawKeys.map((k, i) => {
        const raw = row['raw'] as Record<string, unknown> | null;
        const formatted = fmtCell(raw?.[k] ?? '', 'text');
        const masked = applyMask(formatted, rawMaskTypes[i]);
        return csvInject(masked);
      }),
    ]);

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([headers, ...tableRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, brand.sheetName);
    XLSX.writeFile(wb, `${baseName}.xlsx`);
  }

  onProgress?.('Done!', 100);
}
