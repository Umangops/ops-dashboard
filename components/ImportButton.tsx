'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import ImportDialog from '@/components/ImportDialog';
import type { BrandConfig } from '@/lib/brands/types';

interface Props {
  brand: BrandConfig;
  userId: string;
  userName: string;
}

export default function ImportButton({ brand, userId, userName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-[6px] bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        <Upload size={15} />
        Import
      </button>
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          // Re-runs the server component to update lastImport text + refresh data
          router.refresh();
        }}
        brand={brand}
        userId={userId}
        userName={userName}
      />
    </>
  );
}
