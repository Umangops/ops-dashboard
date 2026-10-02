'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const header = (
    <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
      {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
      <button
        onClick={onClose}
        className="ml-auto rounded-md p-1 text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
      >
        <X size={18} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Desktop: slide in from right */}
      <div
        className={cn(
          'absolute right-0 top-0 hidden h-full w-[480px] flex-col bg-surface shadow-xl md:flex overflow-y-auto',
          className,
        )}
        style={{ animation: 'drawer-right 200ms ease-out' }}
      >
        {header}
        <div className="flex-1 p-6">{children}</div>
      </div>

      {/* Mobile: slide up from bottom */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-surface shadow-xl md:hidden',
          className,
        )}
        style={{ animation: 'drawer-bottom 200ms ease-out' }}
      >
        {header}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
