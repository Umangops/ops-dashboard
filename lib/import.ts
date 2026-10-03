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

// Runs XLSX parsing + Supabase writes in a background Web Worker (/import-worker.js)
// so the browser main thread stays fully responsive during large file imports.
// The worker loads SheetJS from /xlsx.full.min.js (self-hosted, cached after first load).

export async function importExcel(
  file: File,
  brand: BrandConfig,
  supabase: SupabaseClient,
  userId: string,
  userName: string,
  onProgress?: ProgressFn,
): Promise<ImportResult> {
  // Gather credentials before spawning worker
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? '';

  // Read file bytes (fast, async — returns immediately after buffering)
  const buffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    // Static worker at /import-worker.js — no bundler magic required
    const worker = new Worker('/import-worker.js');

    worker.postMessage(
      {
        buffer,
        supabaseUrl,
        anonKey,
        accessToken,
        sheetName: brand.sheetName,
        table: brand.table,
        columns: brand.columns.map((c) => ({
          field: c.field,
          header: c.header,
          type: c.type,
          required: c.required ?? false,
        })),
        ignoredHeaders: brand.ignoredHeaders ?? [],
        fileName: file.name,
        userId,
        userName,
        brandKey: brand.key,
      },
      [buffer], // transfer ownership — zero-copy, no serialization overhead
    );

    worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'progress':
          onProgress?.(data.msg, data.pct);
          break;
        case 'done':
          worker.terminate();
          resolve(data.result as ImportResult);
          break;
        case 'error':
          worker.terminate();
          reject(new Error(data.message));
          break;
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message ?? 'Worker failed to start'));
    };
  });
}
