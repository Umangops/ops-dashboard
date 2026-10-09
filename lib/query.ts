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

export interface StatusGroup {
  key: string;
  label: string;
  total: number;
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
  const rawQ = (filters.q ?? '').replace(/[,()\%]/g, '').trim();
  if (rawQ) {
    const e = escIlike(rawQ.toLowerCase());
    if (brand.globalSearchColumns?.length) {
      q = q.or(brand.globalSearchColumns.map((f) => `${f}.ilike.%${e}%`).join(','));
    } else {
      q = q.ilike('search_text', `%${e}%`);
    }
  }

  for (const col of brand.columns) {
    const val = filters[col.field];
    if (!val) continue;
    if (col.filter === 'search') {
      const v = col.field === 'customer_mobile' ? cleanPhone(val) : val;
      q = q.ilike(col.field, `%${escIlike(v)}%`);
    } else if (col.filter === 'dropdown') {
      // Exact case-insensitive match from searchable dropdown
      q = q.ilike(col.field, escIlike(val.trim()));
    } else if (col.filter === 'select') {
      if (col.type === 'boolean') {
        q = q.eq(col.field, val === 'Paid');
      } else if (col.keyField) {
        // Filter via the generated normalised-key column — handles any casing/spacing in DB
        q = q.eq(col.keyField, val);
      } else {
        q = q.ilike(col.field, val);
      }
    }
  }

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
  const pageSize = Number.isFinite(rawSize) ? Math.min(Math.max(1, rawSize), 1_000) : 25;
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

// Returns distinct status groups for Hitachi/Godrej from the status_groups RPC.
export async function statusGroups(
  supabase: SupabaseClient,
  table: string,
): Promise<StatusGroup[]> {
  const { data, error } = await supabase.rpc('status_groups', { p_table: table });
  if (error || !data) return [];
  return (data as { key: string; label: string; total: bigint | number }[]).map((r) => ({
    key: r.key,
    label: r.label,
    total: Number(r.total),
  }));
}

// Samsung store dropdown options.
export async function samsungStoreOptions(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc('samsung_store_options');
  if (error || !data) return [];
  return (data as { store_name: string }[]).map((r) => r.store_name);
}

// Samsung branch dropdown options — optionally filtered by selected store.
export async function samsungBranchOptions(supabase: SupabaseClient, store?: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('samsung_branch_options', { p_store: store ?? null });
  if (error || !data) return [];
  return (data as { branch_name: string }[]).map((r) => r.branch_name);
}

// Samsung partner card counts — groups by store_name, respects all current filters.
export async function samsungPartnerCounts(
  supabase: SupabaseClient,
  filters: Record<string, string>,
): Promise<{ store_name: string; total: number }[]> {
  const { data, error } = await supabase.rpc('samsung_partner_counts', {
    p_q:       filters.q       || null,
    p_plan:    filters.plan_name || null,
    p_branch:  filters.branch_name || null,
    date_from: filters.dateFrom || null,
    date_to:   filters.dateTo   || null,
  });
  if (error || !data) return [];
  return (data as { store_name: string; total: number | bigint }[]).map((r) => ({
    store_name: r.store_name,
    total: Number(r.total),
  }));
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
