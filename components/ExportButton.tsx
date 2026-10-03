'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import ExportDialog from '@/components/ExportDialog';
import Toast from '@/components/ui/Toast';
import type { BrandConfig } from '@/lib/brands/types';
import type { Filters } from '@/lib/query';

interface Props {
  brand: BrandConfig;
}

export default function ExportButton({ brand }: Props) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Parse current URL filters (exclude page/pageSize/sort — export fetches all)
  const filters = useMemo((): Filters => {
    const f: Filters = {};
    searchParams.forEach((v, k) => {
      if (k !== 'page' && k !== 'pageSize' && k !== 'sort') f[k] = v;
    });
    return f;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const handleSuccess = useCallback(() => {
    setShowToast(true);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-[6px] border border-line bg-surface px-3 text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        <Download size={15} />
        Export
      </button>

      <ExportDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={handleSuccess}
        brand={brand}
        filters={filters}
      />

      {showToast && (
        <Toast message="Export ready" onDismiss={() => setShowToast(false)} />
      )}
    </>
  );
}
