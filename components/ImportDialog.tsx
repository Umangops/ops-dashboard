'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { importExcel } from '@/lib/import';
import type { ImportResult } from '@/lib/import';
import type { BrandConfig } from '@/lib/brands/types';

// ─── csv download helper ─────────────────────────────────────────────────────

function makeCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n'))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    headers.map(esc).join(','),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
  ].join('\n');
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  const blob = new Blob([makeCSV(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── result tile ─────────────────────────────────────────────────────────────

function ResultTile({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col rounded-[8px] p-4" style={{ backgroundColor: bg }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums leading-none" style={{ color }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  brand: BrandConfig;
  userId: string;
  userName: string;
}

type Phase = 'idle' | 'processing' | 'done' | 'error';

export default function ImportDialog({
  open,
  onClose,
  onSuccess,
  brand,
  userId,
  userName,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ msg: '', pct: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');

  const reset = useCallback(() => {
    setPhase('idle');
    setProgress({ msg: '', pct: 0 });
    setResult(null);
    setErrorMsg('');
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    if (phase === 'processing') return;
    reset();
    onClose();
  }, [phase, reset, onClose]);

  const processFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        setErrorMsg('Only .xlsx, .xls, or .csv files are supported.');
        setPhase('error');
        return;
      }
      setFileName(file.name);
      setPhase('processing');
      setProgress({ msg: 'Reading file…', pct: 5 });
      try {
        const res = await importExcel(
          file,
          brand,
          supabase,
          userId,
          userName,
          (msg, pct) => setProgress({ msg, pct }),
        );
        setResult(res);
        setPhase('done');
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'An unexpected error occurred.',
        );
        setPhase('error');
      }
    },
    [brand, supabase, userId, userName],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDone = useCallback(() => {
    reset();
    onClose();
    onSuccess();
  }, [reset, onClose, onSuccess]);

  const title =
    phase === 'done'
      ? 'Import Complete'
      : phase === 'error'
      ? 'Import Failed'
      : `Import ${brand.label} Records`;

  return (
    <Modal open={open} onClose={handleClose} size="md" title={title} mobileFullscreen>
      {/* ── idle: drag-drop ── */}
      {phase === 'idle' && (
        <div className="flex flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-[8px] border-2 border-dashed py-12 transition-colors ${
              isDragOver
                ? 'border-primary bg-primary-soft'
                : 'border-line hover:border-line-strong'
            }`}
          >
            <Upload
              size={32}
              className={isDragOver ? 'text-primary' : 'text-ink-3'}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-ink">
                Drop your Excel or CSV file here
              </p>
              <p className="mt-0.5 text-xs text-ink-3">
                .xlsx · .xls · .csv &nbsp;·&nbsp; Sheet: &ldquo;{brand.sheetName}&rdquo;
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-1 flex h-9 items-center gap-2 rounded-[6px] bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Browse files
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── processing ── */}
      {phase === 'processing' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <FileText size={20} className="shrink-0 text-ink-3" />
            <p className="truncate text-sm font-medium text-ink">{fileName}</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-3">{progress.msg}</p>
              <p className="text-xs font-medium text-ink">{progress.pct}%</p>
            </div>
          </div>
        </div>
      )}

      {/* ── done ── */}
      {phase === 'done' && result && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <ResultTile label="Total Rows" value={result.total} color="#4B5563" bg="#F0F2F5" />
            <ResultTile label="Inserted" value={result.inserted} color="#2E9E5B" bg="#DDF5E7" />
            <ResultTile label="Updated" value={result.updated} color="#4F5FE8" bg="#E8EBFD" />
            <ResultTile
              label="Skipped"
              value={result.skipped}
              color={result.skipped > 0 ? '#D4A017' : '#4B5563'}
              bg={result.skipped > 0 ? '#FDF3D0' : '#F0F2F5'}
            />
          </div>

          {result.skipped > 0 && (
            <button
              onClick={() =>
                downloadCSV(
                  result.skippedRows,
                  `skipped_${brand.key}_${Date.now()}.csv`,
                )
              }
              className="flex items-center justify-center gap-2 rounded-[6px] border border-line py-2.5 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              <Download size={15} />
              Download {result.skipped} skipped row
              {result.skipped !== 1 ? 's' : ''} as CSV
            </button>
          )}

          <button
            onClick={handleDone}
            className="flex h-10 items-center justify-center gap-2 rounded-[6px] bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <CheckCircle2 size={16} />
            Done — refresh table
          </button>
        </div>
      )}

      {/* ── error ── */}
      {phase === 'error' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <AlertCircle size={40} className="text-danger" />
          <div className="text-center">
            <p className="text-sm font-medium text-ink">Could not import file</p>
            <p className="mt-1 max-w-sm text-xs text-ink-3">{errorMsg}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex h-9 items-center gap-2 rounded-[6px] bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Try Again
            </button>
            <button
              onClick={handleClose}
              className="flex h-9 items-center gap-2 rounded-[6px] border border-line px-4 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
