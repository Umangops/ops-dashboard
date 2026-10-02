'use client';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[];
  placeholder?: string;
}

export default function Select({
  options,
  placeholder = 'All',
  className,
  ...props
}: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-[6px] border border-line bg-surface px-3 pr-8 text-sm text-ink outline-none transition-colors',
          'hover:border-line-strong focus:border-primary focus:ring-2 focus:ring-primary/20',
          className,
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}
