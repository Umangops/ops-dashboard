import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandConfig } from './brands/types';

export interface Filters {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  [field: string]: string | undefined;
}

export interface PageResult {
  data: Record<string, unknown>[];
  count: number;
  error: string | null;
}

function escIlike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

function cleanPhone(s: string): string {
  return s.replace(/[\s\-()+]/g, '').replace(/^91(\d{10})$/, '$1').replace(/^0+/, '');
}

// Shared filter logic — applied by both queryBrand and countBrand.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, brand: BrandConfig, filters: Filters): any {
  // Global search — strip , ( ) % then search across globalSearch columns
  const rawQ = (filters.q ?? '').replace(/[,()\%]/g, '').trim();
  if (rawQ) {
    const cols = brand.columns.filter((c) => c.globalSearch).map((c) => c.field);
    if (cols.length) {
      const e = escIlike(rawQ);
      q = q.or(cols.map((f) => `${f}.ilike.%${e}%`).join(','));
    }
  }

  // Per-column filters
  for (const col of brand.columns) {
    const val = filters[col.field];
    if (!val) continue;
    if (col.filter === 'search') {
      const v = col.field === 'customer_mobile' ? cleanPhone(val) : val;
      q = q.ilike(col.field, `%${escIlike(v)}%`);
    } else if (col.filter === 'select') {
      // boolean stored as true/false; status uses ilike so casing/spacing in the DB doesn't break matches
      q = col.type === 'boolean' ? q.eq(col.field, val === 'Paid') : q.ilike(col.field, val);
    }
  }

  // Date range — always applies to brand.dateField
  if (filters.dateFrom) q = q.gte(brand.dateField, filters.dateFrom);
  if (filters.dateTo) q = q.lte(brand.dateField, filters.dateTo);

  return q;
}

export async function queryBrand(
  supabase: SupabaseClient,
  brand: BrandConfig,
  filters: Filters,
): Promise<PageResult> {
  const page = Math.max(1, parseInt(filters.page ?? '1', 10));
  const rawSize = parseInt(filters.pageSize ?? '25', 10);
  const pageSize = ([25, 50, 100] as number[]).includes(rawSize) ? rawSize : 25;
  const offset = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(brand.table).select('*', { count: 'exact' });
  q = applyFilters(q, brand, filters);

  if (filters.sort) {
    const [field, dir] = filters.sort.split(':');
    if (field) q = q.order(field, { ascending: dir !== 'desc' });
  } else {
    q = q.order('created_at', { ascending: false });
  }

  q = q.range(offset, offset + pageSize - 1);

  const { data, count, error } = await q;
  return {
    data: (data ?? []) as Record<string, unknown>[],
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

// Returns just the count — used by SummaryCards for parallel count queries.
export async function countBrand(
  supabase: SupabaseClient,
  brand: BrandConfig,
  filters: Filters,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(brand.table).select('*', { count: 'exact', head: true });
  q = applyFilters(q, brand, filters);
  const { count, error } = await q;
  return error ? 0 : (count ?? 0);
}

// Samsung RPC — returns plan names sorted by count desc.
export async function samsungPlanCounts(
  supabase: SupabaseClient,
  dateFrom?: string,
  dateTo?: string,
): Promise<{ plan_name: string; total: number }[]> {
  const { data, error } = await supabase.rpc('samsung_plan_counts', {
    date_from: dateFrom ?? null,
    date_to: dateTo ?? null,
  });
  if (error || !data) return [];
  return (data as { plan_name: string; total: number | bigint }[]).map((r) => ({
    plan_name: r.plan_name,
    total: Number(r.total),
  }));
}
