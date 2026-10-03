'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

const sizeCls: Record<ModalSize, string> = {
  sm: 'sm:max-w-[400px]',
  md: 'sm:max-w-[480px]',
  lg: 'sm:max-w-[560px]',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  children: ReactNode;
  className?: string;
  /** On narrow screens the dialog fills the viewport from the bottom */
  mobileFullscreen?: boolean;
}

export default function Modal({
  open,
  onClose,
  size = 'md',
  title,
  children,
  className,
  mobileFullscreen = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        mobileFullscreen
          ? 'items-end p-0 sm:items-center sm:p-4'
          : 'items-center p-4',
      )}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full bg-surface shadow-xl overflow-hidden',
          mobileFullscreen
            ? cn(
                'flex flex-col rounded-t-[16px] sm:rounded-[10px]',
                'max-h-[95dvh] sm:max-h-none',
                sizeCls[size],
              )
            : cn('rounded-[10px]', sizeCls[size]),
          className,
        )}
        style={{ animation: 'modal-in 150ms ease-out' }}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-1 text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn('p-6', mobileFullscreen && 'flex-1 overflow-y-auto')}>
          {children}
        </div>
      </div>
    </div>
  );
}
