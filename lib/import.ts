import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandConfig } from './brands/types';
import { toText, parseDate, parseBool, normaliseHeader } from './clean';

export interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  skippedRows: Record<string, unknown>[];
}

export type ProgressFn = (msg: string, pct: number) => void;

export async function importExcel(
  file: File,
  brand: BrandConfig,
  supabase: SupabaseClient,
  userId: string,
  userName: string,
  onProgress?: ProgressFn,
): Promise<ImportResult> {
  onProgress?.('Reading file…', 5);

  // Dynamic import so SheetJS (~1 MB) is only bundled on demand
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  // cellDates:true → date cells become JS Date objects instead of serial numbers
  const wb = XLSX.read(buffer, { cellDates: true });

  // Prefer the sheet named like the brand; fall back to first sheet
  const sheetName =
    wb.SheetNames.find(
      (n) => n.trim().toLowerCase() === brand.sheetName.toLowerCase(),
    ) ?? wb.SheetNames[0];

  if (!sheetName) throw new Error('No sheets found in the workbook.');

  const ws = wb.Sheets[sheetName];
  onProgress?.('Parsing rows…', 10);

  // raw:true keeps numbers as numbers (important: phone/code cols stored as numeric in Excel)
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: true,
    defval: null,
  });

  if (rows.length === 0) {
    return { total: 0, inserted: 0, updated: 0, skipped: 0, skippedRows: [] };
  }

  onProgress?.('Validating headers…', 15);

  // Build normalised file-header → DB-field map
  const headerToField = new Map<string, string>();
  for (const col of brand.columns) {
    headerToField.set(normaliseHeader(col.header), col.field);
  }
  const ignoredNorm = new Set((brand.ignoredHeaders ?? []).map(normaliseHeader));

  // Validate: all required columns must appear in the file
  const fileHeaders = Object.keys(rows[0]).map(normaliseHeader);
  const missing = brand.columns
    .filter((c) => c.required)
    .filter((c) => !fileHeaders.includes(normaliseHeader(c.header)));
  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing.map((c) => c.header).join(', ')}`,
    );
  }

  onProgress?.('Processing rows…', 20);

  // Map Excel rows → DB records; last row with the same activation_code wins (dedup)
  const recordMap = new Map<string, Record<string, unknown>>();
  const skippedRows: Record<string, unknown>[] = [];

  for (const row of rows) {
    const record: Record<string, unknown> = {};
    const raw: Record<string, unknown> = {};

    for (const [rawKey, rawVal] of Object.entries(row)) {
      const normKey = normaliseHeader(rawKey);
      const field = headerToField.get(normKey);

      if (field) {
        const col = brand.columns.find((c) => c.field === field)!;
        if (col.type === 'date') {
          record[field] = parseDate(rawVal);
        } else if (col.type === 'boolean') {
          record[field] = parseBool(rawVal);
        } else {
          record[field] = toText(rawVal);
        }
      } else if (!ignoredNorm.has(normKey) && normKey !== '') {
        // Preserve extra columns in raw jsonb
        raw[rawKey] =
          rawVal instanceof Date ? rawVal.toISOString().slice(0, 10) : rawVal;
      }
    }

    // Skip rows that have no activation_code (Plan ID)
    const code = record['activation_code'];
    if (!code) {
      skippedRows.push(row);
      continue;
    }

    record['raw'] = Object.keys(raw).length > 0 ? raw : null;
    recordMap.set(String(code), record);
  }

  const records = Array.from(recordMap.values());
  const BATCH = 500;
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const batchCodes = batch.map((r) => String(r['activation_code']));
    const pct = 20 + Math.round((i / Math.max(records.length, 1)) * 70);
    onProgress?.(
      `Uploading rows ${i + 1}–${Math.min(i + BATCH, records.length)}…`,
      pct,
    );

    // Count how many codes in this batch already exist (to split insert vs update count)
    const { count: existCount } = await supabase
      .from(brand.table)
      .select('*', { count: 'exact', head: true })
      .in('activation_code', batchCodes);

    const { error } = await supabase
      .from(brand.table)
      .upsert(
        batch.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: 'activation_code' },
      );

    if (error) throw new Error(error.message);

    const exist = existCount ?? 0;
    updated += exist;
    inserted += batch.length - exist;
  }

  onProgress?.('Saving import record…', 95);

  await supabase.from('imports').insert({
    brand: brand.key,
    file_name: file.name,
    total_rows: records.length,
    inserted,
    updated,
    skipped: skippedRows.length,
    uploaded_by: userId,
    uploaded_by_name: userName,
    status: 'completed',
  });

  onProgress?.('Done!', 100);

  return { total: records.length, inserted, updated, skipped: skippedRows.length, skippedRows };
}
