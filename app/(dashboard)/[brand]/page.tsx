import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getBrand } from '@/lib/brands';
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">{brand.label} Records</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          Search, filter and view all {brand.label} warranty records.
        </p>
      </div>

      {/* FilterBar + DataTable both use useSearchParams → must be inside Suspense */}
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBar brand={brand} />
      </Suspense>

      <Suspense fallback={<TableSkeleton cols={brand.columns.length} />}>
        <DataTable brand={brand} />
      </Suspense>
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
    <div className="flex flex-col gap-0 overflow-hidden rounded-[10px] border border-line bg-surface">
      {/* header */}
      <div className="flex gap-4 border-b border-line px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 w-20 animate-pulse rounded bg-subtle" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
}
