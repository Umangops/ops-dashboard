'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Check,
  AlertCircle,
  Inbox,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { queryBrand } from '@/lib/query';
import type { BrandColumn, BrandConfig, Tone } from '@/lib/brands/types';
import RecordDrawer from '@/components/RecordDrawer';
import { cn } from '@/lib/utils';

// ─── tone colors (text only — no bubble) ────────────────────────────────────

const toneColor: Record<Tone, string> = {
  info:    '#4F5FE8',
  success: '#2E9E5B',
  warning: '#D4A017',
  danger:  '#E5252A',
  neutral: '#4B5563',
};

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(val: unknown): string {
  if (!val) return '—';
  try {
    const d = parseISO(String(val));
    return isValid(d) ? format(d, 'd MMM yyyy') : String(val);
  } catch {
    return String(val);
  }
}

function cellContent(
  col: BrandColumn,
  val: unknown,
  statusTones: Record<string, Tone>,
): { text: string; pill?: { label: string; tone: Tone } } {
  if (val === null || val === undefined || val === '') return { text: '—' };

  if (col.type === 'date') return { text: fmtDate(val) };

  if (col.type === 'boolean') {
    const label = val === true ? 'Paid' : 'Unpaid';
    return { text: label, pill: { label, tone: statusTones[label] ?? 'neutral' } };
  }

  if (col.type === 'status') {
    const label = String(val);
    return { text: label, pill: { label, tone: statusTones[label] ?? 'neutral' } };
  }

  return { text: String(val) };
}

// ─── column filter input ─────────────────────────────────────────────────────

function ColFilter({
  col,
  value,
  onChange,
}: {
  col: BrandColumn;
  value: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  // select — instant update
  if (col.filter === 'select' && col.options && col.options.length > 0) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full appearance-none rounded border border-line bg-surface px-2 pr-5 text-xs text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        >
          <option value="">All</option>
          {col.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown
          size={11}
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-3"
        />
      </div>
    );
  }

  // dateRange — controlled by FilterBar; show an empty placeholder
  if (col.filter === 'dateRange') {
    return <div className="h-7" />;
  }

  // text search (select with no options also falls here)
  return (
    <input
      type="search"
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => onChange(v), 400);
      }}
      placeholder="Filter…"
      className="h-7 w-full rounded border border-line bg-surface px-2 text-xs text-ink placeholder:text-ink-3/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
    />
  );
}

// ─── copy button ─────────────────────────────────────────────────────────────

