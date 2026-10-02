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
  // strip spaces, dashes, parens, +91 prefix, leading 0
  return s.replace(/[\s\-()+]/g, '').replace(/^91(\d{10})$/, '$1').replace(/^0+/, '');
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

  // Global search — strip , ( ) % then search across all globalSearch columns
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
      if (col.type === 'boolean') {
        // Paid → true, Unpaid → false
        q = q.eq(col.field, val === 'Paid');
      } else {
        q = q.eq(col.field, val);
      }
    }
    // dateRange columns are handled via dateFrom/dateTo below
  }

  // Date range — always applies to brand.dateField
  if (filters.dateFrom) q = q.gte(brand.dateField, filters.dateFrom);
  if (filters.dateTo) q = q.lte(brand.dateField, filters.dateTo);

  // Sort
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
