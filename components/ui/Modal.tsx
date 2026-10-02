'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

const sizeCls: Record<ModalSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[560px]',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({
  open,
  onClose,
  size = 'md',
  title,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full rounded-[10px] bg-surface shadow-xl overflow-hidden',
          sizeCls[size],
          className,
        )}
        style={{ animation: 'modal-in 150ms ease-out' }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
