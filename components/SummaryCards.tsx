'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  FileText,
  CheckCircle,
  Ban,
  Clock,
  Tag,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { countBrand, samsungPlanCounts } from '@/lib/query';
import type { BrandConfig, Tone } from '@/lib/brands/types';

// ─── tone style map ───────────────────────────────────────────────────────────

const toneMap: Record<Tone, { color: string; bg: string; border: string }> = {
  info:    { color: '#4F5FE8', bg: '#E8EBFD', border: '#C7CDFA' },
  success: { color: '#2E9E5B', bg: '#DDF5E7', border: '#A7E3C1' },
  warning: { color: '#D4A017', bg: '#FDF3D0', border: '#F2D675' },
  danger:  { color: '#E5252A', bg: '#FDE2E2', border: '#F7B4B5' },
  neutral: { color: '#4B5563', bg: '#F0F2F5', border: '#D1D5DB' },
};

const toneIcons: Record<Tone, LucideIcon> = {
  success: CheckCircle,
  danger:  Ban,
  warning: Clock,
  neutral: FileText,
  info:    Tag,
};

// ─── individual card ──────────────────────────────────────────────────────────

interface CardDef {
  id: string;
  label: string;
  tone: Tone;
  Icon: LucideIcon;
  filterField?: string;
  filterValue?: string;
  count: number | null;
}

