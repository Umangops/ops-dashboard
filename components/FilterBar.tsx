'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, startOfDay, startOfMonth, subDays } from 'date-fns';
import { Search, X, RotateCcw } from 'lucide-react';
import type { BrandConfig } from '@/lib/brands/types';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const today = () => fmt(startOfDay(new Date()));
const ago = (n: number) => fmt(subDays(startOfDay(new Date()), n));
const monthStart = () => fmt(startOfMonth(new Date()));

const PRESETS = [
  { label: 'Today',   from: today,         to: today         },
  { label: '7 days',  from: () => ago(6),  to: today         },
  { label: '30 days', from: () => ago(29), to: today         },
  { label: 'Month',   from: monthStart,    to: today         },
] as const;

interface FilterBarProps {
  brand: BrandConfig;
  actionSlot?: React.ReactNode;
}

export default function FilterBar({ brand, actionSlot }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  const [localQ, setLocalQ] = useState(q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep localQ in sync if q is cleared externally (e.g., reset)
  useEffect(() => { setLocalQ(q); }, [q]);

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) p.set(k, v); else p.delete(k);
      }
      p.delete('page');
      router.replace(`${pathname}?${p.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const handleSearch = useCallback(
    (value: string) => {
      setLocalQ(value);
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        pushParams({ q: value || null });
      }, 400);
    },
    [pushParams],
  );

  const activePreset = useMemo(() => {
    if (!dateFrom && !dateTo) return null;
    return PRESETS.find((p) => p.from() === dateFrom && p.to() === dateTo) ?? null;
  }, [dateFrom, dateTo]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (q) n++;
    if (dateFrom || dateTo) n++;
    for (const col of brand.columns) {
      if (searchParams.get(col.field)) n++;
    }
    return n;
  }, [q, dateFrom, dateTo, brand.columns, searchParams]);

  const handleReset = useCallback(() => {
    router.replace(pathname);
    setLocalQ('');
  }, [router, pathname]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-surface px-4 py-3">
      {/* Global search */}
      <div className="relative min-w-[200px] flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <input
          type="search"
          value={localQ}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by Plan ID, phone, IMEI, CRM ID…"
          className="h-9 w-full rounded-[6px] border border-line bg-surface pl-9 pr-8 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {localQ && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-3 hover:text-ink"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Date range presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => {
          const active = activePreset?.label === p.label;
          return (
            <button
              key={p.label}
              onClick={() =>
                active
                  ? pushParams({ dateFrom: null, dateTo: null })
                  : pushParams({ dateFrom: p.from(), dateTo: p.to() })
              }
              className={`h-8 rounded-[6px] border px-3 text-xs font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        <span className="text-xs text-ink-3 select-none">or</span>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => pushParams({ dateFrom: e.target.value || null })}
          className="h-8 rounded-[6px] border border-line bg-surface px-2 text-xs text-ink outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        <span className="text-xs text-ink-3 select-none">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => pushParams({ dateTo: e.target.value || null })}
          className="h-8 rounded-[6px] border border-line bg-surface px-2 text-xs text-ink outline-none transition-colors hover:border-line-strong focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* Active count + reset */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
            {activeCount} active
          </span>
          <button
            onClick={handleReset}
            className="flex h-8 items-center gap-1.5 rounded-[6px] border border-line px-3 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      )}

      {/* Slot for Import / Export buttons (added in a later phase) */}
      {actionSlot && (
        <div className="ml-auto flex items-center gap-2">{actionSlot}</div>
      )}
    </div>
  );
}