function CopyBtn({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      title="Copy"
      className="ml-1.5 shrink-0 rounded p-0.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
    >
      {done ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface DataTableProps {
  brand: BrandConfig;
}

export default function DataTable({ brand }: DataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();

  // derive all filters from URL (stable across renders for same URL)
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    searchParams.forEach((v, k) => { f[k] = v; });
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // update one param, reset page unless changing page itself
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value) p.set(key, value); else p.delete(key);
      if (key !== 'page') p.delete('page');
      router.replace(`${pathname}?${p.toString()}`);
    },
    [searchParams, pathname, router],
  );

  // ─── fetch ───────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    queryBrand(supabase, brand, filters).then(({ data, count, error }) => {
      if (cancelled) return;
      if (error) { setError(error); setRows([]); setCount(0); }
      else { setRows(data); setCount(count); }
      setLoading(false);
    });

    return () => { cancelled = true; };
  // paramsKey and brand.key as strings avoid object identity issues
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, brand.key, supabase]);

  // ─── sort ────────────────────────────────────────────────────────────────
  const [sortField, sortDir] = (filters.sort ?? '').split(':');

  const handleSort = useCallback(
    (field: string) => {
      let next: string | null;
      if (sortField !== field) next = `${field}:asc`;
      else if (sortDir === 'asc') next = `${field}:desc`;
      else next = null;
      setParam('sort', next);
    },
    [sortField, sortDir, setParam],
  );

  // ─── pagination ───────────────────────────────────────────────────────────
  const rawSize = parseInt(filters.pageSize ?? '25', 10);
  const pageSize = ([25, 50, 100] as number[]).includes(rawSize) ? rawSize : 25;
  const page = Math.max(1, parseInt(filters.page ?? '1', 10));
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const displayFrom = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const displayTo = Math.min(page * pageSize, count);

  // ─── has active filters? ──────────────────────────────────────────────────
  const hasFilters = !!(
    filters.q || filters.dateFrom || filters.dateTo ||
    brand.columns.some((c) => filters[c.field])
  );

  const handleReset = useCallback(() => router.replace(pathname), [router, pathname]);

  // ─── render ───────────────────────────────────────────────────────────────
  const firstField = brand.columns[0]?.field;

  return (
    <div className="flex flex-col overflow-hidden rounded-[10px] border border-line bg-surface">
      {/* Scrollable table */}
      <div className="overflow-auto">
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth: `${Math.max(800, brand.columns.length * 156)}px` }}
        >
          <thead>
            {/* ── column label row (sticky) ── */}
            <tr>
              {brand.columns.map((col, i) => {
                const isFirst = col.field === firstField;
                const sorted = sortField === col.field;
                return (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className={cn(
                      'cursor-pointer select-none border-b border-line bg-surface px-4 py-3',
                      'sticky top-0 z-20 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3',
                      'hover:text-ink transition-colors',
                      isFirst && 'left-0 z-30',
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {sorted ? (
                        sortDir === 'asc'
                          ? <ChevronUp size={13} />
                          : <ChevronDown size={13} />
                      ) : (
                        <ChevronsUpDown size={13} className="opacity-30" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* ── per-column filter row (sticky just below labels) ── */}
            <tr>
              {brand.columns.map((col) => {
                const isFirst = col.field === firstField;
                return (
                  <th
                    key={col.field}
                    className={cn(
                      'sticky top-[44px] z-20 border-b border-line bg-subtle px-2 py-1.5',
                      isFirst && 'left-0 z-30',
                    )}
                  >
                    <ColFilter
                      col={col}
                      value={filters[col.field] ?? ''}
                      onChange={(v) => setParam(col.field, v || null)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* ── loading skeleton ── */}
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-line">
                {brand.columns.map((col) => (
                  <td key={col.field} className="px-4 py-5">
                    <div
                      className="h-4 animate-pulse rounded bg-subtle"
                      style={{ width: `${55 + (i * 37 + col.field.length * 7) % 45}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* ── error ── */}
            {!loading && error && (
              <tr>
                <td colSpan={brand.columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle size={36} className="text-danger" />
                    <p className="text-sm font-medium text-ink">Failed to load records</p>
                    <p className="max-w-xs text-xs text-ink-3">{error}</p>
                    <button
                      onClick={() => {
                        // force re-fetch by toggling a dummy param
                        const p = new URLSearchParams(searchParams.toString());
                        p.set('_r', String(Date.now()));
                        router.replace(`${pathname}?${p.toString()}`);
                      }}
                      className="mt-1 flex items-center gap-1.5 rounded-[6px] border border-line px-4 py-2 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
                    >
                      <RotateCcw size={14} />
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* ── empty ── */}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={brand.columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Inbox size={36} className="text-ink-3" />
                    <p className="text-sm font-medium text-ink">No records match your filters</p>
                    {hasFilters && (
                      <button
                        onClick={handleReset}
                        className="mt-1 flex items-center gap-1.5 rounded-[6px] border border-line px-4 py-2 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
                      >
                        <RotateCcw size={14} />
                        Reset filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* ── data rows ── */}
            {!loading && !error && rows.map((row, ri) => (
              <tr
                key={(row.id as string) ?? ri}
                onClick={() => setSelectedRow(row)}
                className="group cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-canvas"
                style={{ height: 72 }}
              >
                {brand.columns.map((col) => {
                  const isFirst = col.field === firstField;
                  const raw = row[col.field];
                  const { text, pill } = cellContent(col, raw, brand.statusTones);

                  return (
                    <td
                      key={col.field}
                      className={cn(
                        'px-4 align-middle',
                        isFirst &&
                          'sticky left-0 z-10 bg-surface transition-colors group-hover:bg-canvas',
                      )}
                    >
                      {pill ? (
                        <span
                          className="font-medium"
                          style={{ color: toneColor[pill.tone] }}
                        >
                          {pill.label}
                        </span>
                      ) : (
                        <div className="flex items-center">
                          <span
                            className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-ink"
                            title={text !== '—' ? text : undefined}
                          >
                            {text === '—' ? (
                              <span className="text-ink-3">{text}</span>
                            ) : text}
                          </span>
                          {col.copyable && text !== '—' && (
                            <CopyBtn value={text} />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── record drawer ── */}
      <RecordDrawer
        row={selectedRow}
        brand={brand}
        onClose={() => setSelectedRow(null)}
      />

      {/* ── footer ── */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="text-sm text-ink-3">
            {count === 0
              ? 'No records'
              : `Showing ${displayFrom.toLocaleString()}–${displayTo.toLocaleString()} of ${count.toLocaleString()} records`}
          </span>

          <div className="flex items-center gap-3">
            {/* rows per page */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-3">Rows</span>
              <select
                value={pageSize}
                onChange={(e) => setParam('pageSize', e.target.value)}
                className="h-8 rounded border border-line bg-surface px-2 pr-6 text-xs text-ink outline-none focus:border-primary appearance-none"
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* prev / page info / next */}
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronUp size={14} className="-rotate-90" />
              </button>
              <span className="min-w-[60px] text-center text-sm text-ink">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
