'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X, ChevronDown } from 'lucide-react';
import { format, startOfDay, startOfMonth, subDays } from 'date-fns';
import type { BrandConfig } from '@/lib/brands/types';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const today = () => fmt(startOfDay(new Date()));
const ago = (n: number) => fmt(subDays(startOfDay(new Date()), n));
const monthStart = () => fmt(startOfMonth(new Date()));

const PRESETS = [
  { label: 'Today',   from: today,         to: today  },
  { label: '7 days',  from: () => ago(6),  to: today  },
  { label: '30 days', from: () => ago(29), to: today  },
  { label: 'Month',   from: monthStart,    to: today  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  brand: BrandConfig;
}

export default function MobileFilterSheet({ open, onClose, brand }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state — applied all at once on "Apply"
  const [localFrom, setLocalFrom] = useState('');
  const [localTo, setLocalTo] = useState('');
  const [localCols, setLocalCols] = useState<Record<string, string>>({});

  // Initialise from URL when sheet opens
  useEffect(() => {
    if (!open) return;
    setLocalFrom(searchParams.get('dateFrom') ?? '');
    setLocalTo(searchParams.get('dateTo') ?? '');
    const cols: Record<string, string> = {};
    for (const col of brand.columns) {
      cols[col.field] = searchParams.get(col.field) ?? '';
    }
    setLocalCols(cols);
  }, [open, searchParams, brand.columns]);

  // Esc key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleApply = useCallback(() => {
    const p = new URLSearchParams();
    const q = searchParams.get('q');
    if (q) p.set('q', q);
    if (localFrom) p.set('dateFrom', localFrom);
    if (localTo) p.set('dateTo', localTo);
    for (const [field, val] of Object.entries(localCols)) {
      if (val) p.set(field, val);
    }
    router.replace(`${pathname}?${p.toString()}`);
    onClose();
  }, [searchParams, localFrom, localTo, localCols, router, pathname, onClose]);

  const handleReset = useCallback(() => {
    const p = new URLSearchParams();
    const q = searchParams.get('q');
    if (q) p.set('q', q);
    router.replace(`${pathname}?${p.toString()}`);
    setLocalFrom('');
    setLocalTo('');
    setLocalCols({});
    onClose();
  }, [searchParams, router, pathname, onClose]);

  if (!open) return null;

  const activePreset =
    PRESETS.find((p) => p.from() === localFrom && p.to() === localTo) ?? null;

  // Columns that have a filter (exclude dateRange — handled by the date section)
  const filterableCols = brand.columns.filter(
    (c) => c.filter && c.filter !== 'dateRange',
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        style={{ animation: 'modal-in 150ms ease-out' }}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90dvh] flex-col rounded-t-[16px] bg-surface shadow-2xl"
        style={{ animation: 'drawer-bottom 250ms ease-out' }}
        role="dialog"
        aria-label="Filters"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Filters</h2>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Date Range */}
          <section className="mb-6">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Date Range
            </p>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = activePreset?.label === p.label;
                return (
                  <button
                    key={p.label}
                    onClick={() =>
                      active
                        ? (setLocalFrom(''), setLocalTo(''))
                        : (setLocalFrom(p.from()), setLocalTo(p.to()))
                    }
                    className={`h-10 rounded-[6px] border px-3 text-sm font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-line bg-surface text-ink-2 hover:border-line-strong'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                aria-label="Date from"
                className="h-11 flex-1 rounded-[6px] border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-primary"
              />
              <span className="text-sm text-ink-3" aria-hidden>–</span>
              <input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                aria-label="Date to"
                className="h-11 flex-1 rounded-[6px] border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-primary"
              />
            </div>
          </section>

          {/* Column filters */}
          <section className="flex flex-col gap-5">
            {filterableCols.map((col) => (
              <div key={col.field}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  {col.label}
                </p>
                {col.filter === 'select' && col.options && col.options.length > 0 ? (
                  <div className="relative">
                    <select
                      value={localCols[col.field] ?? ''}
                      onChange={(e) =>
                        setLocalCols((prev) => ({ ...prev, [col.field]: e.target.value }))
                      }
                      aria-label={col.label}
                      className="h-11 w-full appearance-none rounded-[6px] border border-line bg-surface px-3 pr-9 text-sm text-ink outline-none focus:border-primary"
                    >
                      <option value="">All</option>
                      {col.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
                      aria-hidden
                    />
                  </div>
                ) : (
                  <input
                    type="search"
                    value={localCols[col.field] ?? ''}
                    onChange={(e) =>
                      setLocalCols((prev) => ({ ...prev, [col.field]: e.target.value }))
                    }
                    placeholder={`Search ${col.label.toLowerCase()}…`}
                    aria-label={`Filter by ${col.label}`}
                    className="h-11 w-full rounded-[6px] border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-primary"
                  />
                )}
              </div>
            ))}
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-line px-5 py-4">
          <button
            onClick={handleReset}
            className="h-11 flex-1 rounded-[6px] border border-line text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="h-11 flex-1 rounded-[6px] bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
