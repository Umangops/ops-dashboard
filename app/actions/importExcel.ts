'use server';

import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { getBrand } from '@/lib/brands';
import { toText, parseDate, parseBool, normaliseHeader } from '@/lib/clean';
import type { ImportResult } from '@/lib/import';

// Runs on the Vercel server — no browser thread blocking, no page freeze.
// The bodySizeLimit in next.config.ts controls the max upload size.

export async function importExcelAction(formData: FormData): Promise<ImportResult> {
  const file = formData.get('file') as File;
  const brandKey = formData.get('brandKey') as string;
  const userId = formData.get('userId') as string;
  const userName = formData.get('userName') as string;

  if (!file?.size) throw new Error('No file received.');

  const brand = getBrand(brandKey);
  if (!brand) throw new Error(`Unknown brand: ${brandKey}`);

  // ── Parse Excel ──────────────────────────────────────────────────────────────
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });

  const wsName =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === brand.sheetName.toLowerCase()) ??
    wb.SheetNames[0];
  if (!wsName) throw new Error('No sheets found in the workbook.');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wsName], {
    raw: true,
    defval: null,
  });

  if (rows.length === 0) {
    return { total: 0, inserted: 0, updated: 0, skipped: 0, skippedRows: [] };
  }

  // ── Map headers → DB fields ──────────────────────────────────────────────────
  const headerToField = new Map<string, string>();
  for (const col of brand.columns) headerToField.set(normaliseHeader(col.header), col.field);
  const ignoredNorm = new Set((brand.ignoredHeaders ?? []).map(normaliseHeader));

  const fileHeaders = Object.keys(rows[0]).map(normaliseHeader);
  const missing = brand.columns
    .filter((c) => c.required)
    .filter((c) => !fileHeaders.includes(normaliseHeader(c.header)));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.map((c) => c.header).join(', ')}`);
  }

  // ── Transform rows ────────────────────────────────────────────────────────────
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

  const records = Array.from(recordMap.values());

  // ── Upsert to Supabase ────────────────────────────────────────────────────────
  const supabase = await createClient();

  const { count: countBefore } = await supabase
    .from(brand.table)
    .select('*', { count: 'exact', head: true });

  const BATCH = 1000;
  for (let i = 0; i < records.length; i += BATCH) {
    const { error } = await supabase
      .from(brand.table)
      .upsert(
        records.slice(i, i + BATCH).map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: 'activation_code' },
      );
    if (error) throw new Error(error.message);
  }

  const { count: countAfter } = await supabase
    .from(brand.table)
    .select('*', { count: 'exact', head: true });

  const inserted = Math.max(0, (countAfter ?? 0) - (countBefore ?? 0));
  const updated = records.length - inserted;

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

  return { total: records.length, inserted, updated, skipped: skippedRows.length, skippedRows };
}
