import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { getBrand } from '@/lib/brands';
import { createClient } from '@/lib/supabase/server';
import SummaryCards from '@/components/SummaryCards';
import FilterBar from '@/components/FilterBar';
import DataTable from '@/components/DataTable';
import Skeleton from '@/components/ui/Skeleton';

interface Props {
  params: Promise<{ brand: string }>;
}

export default async function BrandPage({ params }: Props) {
  const { brand: brandKey } = await params;
  const brand = getBrand(brandKey);
  if (!brand) notFound();

  // Latest import for this brand — used for "Last updated" subtitle
  const supabase = await createClient();
  const { data: lastImport } = await supabase
    .from('imports')
    .select('uploaded_by_name, created_at')
    .eq('brand', brandKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastUpdatedText = lastImport
    ? `Last updated ${format(parseISO(lastImport.created_at), 'd MMM yyyy, h:mm a')}${
        lastImport.uploaded_by_name ? ` by ${lastImport.uploaded_by_name}` : ''
      }`
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-semibold text-ink">{brand.label} Records</h1>
        {lastUpdatedText ? (
          <p className="mt-0.5 text-sm text-ink-3">{lastUpdatedText}</p>
        ) : (
          <p className="mt-0.5 text-sm text-ink-3">
            Search, filter and view all {brand.label} warranty records.
          </p>
        )}
      </div>

      {/* Summary cards */}
      <Suspense fallback={<CardsSkeleton brand={brandKey} />}>
        <SummaryCards brand={brand} />
      </Suspense>

      {/* Filter bar */}
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBar brand={brand} />
      </Suspense>

      {/* Records table */}
      <Suspense fallback={<TableSkeleton cols={brand.columns.length} />}>
        <DataTable brand={brand} />
      </Suspense>
    </div>
  );
}

function CardsSkeleton({ brand }: { brand: string }) {
  const n = brand === 'hitachi' ? 4 : brand === 'godrej' ? 3 : 5;
  const cls = brand === 'hitachi'
    ? 'grid grid-cols-2 md:grid-cols-4 gap-3'
    : brand === 'godrej'
    ? 'grid grid-cols-2 md:grid-cols-3 gap-3'
    : 'flex gap-3 overflow-x-auto pb-1';
  return (
    <div className={cls}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="h-[52px] animate-pulse rounded-[10px] border border-line bg-surface" />
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="flex gap-4 border-b border-line px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 w-20 animate-pulse rounded bg-subtle" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
}
