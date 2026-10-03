import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { getBrand } from '@/lib/brands';
import { createClient } from '@/lib/supabase/server';
import SummaryCards from '@/components/SummaryCards';
import FilterBar from '@/components/FilterBar';
import DataTable from '@/components/DataTable';
import ImportButton from '@/components/ImportButton';
import ExportButton from '@/components/ExportButton';
import MobileRecordList from '@/components/MobileRecordList';
import Skeleton from '@/components/ui/Skeleton';

interface Props {
  params: Promise<{ brand: string }>;
}

export default async function BrandPage({ params }: Props) {
  const { brand: brandKey } = await params;
  const brand = getBrand(brandKey);
  if (!brand) notFound();

  const supabase = await createClient();

  // User identity — used for admin check and import attribution
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()
    : { data: null };

  const isAdmin = profile?.role === 'admin';
  const userId = user?.id ?? '';
  const userName = profile?.full_name ?? user?.email ?? 'Unknown';

  // Latest import for this brand — "Last updated" subtitle
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

  // Export for all users; Import for admins only
  const actionSlot = (
    <div className="flex items-center gap-2">
      <ExportButton brand={brand} />
      {isAdmin && <ImportButton brand={brand} userId={userId} userName={userName} />}
    </div>
  );

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

      {/* Filter bar + Import button */}
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBar brand={brand} actionSlot={actionSlot} />
      </Suspense>

      {/* Desktop table — hidden on mobile */}
      <div className="hidden md:block">
        <Suspense fallback={<TableSkeleton cols={brand.columns.length} />}>
          <DataTable brand={brand} />
        </Suspense>
      </div>

      {/* Mobile card list — hidden on desktop */}
      <div className="md:hidden">
        <Suspense fallback={<MobileCardsSkeleton />}>
          <MobileRecordList brand={brand} />
        </Suspense>
      </div>
    </div>
  );
}

function CardsSkeleton({ brand }: { brand: string }) {
  const n = brand === 'hitachi' ? 4 : brand === 'godrej' ? 3 : 5;
  const cls =
    brand === 'hitachi'
      ? 'grid grid-cols-2 md:grid-cols-4 gap-3'
      : 'grid grid-cols-2 md:grid-cols-3 gap-3';
  return (
    <div className={cls}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}

function MobileCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-[10px] border border-line bg-surface p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 h-2.5 w-12 animate-pulse rounded bg-subtle" />
              <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
            </div>
            <div className="h-7 w-24 animate-pulse rounded-full bg-subtle" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j}>
                <div className="mb-1 h-2 w-12 animate-pulse rounded bg-subtle" />
                <div className="h-4 w-20 animate-pulse rounded bg-subtle" />
              </div>
            ))}
          </div>
        </div>
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
