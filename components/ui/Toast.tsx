'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-[8px] bg-ink px-4 py-3 shadow-xl"
      style={{ animation: 'modal-in 150ms ease-out' }}
    >
      <CheckCircle2 size={16} className="shrink-0 text-success" />
      <p className="text-sm font-medium text-white">{message}</p>
      <button
        onClick={onDismiss}
        className="ml-1 rounded p-0.5 text-white/60 transition-colors hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}
