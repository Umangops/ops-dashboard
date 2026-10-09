'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Props {
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
  size?: 'sm' | 'md';
}

export default function SearchableDropdown({
  value,
  options,
  placeholder = 'All',
  onChange,
  size = 'sm',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  const isSmall = size === 'sm';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-1 rounded border border-line bg-surface text-ink outline-none transition-colors hover:border-line-strong focus:border-primary ${
          isSmall ? 'h-7 px-2 text-xs' : 'h-11 px-3 text-sm'
        }`}
      >
        <span className={`truncate ${value ? 'text-ink' : 'text-ink-3'}`}>
          {value || placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  handleSelect('');
                }
              }}
              className="rounded p-0.5 text-ink-3 hover:text-ink"
              aria-label="Clear"
            >
              <X size={isSmall ? 10 : 13} />
            </span>
          )}
          <ChevronDown size={isSmall ? 11 : 14} className="text-ink-3" />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-max min-w-full max-w-[280px] rounded-[8px] border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-2 py-1.5">
            <div className="relative">
              <Search
                size={12}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                autoFocus
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-7 w-full rounded border border-line bg-subtle pl-6 pr-2 text-xs text-ink placeholder:text-ink-3 outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-subtle ${
                !value ? 'font-semibold text-primary' : 'text-ink-2'
              }`}
            >
              All
            </button>
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-3">No matches</p>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => handleSelect(o)}
                className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-subtle ${
                  value === o ? 'font-semibold text-primary' : 'text-ink'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
