'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';

interface ImportRow {
  id: string;
  brand: string;
  file_name: string;
  uploaded_by_name: string | null;
  total_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  created_at: string;
}

interface Props {
  imports: ImportRow[];
}

const BRAND_LABELS: Record<string, string> = {
  hitachi: 'Hitachi',
  godrej: 'Godrej',
  samsung: 'Samsung',
};

export default function UploadHistoryTable({ imports }: Props) {
  const [brandFilter, setBrandFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (brandFilter === 'all') return imports;
    return imports.filter((r) => r.brand === brandFilter);
  }, [imports, brandFilter]);

  const brandOptions = [
    { key: 'all', label: 'All Brands' },
    { key: 'hitachi', label: 'Hitachi' },
    { key: 'godrej', label: 'Godrej' },
    { key: 'samsung', label: 'Samsung' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Brand filter chips */}
      <div className="flex flex-wrap gap-2">
        {brandOptions.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setBrandFilter(key)}
            className={`h-8 rounded-[6px] border px-3 text-xs font-medium transition-colors ${
              brandFilter === key
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 760 }}>
            <thead>
              <tr className="border-b border-line bg-subtle">
                {[
                  'Date & Time',
                  'Brand',
                  'File Name',
                  'Uploaded By',
                  'Rows',
                  'Inserted',
                  'Updated',
                  'Skipped',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-ink-3">
                    No uploads yet
                    {brandFilter !== 'all' && ` for ${BRAND_LABELS[brandFilter] ?? brandFilter}`}.
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line last:border-0 transition-colors hover:bg-canvas"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">
                    {format(parseISO(row.created_at), 'd MMM yyyy, h:mm a')}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {BRAND_LABELS[row.brand] ?? row.brand}
                  </td>
                  <td
                    className="max-w-[220px] truncate px-4 py-3 text-ink-2"
                    title={row.file_name}
                  >
                    {row.file_name}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{row.uploaded_by_name ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-ink">
                    {row.total_rows.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-success">
                    {row.inserted.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-info">
                    {row.updated.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-warning">
                    {row.skipped.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
