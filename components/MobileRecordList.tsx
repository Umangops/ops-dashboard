'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import { AlertCircle, Inbox, RotateCcw, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { queryBrand } from '@/lib/query';
import Pill from '@/components/ui/Pill';
import RecordDrawer from '@/components/RecordDrawer';
import type { BrandConfig, BrandColumn, Tone } from '@/lib/brands/types';

const PAGE_SIZE = 20;

function fmtDate(val: unknown): string {
  if (!val) return '—';
  try {
    const d = parseISO(String(val));
    return isValid(d) ? format(d, 'd MMM yyyy') : String(val);
  } catch {
    return String(val);
  }
}

// ─── single record card ───────────────────────────────────────────────────────

function RecordCard({
  row,
  brand,
  onClick,
}: {
  row: Record<string, unknown>;
  brand: BrandConfig;
  onClick: () => void;
}) {
  const planId = String(row['activation_code'] ?? '');

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

  const mobileFieldCols = brand.mobileFields
    .map((f) => brand.columns.find((c) => c.field === f))
    .filter((c): c is BrandColumn => !!c);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-[10px] border border-line bg-surface p-4 text-left transition-colors hover:bg-canvas active:scale-[0.99]"
    >
      {/* Plan ID + status pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-ink-3">Plan ID</p>
          <p className="truncate font-mono text-sm font-semibold text-ink">{planId || '—'}</p>
        </div>
        {statusLabel && (
          <div className="shrink-0">
            <Pill tone={statusTone}>{statusLabel}</Pill>
          </div>
        )}
      </div>

      {/* Mobile fields grid */}
      {mobileFieldCols.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {mobileFieldCols.map((col) => {
            const val = row[col.field];
            const display =
              val === null || val === undefined || val === ''
                ? '—'
                : col.type === 'date'
                ? fmtDate(val)
                : col.type === 'boolean'
                ? val === true
                  ? 'Paid'
                  : 'Unpaid'
                : String(val);
            return (
              <div key={col.field} className="min-w-0">
                <p className="text-[10px] font-medium text-ink-3">{col.label}</p>
                <p className="truncate text-sm text-ink">{display}</p>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ─── skeleton card ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-[10px] border border-line bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 h-2.5 w-12 animate-pulse rounded bg-subtle" />
          <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
        </div>
        <div className="h-7 w-24 animate-pulse rounded-full bg-subtle" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="mb-1 h-2 w-12 animate-pulse rounded bg-subtle" />
            <div className="h-4 w-20 animate-pulse rounded bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MobileRecordList({ brand }: { brand: BrandConfig }) {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // Stable filter key that excludes page/pageSize/sort (managed locally)
  const filterKey = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page'); p.delete('pageSize'); p.delete('sort');
    return p.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (k !== 'page' && k !== 'pageSize' && k !== 'sort') f[k] = v;
    });
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  // Reset + load first page when filters change
  useEffect(() => {
    let cancelled = false;
    setAllRows([]);
    setCurrentPage(1);
    setLoading(true);
    setError(null);

    queryBrand(supabase, brand, { ...filters, page: '1', pageSize: String(PAGE_SIZE) }).then(
      ({ data, count, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error);
        } else {
          setAllRows(data);
          setTotalCount(count);
        }
        setLoading(false);
      },
    );

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, brand.key, supabase]);

  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    queryBrand(supabase, brand, {
      ...filters,
      page: String(nextPage),
      pageSize: String(PAGE_SIZE),
    }).then(({ data, error }) => {
      if (error) return; // silently fail on load-more
      setAllRows((prev) => [...prev, ...data]);
      setCurrentPage(nextPage);
      setLoadingMore(false);
    });
  }, [supabase, brand, filters, currentPage]);

  const hasMore = allRows.length < totalCount;

  const hasFilters = !!(
    filters.q || filters.dateFrom || filters.dateTo ||
    brand.columns.some((c) => filters[c.field])
  );

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertCircle size={36} className="text-danger" />
        <p className="text-sm font-medium text-ink">Failed to load records</p>
        <p className="max-w-[240px] text-center text-xs text-ink-3">{error}</p>
      </div>
    );
  }

  // ── Empty ──
  if (allRows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Inbox size={36} className="text-ink-3" />
        <p className="text-sm font-medium text-ink">No records match your filters</p>
        {hasFilters && (
          <button
            onClick={() => {
              // clear filters by navigating to plain pathname
              window.history.replaceState(null, '', window.location.pathname);
              window.dispatchEvent(new Event('popstate'));
            }}
            className="flex items-center gap-1.5 rounded-[6px] border border-line px-4 py-2 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
          >
            <RotateCcw size={14} aria-hidden />
            Reset filters
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Count */}
      <p className="mb-2 text-xs text-ink-3">
        {allRows.length.toLocaleString()} of {totalCount.toLocaleString()} records
      </p>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {allRows.map((row, i) => (
          <RecordCard
            key={(row.id as string) ?? i}
            row={row}
            brand={brand}
            onClick={() => setSelectedRow(row)}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-line text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60"
        >
          {loadingMore ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Loading…
            </>
          ) : (
            `Load more (${(totalCount - allRows.length).toLocaleString()} remaining)`
          )}
        </button>
      )}

      {/* Record drawer */}
      <RecordDrawer
        row={selectedRow}
        brand={brand}
        onClose={() => setSelectedRow(null)}
      />
    </>
  );
}