function Card({
  card,
  selected,
  snap,
  onClick,
}: {
  card: CardDef;
  selected: boolean;
  snap: boolean;
  onClick: () => void;
}) {
  const ts = toneMap[card.tone];
  const Icon = card.Icon;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col rounded-[10px] bg-surface p-4 text-left transition-all hover:shadow-sm active:scale-[0.98] ${
        snap ? 'w-[160px] shrink-0 snap-start' : 'w-full'
      }`}
      style={{
        border: selected ? `2px solid ${ts.border}` : '1px solid #E5E7EB',
        boxShadow: selected ? `0 0 0 3px ${ts.bg}` : undefined,
      }}
    >
      {/* icon tile */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-[8px]"
        style={{ backgroundColor: ts.bg }}
      >
        <Icon size={18} style={{ color: ts.color }} />
      </div>

      {/* label */}
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3 leading-tight">
        {card.label}
      </p>

      {/* count */}
      <p
        className="mt-1 text-3xl font-bold leading-none tabular-nums"
        style={{ color: ts.color }}
      >
        {card.count === null ? '…' : card.count.toLocaleString()}
      </p>
    </button>
  );
}

function CardSkeleton({ snap }: { snap: boolean }) {
  return (
    <div
      className={`rounded-[10px] border border-line bg-surface p-4 ${
        snap ? 'w-[160px] shrink-0' : 'w-full'
      }`}
    >
      <div className="h-9 w-9 animate-pulse rounded-[8px] bg-subtle" />
      <div className="mt-3 h-2.5 w-20 animate-pulse rounded bg-subtle" />
      <div className="mt-2 h-8 w-14 animate-pulse rounded bg-subtle" />
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface SummaryCardsProps {
  brand: BrandConfig;
}

export default function SummaryCards({ brand }: SummaryCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const isSamsung = brand.key === 'samsung';
  const isDynamic = brand.summary.type === 'dynamic';
  const statusField = !isDynamic ? brand.summary.field : null;

  // Base filters: URL params minus sort/page/pageSize/statusField
  // (cards show breakdown by status, so the active status filter must be excluded)
  const paramsKey = searchParams.toString();
  const baseFilters = useMemo(() => {
    const f: Record<string, string> = {};
    searchParams.forEach((v, k) => { f[k] = v; });
    if (statusField) delete f[statusField];
    delete f.sort; delete f.page; delete f.pageSize;
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, statusField]);

  // counts keyed by card id
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCounts({});

    if (isDynamic) {
      // Samsung — use the RPC (only dateFrom/dateTo filters supported)
      samsungPlanCounts(supabase, baseFilters.dateFrom, baseFilters.dateTo).then((rows) => {
        if (cancelled) return;
        const result: Record<string, number> = {};
        const total = rows.reduce((s, r) => s + r.total, 0);
        result['__total'] = total;
        const maxCards = (brand.summary as { maxCards: number }).maxCards;
        const top = rows.slice(0, maxCards);
        top.forEach((r) => { result[r.plan_name] = r.total; });
        const othersSum = top.reduce((s, r) => s + r.total, 0);
        if (total - othersSum > 0) result['__others'] = total - othersSum;
        setCounts(result);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    // Hitachi / Godrej — parallel count queries (head: true)
    const statusCards = (brand.summary as { cards: { label: string; value: string; tone: Tone }[] }).cards;
    const promises = [
      countBrand(supabase, brand, baseFilters).then((n) => ({ id: '__total', n })),
      ...statusCards.map((c) =>
        countBrand(supabase, brand, { ...baseFilters, [statusField!]: c.value }).then((n) => ({
          id: c.value,
          n,
        })),
      ),
    ];

    Promise.all(promises).then((results) => {
      if (cancelled) return;
      const r: Record<string, number> = {};
      results.forEach(({ id, n }) => { r[id] = n; });
      setCounts(r);
      setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(baseFilters), brand.key, supabase]);

  // Build card definitions
  const cards = useMemo((): CardDef[] => {
    if (isDynamic) {
      const planKeys = Object.keys(counts).filter((k) => !k.startsWith('__'));
      return [
        { id: '__total', label: 'Total Plans', tone: 'neutral', Icon: FileText, count: counts['__total'] ?? null },
        ...planKeys.map((name) => ({
          id: name,
          label: name,
          tone: 'info' as Tone,
          Icon: Tag,
          filterField: 'plan_name',
          filterValue: name,
          count: counts[name] ?? null,
        })),
        ...(counts['__others'] != null
          ? [{ id: '__others', label: 'Others', tone: 'neutral' as Tone, Icon: MoreHorizontal, count: counts['__others'] }]
          : []),
      ];
    }

    const statusCards = (brand.summary as { cards: { label: string; value: string; tone: Tone }[] }).cards;
    return [
      { id: '__total', label: 'Total Plans', tone: 'neutral', Icon: FileText, count: counts['__total'] ?? null },
      ...statusCards.map((c) => ({
        id: c.value,
        label: c.label,
        tone: c.tone,
        Icon: toneIcons[c.tone] ?? FileText,
        filterField: statusField ?? undefined,
        filterValue: c.value,
        count: counts[c.value] ?? null,
      })),
    ];
  }, [brand.summary, counts, isDynamic, statusField]);

  const handleClick = useCallback(
    (card: CardDef) => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('page');
      if (!card.filterField) {
        // Total: clear status filter
        if (statusField) p.delete(statusField);
      } else {
        const current = p.get(card.filterField);
        if (current === card.filterValue) p.delete(card.filterField); // toggle off
        else p.set(card.filterField, card.filterValue!);
      }
      router.replace(`${pathname}?${p.toString()}`);
    },
    [searchParams, pathname, router, statusField],
  );

  const activeFilterValue = statusField ? (searchParams.get(statusField) ?? null) : null;
  const samsungActive = searchParams.get('plan_name') ?? null;

  // Layout class
  const containerCls = isSamsung
    ? 'flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mb-1'
    : brand.key === 'godrej'
    ? 'grid grid-cols-2 md:grid-cols-3 gap-3'
    : 'grid grid-cols-2 md:grid-cols-4 gap-3';

  const skeletonCount = brand.key === 'hitachi' ? 4 : brand.key === 'godrej' ? 3 : 5;

  return (
    <div className={containerCls}>
      {loading
        ? Array.from({ length: skeletonCount }).map((_, i) => (
            <CardSkeleton key={i} snap={isSamsung} />
          ))
        : cards.map((card) => {
            let selected = false;
            if (isSamsung) {
              selected = card.filterValue != null && samsungActive === card.filterValue;
            } else if (card.filterField && card.filterValue) {
              selected = activeFilterValue === card.filterValue;
            }
            return (
              <Card
                key={card.id}
                card={card}
                selected={selected}
                snap={isSamsung}
                onClick={() => handleClick(card)}
              />
            );
          })}
    </div>
  );
}
