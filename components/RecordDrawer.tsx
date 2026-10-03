'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import Pill from '@/components/ui/Pill';
import type { BrandConfig, Tone } from '@/lib/brands/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(val: unknown): string {
  if (!val) return '—';
  try {
    const d = parseISO(String(val));
    return isValid(d) ? format(d, 'd MMM yyyy') : String(val);
  } catch {
    return String(val);
  }
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      title="Copy"
      className="shrink-0 rounded p-1 text-ink-3 transition-colors hover:text-primary"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface RecordDrawerProps {
  row: Record<string, unknown> | null;
  brand: BrandConfig;
  onClose: () => void;
}

export default function RecordDrawer({ row, brand, onClose }: RecordDrawerProps) {
  const open = !!row;
  const [rawExpanded, setRawExpanded] = useState(false);

  // Esc key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset raw panel when drawer opens a new row
  useEffect(() => {
    if (open) setRawExpanded(false);
  }, [open, row]);

  if (!row) return null;

  const planId = String(row['activation_code'] ?? '');

  // Primary status column — first type=status, then type=boolean
  const statusCol =
    brand.columns.find((c) => c.type === 'status') ??
    brand.columns.find((c) => c.type === 'boolean');

  const statusVal = statusCol ? row[statusCol.field] : null;
  const statusLabel =
    statusCol?.type === 'boolean'
      ? statusVal === true
        ? 'Paid'
        : statusVal === false
        ? 'Unpaid'
        : null
      : statusVal
      ? String(statusVal)
      : null;
  const statusTone = (
    statusLabel ? (brand.statusTones[statusLabel] ?? 'neutral') : 'neutral'
  ) as Tone;

  // Detail rows — all columns except Plan ID
  const detailCols = brand.columns.filter((c) => c.field !== 'activation_code');

  // Raw extra fields (from jsonb)
  const rawData = row['raw'] as Record<string, unknown> | null;
  const rawEntries = rawData
    ? Object.entries(rawData).sort(([a], [b]) => a.localeCompare(b))
    : [];

  // Last updated
  const updatedAt = (() => {
    const v = row['updated_at'];
    if (!v) return null;
    try {
      const d = parseISO(String(v));
      return isValid(d) ? format(d, 'd MMM yyyy, h:mm a') : null;
    } catch {
      return null;
    }
  })();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        style={{ animation: 'modal-in 150ms ease-out' }}
      />

      {/* Drawer panel — full-screen on mobile, 400px on sm+ */}
      <div
        className="fixed inset-0 z-50 flex flex-col bg-surface shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[400px]"
        style={{ animation: 'drawer-right 200ms ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Plan ID
              </span>
              <div className="flex items-center gap-0.5">
                <span className="font-mono text-base font-semibold text-ink">
                  {planId || '—'}
                </span>
                {planId && <CopyBtn value={planId} />}
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
          {statusLabel && <Pill tone={statusTone}>{statusLabel}</Pill>}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Key Details */}
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Key Details
          </h3>
          <div className="flex flex-col divide-y divide-line rounded-[8px] border border-line">
            {detailCols.map((col) => {
              const val = row[col.field];
              const isEmpty = val === null || val === undefined || val === '';

              const content = (() => {
                if (isEmpty) return <span className="text-ink-3">—</span>;

                if (col.type === 'date') {
                  return <span className="text-ink">{fmtDate(val)}</span>;
                }

                if (col.type === 'boolean') {
                  const label = val === true ? 'Paid' : 'Unpaid';
                  const tone = (brand.statusTones[label] ?? 'neutral') as Tone;
                  return <Pill tone={tone}>{label}</Pill>;
                }

                if (col.type === 'status') {
                  const label = String(val);
                  const tone = (brand.statusTones[label] ?? 'neutral') as Tone;
                  return <Pill tone={tone}>{label}</Pill>;
                }

                return (
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="break-all text-ink">{String(val)}</span>
                    {col.copyable && <CopyBtn value={String(val)} />}
                  </div>
                );
              })();

              return (
                <div key={col.field} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="w-28 shrink-0 text-xs leading-5 text-ink-3">{col.label}</span>
                  <div className="min-w-0 flex-1 text-sm leading-5">{content}</div>
                </div>
              );
            })}
          </div>

          {/* All Data (collapsible) */}
          {rawEntries.length > 0 && (
            <div className="mt-5">
              <button
                onClick={() => setRawExpanded((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3 transition-colors hover:text-ink"
              >
                <span>All Data ({rawEntries.length} fields)</span>
                {rawExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {rawExpanded && (
                <div className="mt-2 flex flex-col divide-y divide-line rounded-[8px] border border-line">
                  {rawEntries.map(([key, val]) => (
                    <div key={key} className="flex items-start gap-3 px-3 py-2">
                      <span className="w-28 shrink-0 break-all text-xs leading-5 text-ink-3">
                        {key}
                      </span>
                      <span className="min-w-0 flex-1 break-all text-sm leading-5 text-ink">
                        {val === null || val === undefined || val === '' ? '—' : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {updatedAt && (
          <div className="border-t border-line px-5 py-3">
            <p className="text-xs text-ink-3">Last updated {updatedAt}</p>
          </div>
        )}
      </div>
    </>
  );
}
