'use client';
import { useState, useRef, useEffect } from 'react';
import { Menu, TrendingUp, ChevronDown, LogOut, User } from 'lucide-react';
import { signOut } from '@/app/actions';

interface Props {
  fullName: string;
  role: 'admin' | 'viewer';
  onMenuClick: () => void;
}

export default function Header({ fullName, role, onMenuClick }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className="flex h-[72px] shrink-0 items-center justify-between border-b border-line bg-surface px-5 md:px-8"
      style={{ boxShadow: '0 2px 4px rgba(16,24,40,0.06)' }}
    >
      {/* Left — mobile hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-ink-2 hover:bg-subtle transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {/* Logo visible on mobile (desktop shows it in sidebar) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="text-[16px] font-semibold text-ink">LookupDost</span>
        </div>
      </div>

      {/* Right — user menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 hover:bg-subtle transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium text-ink leading-tight">{fullName}</p>
            <p className="text-xs text-ink-3 capitalize leading-tight">{role}</p>
          </div>
          <ChevronDown
            size={16}
            className={`text-ink-3 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-52 rounded-[10px] border border-line bg-surface py-1 shadow-lg z-50"
            style={{ boxShadow: '0 4px 6px rgba(16,24,40,0.05), 0 10px 15px rgba(16,24,40,0.08)' }}
          >
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-medium text-ink">{fullName}</p>
              <p className="mt-0.5 text-xs text-ink-3 capitalize">{role}</p>
            </div>
            <div className="py-1">
              <button
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-2 hover:bg-subtle hover:text-ink transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <User size={15} className="text-ink-3" />
                Change password
              </button>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger-soft transition-colors"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
