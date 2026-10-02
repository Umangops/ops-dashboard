'use client';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  searchIcon?: boolean;
  error?: string;
}

export default function Input({ searchIcon, error, className, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      {searchIcon && (
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
      )}
      <input
        className={cn(
          'h-10 w-full rounded-[6px] border bg-surface text-sm text-ink placeholder:text-ink-3 outline-none transition-colors',
          'border-line hover:border-line-strong focus:border-primary focus:ring-2 focus:ring-primary/20',
          searchIcon ? 'pl-9 pr-3' : 'px-3',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
