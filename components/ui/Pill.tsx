import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const toneStyles: Record<Tone, { color: string; bg: string; border: string }> = {
  info:    { color: '#4F5FE8', bg: '#E8EBFD', border: '#C7CDFA' },
  success: { color: '#2E9E5B', bg: '#DDF5E7', border: '#A7E3C1' },
  warning: { color: '#D4A017', bg: '#FDF3D0', border: '#F2D675' },
  danger:  { color: '#E5252A', bg: '#FDE2E2', border: '#F7B4B5' },
  neutral: { color: '#4B5563', bg: '#F0F2F5', border: '#D1D5DB' },
};

interface PillProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export default function Pill({ tone = 'neutral', children, className }: PillProps) {
  const s = toneStyles[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium',
        className,
      )}
      style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
    >
      {children}
    </span>
  );
}
