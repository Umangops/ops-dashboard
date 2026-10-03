import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandConfig } from './brands/types';

export interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  skippedRows: Record<string, unknown>[];
}

export type ProgressFn = (msg: string, pct: number) => void;

// ── Off-thread parsing via Web Worker ────────────────────────────────────────
// Moves XLSX.read + sheet_to_json + row transformation to a background thread
// so the browser never freezes, even for large files (50 K+ rows).

function parseInWorker(
  buffer: ArrayBuffer,
  brand: BrandConfig,
  onProgress?: ProgressFn,
): Promise<{ records: Record<string, unknown>[]; skippedRows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./import.worker.ts', import.meta.url));

    worker.postMessage(
      {
        buffer,
        sheetName: brand.sheetName,
        columns: brand.columns.map((c) => ({
          field: c.field,
          header: c.header,
          type: c.type,
          required: c.required ?? false,
        })),
        ignoredHeaders: brand.ignoredHeaders ?? [],
      },
      [buffer], // transfer ownership — zero-copy, no clone overhead
    );

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress?.(data.msg, data.pct);
      } else if (data.type === 'done') {
        worker.terminate();
        resolve({ records: data.records, skippedRows: data.skippedRows });
      } else if (data.type === 'error') {
        worker.terminate();
        reject(new Error(data.message));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message ?? 'Worker error'));
    };
  });
}

// ── Main import function ──────────────────────────────────────────────────────

export async function importExcel(
  file: File,
  brand: BrandConfig,
  supabase: SupabaseClient,
  userId: string,
  userName: string,
  onProgress?: ProgressFn,
): Promise<ImportResult> {
  // 1. Read file bytes (fast, async — no blocking)
  const buffer = await file.arrayBuffer();

  // 2. Parse + transform on a background thread — UI stays responsive
  const { records, skippedRows } = await parseInWorker(buffer, brand, onProgress);

  if (records.length === 0) {
    return { total: 0, inserted: 0, updated: 0, skipped: skippedRows.length, skippedRows };
  }

  // 3. One count before upsert — avoids a round trip per batch
  const { count: countBefore } = await supabase
    .from(brand.table)
    .select('*', { count: 'exact', head: true });

  // 4. Upsert in batches of 1000
  const BATCH = 1000;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const pct = 20 + Math.round((i / Math.max(records.length, 1)) * 70);
    onProgress?.(`Uploading rows ${i + 1}–${Math.min(i + BATCH, records.length)}…`, pct);

    const { error } = await supabase
      .from(brand.table)
      .upsert(
        batch.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: 'activation_code' },
      );

    if (error) throw new Error(error.message);
  }

  // 5. One count after — derive inserts vs updates without per-batch round trips
  onProgress?.('Saving import record…', 92);
  const { count: countAfter } = await supabase
    .from(brand.table)
    .select('*', { count: 'exact', head: true });

  const inserted = Math.max(0, (countAfter ?? 0) - (countBefore ?? 0));
  const updated = records.length - inserted;

  // 6. Save import history record
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
