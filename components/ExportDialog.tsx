'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { countBrand } from '@/lib/query';
import { exportBrand, MAX_EXPORT_ROWS } from '@/lib/export';
import type { ExportFormat, ExportColumns } from '@/lib/export';
import type { BrandConfig } from '@/lib/brands/types';
import type { Filters } from '@/lib/query';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  brand: BrandConfig;
  filters: Filters;
}

type Phase = 'idle' | 'fetching' | 'error';

export default function ExportDialog({ open, onClose, onSuccess, brand, filters }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [count, setCount] = useState<number | null>(null);
  const [fmt, setFmt] = useState<ExportFormat>('xlsx');
  const [cols, setCols] = useState<ExportColumns>('dashboard');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ msg: '', pct: 0 });
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch count whenever dialog opens (or filters change while open)
  useEffect(() => {
    if (!open) return;
    setCount(null);
    countBrand(supabase, brand, filters).then(setCount);
  }, [open, supabase, brand, filters]);

  const resetAndClose = useCallback(() => {
    if (phase === 'fetching') return;
    setPhase('idle');
    setProgress({ msg: '', pct: 0 });
    setErrorMsg('');
    onClose();
  }, [phase, onClose]);

  const handleExport = useCallback(async () => {
    setPhase('fetching');
    setProgress({ msg: 'Fetching records…', pct: 5 });
    try {
      await exportBrand(supabase, brand, filters, { format: fmt, columns: cols }, (msg, pct) => {
        setProgress({ msg, pct });
      });
      // Reset before calling onSuccess so dialog is clean
      setPhase('idle');
      setProgress({ msg: '', pct: 0 });
      onClose();
      onSuccess(); // shows toast in parent
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed. Please try again.');
      setPhase('error');
    }
  }, [supabase, brand, filters, fmt, cols, onClose, onSuccess]);

  const isOverLimit = (count ?? 0) > MAX_EXPORT_ROWS;
  const canExport = count !== null && count > 0 && phase === 'idle';
  const exportCount = count !== null ? Math.min(count, MAX_EXPORT_ROWS) : 0;

  return (
    <Modal open={open} onClose={resetAndClose} size="md" title={`Export ${brand.label} Records`} mobileFullscreen>

      {/* ── fetching: progress ── */}
      {phase === 'fetching' && (
        <div className="flex flex-col gap-4 py-2">
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
      )}

      {/* ── idle / error: options ── */}
      {phase !== 'fetching' && (
        <div className="flex flex-col gap-5">
          {/* Record count */}
          <div className="rounded-[8px] bg-subtle px-4 py-3">
            {count === null ? (
              <div className="h-4 w-44 animate-pulse rounded bg-line" />
            ) : (
              <p className="text-sm text-ink">
                <span className="font-semibold">{count.toLocaleString()}</span>{' '}
                record{count !== 1 ? 's' : ''} match your current filters
              </p>
            )}
          </div>

          {/* 50k warning */}
          {isOverLimit && (
            <div className="flex items-start gap-2 rounded-[8px] border border-warning-border bg-warning-soft px-3 py-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-xs text-ink">
                Only the first <strong>50,000</strong> rows will be exported.
              </p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="rounded-[8px] border border-danger-border bg-danger-soft px-3 py-2.5">
              <p className="text-xs text-ink">{errorMsg}</p>
            </div>
          )}

          {/* Format selector */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Format</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'xlsx', label: 'Excel (.xlsx)', Icon: FileSpreadsheet },
                  { id: 'csv',  label: 'CSV (.csv)',   Icon: FileText        },
                ] as { id: ExportFormat; label: string; Icon: React.ElementType }[]
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setFmt(id)}
                  className={`flex items-center gap-2 rounded-[6px] border px-3 py-2.5 text-sm transition-colors ${
                    fmt === id
                      ? 'border-primary bg-primary-soft font-medium text-primary'
                      : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Columns selector */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Columns</p>
            <div className="flex flex-col gap-2">
              {(
                [
                  {
                    id: 'dashboard',
                    label: 'Dashboard columns',
                    desc: 'Only the columns visible in the table',
                  },
                  {
                    id: 'all',
                    label: 'All columns',
                    desc: 'Includes extra raw data from the original upload',
                  },
                ] as { id: ExportColumns; label: string; desc: string }[]
              ).map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setCols(id)}
                  className={`flex flex-col rounded-[6px] border px-3 py-2.5 text-left transition-colors ${
                    cols === id
                      ? 'border-primary bg-primary-soft'
                      : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${cols === id ? 'text-primary' : 'text-ink'}`}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-ink-3">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={!canExport}
            className="flex h-10 items-center justify-center gap-2 rounded-[6px] bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {count === null
              ? 'Loading…'
              : count === 0
              ? 'No records to export'
              : `Export ${exportCount.toLocaleString()} record${exportCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </Modal>
  );
}
